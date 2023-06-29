import COMPTROLLER_INTERFACE from "../../configuration/abis/Comptroller";
import { BotConfiguration } from "../../configuration/config";
import { MultiCall } from '@indexed-finance/multicall';
import { chainReader } from "./reader";
import { ethers } from "ethers";


// TODO/question: can I get rid of accounts with 0 liquidity and 0 shortfall?

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
        this.closeFactorMantissa = ethers.BigNumber.from(-1);
    }

    async start () {

        // start reader
        // TODO: should I do this here or in constructor?
        this.reader = new chainReader(this.configuration, this.trollInstance);

        // build list of active accounts by starting a listener and finding historic 
        // MarketEntered/Exited events
        let readerStarted = this.reader.start();

        await readerStarted;

        // get close factor mantissa
        // TODO: how often should this be updated?
        this.closeFactorMantissa = await this.trollInstance.closeFactorMantissa();

        //console.log("Our lucky guest: ");
        //console.log(await this.trollInstance.getAssetsIn(this.reader.activePositions[742].account));
        // console.log(await this.trollInstance.getAccountLiquidity(this.reader.activePositions[20].account));
        // console.log(this.reader.activePositions[20].account);

        this.watchAccountLiquidity();
    }

    private async watchAccountLiquidity () {
        // how many concurrent processes to start calling getAccountLiquidity
        // divides activePositions up into numBatches equal parts and calls readAccountsLiquidity for each
        // TODO: This can't be the best way to do this.  Working with mainnet data so activePositions has around 200,000 
        // entries.  If we identify a strategy that can scale for mainnet data, we're set forever
        const numBatches = 5;

        const multi = new MultiCall(this.myProvider);

        // calls function to search through all active positions for underwater positions.  
        // When it's done searching, wait `seconds` then call again
        // TODO: using infinite loop feels really gross.  There's probably a safer and cleaner way
        while (true) {

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

            // sleep before next call
            // TODO: maybe unnecessary 
            const seconds = 60;
            await new Promise(r => setTimeout(r, seconds * 1000));
        }

        
    }

    private async readAccountsLiquidity(start: number, end: number, multi: MultiCall) {

        type Input = {
            target: string,
            function: string,
            args: string[]
        }

        // searches from start to end by increments of 50
        // anything larger than 50 and multicall errors out because of 24kb smart contract size
        for (let i = start; i < end; i += 50) {
            //console.log((i/end)*100 + "%");

            const inputs: Input[] = [];

            // adds 50 accounts to the next query
            for(let j = 0; j < 50 && j + i < this.reader.activePositions.length; j++) {
                inputs.push({
                    target: this.trollInstance.address,
                    function: 'getAccountLiquidity',
                    args: [this.reader.activePositions[j+i].account]
                });
            }

            // TODO: fill in
            var data: [number, any[]];
            try {
                data = await multi.multiCall(COMPTROLLER_INTERFACE, inputs);
            }
            catch {

            }
        
            // data[0] is block number
            // data[1] is array of 'getAccountLiquidity' results
            // data[1][i] is a specific tuple result of a single call of `getAccountLiquidity`
            // data[1][i][0] is "error" bignum.  == 0 on success
            // data[1][i][1] is "liquidity" bignum.  !=0 means account has available liquidity
            // data[1][i][2] is "shortfall" bignum.  !=0 means account is below collateral requirement and is subject to liquidation
            // inputs[i].args an array of arguments for multicall.  In this case it's just the account address
            for (let i = 0; i < data.length; i++) {
                
                const [error, liquidity, shortfall] = data[1][i];
                const addr = inputs[i].args;
                // console.log(error);
                // console.log(liquidity);
                // console.log(shortfall);
                // console.log(acct + "\n");

                // TODO: can I remove accounts that have 0 liquidity AND 0 shortfall?
                if (!error.isZero()) {
                    console.error("Error in querying account liquidity");
                    console.log(error);
                }
                if (!liquidity.isZero()) {
                    // account has available liquidity
                }
                if (!shortfall.isZero()) {
                    // LIQUIDATE!!!
                    // account is below collateral requirement and is subject to liquidation
                    this.investigateLiquidate();
                }
            }
        }
    }

    private async investigateLiquidate() {
        // calculations and such
        console.log("liquidate the mfer");
    }


}