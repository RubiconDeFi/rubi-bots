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

// Takes a configuration, market aid instance, and strategy in the constructor
export class GenericMarketMakingBot {
    config: BotConfiguration;
    marketAid: ethers.Contract;
    strategy: RiskMinimizedStrategy | TargetVenueOutBidStrategy;
    liquidityVenue: GenericLiquidityVenue; // TODO: MAKE RUBICON MARKET-AID BOOSTED LIQUIDITY VENUE FUNCTIONS
    relativeAssetBalance: number;
    relativeQuoteBalance: number;
    inventoryManagement: () => void;

    constructor(config: BotConfiguration, marketAid: ethers.Contract, strategy: RiskMinimizedStrategy | TargetVenueOutBidStrategy, liquidityVenue?: GenericLiquidityVenue) {
        this.config = config;
        this.marketAid = marketAid;
        this.strategy = strategy;
        this.liquidityVenue = liquidityVenue;
        this.relativeAssetBalance = 0;
        this.relativeQuoteBalance = 0;
    }


    // Function that updates the on-chain book on the liquidity venue based on the strategy's targetBook
    // updateOnChainBook() {


    // Start function that kicks off the logical polling sequence that represents the bot's execution
    launchBot() {
        // See if we can listen to the underlying strategy's recomended price
        console.log('Launching bot');

        // TODO: Kickoff a listener that polls the market-aid for the current state of the market
        // NEED OUR BOOK SPECIFIC LIQUIDITY VENUE TODO - BUILD ABSTRACT MARKET AID BOOK LIQIUDUITY VENUE FOR MARKET AID MM STRATS

        // TODO: Generate ladder on both sides of the book based on 
        // e.g. OP_LIVE_GLOBAL_QUERY_LADDER = 50-300-700-3000-6000
        // and this.availableLiquidity to get information on the current state of the market via pollLiveBook
        var assetLadder = [BigNumber.from('1000000000000000000')];
        var quoteLadder = [BigNumber.from('1000000')];

        (this.strategy.referenceLiquidityVenue as UniswapLiquidityVenue).pollLiveBook(
            quoteLadder,
            assetLadder,
            2000
        );
        this.strategy.updateNotifier.on('update', (liveBook) => {
            console.log('\nStrategy Feed updated');
            console.log(liveBook);
        });

        // TODO: NEED TO PULL RUBICON BOOKS IN PARALLEL THROUGH THE MARKET-AID SPECIFIC ADAPTER THAT RETURNS OUR ORDERS

    }


}
// TODO: DRIVE on-chan EXECUTIONS through liquidity venue Rubicon functions for composability
