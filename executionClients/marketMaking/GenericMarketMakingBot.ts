// Execution client object that listens to the price feed coming from a Strategy object and executes orders on a Liquidity Venue object
// Has a function called inventoryMangagement that listens to this.relativeAssetBalance and this.relativeQuoteBalance to determine biases for market-making behavior
// Has a function called execute that listens to the strategy's targetBook and executes orders on the liquidity venue once the strategy's targetBook is different 
// enough based on a configurable threshold from the liquidity venue's liveBook

import { BigNumber, ethers } from "ethers";
import { BotConfiguration, TransactionResponse, marketAddressesByNetwork } from "../../configuration/config";
import { GenericMarketMakingStrategy } from "../../strategies/marketMaking/genericMarketMaking";
import { AssetPair, GenericLiquidityVenue } from "../../liquidityVenues/generic";
import { TargetVenueOutBidStrategy } from "../../strategies/marketMaking/targetVenueOutBid";
import { RiskMinimizedStrategy } from "../../strategies/marketMaking/riskMinimizedUpOnly";
import { UniswapLiquidityVenue } from "../../liquidityVenues/uniswap";
import { MarketAidPositionTracker } from "../../liquidityVenues/rubicon/MarketAidPositionTracker";
import { formatUnits, getAddress, parseUnits } from "ethers/lib/utils";
import MARKET_INTERFACE from "../../configuration/abis/Market";


export type MarketAidAvailableLiquidity = {
    quoteWeiAmount: BigNumber,
    assetWeiAmount: BigNumber,
    status: boolean
};


// Takes a configuration, market aid instance, and strategy in the constructor
export class GenericMarketMakingBot {
    config: BotConfiguration;
    marketAid: ethers.Contract;
    strategy: RiskMinimizedStrategy | TargetVenueOutBidStrategy;
    liquidityVenue: GenericLiquidityVenue; // TODO: MAKE RUBICON MARKET-AID BOOSTED LIQUIDITY VENUE FUNCTIONS

    // ** Market Aid Liquidity **
    availableLiquidity: MarketAidAvailableLiquidity;
    relativeAssetBalance: number;
    relativeQuoteBalance: number;
    inventoryManagement: () => void;
    EOAbotAddress: string;
    assetPair: AssetPair;

    marketAidPositionTracker: MarketAidPositionTracker;

    // Logic gates to help with execution flows
    makingInitialBook: boolean;
    requotingOutstandingBook: boolean;

    marketContract: ethers.Contract;

    constructor(config: BotConfiguration, marketAid: ethers.Contract, strategy: RiskMinimizedStrategy | TargetVenueOutBidStrategy, _botAddy: string, liquidityVenue?: GenericLiquidityVenue) {
        this.config = config;
        this.marketAid = marketAid;
        this.strategy = strategy;
        this.liquidityVenue = liquidityVenue;
        this.relativeAssetBalance = 0;
        this.relativeQuoteBalance = 0;
        this.availableLiquidity = <MarketAidAvailableLiquidity>{};
        this.EOAbotAddress = _botAddy;
        this.assetPair = {
            asset: this.config.targetTokens[0],
            quote: this.config.targetTokens[1]
        };
        // If any params passed to the constructor are undefined, throw an error
        if (config === undefined || marketAid === undefined || _botAddy === undefined || this.assetPair === undefined) {
            throw new Error("GenericMarketMakingBot constructor params cannot be undefined");
        }
        const _marketAidPositionTracker = new MarketAidPositionTracker(this.assetPair, this.marketAid, this.EOAbotAddress, this.config);
        this.marketAidPositionTracker = _marketAidPositionTracker;

        this.marketContract = new ethers.Contract(
            marketAddressesByNetwork[this.config.network],
            MARKET_INTERFACE,
            this.config.connections.websocketProvider ? this.config.connections.websocketProvider : this.config.connections.jsonRpcProvider
        );
    }


    // Function that updates the on-chain book on the liquidity venue based on the strategy's targetBook
    // updateOnChainBook() {


