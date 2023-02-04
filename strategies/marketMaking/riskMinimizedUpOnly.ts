// Listen to a SINGLE liquidity venue and return a live feed of a Simple Book that quotes
// at a configurable premium to the targeted liquidity venue's perceived curve
// Takes all fill and dumps it on the targeted liquidity venue for profit
// Extends the GenericMarketMakingStrategy class and overrides the updateTargetBook method
// 
import { GenericMarketMakingStrategy } from "./genericMarketMaking";
import { GenericLiquidityVenue } from "../../liquidityVenues/generic";

export class RiskMinimizedStrategy extends GenericMarketMakingStrategy {
    premium: number;

    constructor(referenceLiquidityVenue: GenericLiquidityVenue, premium: number) {
        super(referenceLiquidityVenue);
        this.premium = premium;
        this.identifier = 'riskMinimizedUpOnly';
    }

    // Function that listens to the referenceLiquidityVenue's updateNotifier and updates targetBook based on the latest information from referenceLiquidityVenue
    override updateTargetBook() {
        this.referenceLiquidityVenue.updateNotifier.on('update', (liveBook) => {
            this.targetBook = liveBook;
            this.targetBook.bids.forEach((bid) => {
                bid.price = bid.price * (1 + this.premium);
            });
            this.targetBook.asks.forEach((ask) => {
                ask.price = ask.price * (1 - this.premium);
            });
        });
    }
}