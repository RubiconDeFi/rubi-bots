import { BigNumber, ethers } from "ethers";
import { GenericMarketMakingBot, MarketAidAvailableLiquidity, applyInventoryManagement } from "./GenericMarketMakingBot";
import { BotConfiguration } from "../../configuration/config";
import { RiskMinimizedStrategy } from "../../strategies/marketMaking/riskMinimizedUpOnly";
import { TargetVenueOutBidStrategy } from "../../strategies/marketMaking/targetVenueOutBid";
import { formatUnits, parseUnits } from "ethers/lib/utils";
import { EventEmitter } from "stream";
import { Call } from "./BatchStrategyExecutor";
import { MarketAidPositionTracker } from "../../liquidityVenues/rubicon/MarketAidPositionTracker";
import { UniswapLiquidityVenue } from "../../liquidityVenues/uniswap";

class BatchableGenericMarketMakingBot extends GenericMarketMakingBot {
    eventEmitter: EventEmitter;
    differentiatorAddress: string;
    liquidityAllocation: { asset: number, quote: number };

    constructor(config: BotConfiguration, marketAid: ethers.Contract, strategy: RiskMinimizedStrategy | TargetVenueOutBidStrategy, _botAddy: string, uid: number, liquidityAllocation: { asset: number, quote: number }) { // Replace 'any' with the appropriate type for the options parameter
        console.log("BatchableGenericMarketMakingBot spinning up...");
        console.log("this strategy", strategy.identifier);

        super(config, marketAid, strategy, _botAddy);

        this.eventEmitter = new EventEmitter();

        // Set differentiatorAddress based on environment variables
        const assetSymbol = this.config.targetTokens ? this.config.targetTokens[0].symbol : 'UNKNOWN';
        const quoteSymbol = this.config.targetTokens ? this.config.targetTokens[1].symbol : 'UNKNOWN';
        const envVarName = `BatchBotPair_${uid}_${assetSymbol}_${quoteSymbol}_REPADDRESS`;
        const myAddy = process.env[envVarName];

        if (myAddy === undefined) {
            throw new Error(`No representational address found for environment variable: ${envVarName}`);
        }

        this.differentiatorAddress = myAddy;
        // This should allow everything to work correctly in GenericMarketMakingBot
        console.log("this.differentiatorAddress", this.differentiatorAddress);

        this.EOAbotAddress = myAddy;

        // Overwrite
        const _marketAidPositionTracker = new MarketAidPositionTracker(this.assetPair, this.marketAid, this.differentiatorAddress, this.config);
        this.marketAidPositionTracker = _marketAidPositionTracker;

        console.log("This is the address of the ACCOUNT REFERENCE im watching...", this.marketAidPositionTracker.myReferenceOperator);
        console.log("This is the Market Aid address:", this.marketAid.address);

        // Validate liquidity allocation values
        if (liquidityAllocation.asset < 0 || liquidityAllocation.asset > 1000 || liquidityAllocation.quote < 0 || liquidityAllocation.quote > 1000) {
            throw new Error(`Invalid liquidity allocation: asset and quote values must be in the range 0 <= x <= 1000`);
        }

        // TODO: ITERATE LIQUIDITY TO ACCOUNT FOR high-level allocation AND track the relevant ids to this.differentiatorAddress    
        this.liquidityAllocation = liquidityAllocation;

        console.log("This liquidity allocation!", this.liquidityAllocation);

    }

    // Override placeInitialMarketMakingTrades
    // Override placeInitialMarketMakingTrades
    override async placeInitialMarketMakingTrades(): Promise<void> {
        console.log("\nInitializing a market aid position to match the strategy book");

        var askNumerators = [];
        var askDenominators = [];
        var bidNumerators = [];
        var bidDenominators = [];

        // Loop through the asks and bids of the target book and populate the above arrays
        for (let i = 0; i < this.strategy.targetBook.asks.length; i++) {
            const ask = this.strategy.targetBook.asks[i];
            const bid = this.strategy.targetBook.bids[i];

            // Skip this iteration if both bid and ask sizes are zero
            if (ask.size === 0 && bid.size === 0) {
                console.log("Skipping this iteration because both bid and ask sizes are zero");
                continue;
            }

            askNumerators.push(parseUnits(ask.size.toFixed(this.assetPair.asset.decimals), this.assetPair.asset.decimals));
            askDenominators.push(parseUnits((ask.price * ask.size).toFixed(this.assetPair.quote.decimals), this.assetPair.quote.decimals));

            bidNumerators.push(parseUnits((bid.price * bid.size).toFixed(this.assetPair.quote.decimals), this.assetPair.quote.decimals));
            bidDenominators.push(parseUnits(bid.size.toFixed(this.assetPair.asset.decimals), this.assetPair.asset.decimals));
        }

        if (this.makingInitialBook) {
            console.log("Already making initial book, not making another - 0");
            return;
        }

        // Encode the function data for batchPlaceInitialMarketMakingTrades
        const calldata = this.marketAid.interface.encodeFunctionData("batchMarketMakingTrades(address[2],uint256[],uint256[],uint256[],uint256[],address)", [
            [this.assetPair.asset.address, this.assetPair.quote.address],
            askNumerators,
            askDenominators,
            bidNumerators,
            bidDenominators,
            this.differentiatorAddress
        ]);

        // Emit the event with the encoded function data for further processing
        this.eventEmitter.emit('placeInitialMarketMakingTrades', calldata as unknown as Call);
    }


