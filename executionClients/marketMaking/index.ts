import * as dotenv from "dotenv";

import { ethers, BigNumber } from "ethers";
import { BotConfiguration, BotType, MarketMakingStrategy, tokenList } from "../../configuration/config";
import { getAddress } from "ethers/lib/utils";
import MARKET_AID_INTERFACE from "../../configuration/abis/MarketAid";
import { RiskMinimizedStrategy } from "../../strategies/marketMaking/riskMinimizedUpOnly";
import { UniswapLiquidityVenue } from "../../liquidityVenues/uniswap";
import { GenericMarketMakingBot } from "./GenericMarketMakingBot";
//imports from marketaid
import { rl, getAidFactory, networkMenu, aidFactoryMenu, maxApproveMarketAidForAllTokens, getTokensByNetwork, switchNetwork } from "../../configuration/marketAid"; //grabbing marketAid functions
import { MarketAidFactory } from "../../utilities/contracts/MarketAidFactory";
import { MarketAid } from "../../utilities/contracts/MarketAid";
//
//importing to get the right tokens for approval
import { TokenInfo } from "@uniswap/token-lists";
import { ERC20 } from "../../utilities/contracts/ERC20";
//
import { start } from "repl";
dotenv.config();

// function to prompt the user to select an existing contract instance or create a new one
function userMarketAidCheckCallback(configuration: BotConfiguration, rl): Promise<string> {
    return new Promise(resolve => {
        rl.question('\n Do you have an existing MarketAid contract instance you would like to use? (Enter the address of the contract instance you want to use then enter to add, or enter "no" to create one):', (answer) => {
            if (answer.toLowerCase() === 'no') {
                resolve("no");
            } else {
                console.log('\n Using existing MarketAid contract instance...');
                try {
                    const address = getAddress(answer);
                    resolve(address);
                } catch (error) {
                    console.log("Invalid answer! Enter the address of the contract instance you want to use or enter 'no' to create one");
                    resolve(userMarketAidCheckCallback(configuration, rl));
                }
            }
        })
    });
}


async function depositMenu(tokens: TokenInfo[], marketAid: MarketAid, rl) {
    const depositAssets: string[] = [];
    const depositAmounts: BigNumber[] = [];
    console.log("break");

    const addAssetToDeposit = async () => {
        console.log("\nSelect an asset to deposit:");
        tokens.forEach((token, index) => {
            console.log(`${index + 1}: ${token.name} (${token.symbol})`);
        });
        console.log(`${tokens.length + 1}: Done`);

        const answer: string  = await new Promise(resolve => {
            rl.question("Enter the number corresponding to the asset you want to deposit: ", (input) => {
                resolve(input);
            });
        });

        const selectedIndex = parseInt(answer.trim()) - 1;

        if (selectedIndex >= 0 && selectedIndex < tokens.length) {
            const selectedToken = tokens[selectedIndex];
            depositAssets.push(selectedToken.address);

            const amountAnswer: string = await new Promise(resolve => {
                rl.question(`Enter the amount of ${selectedToken.symbol} to deposit: `, (input) => {
                    resolve(input);
                });
            });

            const amount = parseFloat(amountAnswer.trim());
            const smallestUnitAmount = BigNumber.from((amount * 10 ** selectedToken.decimals).toFixed());
            depositAmounts.push(smallestUnitAmount);

            await addAssetToDeposit();
        } else if (selectedIndex === tokens.length) {
            console.log("\nDeposit summary:");
            depositAssets.forEach((asset, index) => {
                const token = tokens.find((t) => t.address === asset);
                if (token) {
                    console.log(`Deposit ${depositAmounts[index]} ${token.symbol}`);
                }
            });

            const confirmation = await new Promise(resolve => {
                rl.question("\nAre you sure you want to proceed with the deposit? (yes/no): ", (input) => {
                    resolve(input.trim().toLowerCase());
                });
            });

            if (confirmation === "yes") {
                try {
                    const balanceChanges = await marketAid.adminDepositToBook(depositAssets, depositAmounts);
                    console.log("\nDeposit successful. Balance changes:");
                    for (const tokenAddress in balanceChanges) {
                        const token = tokens.find((t) => t.address === tokenAddress);
                        if (token) {
                            console.log(`Balance of ${token.name} (${token.symbol}) changed by: ${balanceChanges[tokenAddress]} ${token.symbol}`);
                        }
                    }
                } catch (error) {
                    console.error("Failed to deposit:", error);
                }
            } else {
                console.log("Deposit canceled.");
            }
        } else {
            console.log("Invalid selection. Please try again.");
            await addAssetToDeposit();
        }
    };
    await addAssetToDeposit();
}



