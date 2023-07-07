// Listen to a SINGLE liquidity venue and return a live feed of a Simple Book that quotes
// at a configurable premium to the targeted liquidity venue's perceived curve
// Takes all fill and dumps it on the targeted liquidity venue for profit
// Extends the GenericMarketMakingStrategy class and overrides the updateTargetBook method
import { GenericMarketMakingStrategy } from "./genericMarketMaking";
import { GenericLiquidityVenue } from "../../liquidityVenues/generic";
import { MIN_ORDER_SIZES } from "../../configuration/config";

export class RiskMinimizedStrategy extends GenericMarketMakingStrategy {
    premium: number;

    constructor(referenceLiquidityVenue: GenericLiquidityVenue, premium: number) {
        super(referenceLiquidityVenue);
        this.premium = premium;
        console.log("This is my premium: ", this.premium);
        if (this.premium > 1 || this.premium < 0) {
            throw new Error("Premium must be less than 1 or greater than 0");
        }

        // referenceLiquidityVenue.fee?
        // TODO: pass UNIfee here? 
        // TODO: Add a check to ensure that the premium is greater than the implied minimum from the uniFee

        this.identifier = 'riskminimized';
        this.updateTargetBook();
    }

    // Function that listens to the referenceLiquidityVenue's updateNotifier and updates targetBook based on the latest information from referenceLiquidityVenue
    override updateTargetBook() {
        // console.log("THIS FUNCTION WAS CALLED!!!!");

        console.log("Listening to referenceLiquidityVenue's updateNotifier...");

        this.referenceLiquidityVenue.updateNotifier.on('update', (liveBook) => {
            // console.log("STARTING BOOK ", liveBook);

            if (liveBook == undefined) {
                console.log("Live book is undefined, therefore do nothing and return");
                return;
            }
            this.targetBook = liveBook;

            // this.premium = 0;
            if (liveBook.bids) {
                this.targetBook.bids = liveBook.bids.map((bid) => {
                    if (bid.price == Infinity || isNaN(bid.price) || bid.price == undefined || bid.price == 0 || bid.size == 0) {
                        return;
                    }
                    return {
                        price: bid.price * (1 - this.premium),
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
                        price: ask.price * (1 + this.premium),
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
            

            console.log(this.identifier, " - This is targetBook: ", this.targetBook);

            this.emitUpdate();
        });
    }
}