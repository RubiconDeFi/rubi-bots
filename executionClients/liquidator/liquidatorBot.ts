import COMPTROLLER_INTERFACE from "../../configuration/abis/Comptroller";
import { BotConfiguration, Position } from "../../configuration/config";
import { MultiCall } from '@indexed-finance/multicall';
import { chainReader } from "./chainReader"; // TODO: move Position somewhere
import { ethers } from "ethers";
import CERC20_INTERFACE from "../../configuration/abis/CErc20";


// TODO/question: can I get rid of accounts with 0 liquidity and 0 shortfall?
// TODO: ask which token they want to get paid out in

export class liquidatorBot {

    public configuration: BotConfiguration; // TODO: don't need to set this in both the bot and reader
    public trollInstance: ethers.Contract; // TODO: don't need to set this in both the bot and reader
    public myProvider: ethers.providers.JsonRpcProvider | ethers.providers.WebSocketProvider; // TODO: don't need to set this in both the bot and reader
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

        // perpetual job to search through all active positions for underwater positions.
        // TODO: infinite while loop is incredibly sketch.  There's a better way to do this
        while (true) {
            
            let batchPromises: Promise<[number, any[]]>[] = [];

            console.log("Unique addresses: " + this.reader.activePositions.length);

            // queries (50 * batchSize) accounts at a time
            for (let i = 0; i < this.reader.activePositions.length; i += 50) {
                //console.log(((i/this.reader.activePositions.length)*100).toFixed(2) + "%");
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

                        // TODO: CAN I REMOVE ACCOUNTS WITH 0 LIQUIDITY AND 0 SHORTFALL???
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
        //console.log("liquidate the mfer " + account);

        const closeFactor = await this.trollInstance.closeFactorMantissa();
        const liquidationIncentive = await this.trollInstance.liquidationIncentiveMantissa();
        if (closeFactor === null || liquidationIncentive === null) {
          console.log('Borrower computation error: closeFactor|liquidationIncentive === null');
          return null;
        }

        // get all cToken markets account is currently in
        const assetsIn: string = await this.trollInstance.getAssetsIn(account);
        let snapShots: [string, ethers.BigNumber][] = [];
        for ( const asset of assetsIn ) {

            // TODO: move && figure out better way of creating cToken instances
            const cTokenInstance = new ethers.Contract(
                asset,
                CERC20_INTERFACE,
                this.myProvider // TODO: use websocket (why?)
            );

            //const borrowBalance: ethers.BigNumber = await cTokenInstance.borrowBalanceStored(account);
            const snapShot = await cTokenInstance.getAccountSnapshot(account);
            //const underlying = await cTokenInstance.underlying();
            snapShots.push([asset, snapShot]);
        }
        console.log("Account: " + account);
        let bestSeizeToken: string = '0';
        let bestSeizeTokenUSDAmt: ethers.BigNumber = ethers.BigNumber.from(0);
        let bestRepayToken: string = '0';
        let bestRepayTokenUSDAmt: ethers.BigNumber = ethers.BigNumber.from(0);
        for (const currToken of snapShots) {
            const token: string = currToken[0];
            const error: ethers.BigNumber = currToken[1][0];
            const balance: ethers.BigNumber = currToken[1][1];
            const borrowed: ethers.BigNumber = currToken[1][2];
            const exchangeRate: ethers.BigNumber = currToken[1][3];
            // console.log("   Token: " + token);
            // console.log("   error: " + error);
            // console.log("   balance: " + balance); // one of these will be our seizeCToken
            // console.log("   borrowed: " + borrowed);// one of these will be our repayCToken
            // console.log("   exchange rate: " + exchangeRate);
            // const underlying: string = currToken[2];
            // console.log("   underling asset: " + underlying + "\n")

            // TODO: profits can be maximized further by comparing all repay to all seize
            // and calculating liquidateCalculateSeizeTokens (look at comptroller) on each 
            // combination.  But intensive and I'm lazy currently

            // find best cToken to seize
            const underlyingUSDValue: ethers.BigNumber = await this.getUSDPriceOfUnderlying(token)
            const underlyingBalance: ethers.BigNumber = balance.mul(exchangeRate); // TODO: verify
            const USDBalance: ethers.BigNumber = underlyingUSDValue.mul(underlyingBalance);

            if(USDBalance.gt(bestSeizeTokenUSDAmt)) {
                bestSeizeToken = token;
                bestSeizeTokenUSDAmt = USDBalance;
            }

            // find best cToken to repay
            // maximize priceOfBorrowed*amountBorrowed
            const USDBorrowed: ethers.BigNumber = borrowed.mul(underlyingUSDValue)

            if(USDBorrowed.gt(bestRepayTokenUSDAmt)) {
                bestRepayToken = token;
                bestRepayTokenUSDAmt = USDBorrowed;
            }
        }
        console.log("Best repayCToken: " + bestRepayToken);
        console.log("Best seizeCToken: " + bestSeizeToken + "\n");

        // TODO: call liquidate on our contract

        // max_liquidation_amount_in_eth = total_borrow_value_in_eth * close_factor
        // token_borrow_balance_underlying_in_eth = token_borrow_balance_underlying * underlying_asset_to_eth_exchange_rate
        // total_borrow_value_in_eth = sum(token_borrow_balance_underlying_in_eth)
        // token_supply_balance_underlying_in_eth = token_supply_balance_underlying * underlying_asset_to_eth_exchange_rate
        // total_supply_value_in_eth = sum(token_supply_balance_underlying_in_eth * collateral_factor)
        // max_collectible_amount_in_eth = sum(token_supply_balance_underlying_in_eth)

    }

    // use getUnderlyingPrice
    // the returned price will be scaled by 10^(36 - underlying.decimals), so make sure to handle it
    async getUSDPriceOfUnderlying(token: string): Promise<ethers.BigNumber> {
        return ethers.BigNumber.from(1);
    }


}