import { BigNumber, ethers } from 'ethers';
import { EventEmitter } from 'events';
import BatchableGenericMarketMakingBot from './BatchableGenericMarketMakingBot';
import { BotConfiguration } from '../../configuration/config';

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
    this.batch = [];
    this.batchInProgress = false;
    this.bots = bots;
    this.config = config;
    this.marketAid = marketAid;
    this.eventEmitter = new EventEmitter();

    // Bind event listeners
    this.on('addToBatch', this.handleAddToBatch);

    console.log("BatchStrategyExecutor spinning up...");
    console.log("this bots", this.bots);
    

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
    });

    // Start polling to periodically process the batch queue
    this.startPolling();
  }

  // Logical loop for executing the batch when it exists
  private startPolling(): void {
    // Set an arbitrary polling interval in milliseconds (e.g., 5000 ms or 5 seconds)
    const pollingInterval = 5000;

    setInterval(() => {
      if (!this.batchInProgress && this.batch.length > 0) {
        this.executeBatch();
      }
    }, pollingInterval);
  }


  // Event handler for 'addToBatch'
  private handleAddToBatch(data: any): void {
    // Add the data to the batch and trigger the execution if necessary
    this.addToBatch(data);
    if (!this.batchInProgress) {
      this.executeBatch();
    }
  }

  private addToBatch(data: any): void {
    // Search for an existing action in the batch for the same bot
    const existingActionIndex = this.batch.findIndex(item => item.botId === data.botId && item.action === data.action);

    if (existingActionIndex >= 0) {
      // Update the existing action with the new calldata
      this.batch[existingActionIndex].calldata = data.calldata;
    } else {
      // Add the new action to the batch
      this.batch.push(data);
    }
  }


  private async executeBatch(): Promise<void> {
    this.batchInProgress = true;

    const targets: Call[] = this.batch.map(item => ({
      target: this.marketAid.address, // Assuming the target is the marketAid contract address
      function: item.action,
      args: [item.calldata],
    }));

    try {
      const gasEstimate = await this.marketAid.connect(this.config.connections.signer).estimateGas.batchBox(targets);

      if (this.batchInProgress) {
        console.log("\nNot shipping this one because already attempting...");
        return;
      }

      if (gasEstimate) {
        this.batchInProgress = true;
        const tx = await this.marketAid.connect(this.config.connections.signer).batchBox(targets, { gasLimit: gasEstimate });

        const receipt = await tx.wait();
        this.batchInProgress = false;

        // Clear the batch
        this.batch = [];

        if (receipt.status) {
          console.log("\n🎉 THE BATCH WAS SUCCESSFUL 🎉");
        } else {
        }

        // Handle gas spent on transactions and other related logic
        // ...
      }
    } catch (error) {
      console.error("Error executing batch transaction:", error.message);
      this.batchInProgress = false;
      this.batch = [];
    }
  }


}

export default BatchStrategyExecutor;


export type Call = {
  target: string;
  function: string;
  args: string[] | any[];
};