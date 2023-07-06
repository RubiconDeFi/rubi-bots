import COMPTROLLER_INTERFACE from "../../configuration/abis/Comptroller";
import { BotConfiguration, Position } from "../../configuration/config";
import { MultiCall } from '@indexed-finance/multicall';
import { chainReader } from "./chainReader"; // TODO: move Position somewhere
import { ethers } from "ethers";
import CERC20_INTERFACE from "../../configuration/abis/CErc20";


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

                        // if shortfall != 0 then account is below collateral requirement and subject to liquidation
                        if (!shortfall.isZero()) {
                            // TODO: fire this in correct order maybe?
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

        let borrowBalances: [string, ethers.BigNumber][] = [];
        const assetsIn: string = await this.trollInstance.getAssetsIn(account);
        for ( const asset of assetsIn ) {

            // TODO: move && figure out better way of creating cToken instances
            const cTokenInstance = new ethers.Contract(
                asset,
                CERC20_INTERFACE,
                this.myProvider // TODO: use websocket (why?)
            );

            const borrowBalance: ethers.BigNumber = await cTokenInstance.borrowBalanceStored(account);
            borrowBalances.push([asset, borrowBalance]);
        }
        console.log("Account: " + account);
        for (const curr of borrowBalances) {
            if (!curr[1].isZero())
            console.log(curr);
        }


        // max_liquidation_amount_in_eth = total_borrow_value_in_eth * close_factor
        // token_borrow_balance_underlying_in_eth = token_borrow_balance_underlying * underlying_asset_to_eth_exchange_rate
        // total_borrow_value_in_eth = sum(token_borrow_balance_underlying_in_eth)
        // token_supply_balance_underlying_in_eth = token_supply_balance_underlying * underlying_asset_to_eth_exchange_rate
        // total_supply_value_in_eth = sum(token_supply_balance_underlying_in_eth * collateral_factor)
        // max_collectible_amount_in_eth = sum(token_supply_balance_underlying_in_eth)

        
        // /* We calculate the number of collateral tokens that will be seized */
        // (uint amountSeizeError, uint seizeTokens) = comptroller.liquidateCalculateSeizeTokens(address(this), address(cTokenCollateral), repayAmount);
        // /**
        //  * @notice Calculate number of tokens of collateral asset to seize given an underlying amount
        //  * @dev Used in liquidation (called in cToken.liquidateBorrowFresh)
        //  * @param cTokenBorrowed The address of the borrowed cToken
        //  * @param cTokenCollateral The address of the collateral cToken
        //  * @param actualRepayAmount The amount of cTokenBorrowed underlying to convert into cTokenCollateral tokens
        //  * @return (errorCode, number of cTokenCollateral tokens to be seized in a liquidation)
        //  */
        // function liquidateCalculateSeizeTokens(address cTokenBorrowed, address cTokenCollateral, uint actualRepayAmount) external view returns (uint, uint) {
        //     /* Read oracle prices for borrowed and collateral markets */
        //     uint priceBorrowedMantissa = oracle.getUnderlyingPrice(CToken(cTokenBorrowed));
        //     uint priceCollateralMantissa = oracle.getUnderlyingPrice(CToken(cTokenCollateral));
        //     if (priceBorrowedMantissa == 0 || priceCollateralMantissa == 0) {
        //         return (uint(Error.PRICE_ERROR), 0);
        //     }
        //     /*
        //     * Get the exchange rate and calculate the number of collateral tokens to seize:
        //     *  seizeAmount = actualRepayAmount * liquidationIncentive * priceBorrowed / priceCollateral
        //     *  seizeTokens = seizeAmount / exchangeRate
        //     *   = actualRepayAmount * (liquidationIncentive * priceBorrowed) / (priceCollateral * exchangeRate)
        //     */
        //     uint exchangeRateMantissa = CToken(cTokenCollateral).exchangeRateStored(); // Note: reverts on error
        //     uint seizeTokens;
        //     Exp memory numerator;
        //     Exp memory denominator;
        //     Exp memory ratio;
        //     MathError mathErr;
        //     (mathErr, numerator) = mulExp(liquidationIncentiveMantissa, priceBorrowedMantissa);
        //     if (mathErr != MathError.NO_ERROR) {
        //         return (uint(Error.MATH_ERROR), 0);
        //     }
        //     (mathErr, denominator) = mulExp(priceCollateralMantissa, exchangeRateMantissa);
        //     if (mathErr != MathError.NO_ERROR) {
        //         return (uint(Error.MATH_ERROR), 0);
        //     }
        //     (mathErr, ratio) = divExp(numerator, denominator);
        //     if (mathErr != MathError.NO_ERROR) {
        //         return (uint(Error.MATH_ERROR), 0);
        //     }
        //     (mathErr, seizeTokens) = mulScalarTruncate(ratio, actualRepayAmount);
        //     if (mathErr != MathError.NO_ERROR) {
        //         return (uint(Error.MATH_ERROR), 0);
        //     }
        //     return (uint(Error.NO_ERROR), seizeTokens);
        // }

    }


}