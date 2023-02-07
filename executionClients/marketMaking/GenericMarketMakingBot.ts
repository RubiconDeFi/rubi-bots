// Execution client object that listens to the price feed coming from a Strategy object and executes orders on a Liquidity Venue object
// Has a function called inventoryMangagement that listens to this.relativeAssetBalance and this.relativeQuoteBalance to determine biases for market-making behavior
// Has a function called execute that listens to the strategy's targetBook and executes orders on the liquidity venue once the strategy's targetBook is different 
// enough based on a configurable threshold from the liquidity venue's liveBook

import { ethers } from "ethers";
import { BotConfiguration } from "../../configuration/config";
import { GenericMarketMakingStrategy } from "../../strategies/marketMaking/genericMarketMaking";
import { GenericLiquidityVenue } from "../../liquidityVenues/generic";

// Takes a configuration, market aid instance, and strategy in the constructor
export class GenericMarketMakingBot {
    config: BotConfiguration;
    marketAid: ethers.Contract;
    strategy: GenericMarketMakingStrategy;
    liquidityVenue: GenericLiquidityVenue; // TODO: MAKE RUBICON MARKET-AID BOOSTED LIQUIDITY VENUE FUNCTIONS
    relativeAssetBalance: number;
    relativeQuoteBalance: number;
    inventoryManagement: () => void;
    execute: () => void;
    constructor(config: BotConfiguration, marketAid: ethers.Contract, strategy: GenericMarketMakingStrategy, liquidityVenue?: GenericLiquidityVenue) {
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
        this.strategy.updateNotifier.on('update', (liveBook) => {
            console.log('\nStrategy Feed updated');
            console.log(liveBook);
        });

        // TODO: NEED TO PULL RUBICON BOOKS IN PARALLEL THROUGH THE MARKET-AID SPECIFIC ADAPTER THAT RETURNS OUR ORDERS

    }


}
// TODO: DRIVE on-chan EXECUTIONS through liquidity venue Rubicon functions for composability