    // Add any new methods or properties specific to the BatchableGenericMarketMakingBot class
    // Function that calls requote() on the market-aid
    override async requoteMarketAidPosition(): Promise<void> {
        console.log("\nRequoting market aid position to match the strategy book");
        // TODO: implement web3 call to requote()
        // console.log(this.strategy.identifier, "target this book with batchRequote", this.strategy.targetBook);
        // console.log("Need to update from this book", this.marketAidPositionTracker.liveBook);

        var _targetBook = this.strategy.targetBook;

        // console.log("PRE REQUOTE this is available liquidity", `${this.assetPair.asset.symbol}`, formatUnits(this.availableLiquidity.assetWeiAmount, this.assetPair.asset.decimals), `${this.assetPair.quote.symbol}`, formatUnits(this.availableLiquidity.quoteWeiAmount, this.assetPair.quote.decimals));

        // console.log("PRE REQUOTE is the target book", _targetBook);
        // const totalAskSize = _targetBook.asks.reduce((acc, ask) => acc + ask.size, 0);
        // // // Convert totalBidSize from asset amount to quote amount
        // const totalBidSize = _targetBook.bids.reduce((acc, bid) => acc + (bid.size * bid.price), 0);
        // // Print amount formatted
        // console.log("PRE REQUOTE total ask size", totalAskSize);
        // console.log("PRE REQUOTE total bid size", totalBidSize);



        // Grab all of the strategist trade IDs from MarketAid position tracker
        const strategistTradeIDs: BigNumber[] = [];
        for (let i = 0; i < this.marketAidPositionTracker.onChainBookWithData.length; i++) {
            strategistTradeIDs.push(this.marketAidPositionTracker.onChainBookWithData[i].stratTradeID);
        }

        // console.log(this.strategy.identifier, "These are the relevant ids", strategistTradeIDs);
        // Print the map formatted
        console.log("these ids formatted", strategistTradeIDs.map((id) => id.toString()));

        // TODO: only on targetVenueOutBid???
        let assetSideBias = 1;
        let quoteSideBias = 1;

        if (this.strategy instanceof TargetVenueOutBidStrategy) {
            const { assetSideBias: calculatedAssetSideBias, quoteSideBias: calculatedQuoteSideBias } = applyInventoryManagement(this.relativeAssetBalance, this.relativeQuoteBalance);
            assetSideBias = calculatedAssetSideBias;
            quoteSideBias = calculatedQuoteSideBias;
        }        // const assetSideBias = 1;
        // const quoteSideBias = 1;
        console.log("\n APPLY THESE BIASES, asset, quote", assetSideBias, quoteSideBias);

        var askNumerators = [];
        var askDenominators = [];
        var bidNumerators = [];
        var bidDenominators = [];
        // TODO: adapt this to drive on batchRequote
        // ************************************
        // TODO: check that this works?
        for (let index = 0; index < _targetBook.asks.length; index++) {
            const ask = _targetBook.asks[index];
            const bid = _targetBook.bids[index];

            // Skip this iteration if both bid and ask sizes are zero
            if (ask.size === 0 && bid.size === 0) {
                console.log("Skipping this iteration because both bid and ask sizes are zero");
                continue;
            }
            const askNumerator = parseUnits((_targetBook.asks[index].size * assetSideBias).toFixed(this.assetPair.asset.decimals), this.assetPair.asset.decimals);
            const askDenominator = parseUnits((_targetBook.asks[index].price * (_targetBook.asks[index].size * assetSideBias)).toFixed(this.assetPair.quote.decimals), this.assetPair.quote.decimals);
            const bidNumerator = parseUnits((_targetBook.bids[index].price * (_targetBook.bids[index].size * quoteSideBias)).toFixed(this.assetPair.quote.decimals), this.assetPair.quote.decimals);
            const bidDenominator = parseUnits((_targetBook.bids[index].size * quoteSideBias).toFixed(this.assetPair.asset.decimals), this.assetPair.asset.decimals);

            askNumerators.push(askNumerator);
            askDenominators.push(askDenominator);
            bidNumerators.push(bidNumerator);
            bidDenominators.push(bidDenominator);
        }


        // New code to print out the price of each trade
        for (let i = 0; i < askNumerators.length; i++) {
            const askPrice = parseFloat(formatUnits(askDenominators[i], this.assetPair.quote.decimals)) / parseFloat(formatUnits(askNumerators[i], this.assetPair.asset.decimals));
            const bidPrice = parseFloat(formatUnits(bidNumerators[i], this.assetPair.quote.decimals)) / parseFloat(formatUnits(bidDenominators[i], this.assetPair.asset.decimals));

            console.log(`Ask price for trade ${i + 1}: ${askPrice}, ${this.assetPair.asset.symbol}-${this.assetPair.quote.symbol}`);
            console.log(`Bid price for trade ${i + 1}: ${bidPrice}, ${this.assetPair.asset.symbol}-${this.assetPair.quote.symbol}`);
        }
        // console.log("askNumerators", askNumerators);
        // console.log("askDenominators", askDenominators);

        console.log("Lengths of the arrays", strategistTradeIDs.length, askNumerators.length, askDenominators.length, bidNumerators.length, bidDenominators.length);

        // Check the lengths of all of them, if they don't match then wipeOnChainBook and return
        if (strategistTradeIDs.length !== askNumerators.length || askNumerators.length !== askDenominators.length || askDenominators.length !== bidNumerators.length || bidNumerators.length !== bidDenominators.length) {
            console.log("Lengths of the arrays don't match, wiping on chain book and returning");
            await this.wipeOnChainBook();
            return;
        }

        if (this.requotingOutstandingBook) return;

        this.requotingOutstandingBook = true;


        // Encode the function data for batchRequoteOffers
        const calldata = this.marketAid.interface.encodeFunctionData("batchRequoteOffers(uint256[],address[2],uint256[],uint256[],uint256[],uint256[],address)", [
            strategistTradeIDs,
            [this.assetPair.asset.address, this.assetPair.quote.address],
            askNumerators,
            askDenominators,
            bidNumerators,
            bidDenominators,
            this.differentiatorAddress
        ]);

        // Emit the event with the encoded function data for further processing
        this.eventEmitter.emit('requoteMarketAidPosition', calldata as unknown as Call);

        // console.log("Emitted requoteMarketAidPosition, now waiting for 2 seconds to avoid spam...");

        // // Hold execution here and set a timeout to avoid spamming before moving forward
        // await new Promise(r => setTimeout(r, 2000)); // Should be block time

        // naive spam mode
        this.requotingOutstandingBook = false;
    }

