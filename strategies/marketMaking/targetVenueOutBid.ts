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
            if (liveBook == undefined) {
                console.log("Live book is undefined, therefore do nothing and return");
                return;
            }
            this.targetBook = liveBook;
            if (liveBook.bids) {
                this.targetBook.bids = liveBook.bids.map((bid) => {
                    if (bid.price == Infinity || isNaN(bid.price) || bid.price == undefined || bid.price == 0 || bid.size == 0) {
                        return;
                    }
                    return {
                        price: bid.price * (1 + this.improvement),
                        size: bid.size
                    }
                });
            }
            if (liveBook.asks) {
                this.targetBook.asks = liveBook.asks.map((ask) => {
                    // If price is infinity, NaN, undefined, or zero, exclude that ask. Also, if size is zero then exclude that ask
                    if (ask.price == Infinity || isNaN(ask.price) || ask.price == undefined || ask.price == 0 || ask.size == 0) {
                        return;
                    }
                    return {
                        price: ask.price * (1 - this.improvement),
                        size: ask.size
                    }
                });
            }
            // Replace all undefined elements from this.targetBook with orders that have a size of zero and price of zero
            this.targetBook.bids = this.targetBook.bids.map((bid) => {
                if (bid == undefined) {
                    return {
                        price: 0,
                        size: 0
                    }
                }
                return bid;
            });
            this.targetBook.asks = this.targetBook.asks.map((ask) => {
                if (ask == undefined) {
                    return {
                        price: 0,
                        size: 0
                    }
                }
                return ask;
            });
            this.emitUpdate();
        });
    }
}
