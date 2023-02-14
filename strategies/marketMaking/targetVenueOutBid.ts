// Target a SINGLE liquidity venue and return a live feed of a Simple Book that quotes
// at a configurable DISCOUNT/improvement to the targeted liquidity venue's perceived curve (better price)
// Does NOT externally rebalance - only rebalances against market fill

import { GenericLiquidityVenue } from "../../liquidityVenues/generic";
import { GenericMarketMakingStrategy } from "./genericMarketMaking";

// Extends the GenericLiquidityVenue class and overrides the updateTargetBook method
export class TargetVenueOutBidStrategy extends GenericMarketMakingStrategy {
    improvement: number; // Improvement on the targeted liquidity venue's perceived curve

    constructor(referenceLiquidityVenue: GenericLiquidityVenue, premium: number) {
        super(referenceLiquidityVenue);
        this.improvement = premium;
        console.log("This is my premium: ", this.improvement);
        if (this.improvement > 1 || this.improvement < 0) {
            throw new Error("Premium must be less than 1 or greater than 0");
        }

        this.identifier = 'TargetVenueOutBidStrategy';
        this.updateTargetBook();
    }

    // Function that listens to the referenceLiquidityVenue's updateNotifier and updates targetBook based on the latest information from referenceLiquidityVenue
    override updateTargetBook() {
        this.referenceLiquidityVenue.updateNotifier.on('update', (liveBook) => {
            this.targetBook = liveBook;
            this.targetBook.bids = liveBook.bids.map((bid) => {
                return {
                    price: bid.price * (1 + this.improvement),
                    size: bid.size
                }
            });
            this.targetBook.asks = liveBook.asks.map((ask) => {
                return {
                    price: ask.price * (1 - this.improvement),
                    size: ask.size
                }
            });
            this.emitUpdate();
        });
    }
}