    // Start function that kicks off the logical polling sequence that represents the bot's execution
    async launchBot() {
        // See if we can listen to the underlying strategy's recomended price
        console.log('Launching bot');

        // 1. Get the strategist's available liquidity over time
        await this.pullOnChainLiquidity();
        // UPDATER - Poll the strategist's total liquidity every second and populate the availableLiquidity object
        setTimeout(() => {
            this.pullOnChainLiquidity();
        }, 1000) // TODO: move to config

        // Call a function that takes available liquidity and generates a ladder based on a configurable parameter step size
        var _uniQueryLadder = getLadderFromAvailableLiquidity(this.availableLiquidity, 5);
        // console.log("This ladder!", _uniQueryLadder);


        // and this.availableLiquidity to get information on the current state of the market via pollLiveBook
        var assetLadder = _uniQueryLadder.assetLadder;
        var quoteLadder = _uniQueryLadder.quoteLadder;

        (this.strategy.referenceLiquidityVenue as UniswapLiquidityVenue).pollLiveBook(
            quoteLadder,
            assetLadder,
            1000
        );
        this.strategy.updateNotifier.on('update', (liveBook) => {
            console.log('\nStrategy Feed updated!');
            console.log(liveBook);
            this.compareStrategyAndMarketAidBooks();
        });

        // Kickoff a listener that polls the market-aid for the current state of the market
        // MarketAidPositionTracker will drive a book we compare against strategy book to do everything
        this.marketAidPositionTracker.updateNotifier.on('update', (liveBook) => {
            console.log('\nMarket Aid Position Tracker Feed updated!');
            console.log(liveBook);
            this.compareStrategyAndMarketAidBooks();
        });

        // Check the type of this.strategy, and if it is RiskMinimizedStrategy, then call the function tailOffModule on this
        if (this.strategy instanceof RiskMinimizedStrategy) {
            this.tailOffModule();
        }
    }

    // Main logical function that executes orders on the liquidity venue based on the strategy's targetBook
    compareStrategyAndMarketAidBooks() {
        // Compare the strategy's targetBook with the market-aid's liveBook
        // If the strategy's targetBook is different enough from the market-aid's liveBook, then execute orders on the liquidity venue to match
        const strategyBook = this.strategy.targetBook;
        const marketAidBook = this.marketAidPositionTracker.liveBook;
        const deltaTrigger = 0.003; // Relative difference in price between the strategy's targetBook and the market-aid's liveBook that triggers an order execution

        if (strategyBook === undefined || marketAidBook === undefined) {
            console.log('No books to compare');
            return;
        }

        // Check if the asks and the bids are not defined in both books
        // Both books have defined values for asks and bids
        if (strategyBook.asks !== undefined && strategyBook.bids !== undefined && marketAidBook.asks !== undefined && marketAidBook.bids !== undefined) {
            console.log("Comparing books");
            console.log("Strategy Book", strategyBook);
            console.log("Market Aid Book", marketAidBook);

            // If the asks and bids of marketAidBook are empty then we call placeInitialMarketMakingTrades()
            if (marketAidBook.asks.length === 0 && marketAidBook.bids.length === 0) {
                console.log("Market Aid book is empty, placing initial market making trades");
                this.placeInitialMarketMakingTrades();
            }
            // If the asks and the bids of marketAidBook are non-empty then check if they are equal in length to the strategyBook
            else if (marketAidBook.asks.length === strategyBook.asks.length && marketAidBook.bids.length === strategyBook.bids.length) {
                console.log("Market Aid book is same length as strategy book, checking for price deltas");

                // Check the differential between the strategyBook and the marketAidBook offers and call updateMarketAidPosition() if the differential is greater than deltaTrigger
                for (let i = 0; i < strategyBook.asks.length; i++) {
                    const strategyAsk = strategyBook.asks[i];
                    const marketAidAsk = marketAidBook.asks[i];
                    const askDelta = Math.abs(strategyAsk.price - marketAidAsk.price) / strategyAsk.price;

                    if (askDelta > deltaTrigger) {
                        console.log("Ask delta is greater than deltaTrigger, updating market aid position");
                        this.requoteMarketAidPosition();
                    }
                }

                for (let i = 0; i < strategyBook.bids.length; i++) {
                    const strategyBid = strategyBook.bids[i];
                    const marketAidBid = marketAidBook.bids[i];
                    const bidDelta = Math.abs(strategyBid.price - marketAidBid.price) / strategyBid.price;

                    if (bidDelta > deltaTrigger) {
                        console.log("Bid delta is greater than deltaTrigger, updating market aid position");
                        this.requoteMarketAidPosition();
                    }
                }
            }
            // If the asks and the bids of marketAidBook are non-empty but are not equal in length to the strategyBook then we call requoteMarketAidPosition() if the market aid has a non-zero amount of orders on the book and call placeInitialMarketMakingTrades() if the market aid has a zero amount of orders on the book
            else if (marketAidBook.asks.length !== strategyBook.asks.length || marketAidBook.bids.length !== strategyBook.bids.length) {
                this.requoteMarketAidPosition();
            }
        }
    }

