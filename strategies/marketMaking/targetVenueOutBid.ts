// Target a SINGLE liquidity venue and return a live feed of a Simple Book that quotes
// at a configurable DISCOUNT/improvement to the targeted liquidity venue's perceived curve (better price)
// Does NOT externally rebalance - only rebalances against market fill

import { MIN_ORDER_SIZES } from "../../configuration/config";
import { GenericLiquidityVenue } from "../../liquidityVenues/generic";
import { GenericMarketMakingStrategy } from "./genericMarketMaking";

// Extends the GenericLiquidityVenue class and overrides the updateTargetBook method
export class TargetVenueOutBidStrategy extends GenericMarketMakingStrategy {
    improvement: number; // Improvement on the targeted liquidity venue's perceived curve

    constructor(referenceLiquidityVenue: GenericLiquidityVenue, premium: number) {
        super(referenceLiquidityVenue);
        this.improvement = premium;
        console.log("This is my IMPROVEMENT: ", this.improvement);
        if (this.improvement > 1 || this.improvement < 0) {
            throw new Error("Premium must be less than 1 or greater than 0");
        }

        this.identifier = 'targetvenueoutbid';
        this.updateTargetBook();
    }

    // Function that listens to the referenceLiquidityVenue's updateNotifier and updates targetBook based on the latest information from referenceLiquidityVenue
    override updateTargetBook() {
        const MIN_SPREAD = 0.0001;

        this.referenceLiquidityVenue.updateNotifier.on('update', (liveBook) => {
            if (liveBook == undefined) {
                console.log("Live book is undefined, therefore do nothing and return");
                return;
            }
            this.targetBook = liveBook;

            // Calculate the midpoint of the initial liveBook
            const highestBid = liveBook.bids.length > 0 ? liveBook.bids[0].price : 0;
            const lowestAsk = liveBook.asks.length > 0 ? liveBook.asks[0].price : Infinity;
            const midpoint = (highestBid + lowestAsk) / 2;

            if (liveBook.bids) {
                this.targetBook.bids = liveBook.bids.map((bid) => {
                    if (bid.price == Infinity || isNaN(bid.price) || bid.price == undefined || bid.price == 0 || bid.size == 0) {
                        return;
                    }
                    const newPrice = bid.price * (1 + this.improvement);
                    const adjustedPrice = Math.min(newPrice, midpoint) === midpoint ? (midpoint * (1 - (MIN_SPREAD / 2))) : newPrice;
                    return {
                        price: adjustedPrice,
                        size: bid.size
                    }
                });
            }
            if (liveBook.asks) {
                this.targetBook.asks = liveBook.asks.map((ask) => {
                    if (ask.price == Infinity || isNaN(ask.price) || ask.price == undefined || ask.price == 0 || ask.size == 0) {
                        return;
                    }
                    const newPrice = ask.price * (1 - this.improvement);
                    const adjustedPrice = Math.max(newPrice, midpoint) === midpoint ? (midpoint * (1 + (MIN_SPREAD / 2))) : newPrice;
                    return {
                        price: adjustedPrice,
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

                const bidSymbol = this.getAssetPair().quote.symbol;
                // Assuming "asset" to represent the asset name for this order
                var minSize = MIN_ORDER_SIZES[bidSymbol];

                const adjustedSize = minSize / bid.price;

                minSize = adjustedSize;
                if (minSize == undefined) {
                    minSize = 0;
                    console.log("Min size is undefined for asset: ", bidSymbol);
                }

                if (bid.size < minSize) {
                    console.log(`Bid size ${bid.size} for asset ${bidSymbol} is less than minimum ${minSize}. Adjusting to minimum size.`);
                    bid.size = minSize;
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

                const askSymbol = this.getAssetPair().asset.symbol;
                // Assuming "asset" to represent the asset name for this order
                var minSize = MIN_ORDER_SIZES[askSymbol];

                // console.log("This is ASSET minSize: ", minSize);

                if (minSize == undefined) {
                    minSize = 0;
                    console.log("Min size is undefined for asset: ", askSymbol);
                }

                if (ask.size < minSize) {
                    console.log(`Ask size ${ask.size} for asset ${minSize} is less than minimum ${minSize}. Adjusting to minimum size.`);
                    ask.size = minSize;
                }
                return ask;
            });

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
            console.log(this.identifier, " - This is targetBook: ", this.targetBook);
            this.emitUpdate();
        });
    }
}
