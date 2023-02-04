// Class that implements a Uniswap liquidity venue. Extends the GenericLiquidityVenue class.
// Has a function that polls and queries the Uniswap contract, parses the response, and updates the liveBook property
// Should have a function that queries the Uniswap contract for swap fill at a defined step size and parses the results 
//      to return a live feed of a Simple Book. This function should be called by the function that polls and queries the Uniswap contract
//      it also allows for the user to define a step size for the query for more granular results
// 
import { GenericLiquidityVenue, BidAndAsk, AssetPair } from "../generic";
import { SimpleBook } from "../../configuration/config";
import { ethers, BigNumber } from "ethers";
import QUOTER_INTERFACE from "../../configuration/abis/Quoter";
import { tickToBook } from "./data";

export class UniswapLiquidityVenue extends GenericLiquidityVenue {
    assetPair: AssetPair;
    identifier: string;
    liveBook: SimpleBook;
    pairContract: ethers.Contract;
    quoterContract: ethers.Contract;
    uniFee: number;

    constructor(
        assetPair: AssetPair,
        reader: ethers.providers.JsonRpcProvider | ethers.providers.WebSocketProvider,
        uniFee?: number
    ) {
        super(assetPair);
        this.assetPair = assetPair;
        this.identifier = 'uniswap';
        this.liveBook = <SimpleBook>{};
        this.quoterContract = new ethers.Contract(
            "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6", // NOTE: THIS IS AN ASSUMED CONSTANT TODO: EXTRAPOLATE TO CONFIG
            QUOTER_INTERFACE,
            reader
        );
        uniFee ? this.uniFee = uniFee : this.uniFee = 3000;
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

    // function that calls tickToBook and updates the liveBook property with the result while using a defined liquidity ladder as the setp size
    async updateLiveBook(
        leftSizeLadderWei: Array<BigNumber>,
        rightSizeLadderWei: Array<BigNumber>,
        stretchScalar?: number
    ) {
        this.liveBook = await tickToBook(
            leftSizeLadderWei,
            rightSizeLadderWei,
            this.quoterContract,
            this.assetPair.asset,
            this.assetPair.quote,
            BigNumber.from(this.uniFee),
            stretchScalar ? stretchScalar : 1
        );
    }

    // Polling function that calls updateLiveBook with a defined liquidity ladder as the step size
    async pollLiveBook(
        leftSizeLadderWei: Array<BigNumber>,
        rightSizeLadderWei: Array<BigNumber>,
        interval: number
    ) {
        await this.updateLiveBook(leftSizeLadderWei, rightSizeLadderWei);
        setInterval(() => {
            this.updateLiveBook(leftSizeLadderWei, rightSizeLadderWei);
        }, interval);
    }
}
