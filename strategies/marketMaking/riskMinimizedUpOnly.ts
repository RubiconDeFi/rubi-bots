// Listen to a SINGLE liquidity venue and return a live feed of a Simple Book that quotes
// at a configurable premium to the targeted liquidity venue's perceived curve
// Takes all fill and dumps it on the targeted liquidity venue for profit
// Extends the GenericMarketMakingStrategy class and overrides the updateTargetBook method
import { GenericMarketMakingStrategy } from "./genericMarketMaking";
import { GenericLiquidityVenue } from "../../liquidityVenues/generic";

export class RiskMinimizedStrategy extends GenericMarketMakingStrategy {
    premium: number;

    constructor(referenceLiquidityVenue: GenericLiquidityVenue, premium: number) {
        super(referenceLiquidityVenue);
        this.premium = premium;
        console.log("This is my premium: ", this.premium);
        if (this.premium > 1 || this.premium < 0) {
            throw new Error("Premium must be less than 1 or greater than 0");
        }

        this.identifier = 'RiskMinimizedUpOnly';
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
                    return {
                        price: bid.price * (1 - this.premium),
                        size: bid.size
                    }
                });
            }
            if (liveBook.asks) {
                this.targetBook.asks = liveBook.asks.map((ask) => {
                    return {
                        price: ask.price * (1 + this.premium),
                        size: ask.size
                    }
                });
            }
            this.emitUpdate();
        });
    }
}