    // Function that calls requote() on the market-aid
    requoteMarketAidPosition(): void {
        console.log("\nRequoting market aid position to match the strategy book");
        // TODO: implement web3 call to requote()
        console.log("target this book with batchRequote", this.strategy.targetBook);
        console.log("Need to update from this book", this.marketAidPositionTracker.liveBook);

        // Grab all of the strategist trade IDs from MarketAid position tracker
        const strategistTradeIDs: BigNumber[] = [];
        for (let i = 0; i < this.marketAidPositionTracker.onChainBookWithData.length; i++) {
            strategistTradeIDs.push(this.marketAidPositionTracker.onChainBookWithData[i].stratTradeID);
        }

        // console.log("These are the relevant ids", strategistTradeIDs);

        const assetSideBias = 1;
        const quoteSideBias = 1;
        console.log("\n APPLY THESE BIASES, asset, quote", assetSideBias, quoteSideBias);

        var askNumerators = [];
        var askDenominators = [];
        var bidNumerators = [];
        var bidDenominators = [];
        // TODO: adapt this to drive on batchRequote
        // ************************************
        // TODO: check that this works?
        for (let index = 0; index < this.strategy.targetBook.asks.length; index++) {
            const ask = this.strategy.targetBook.asks[index];
            const askNumerator = parseUnits((this.strategy.targetBook.asks[index].size * assetSideBias).toFixed(this.assetPair.asset.decimals), this.assetPair.asset.decimals);
            const askDenominator = parseUnits((this.strategy.targetBook.asks[index].price * (this.strategy.targetBook.asks[index].size * assetSideBias)).toFixed(this.assetPair.quote.decimals), this.assetPair.quote.decimals);
            const bidNumerator = parseUnits((this.strategy.targetBook.bids[index].price * (this.strategy.targetBook.bids[index].size * quoteSideBias)).toFixed(this.assetPair.quote.decimals), this.assetPair.quote.decimals);
            const bidDenominator = parseUnits((this.strategy.targetBook.bids[index].size * quoteSideBias).toFixed(this.assetPair.asset.decimals), this.assetPair.asset.decimals);

            askNumerators.push(askNumerator);
            askDenominators.push(askDenominator);
            bidNumerators.push(bidNumerator);
            bidDenominators.push(bidDenominator);

        }
        // const askNumerator = parseUnits((this.strategy.targetBook.asks[index].size * assetSideBias).toFixed(this.assetPair.asset.decimals), this.assetPair.asset.decimals);
        // const askDenominator = parseUnits((this.strategy.targetBook.asks[0].price * (this.strategy.targetBook.asks[0].size * assetSideBias)).toFixed(this.assetPair.quote.decimals), this.assetPair.quote.decimals);
        // const bidNumerator = parseUnits((this.strategy.targetBook.bids[0].price * (this.strategy.targetBook.bids[0].size * quoteSideBias)).toFixed(this.assetPair.quote.decimals), this.assetPair.quote.decimals);
        // const bidDenominator = parseUnits((this.strategy.targetBook.bids[0].size * quoteSideBias).toFixed(this.assetPair.asset.decimals), this.assetPair.asset.decimals);

        // // TODO: we need to know the relevant strategist trade ID to pass into requote()
        if (this.requotingOutstandingBook) return;
        // Note, conversely batchRequoteAllOffers could be used
        console.log(this.marketAid.connect(this.config.connections.signer).estimateGas);

        this.marketAid.connect(this.config.connections.signer).estimateGas['batchRequoteOffers(uint256[],address[2],uint256[],uint256[],uint256[],uint256[])'](
            strategistTradeIDs,
            [this.assetPair.asset.address, this.assetPair.quote.address],
            askNumerators,
            askDenominators,
            bidNumerators,
            bidDenominators,
        ).then((r) => {
            if (r) {
                if (this.requotingOutstandingBook) return;

                this.requotingOutstandingBook = true;

                this.marketAid.connect(this.config.connections.signer)['batchRequoteOffers(uint256[],address[2],uint256[],uint256[],uint256[],uint256[])'](
                    strategistTradeIDs,
                    [this.assetPair.asset.address, this.assetPair.quote.address],
                    askNumerators,
                    askDenominators,
                    bidNumerators,
                    bidDenominators,
                ).then(async (r) => {
                    const out = await r.wait();
                    this.requotingOutstandingBook = false;

                    if (out.status == true) {
                        console.log("\nREQUOTE SUCCESSFUL!!!! 🎉");
                        // TODO??? Chase the transaction and update what info on this we can
                    }

                }).catch((e) => {
                    console.log("This error IN SHIPPING REQUOTE", e);
                    this.requotingOutstandingBook = false;
                    // updateNonceManagerTip(this.config.signer as NonceManager, this.config.connections.reader);
                })
            }
        }).catch((e) => {
            console.log("This error estimating REQUOTE gas", e.reason);
            // Should this one be here?
            // this.requotingOutstandingBook = false;
            // updateNonceManagerTip(this.config.signer as NonceManager, this.config.reader);
        })


    }


