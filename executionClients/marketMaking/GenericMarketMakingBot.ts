// Execution client object that listens to the price feed coming from a Strategy object and executes orders on a Liquidity Venue object
// Has a function called inventoryMangagement that listens to this.relativeAssetBalance and this.relativeQuoteBalance to determine biases for market-making behavior
// Has a function called execute that listens to the strategy's targetBook and executes orders on the liquidity venue once the strategy's targetBook is different 
// enough based on a configurable threshold from the liquidity venue's liveBook

import { BigNumber, ethers } from "ethers";
import { BotConfiguration } from "../../configuration/config";
import { GenericMarketMakingStrategy } from "../../strategies/marketMaking/genericMarketMaking";
import { GenericLiquidityVenue } from "../../liquidityVenues/generic";
import { TargetVenueOutBidStrategy } from "../../strategies/marketMaking/targetVenueOutBid";
import { RiskMinimizedStrategy } from "../../strategies/marketMaking/riskMinimizedUpOnly";
import { UniswapLiquidityVenue } from "../../liquidityVenues/uniswap";


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

    constructor(config: BotConfiguration, marketAid: ethers.Contract, strategy: RiskMinimizedStrategy | TargetVenueOutBidStrategy, _botAddy: string, liquidityVenue?: GenericLiquidityVenue) {
        this.config = config;
        this.marketAid = marketAid;
        this.strategy = strategy;
        this.liquidityVenue = liquidityVenue;
        this.relativeAssetBalance = 0;
        this.relativeQuoteBalance = 0;
        this.availableLiquidity = <MarketAidAvailableLiquidity>{};
        this.EOAbotAddress = _botAddy;
    }


    // Function that updates the on-chain book on the liquidity venue based on the strategy's targetBook
    // updateOnChainBook() {


    // Start function that kicks off the logical polling sequence that represents the bot's execution
    async launchBot() {
        // See if we can listen to the underlying strategy's recomended price
        console.log('Launching bot');

        // console.log("This is my market aid contract", this.marketAid);


        // 1. Get the strategist's available liquidity over time

        await this.pullOnChainLiquidity();
        // UPDATER - Poll the strategist's total liquidity every second and populate the availableLiquidity object
        setTimeout(() => {
            this.pullOnChainLiquidity();
        }, 1000) // TODO: move to config

        // TODO: Kickoff a listener that polls the market-aid for the current state of the market
        // NEED OUR BOOK SPECIFIC LIQUIDITY VENUE TODO - BUILD ABSTRACT MARKET AID BOOK LIQIUDUITY VENUE FOR MARKET AID MM STRATS

        // TODO: Generate ladder on both sides of the book based on 
        // e.g. OP_LIVE_GLOBAL_QUERY_LADDER = 50-300-700-3000-6000

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
            console.log('\nStrategy Feed updated');
            console.log(liveBook);
        });

        // TODO: NEED TO PULL RUBICON BOOKS IN PARALLEL THROUGH THE MARKET-AID SPECIFIC ADAPTER THAT RETURNS OUR ORDERS

    }

    pullOnChainLiquidity(): Promise<MarketAidAvailableLiquidity> {
        console.log("\nQuery Strategist Total Liquidity ",
            this.config.targetTokens[0].address,
            this.config.targetTokens[1].address,
            this.EOAbotAddress
        );

        return this.marketAid.getStrategistTotalLiquidity(
            this.config.targetTokens[0].address,
            this.config.targetTokens[1].address,
            this.EOAbotAddress
        ).then((r: MarketAidAvailableLiquidity) => {
            console.log("Got this after getStratTotalLiquidity", r);

            // TODO: IF THERE's a pool split then implement it???????????/
            // console.log("this config", this.config);

            this.availableLiquidity = r;
            return r;
        });


    }

}
// TODO: DRIVE on-chan EXECUTIONS through liquidity venue Rubicon functions for composability

export function getLadderFromAvailableLiquidity(availableLiquidity: MarketAidAvailableLiquidity, stepSize: number): { assetLadder: BigNumber[], quoteLadder: BigNumber[] } {
    var assetLadder = [];
    var quoteLadder = [];

    var assetStep = availableLiquidity.assetWeiAmount.div(BigNumber.from(stepSize));
    var quoteStep = availableLiquidity.quoteWeiAmount.div(BigNumber.from(stepSize));

    for (var i = 0; i < stepSize; i++) {
        assetLadder.push(assetStep.mul(BigNumber.from(i + 1)));
        quoteLadder.push(quoteStep.mul(BigNumber.from(i + 1)));
    }

    return {
        assetLadder: assetLadder,
        quoteLadder: quoteLadder
    };
}