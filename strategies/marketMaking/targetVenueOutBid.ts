// Target a SINGLE liquidity venue and return a live feed of a Simple Book that quotes
// at a configurable DISCOUNT/improvement to the targeted liquidity venue's perceived curve (better price)
// Does NOT externally rebalance - only rebalances against market fill

import { GenericLiquidityVenue } from "../../liquidityVenues/generic";
import { GenericMarketMakingStrategy } from "./genericMarketMaking";

// Extends the GenericLiquidityVenue class and overrides the updateTargetBook method
export class TargetVenueOutBidStrategy extends GenericMarketMakingStrategy {
    improvement: number; // Improvement on the targeted liquidity venue's perceived curve

    constructor(referenceLiquidityVenue: GenericLiquidityVenue, improvement: number) {
        super(referenceLiquidityVenue);
        this.improvement = improvement;
        this.identifier = 'targetVenueOutBid';
    }

    // Function that listens to the referenceLiquidityVenue's updateNotifier and updates targetBook based on the latest information from referenceLiquidityVenue
    updateTargetBook() {
        this.referenceLiquidityVenue.updateNotifier.on('update', (liveBook) => {
            this.targetBook = liveBook;
            this.targetBook.bids.forEach((bid) => {
                bid.price = bid.price * (1 + this.improvement);
            });
            this.targetBook.asks.forEach((ask) => {
                ask.price = ask.price * (1 - this.improvement);
            });
        });
    }
}
