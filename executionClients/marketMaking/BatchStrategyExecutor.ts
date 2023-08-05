import { BigNumber, ethers } from 'ethers';
import { EventEmitter } from 'events';
import BatchableGenericMarketMakingBot from './BatchableGenericMarketMakingBot';
import { BotConfiguration } from '../../configuration/config';
import { formatUnits, parseUnits } from 'ethers/lib/utils';

// Define the event types that the BatchStrategyExecutor will listen to
interface BatchStrategyExecutorEvents {
  on(event: 'addToBatch', listener: (data: any) => void): this;
  emit(event: 'addToBatch', data: any): boolean;
}

class BatchStrategyExecutor extends (EventEmitter as { new(): BatchStrategyExecutorEvents }) {
  private batch: any[];
  private batchInProgress: boolean;
  private bots: BatchableGenericMarketMakingBot[];
  config: BotConfiguration;
  marketAid: ethers.Contract;
  eventEmitter: EventEmitter;

  constructor(bots: BatchableGenericMarketMakingBot[], config: BotConfiguration, marketAid: ethers.Contract) {
    super();
    this.bots = bots;
    this.batch = new Array(this.bots.length).fill(null).map((_, botId) => ({ botId, actions: {} }));
    this.batchInProgress = false;
    this.config = config;
    this.marketAid = marketAid;
    this.eventEmitter = new EventEmitter();

    // Bind event listeners
    this.on('addToBatch', this.handleAddToBatch);

    console.log("BatchStrategyExecutor spinning up...");

    // Listen to events from all BatchableGenericMarketMakingBot instances
    this.bots.forEach((bot, botIndex) => {
      console.log("Listening to events from bot: ", botIndex);

      bot.launchBot();
      bot.eventEmitter.on('placeInitialMarketMakingTrades', (calldata: string) => {
        this.emit('addToBatch', { botId: botIndex, action: 'placeInitialMarketMakingTrades', calldata });
      });

      bot.eventEmitter.on('requoteMarketAidPosition', (calldata: string) => {
        this.emit('addToBatch', { botId: botIndex, action: 'requoteMarketAidPosition', calldata });
      });

      bot.eventEmitter.on('wipeOnChainBook', (calldata: string) => {
        this.emit('addToBatch', { botId: botIndex, action: 'wipeOnChainBook', calldata });
      });

      // Add a listener for dumpFillViaMarketAid
      bot.eventEmitter.on('dumpFillViaMarketAid', (calldata: string) => {
        this.emit('addToBatch', { botId: botIndex, action: 'dumpFillViaMarketAid', calldata });
      });
    });

    // Start polling to periodically process the batch queue
    this.startPolling();
  }

  // Logical loop for executing the batch when it exists
  private startPolling(): void {
    // Set an arbitrary polling interval in milliseconds (e.g., 5000 ms or 5 seconds)
    // TODO: move to config
    const pollingInterval = 2000;

    setInterval(() => {
      if (!this.batchInProgress && this.batch.length > 0) {
        this.executeBatch();
      }
    }, pollingInterval);
  }


  // Event handler for 'addToBatch'
  private handleAddToBatch(data: any): void {
    // Add the data to the batch and trigger the execution if necessary
    // console.log("Adding to batch...", data);

    this.addToBatch(data);
    // if (!this.batchInProgress) {
    //   this.executeBatch();
    // }
  }

  private addToBatch(data: any): void {
    // Find the batch item for the botId
    const botBatchItem = this.batch.find(item => item.botId === data.botId);

    if (botBatchItem) {
      // Update the action with the new calldata
      botBatchItem.actions[data.action] = data.calldata;
    }
  }


  private async executeBatch(): Promise<void> {

    console.log("\nAttempting to execute the batch...");
    console.log("this is my batch!", this.batch);

    const targets: Call[] = [];
    // Track the bot and action type for each target
    const targetInfo: { botId: number; action: string }[] = [];

    this.batch.forEach((botBatchItem) => {
      for (const actionType in botBatchItem.actions) {
        console.log("\nactionType", actionType, "this bot ID", botBatchItem.botId, "this bot's actions", botBatchItem.actions);

        const calldata = botBatchItem.actions[actionType];
        targets.push({
          target: this.marketAid.address,
          function: actionType,
          args: calldata,
        });
        targetInfo.push({ botId: botBatchItem.botId, action: actionType });
      }
    });

    const payload = targets.map(item => item.args);
    console.log("targets", payload);


    try {
      if (this.batchInProgress) {
        console.log("\nBatch already in progress, not shipping batch.");
        return;
      }

      if (payload.length === 0) {
        console.log("\nNo actions in batch, not shipping batch.");
        return;
      }
      const gasEstimate = await this.marketAid.connect(this.config.connections.signer).estimateGas.batchBox(payload);



      if (gasEstimate) {
        console.log("\nShipping batch with gas estimate:", gasEstimate);
        this.batchInProgress = true;

        /// TODO: Extrapolate to a better location to not slow batch execution
        // https://docs.ethers.org/v5/api/providers/provider/#Provider-getFeeData
        const provider = this.config.connections.jsonRpcProvider;
        const feeData = await provider.getFeeData();
        const formattedGasPrice = formatUnits(feeData.gasPrice, 'gwei');
        
        if (!feeData.gasPrice) {
          console.log("\nNo gas price returned from provider, not shipping batch.");
          this.batchInProgress = false;
          return;
        }

        var tx;
        console.log("Attempting batch at this gas price:", formattedGasPrice);
        
        try {
          tx = await this.marketAid.connect(this.config.connections.signer).batchBox(payload,
            {
              gasLimit: gasEstimate,
              gasPrice: feeData.gasPrice
            });
        } catch (error) {
          console.log("batch error", error);
          
        }

        this.batchInProgress = true;

        const receipt = await tx.wait(1);
        this.batchInProgress = false;

        // Clear the batch
        // this.batch = [];
        // this.batch = new Array(this.bots.length).fill(null).map((_, botId) => ({ botId, actions: {} }));
        // ** Updated logic: ONLY CLEAR THOSE ACTIONS THAT WERE SHIPPED IN THE BATCH
        targetInfo.forEach(({ botId, action }) => {
          delete this.batch[botId].actions[action];
        });

        if (receipt.status) {
          console.log("\n🎉 THE BATCH WAS SUCCESSFUL 🎉");
        } else {
          console.log("\n😢 THE BATCH FAILED 😢", receipt);

        }

        // Handle gas spent on transactions and other related logic
        // ...
      } else {
        console.log("\nNo gas estimate returned, not shipping batch.");

      }
    } catch (error) {
      console.error("Error executing batch transaction:", error.message);
      this.batchInProgress = false;
      // this.batch = [];
      this.batch = new Array(this.bots.length).fill(null).map((_, botId) => ({ botId, actions: {} }));

    }
  }


}

export default BatchStrategyExecutor;


export type Call = {
  target: string;
  function: string;
  args: string[] | any[];
};