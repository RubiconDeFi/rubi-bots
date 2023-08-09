// Class that implements a Uniswap liquidity venue. Extends the GenericLiquidityVenue class.
// Has a function that polls and queries the Uniswap contract, parses the response, and updates the liveBook property
// Should have a function that queries the Uniswap contract for swap fill at a defined step size and parses the results 
//      to return a live feed of a Simple Book. This function should be called by the function that polls and queries the Uniswap contract
//      it also allows for the user to define a step size for the query for more granular results

import { GenericLiquidityVenue, BidAndAsk, AssetPair } from "../generic";
import { SimpleBook } from "../../configuration/config";
import { ethers, BigNumber } from "ethers";
import QUOTER_INTERFACE from "../../configuration/abis/Quoter";
import QUOTER_INTERFACE_V2 from "../../configuration/abis/Quoterv2";

import { tickToBook } from "./data";
import { formatUnits } from "ethers/lib/utils";

export class UniswapLiquidityVenue extends GenericLiquidityVenue {
    assetPair: AssetPair;
    identifier: string;
    liveBook: SimpleBook;
    pairContract: ethers.Contract;
    quoterContract: ethers.Contract;
    uniFee: number;
    isV2: boolean;

    constructor(
        assetPair: AssetPair,
        reader: ethers.providers.JsonRpcProvider | ethers.providers.WebSocketProvider,
        uniFee?: number,
        v2Quoter?: boolean
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
        if (v2Quoter == true) {
            console.log("Using v2 quoter");
            
            this.quoterContract = new ethers.Contract(
                "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a", // NOTE: THIS IS AN ASSUMED CONSTANT TODO: EXTRAPOLATE TO CONFIG
                QUOTER_INTERFACE_V2,
                reader
            );
            this.isV2 = true;
        }

        uniFee ? this.uniFee = uniFee : this.uniFee = 500;
        // console.log("this is the uniFee: ", this.uniFee);

    }

    // function that calls tickToBook and updates the liveBook property with the result while using a defined liquidity ladder as the setp size
    async updateLiveBook(
        leftSizeLadderWei: Array<BigNumber>,
        rightSizeLadderWei: Array<BigNumber>,
        stretchScalar?: number
    ) {
        try {
            this.liveBook = await tickToBook(
                leftSizeLadderWei,
                rightSizeLadderWei,
                this.quoterContract,
                this.assetPair.quote,
                this.assetPair.asset,
                BigNumber.from(this.uniFee),
                stretchScalar ? stretchScalar : 1,
                this.isV2 ? true : undefined
            );

            this.liveBook = {
                bids: this.liveBook.bids.reverse(),
                asks: this.liveBook.asks.reverse()
            }

            // console.log("this is the liveBook: ", this.liveBook);

        } catch (error) {
            console.log("\n Got an error in updateLiveBook for UniswapLiquidity venue: ", error);
        }

        this.emitUpdate();
    }

    // Polling function that calls updateLiveBook with a defined liquidity ladder as the step size
    async pollLiveBook(
        getSizeLadderWei: () => Promise<{
            assetLadder: BigNumber[];
            quoteLadder: BigNumber[];
        }>,
        // getRightSizeLadderWei: () => Promise<Array<BigNumber>>,
        interval: number
    ) {
        const data = await getSizeLadderWei();
        await this.updateLiveBook(data.quoteLadder, data.assetLadder);
        // @dev NOTE: ONE SHORT COMING OF THIS SYSTEM RIGHT NOW
        // From generic market making bot we pull in available liquidity which is then used to calculate the OPPOSITE side of the book
        // TODO: This causes some unexpected behavior and a hacky rescale in the higher level bot... much to improve here
        setInterval(async () => {
            const data = await getSizeLadderWei();
            // console.log("UPDATE UNI LIVEBOOK", data.assetLadder.map((x) => formatUnits(x, 18)), data.quoteLadder.map((x) => formatUnits(x, 18)));

            this.updateLiveBook(data.quoteLadder, data.assetLadder);
        }, interval);
    }


    // TODO: add a websocket listener that calls updateLiveBook every time a relevant swap event occurs and every block? Goal is to speed up the polling interval for more data accuracy
}
