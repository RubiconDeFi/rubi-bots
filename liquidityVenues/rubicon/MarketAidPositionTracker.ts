// A class that extends GenericLiquidityVenue and overrides the updateLiveBook method
//        has a property that is a Market Aid Instance which it polls to get the liveBook

import { GenericLiquidityVenue } from "../generic";
import { AssetPair } from "../../assetPair";
import { ethers } from "ethers";

// This class only returns the book of a specific EOA operator on the market aid excluding other offers present on Rubicon for the purposes of market making
export class RubiconLiquidityVenue extends GenericLiquidityVenue {
    marketAidInstance: ethers.Contract;

    constructor(assetPair: AssetPair, _ma: ethers.Contract) {
        super(assetPair);
        this.marketAidInstance = _ma;
        this.identifier = 'rubicon';
    }

    // Function that polls the rubiconInstance for the latest liveBook
    updateLiveBook() {
        // TODO: Query our order information through the market aid!
        // this.liveBook = this.rubiconInstance.getLiveBook();
        this.emitUpdate();
    }
}