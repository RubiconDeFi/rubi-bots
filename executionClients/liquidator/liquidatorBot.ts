import COMPTROLLER_INTERFACE from "../../configuration/abis/Comptroller";
import { BotConfiguration } from "../../configuration/config";
import { MultiCall } from '@indexed-finance/multicall';
import { chainReader } from "./reader";
import { ethers } from "ethers";

export class liquidatorBot {

    public configuration: BotConfiguration; // TODO: don't need to set this in both the bot and reader
    public trollInstance: ethers.Contract; // TODO: don't need to set this in both the bot and reader
    public myProvider: ethers.providers.JsonRpcProvider | ethers.providers.WebSocketProvider; // TODO: don't need to set this in both the bot and reader
    private closeFactorMantissa: ethers.BigNumber;
    private reader: chainReader;

    constructor(
        configuration: BotConfiguration, 
        trollInstance: ethers.Contract
        ) {

        this.configuration = configuration;
        this.myProvider = configuration.connections.jsonRpcProvider;
        this.trollInstance = trollInstance;
        // should reader have a default value?
    }

    async start () {

        // start reader
        // TODO: should I do this here or in constructor?
        this.reader = new chainReader(this.configuration, this.trollInstance);

        // build list of active accounts by starting a listener and finding historic 
        // MarketEntered/Exited events
        let readerStarted = this.reader.start();

        await readerStarted;
        console.log("Length: " + this.reader.activePositions.length);

        // get close factor mantissa
        // TODO: how often should this be updated?
        this.closeFactorMantissa = await this.trollInstance.closeFactorMantissa();

        console.log("Our lucky guest: ");
        //console.log(await this.trollInstance.getAssetsIn(this.reader.activePositions[742].account));
        //console.log(await this.trollInstance.getAccountLiquidity(this.reader.activePositions[742].account));

        this.watchAccountLiquidity();
    }

    private async watchAccountLiquidity () {
        // how many concurrent processes to start calling getAccountLiquidity
        // divides activePositions up into numBatches equal parts and calls readAccountsLiquidity for each
        // TODO: This can't be the best way to do this.  Working with mainnet data so activePositions has around 200,000 
        // entries.  If we identify a strategy that can scale for mainnet data, we're set forever
        const numBatches = 10;

        const multi = new MultiCall(this.myProvider);
        
        const batchSize = Math.ceil(this.reader.activePositions.length / numBatches);
        const batchPromises: Promise<void>[] = [];

        for (let i = 0; i < numBatches; i++) {
            const start = i * batchSize;
            const end = Math.min(start + batchSize, this.reader.activePositions.length);

            const batchPromise = this.readAccountsLiquidity(start, end, multi);
            batchPromises.push(batchPromise);
        }

        await Promise.all(batchPromises);

        console.log("Done calling");
        
    }

    private async readAccountsLiquidity(start: number, end: number, multi: MultiCall) {
        
        // searches from start to end by increments of 50
        // anything larger than 50 and multicall errors out because of 24kb smart contract size
        for (let i = start; i < end; i += 50) {
            //console.log((i/end)*100 + "%");

            const inputs = [];

            // adds 50 accounts to the next query
            for(let j = 0; j < 50 && j + i < this.reader.activePositions.length; j++) {
                inputs.push({
                    target: this.trollInstance.address,
                    function: 'getAccountLiquidity',
                    args: [this.reader.activePositions[j+i].account]
                });
            }

            const data = await multi.multiCall(COMPTROLLER_INTERFACE, inputs);

            // data[0] is block number
            // data[1] is array of 'getAccountLiquidity' results
            // data[1][i][2] is shortfall.  if > 0 (!=0 since compound doesn't use signed ints) account is below collateral requirement and is subject to liquidation
            for (let i = 0; i < data[1].length; i++) {
                const currResult = data[1][i];

                console.log(currResult);
            }
        }
    }


}