// Class that represents a generic liquidity venue.
// Has a property called liveBook that is a live feed of a Simple Book / the objects most real-time best guess as to the state of a given liquidity venue
// Has a method that returns the best bid and ask from the liveBook
// Has a property that defines the asset pair that the liquidity venue is targeting and an identifier for the liquidity venue itself
// Has a method that returns the asset pair that the liquidity venue is targeting
// Has a method that returns the identifier for the liquidity venue itself
// Has a method that returns a live feed of a Simple Book

import { TokenInfo } from "@uniswap/token-lists";
import { GenericOrder, SimpleBook } from "../configuration/config";


export class GenericLiquidityVenue {
    liveBook: SimpleBook;
    assetPair: AssetPair;
    identifier: string;

    constructor(assetPair: AssetPair) {
        this.liveBook = <SimpleBook>{};
        this.assetPair = assetPair;
        this.identifier = 'generic';
    }

    // Returns the best bid and ask from the liveBook
    getBestBidAndAsk(): BidAndAsk {
        return {
            bid: this.liveBook.bids[0],
            ask: this.liveBook.asks[0]
        }
    }

    // Returns the asset pair that the liquidity venue is targeting
    getAssetPair(): AssetPair {
        return this.assetPair;
    }

    // Returns the identifier for the liquidity venue itself
    getIdentifier(): string {
        return this.identifier;
    }

    // Returns a live feed of a Simple Book
    getLiveBook(): SimpleBook {
        return this.liveBook;
    }
}


export type BidAndAsk = {
    bid: GenericOrder;
    ask: GenericOrder;
};

export type AssetPair = {
    asset: TokenInfo,
    quote: TokenInfo
;}