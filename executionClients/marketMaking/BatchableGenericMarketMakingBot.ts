import { ethers } from "ethers";
import { GenericMarketMakingBot } from "./GenericMarketMakingBot";
import { BotConfiguration } from "../../configuration/config";
import { RiskMinimizedStrategy } from "../../strategies/marketMaking/riskMinimizedUpOnly";
import { TargetVenueOutBidStrategy } from "../../strategies/marketMaking/targetVenueOutBid";

class BatchableGenericMarketMakingBot extends GenericMarketMakingBot {
    constructor(config: BotConfiguration, marketAid: ethers.Contract, strategy: RiskMinimizedStrategy | TargetVenueOutBidStrategy, _botAddy: string,) { // Replace 'any' with the appropriate type for the options parameter
        super(config, marketAid, strategy, _botAddy);
        // Add any additional setup or logic needed for the BatchableGenericMarketMakingBot constructor
    }

    // Add any new methods or properties specific to the BatchableGenericMarketMakingBot class
}

export default BatchableGenericMarketMakingBot;
