import COMPTROLLER_INTERFACE from "../../configuration/abis/Comptroller";
import { BotConfiguration, Position } from "../../configuration/config";
import { MultiCall } from '@indexed-finance/multicall';
import { chainReader } from "./chainReader"; // TODO: move Position somewhere
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
    }

    async start () {

        // start reader
        // TODO: should I do this here or in constructor?
        this.reader = new chainReader(this.configuration, this.trollInstance);

        // build list of active accounts by starting a listener and finding historic 
        // MarketEntered/Exited events
        let readerStarted = this.reader.start();

        console.log("starting reader");
        await readerStarted;
        console.log("reader started");


        //console.log("Our lucky guest: ");
        //console.log(await this.trollInstance.getAssetsIn(this.reader.activePositions[742].account));
        // console.log(await this.trollInstance.getAccountLiquidity(this.reader.activePositions[20].account));
        // console.log(this.reader.activePositions[20].account);

        this.watchAccountLiquidity();
    }

    private async watchAccountLiquidity () {

        type Input = {
            target: string,
            function: string,
            args: string[]
        }

        // number of promises to run at once
        // ensures we don't reach the heap size limit
        // TODO: 1000 is a bit arbitrary.  
        // Wasn't running into heap size issues, maybe increase?
        const batchSize = 1000;

        const multi = new MultiCall(this.myProvider);

        // calls function to search through all active positions for underwater positions.
        while (true) {
            
            let batchPromises: Promise<[number, any[]]>[] = [];

            console.log("Unique addresses: " + this.reader.activePositions.length);

            // queries (50 * batchSize) accounts at a time
            for (let i = 0; i < this.reader.activePositions.length; i += 50) {
                console.log(((i/this.reader.activePositions.length)*100).toFixed(2) + "%");
                let inputs: Input[] = [];

                // adds 50 accounts to the next query
                for(let j = 0; j < 50 && j + i < this.reader.activePositions.length; j++) {
                    inputs.push({
                        target: this.trollInstance.address,
                        function: 'getAccountLiquidity',
                        args: [this.reader.activePositions[j+i].account]
                    });
                    //console.log(this.reader.activePositions[j+i].account);
                }
                
                // if we have batchSize queries already sent, wait until they resolve before
                // sending the next query
                if (batchPromises.length >= batchSize) {
                    console.log("Batch size reached.  Waiting for current promises to resolve");
                    await Promise.allSettled(batchPromises);
                    batchPromises = []; // reset
                }

                // makes multicall query
                let data: Promise<[number, any[]]> = multi.multiCall(COMPTROLLER_INTERFACE, inputs);
                batchPromises.push(data);
                data.then((res) => {
                    // handle result
                    //console.log(res[1]);
                    for (let i = 0; i < res.length; i++) {

                        const [error, liquidity, shortfall] = res[1][i];
                        const account = inputs[i].args[0]; // address
                        // console.log(error);
                        // console.log(liquidity);
                        // console.log(shortfall);
                        // console.log(addr + "\n");

                        // if shortfall != 0 then account is below collateral requirement and subject to liquidation
                        if (!shortfall.isZero()) {
                            this.investigateLiquidate(account);
                        }
                    }
                });

                // small delay to allow for SIGINT (ctrl+c) to be handled
                await new Promise((resolve) => setTimeout(resolve, 5));
            }

            console.log("Done calling");
        }

        
    }


    private async investigateLiquidate(account: string) {
        // calculations and such
        console.log("liquidate the mfer " + account);
    }


}