    // Function that calls placeMarketMakingTrades() on the market-aid
    placeInitialMarketMakingTrades(): void {
        console.log("\nInitializing a market aid position to match the strategy book");
        // Target this book
        console.log("target this book with place market making trades", this.strategy.targetBook);

        // Loop through target book, and using the pattern below populate an array of values for askNumerators, askDenominators, bidNumerators, and bidDenominators
        var askNumerators = [];
        var askDenominators = [];
        var bidNumerators = [];
        var bidDenominators = [];

        // Loop through the asks and bids of the target book and populate the above arrays using the pattern below
        for (let i = 0; i < this.strategy.targetBook.asks.length; i++) {
            askNumerators.push(parseUnits(this.strategy.targetBook.asks[i].size.toString(), this.assetPair.asset.decimals));
            askDenominators.push(parseUnits((this.strategy.targetBook.asks[i].price * this.strategy.targetBook.asks[i].size).toFixed(this.assetPair.quote.decimals), this.assetPair.quote.decimals));
        }

        for (let i = 0; i < this.strategy.targetBook.bids.length; i++) {
            bidNumerators.push(parseUnits((this.strategy.targetBook.bids[i].price * this.strategy.targetBook.bids[i].size).toFixed(this.assetPair.quote.decimals), this.assetPair.quote.decimals));
            bidDenominators.push(parseUnits(this.strategy.targetBook.bids[i].size.toString(), this.assetPair.asset.decimals));
        }

        // Here is what a single offer might look like via placeMarketMakingTrades()
        // Note this assumes that strategy.targetBook size all references asset amounts
        // const askNumerator = parseUnits(this.strategy.targetBook.asks[0].size.toString(), this.assetPair.asset.decimals);
        // const askDenominator = parseUnits((this.strategy.targetBook.asks[0].price * this.strategy.targetBook.asks[0].size).toFixed(this.assetPair.quote.decimals), this.assetPair.quote.decimals);
        // const bidNumerator = parseUnits((this.strategy.targetBook.bids[0].price * this.strategy.targetBook.bids[0].size).toFixed(this.assetPair.quote.decimals), this.assetPair.quote.decimals);
        // const bidDenominator = parseUnits(this.strategy.targetBook.bids[0].size.toString(), this.assetPair.asset.decimals);


        if (this.makingInitialBook) {
            console.log("Already making initial book, not making another - 0");
            return
        };
        // console.log(this.marketAid.connect(this.config.connections.signer).estimateGas);

        this.marketAid.connect(this.config.connections.signer).estimateGas['batchMarketMakingTrades(address[2],uint256[],uint256[],uint256[],uint256[])'](
            [this.assetPair.asset.address, this.assetPair.quote.address],
            askNumerators,
            askDenominators,
            bidNumerators,
            bidDenominators
        ).then(async (r) => {

            if (r) {
                if (this.makingInitialBook) {
                    console.log("Already making initial book, not making another - 1");
                    return
                };

                console.log("\nRipping these params",
                    askNumerators.toString(),
                    askDenominators.toString(),
                    bidDenominators.toString(),
                    bidNumerators.toString());

                this.makingInitialBook = true;
                this.marketAid.connect(this.config.connections.signer)['batchMarketMakingTrades(address[2],uint256[],uint256[],uint256[],uint256[])'](
                    [this.assetPair.asset.address, this.assetPair.quote.address],
                    askNumerators,
                    askDenominators,
                    bidNumerators,
                    bidDenominators,
                    { gasLimit: r.add(BigNumber.from(100000)) }
                ).then(async (r: TransactionResponse) => {

                    // console.log("reposns", r);

                    const out = await r.wait();
                    this.makingInitialBook = false;
                    if (out.status == true) {
                        // PlaceMarketMakingTrades and TODO listen to status all the way through to update what you can on the object...
                        console.log("Market-Making Trades Successful!");

                    }
                }).catch((e) => {
                    console.log("🥺 Error shipping place market-making trades!!!", e);
                    this.makingInitialBook = false;
                    // updateNonceManagerTip(this.config.signer as NonceManager, this.config.reader);
                });
            }

        }).catch((e) => {
            console.log("Couldn't estimate gas on place market-marking trades", e);
            // Should this one be included??
            this.makingInitialBook = false;
            // updateNonceManagerTip(this.config.connections.signer as NonceManager, this.config.reader);
        });
    }