// helper function that lets a user create a MarketAid contract 
// NOTE: there are different ways to implement this function. I chose this way due to the setup of marketAid.ts
//  Currently I'm picking pieces from marketAid.ts 
async function helpUserCreateNewMarketAidInstance(configuration: BotConfiguration) {
    //creating token states to pull them for different networks
    let tokens: TokenInfo[] = [];
    let erc20Tokens: ERC20[] = [];
    //update token states based on network to use maxApproveMarketAidForAllTokens
    //not sure if i can use the switchNetwork function because of the state vars in marketaid. a way to fix is the have the vars as inputs to the function
    //get list of tokens based on selected network 
    tokens = getTokensByNetwork(configuration.network)
    //update erc20Tokens with new ERC20 instances for the new network
    for (const tokenInfo of tokens) {
        const token = new ERC20(tokenInfo.address, configuration.connections.signer);
        erc20Tokens.push(token);
    }
    console.log("Network state updated and token information retrieved")
    //step 1 - init aid factory based on the prev config settings
    const marketAidFactory = getAidFactory(configuration.network, configuration.connections.signer);
    //step 2 - get new address from factory
    const newMarketAidAddress = await marketAidFactory.createMarketAidInstance();
    console.log("New Market Aid Address: ", newMarketAidAddress);
    //step 3 - connect to aid
    console.log("\nConnecting to aid...")
    const marketAid = new MarketAid(newMarketAidAddress, configuration.connections.signer)
    console.log("\nConnected!")
    //step 4 - approve all tokens 
    console.log("Approving tokens for use...")
    await maxApproveMarketAidForAllTokens(erc20Tokens, marketAid, configuration.connections.signer);
    console.log("Tokens approved!")
    //step 5 - deposit assets
    //TODO: is there a better approach than doing this?
    await depositMenu(tokens, marketAid, rl)
    return newMarketAidAddress;
}


// Function 
export async function startGenericMarketMakingBot(configuration: BotConfiguration, rl?: any, providedMarketAidAddress?: string) {
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
    var userMarketAidAddress: string;
    if (providedMarketAidAddress) {
        userMarketAidAddress = providedMarketAidAddress;
    } else {
        userMarketAidAddress = await userMarketAidCheckCallback(configuration, rl);
    }
    // console.log("\nGeneric market-making bot targetting this userMarketAid", userMarketAidAddress);

    // TODO: guided start flow to ask them if they want to use an existing contract instance or create a new one
    if (userMarketAidAddress != "no") {
        console.log("The user selected to use an existing contract instance", userMarketAidAddress);
        marketAidContractInstance = new ethers.Contract(userMarketAidAddress, MARKET_AID_INTERFACE, myProvider);
        console.log("\n This is my contract's address: ", marketAidContractInstance.address);

    } else {
        console.log("Let's create a new MarketAid...")
        userMarketAidAddress = await helpUserCreateNewMarketAidInstance(configuration);
        console.log("The generated contract instance is at: ", userMarketAidAddress);
        marketAidContractInstance = new ethers.Contract(userMarketAidAddress, MARKET_AID_INTERFACE, myProvider);
        console.log("\n This is my contract's address: ", marketAidContractInstance.address);
    }

    // 2. Depending on the user's selected strategy, create the strategy and pass it to the bot
    // Configure relevant liquidity venues and use those to generate a live feed of a TARGET simple book
    var referenceLiquidityVenue = new UniswapLiquidityVenue(
        {
            asset: configuration.targetTokens[0],
            quote: configuration.targetTokens[1]
        }, configuration.connections.jsonRpcProvider //, 500
    );

    // TODO: take another argument from argv to determine which strategy to use
    
    var strat = new RiskMinimizedStrategy(referenceLiquidityVenue, 0.01)
    // 3. Create a new bot instance
    // Note: this guy should use a configurable poll for gas-conscious updating
    // This execution client's job is to simply map the STRATEGY simple book feed on-chain when conditions are met
    // MUST LISTEN TO IT's OWN MARKET AID BOOK as the Rubicon feed - Note that it DOES NOT need the generic feed
    // SHOULD BE MODULAR - simple version first, e.g. then single EOA batch boxing...
    // Conceptually the MarketMakingBot object takes a configuration, a marketAidContractInstance, and a Strategy object and it updates the market aid's on-chain book and liquidity as needed
    const bot = new GenericMarketMakingBot(configuration,
        marketAidContractInstance, // TODO: listen to the market aid's positioning within this object
        strat,// Strategy = Simple book feed that the bot listens to to target on-chain; technically this is just a node event emitter
        configuration.network == 10 ? process.env.MY_LIVE_BOT_EOA_ADDRESS_OR_REF : process.env.MY_TEST_BOT_EOA_ADDRESS // TODO: hacky
    );

    // 4. Start the bot and listen to log feed
    await bot.launchBot();
}

