import { ethers } from "ethers";
import { BotConfiguration } from "../configuration/config";

// Function 
export async function startMarketMakingBot(configuration: BotConfiguration, existingContractInstance?: string) {
    // 1. Validate the configuration and make sure they have a wired up MarketAid for their selected network that has requisite approvals and balances of the tokens they want to target
    // And on-chain things as needed like relevant provider...
    var marketAidContractInstance: ethers.Contract;
    // TODO: WIRE THIS UP TO THE NETWORK THEY WANNA USE
    var myProvider: ethers.providers.JsonRpcProvider | ethers.providers.WebSocketProvider;
    if (existingContractInstance) {
        console.log("The user selected to use an existing contract instance", existingContractInstance);

        // marketAidContractInstance = new ethers.Contract(existingContractInstance, marketAidAbi, myProvider);
    } else {
        console.log("The user did not provide an existing contract instance. Creating a new one...");
        // marketAidContractInstance = helpUserCreateNewMarketAidInstance(configuration);
    }

    // 2. Depending on the user's selected strategy, create the strategy and pass it to the bot
    // Configure relevant liquidity venues and use those to generate a live feed of a TARGET simple book
    // var targetLiquidityVenues
    // Maybe use a callback here to allow the user to select the liquidity venues they want to target...


    // 3. Create a new bot instance
    // Note: this guy should use a configurable poll for gas-conscious updating
    // const bot = new MarketMakingBot(configuration, marketAidContractInstance,
        // Strategy = Simple book feed that the bot listens to to target on-chain
    //);

    // 4. Start the bot and listen to log feed
    // await bot.start();
}