    pullOnChainLiquidity(): Promise<MarketAidAvailableLiquidity> {
        console.log("\nQuery Strategist Total Liquidity ",
            this.config.targetTokens[0].address,
            this.config.targetTokens[1].address,
            this.EOAbotAddress,
            this.marketAid.address
        );

        try {
            return this.marketAid.getStrategistTotalLiquidity(
                this.config.targetTokens[0].address,
                this.config.targetTokens[1].address,
                this.EOAbotAddress
            ).then((r: MarketAidAvailableLiquidity) => {
                // console.log("Got this after getStratTotalLiquidity", r);

                // TODO: IF THERE's a pool split then implement it???????????/
                // console.log("this config", this.config);

                this.availableLiquidity = r;
                return r;
            });
        } catch (error) {
            console.log("\nError in pullOnChainLiquidity", error);
        }
    }

    // *** For use in RiskMinimized Strategy ***
    tailOffModule(): void {
        console.log("Tail off module called");

        console.log("Listening to takes on my orders from this market aid contract", this.marketAid.address);

        const maker = this.marketAid.address;
        this.marketContract.on(this.marketContract.filters.emitTake(null, null, maker), (id, pair, maker, pay_gem, buy_gem, taker, take_amt, give_amt, timestamp, event) => {
            // console.log("\n 🎉 GOT THIS INFO FROM THE LOGTAKE FILTER", id, pair, maker, pay_gem, buy_gem, taker, take_amt, give_amt, timestamp, event);


            console.log("\n 🎉 GOT A RELEVANT LOGTAKE!");
            // TODO: determine exactly what to dump


            if (pay_gem == getAddress(this.assetPair.quote.address) /* && !this.timeoutOnTheField*/) {
                console.log("I AS MAKER JUST BOUGHT SOME ASSET, dump asset on CEX");
                const val = formatUnits(give_amt, this.assetPair.asset.decimals);
                console.log("QUOTE AMOUNT:", formatUnits(take_amt, this.assetPair.quote.decimals));
                console.log("ASSET AMOUNT:", val);

                // writeLogToCsv([val, "🔥🔥🔥 DUMP ON COINBASE", parseFloat(val).toPrecision(3), this.config.asset.symbol, "🔥🔥🔥\n"], getTimestamp(), "FILL_SPOTTED", this.config.asset.address, this.config.quote.address, this.config.strategy)
                console.log("🔥🔥🔥 DUMP ON target", parseFloat(val).toPrecision(3), this.assetPair.asset.symbol, "🔥🔥🔥\n");

                this.dumpFillViaMarketAid(this.assetPair.asset.address, give_amt, this.assetPair.quote.address);
            } else if (pay_gem == getAddress(this.assetPair.asset.address) /* && !this.timeoutOnTheField*/) {
                console.log("I AS MAKER JUST BOUGHT SOME QUOTE, dump quote on CEX");
                const val = formatUnits(give_amt, this.assetPair.quote.decimals); // TODO: potential precision loss ? idk probs unlikely
                console.log("QUOTE AMOUNT:", val);
                console.log("ASSET AMOUNT:", formatUnits(take_amt, this.assetPair.asset.decimals));

                // writeLogToCsv([val, "🔥🔥🔥 DUMP ON COINBASE", parseFloat(val).toPrecision(3), this.config.quote.symbol, "🔥🔥🔥\n"], getTimestamp(), "FILL_SPOTTED", this.config.asset.address, this.config.quote.address, this.config.strategy)

                // different than above... avoids any price math?
                const valueUsedInTail = (formatUnits(take_amt, this.assetPair.asset.decimals));
                console.log("🔥🔥🔥 DUMP ON target this QUOTE amount", val, "or dump this if NEED asset amount:", valueUsedInTail, this.assetPair.asset.symbol, "🔥🔥🔥\n");

                // Note: BUY THE ASSET AMOUNT ON CEX
                // dumpERC20onFTX(true, parseFloat(valueUsedInTail), this.config.quote.symbol);

                // Call the function at the specified line numbers
                this.dumpFillViaMarketAid(this.assetPair.quote.address, give_amt, this.assetPair.asset.address);
            }
        });
    }

