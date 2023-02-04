import { ethers } from "ethers";
import { BotConfiguration } from "../configuration/config";
import { getAddress } from "ethers/lib/utils";
import  MARKET_AID_INTERFACE from "../configuration/abis/MarketAid";

// function to prompt the user to select an existing contract instance or create a new one
function userMarketAidCheckCallback(rl): Promise<string> {
    return new Promise(resolve => {
        rl.question('\n Do you have an existing MarketAid contract instance you would like to use? (Enter the address of the contract instance you want to use then enter to add, or enter "no" to create one):', (answer) => {
            if (answer.toLowerCase() === 'no') {
                // console.log('\n Creating a new MarketAid contract instance...');
                resolve(null);
            } else {
                console.log('\n Using existing MarketAid contract instance...');
                try {
                    const address = getAddress(answer);
                    resolve(address);
                } catch (error) {
                    console.log("Invalid answer! Enter the address of the contract instance you want to use or enter 'no' to create one");
                    resolve(userMarketAidCheckCallback(rl));
                }
            }
        })
    });
}

// Function 
export async function startMarketMakingBot(configuration: BotConfiguration, rl?: any) {
    // TODO: WIRE THIS UP TO THE NETWORK THEY WANNA USE
    var myProvider: ethers.providers.JsonRpcProvider | ethers.providers.WebSocketProvider;
    // pass through from config
    // Note that either a websocket or json rpc provider is allowed
    myProvider = (configuration.connections.jsonRpcProvider);
    // 1. Validate the configuration and make sure they have a wired up MarketAid for their selected network that has requisite approvals and balances of the tokens they want to target
    // And on-chain things as needed like relevant provider...
    var marketAidContractInstance: ethers.Contract;

    // call function to prompt the user to select an existing contract instance or create a new one
    // if they select an existing one, we need to make sure it's on the right network and has the right approvals and balances
    var userMarketAidAddress = await userMarketAidCheckCallback(rl);
    console.log("userMarketAid", userMarketAidAddress);

    // TODO: guided start flow to ask them if they want to use an existing contract instance or create a new one
    if (userMarketAidAddress) {
        console.log("The user selected to use an existing contract instance", userMarketAidAddress);
        marketAidContractInstance = new ethers.Contract(userMarketAidAddress, MARKET_AID_INTERFACE, myProvider);
        console.log("\n This is my contract's address: ", marketAidContractInstance.address);

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