    override async wipeOnChainBook(): Promise<boolean | void> {
        // Wipe this.marketAidPositionTracker.onChainBookWithData !!!
        // TODO: Logic Gate to avoid spam
        // This can be called in normal operations or if ever needed on GLOBAL TIMEOUT for rebalancing
        console.log("WIPE THE ON-CHAIN BOOK!!!");

        if (this.marketAidPositionTracker.onChainBook.length == 0) {
            console.log("RETURN BC NO OC BOOK", this.marketAidPositionTracker.onChainBook);
            return;
        }
        if (this.wipingOutstandingBook) return;

        console.log("Wiping on-chain book...", this.marketAidPositionTracker.onChainBook.map((trade) => trade.toString()));


        // Encode the function data for scrubStrategistTrades
        const calldata = this.marketAid.interface.encodeFunctionData("scrubStrategistTrades", [
            this.marketAidPositionTracker.onChainBook
        ]);

        // Emit the event with the encoded function data for further processing
        this.eventEmitter.emit('wipeOnChainBook', calldata as unknown as Call);

        console.log("Emitted wipeOnChainBook event...");
    }


    override pullOnChainLiquidity(strategist: string): Promise<MarketAidAvailableLiquidity> {
        console.log("\nQuery Strategist Total Liquidity Batchable ",
            this.config.targetTokens[0].address,
            this.config.targetTokens[1].address,
            strategist,
            this.marketAid.address
        );

        try {
            // Note: This is a little hacky when running many strategies in parallel as it gets the strategists book value + whatever is on the market aid, so there is redundant counting of the Market Aid liquidity that is sitting there...
            // A loose proxy for how to share between paralell strategies
            return this.marketAid.getStrategistTotalLiquidity(
                this.config.targetTokens[0].address,
                this.config.targetTokens[1].address,
                strategist
            ).then((r: MarketAidAvailableLiquidity) => {
                // console.log(this.strategy.identifier, "Got this after getStratTotalLiquidity", r);

                // Log formatted the response
                console.log(`Formatted Liquidity - ${this.config.targetTokens[0].symbol} Asset Amount:`, formatUnits(r.assetWeiAmount, this.config.targetTokens[0].decimals));
                console.log(`Formatted Liquidity - ${this.config.targetTokens[1].symbol} Quote Amount:`, formatUnits(r.quoteWeiAmount, this.config.targetTokens[1].decimals));

                // Adjust asset and quote wei amounts with liquidity allocation

                console.log(" This percentage of asset liquidity is allocated to this strategy:", this.liquidityAllocation.asset / 1000);
                console.log(" This percentage of quote liquidity is allocated to this strategy:", this.liquidityAllocation.quote / 1000);

                const adjustedAssetWeiAmount = BigNumber.from(r.assetWeiAmount).mul(this.liquidityAllocation.asset).div(1000);
                const adjustedQuoteWeiAmount = BigNumber.from(r.quoteWeiAmount).mul(this.liquidityAllocation.quote).div(1000);

                // Create a new object with the adjusted properties
                const newR: MarketAidAvailableLiquidity = {
                    assetWeiAmount: adjustedAssetWeiAmount,
                    quoteWeiAmount: adjustedQuoteWeiAmount,
                    status: r.status
                };

                this.availableLiquidity = newR;

                // Relative balance tracking driven off these query results and localbook
                const humanReadableQuoteAmount = parseFloat(formatUnits(this.availableLiquidity.quoteWeiAmount, this.assetPair.quote.decimals));
                const humanReadableAssetAmount = parseFloat(formatUnits(this.availableLiquidity.assetWeiAmount, this.assetPair.asset.decimals));

                if (this.strategy.targetBook !== undefined &&
                    this.strategy.targetBook.asks !== undefined &&
                    this.strategy.targetBook.bids !== undefined &&
                    this.strategy.targetBook.asks.length > 0 &&
                    this.strategy.targetBook.bids.length > 0) {

                    // const humanReadableQuoteAmount = parseFloat(formatUnits(this.availableLiquidity.quoteWeiAmount, this.assetPair.quote.decimals));
                    // const humanReadableAssetAmount = parseFloat(formatUnits(this.availableLiquidity.assetWeiAmount, this.assetPair.asset.decimals));

                    // Calculate the reference price (midpoint)
                    const referencePrice = (this.strategy.targetBook.asks[0].price + this.strategy.targetBook.bids[0].price) / 2;

                    const totalOnChainUSDAmount = humanReadableQuoteAmount + humanReadableAssetAmount * referencePrice;
                    console.log("\n 💰 THIS TOTAL ONCHAIN USD VALUE", totalOnChainUSDAmount, this.assetPair.asset.symbol, "-", this.assetPair.quote.symbol, " 💰");

                    const relativeBalanceAsset = (humanReadableAssetAmount * referencePrice) / totalOnChainUSDAmount;
                    const relativeBalanceQuote = humanReadableQuoteAmount / totalOnChainUSDAmount;
                    console.log("This relative Asset balance", relativeBalanceAsset);
                    console.log("This relative Quote balance", relativeBalanceQuote);

                    // Assign these values to be used in order sizing
                    this.relativeAssetBalance = relativeBalanceAsset;
                    this.relativeQuoteBalance = relativeBalanceQuote;
                } else {
                    console.log("\nNO LOCAL BOOK RETURN or ASKS/BIDS UNDEFINED");
                    this.relativeAssetBalance = undefined;
                    this.relativeQuoteBalance = undefined;
                }

                return newR;
            });
        } catch (error) {
            console.log("\nError in pullOnChainLiquidity", error);
        }
    }

    // Overridden function for use in BatchStrategyExecutor
    override async dumpFillViaMarketAid(
        assetToSell: string,
        amountToSell: BigNumber,
        assetToTarget: string,
    ): Promise<void> {
        const poolFee: number = (this.strategy.getReferenceLiquidityVenue() as UniswapLiquidityVenue).uniFee;

        console.log("Preparing calldata to dump fill via market aid...", assetToSell, amountToSell.toString(), assetToTarget, poolFee);

        try {
            // Prepare the calldata for the strategistRebalanceFunds function
            const calldata = this.marketAid.interface.encodeFunctionData("strategistRebalanceFunds", [
                assetToSell,
                amountToSell,
                assetToTarget,
                poolFee,
            ]);

            // Emit the event with the prepared calldata
            this.eventEmitter.emit("dumpFillViaMarketAid", calldata as unknown as Call);
        } catch (error) {
            console.error("Error while preparing calldata for dumpFillViaMarketAid:", error.reason);
        }
    }

}

export default BatchableGenericMarketMakingBot;