    // *** For use in RiskMinimized Strategy ***
    async dumpFillViaMarketAid(
        assetToSell: string,
        amountToSell: BigNumber,
        assetToTarget: string,
    ): Promise<boolean | void> {
        const poolFee: number = this.strategy.getReferenceLiquidityVenue().uniFee;

        try {
            const amountOut: BigNumber = await this.marketAid.strategistRebalanceFunds(
                assetToSell,
                amountToSell,
                assetToTarget,
                poolFee,
            );
        } catch (error) {
            console.error("Error while executing dumpFillViaMarketAid:", error);
            return false;
        }

        return true;
    }


}

export function getLadderFromAvailableLiquidity(availableLiquidity: MarketAidAvailableLiquidity, stepSize: number): { assetLadder: BigNumber[], quoteLadder: BigNumber[] } {
    // console.log("I think this is my available liquidity", availableLiquidity);

    // Chat GPT helped me with this lol
    // TODO: update this from linear to exponential
    const s = stepSize * (stepSize + 1) / 2;
    const assetStep = availableLiquidity.assetWeiAmount.div(s);
    const quoteStep = availableLiquidity.quoteWeiAmount.div(s);

    const assetLadder = [];
    const quoteLadder = [];

    let totalProvidedAssetLiquidity = BigNumber.from(0);
    let totalProvidedQuoteLiquidity = BigNumber.from(0);

    for (let i = 1; i <= stepSize; i++) {
        const assetAmount = assetStep.mul(i);
        const quoteAmount = quoteStep.mul(i);

        // Check if providing this amount of liquidity will exceed availableLiquidity
        if (totalProvidedAssetLiquidity.add(assetAmount).gt(availableLiquidity.assetWeiAmount) || totalProvidedQuoteLiquidity.add(quoteAmount).gt(availableLiquidity.quoteWeiAmount)) {
            break;
        }

        assetLadder.push(assetAmount);
        quoteLadder.push(quoteAmount);

        totalProvidedAssetLiquidity = totalProvidedAssetLiquidity.add(assetAmount);
        totalProvidedQuoteLiquidity = totalProvidedQuoteLiquidity.add(quoteAmount);
    }

    // Print out the ladder in human readable format using formatUnits
    // console.log("Asset Ladder", assetLadder.map((a) => formatUnits(a, 18)));
    // console.log("Quote Ladder", quoteLadder.map((a) => formatUnits(a, 18)));

    return {
        assetLadder: assetLadder,
        quoteLadder: quoteLadder
    };
}