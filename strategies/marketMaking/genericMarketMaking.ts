// Export a GenericMarketMakingStrategy class that has a property called targetBook that is a Simple Book / the strategy's most real-time target on-chain book they would like to have
// The class has a property called referenceLiquidityVenue that is a Liquidity Venue it uses to decide on where to quote targetBook 
// The class has a property called targetLiquidityVenue that is a Liquidity Venue it uses to quote targetBook 
// The class has a method that updates targetBook based on the latest information from referenceLiquidityVenue and targetLiquidityVenue 
// The class has a method that returns targetBook 
// The class has a method that returns referenceLiquidityVenue 
// The class has a method that returns targetLiquidityVenue 
// The class has a method that returns the asset pair that the strategy is targeting 
// The class has a method that returns the identifier for the strategy itself
// The class has a method that returns a live feed of a Simple Book that is a live feed of the strategy's most real-time target on-chain book they would like to have

import { GenericOrder, SimpleBook } from "../../configuration/config";
import { GenericLiquidityVenue } from "../../liquidityVenues/generic";
import { AssetPair } from "../../liquidityVenues/generic";

export class GenericMarketMakingStrategy {
    targetBook: SimpleBook;
    referenceLiquidityVenue: GenericLiquidityVenue;
    identifier: string;

    constructor(referenceLiquidityVenue: GenericLiquidityVenue) {
        this.targetBook = <SimpleBook>{};
        this.referenceLiquidityVenue = referenceLiquidityVenue;
        this.identifier = 'genericMarketMaking';
    }

    // Returns targetBook
    getTargetBook(): SimpleBook {
        return this.targetBook;
    }

    // Returns referenceLiquidityVenue
    getReferenceLiquidityVenue(): GenericLiquidityVenue {
        return this.referenceLiquidityVenue;
    }

    // Returns the asset pair that the strategy is targeting
    getAssetPair(): AssetPair {
        return this.referenceLiquidityVenue.getAssetPair()
    }

    // Function that listens to the referenceLiquidityVenue's updateNotifier and updates targetBook based on the latest information from referenceLiquidityVenue
    // Generic class naively sets the target book = to the reference book
    updateTargetBook() {
        this.referenceLiquidityVenue.updateNotifier.on('update', (liveBook) => {
            this.targetBook = liveBook;
        });
    }
}