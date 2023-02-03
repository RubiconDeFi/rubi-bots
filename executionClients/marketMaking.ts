import { ethers } from "ethers";
import { BotConfiguration } from "../configuration/config";

// Function 
export async function startMarketMakingBot(configuration: BotConfiguration, existingContractInstance?: string) {
    // 1. Validate the configuration and make sure they have a wired up MarketAid for their selected network that has requisite approvals and balances of the tokens they want to target
    var marketAidContractInstance: ethers.Contract;
    // TODO: WIRE THIS UP TO THE NETWORK THEY WANNA USE
    var myProvider: ethers.providers.JsonRpcProvider | ethers.providers.WebSocketProvider;
    if (existingContractInstance) {
        console.log("The user selected to use an existing contract instance", existingContractInstance);

        marketAidContractInstance = new ethers.Contract(existingContractInstance, marketAidAbi, myProvider);
    } else {
        console.log("The user did not provide an existing contract instance. Creating a new one...");
        // const marketAidInstance = helpUserCreateNewMarketAidInstance(configuration);
    }

    // 2. Create a new bot instance
    // const bot = new MarketMakingBot(configuration, marketAidContractInstance,);
    // 3. Start the bot and listen to log feed
    // await bot.start();
}