// Create a main function which is called and parses through proceess.argv to allow for custom configuration
function main(): Promise<void> {

    console.log("This is process.argv", process.argv);
    // Parse through process.argv to get custom configuration details from the user and start the correct bot process
    // TODO:
    const chainId = parseFloat(process.argv[2]);
    if (!chainId) throw new Error('No chain ID found in process.argv');
    const marketAidContractAddress = process.argv[3];
    const jsonRpcUrl = process.env['JSON_RPC_URL_' + chainId.toString()];
    const websocketUrl = process.env['WEBSOCKET_URL_' + chainId.toString()];
    if (!jsonRpcUrl) throw new Error(`No JSON RPC URL found for network ${chainId}`);
    const staticJsonRpc = new ethers.providers.StaticJsonRpcProvider(jsonRpcUrl, chainId); // TODO: perhaps static provider for rpc consumption consciousness
    if (!process.env.EOA_PRIVATE_KEY) throw new Error('No EOA private key found in .env file');
    const asset = process.argv[4];
    const quote = process.argv[5];
    const assetTokenInfo = tokenList.tokens.find(token => token.address == asset && token.chainId == chainId);
    const quoteTokenInfo = tokenList.tokens.find(token => token.address == quote && token.chainId == chainId);

    if (!assetTokenInfo) throw new Error(`No token found for address ${asset} on network ${chainId}`);
    if (!quoteTokenInfo) throw new Error(`No token found for address ${quote} on network ${chainId}`);
    // TODO: clean this up to also have Strategy configured in the cli process.argv

    var config = {
        network: chainId,
        targetTokens: [assetTokenInfo, quoteTokenInfo],
        connections: {
            jsonRpcProvider: staticJsonRpc,
            websocketProvider: websocketUrl ? new ethers.providers.WebSocketProvider(websocketUrl, chainId) : undefined,
            signer: new ethers.Wallet(process.env.EOA_PRIVATE_KEY, staticJsonRpc)
        },
        botType: BotType.MarketMaking,
        strategy: MarketMakingStrategy.RiskMinimizedUpOnly
    };
    console.log("Spin up UNI reference venue with these tokens", config.targetTokens[0], config.targetTokens[1]);
    
    var referenceLiquidityVenue = new UniswapLiquidityVenue(
        {
            asset: config.targetTokens[0],
            quote: config.targetTokens[1]
        }, config.connections.jsonRpcProvider //, 500
    );
    var strat = new RiskMinimizedStrategy(referenceLiquidityVenue, 0.01);

    return startGenericMarketMakingBot(config, undefined,
        marketAidContractAddress);

}

if (require.main === module) {
    main();
  }
  