import * as dotenv from "dotenv";

import { ethers, BigNumber } from "ethers";
import { getAddress } from "ethers/lib/utils";

import { BotConfiguration, BotType, MarketMakingStrategy, tokenList } from "../../configuration/config";
import  MARKET_AID_INTERFACE  from "../../configuration/abis/MarketAid"; //weird error when this import is in { }
import { rl, getAidFactory, maxApproveMarketAidForAllTokens, getTokensByNetwork, withdrawAllTokens } from "../../configuration/marketAid";

import { RiskMinimizedStrategy } from "../../strategies/marketMaking/riskMinimizedUpOnly";

import { UniswapLiquidityVenue } from "../../liquidityVenues/uniswap";
import { GenericMarketMakingBot } from "./GenericMarketMakingBot";
import { TargetVenueOutBidStrategy } from "../../strategies/marketMaking/targetVenueOutBid";
import BatchableGenericMarketMakingBot from "./BatchableGenericMarketMakingBot";
import BatchStrategyExecutor from "./BatchStrategyExecutor";

import { MarketAidFactory } from "../../utilities/contracts/MarketAidFactory";
import { ERC20 } from "../../utilities/contracts/ERC20";
import { MarketAid } from "../../utilities/contracts/MarketAid";

import { TokenInfo } from "@uniswap/token-lists";
import { start } from "repl";

dotenv.config();

// set variables for use in function 
// TODO: more functions from marketaid could be used if these state variables were inputs in those functions. That's a separate overhaul for a different PR
let tokens: TokenInfo[] = [];
let erc20Tokens: ERC20[] = [];

/**
 * Checks if the user has an existing MarketAid contract instance to use
 * @param configuration - The bot configuration.
 * @param rl - The readline interface.
 * @returns A Promise that resolves to a string indicating the user's choice:
 * - If the user wants to create a new contract instance, the Promise resolves to "no".
 * - If the user wants to use an existing contract instance, the Promise resolves to the address of that instance.
 */
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

/**
 * Displays a deposit menu for the user to select assets and deposit amounts.
 * @param tokens - An array of TokenInfo objects representing available tokens.
 * @param marketAid - The MarketAid contract instance.
 * @param rl - The readline interface.
 */
async function depositMenu(tokens: TokenInfo[], marketAid: MarketAid, rl) {
    const depositAssets: string[] = [];
    const depositAmounts: BigNumber[] = [];

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
            if (depositAssets.length === 0) {
                console.log("You will not be able to run the strategy without funds\n")
                console.log("No assets selected. Exiting deposit menu.");
                return; // Exit the function
            }
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

/**
 * Displays a withdraw menu for the user to select assets and withdraw their amounts.
 * @param tokens - An array of TokenInfo objects representing available tokens.
 * @param configuration - The Bot configuration
 * @param marketAid - The MarketAid contract instance.
 */
async function withdrawMenu(tokens: TokenInfo[], configuration: BotConfiguration, marketAid: MarketAid): Promise<void> {
    const withdrawAssets: string[] = [];
    const withdrawAmounts: BigNumber[] = [];

    const addAssetToWithdraw = async () => {
        console.log("\nSelect an asset to withdraw:");
        tokens.forEach((token, index) => {
            console.log(`${index + 1}: ${token.name} (${token.symbol})`);
        });
        console.log(`${tokens.length + 1}: Done`);

        const answer: string = await new Promise(resolve => {
            rl.question("Enter the number corresponding to the asset you want to withdraw: ", (input) => {
                resolve(input.trim());
            });
        });

        const selectedIndex = parseInt(answer) - 1;
        if (selectedIndex >= 0 && selectedIndex < tokens.length) {
            const selectedToken = tokens[selectedIndex];
            withdrawAssets.push(selectedToken.address);

            const amountAnswer: string = await new Promise(resolve => {
                rl.question(`Enter the amount of ${selectedToken.symbol} to withdraw: `, (input) => {
                    resolve(input.trim());
                });
            });

            const amount = parseFloat(amountAnswer);
            // Convert the input amount to the smallest token unit using the token decimals
            const smallestUnitAmount = BigNumber.from((amount * 10 ** selectedToken.decimals).toFixed());
            withdrawAmounts.push(smallestUnitAmount);

            await addAssetToWithdraw();
        } else if (selectedIndex === tokens.length) {
            console.log("\nWithdrawal summary:");
            withdrawAssets.forEach((asset, index) => {
                const token = tokens.find((t) => t.address === asset);
                if (token) {
                    console.log(`Withdraw ${withdrawAmounts[index]} ${token.symbol}`);
                }
            });

            const confirmation = await new Promise(resolve => {
                rl.question("\nAre you sure you want to proceed with the withdrawal? (yes/no): ", (input) => {
                    resolve(input.trim().toLowerCase());
                });
            });

            if (confirmation === "yes") {
                try {
                    const balanceChanges = await marketAid.adminWithdrawFromBook(withdrawAssets, withdrawAmounts);
                    console.log("\nWithdrawal successful. Balance changes:");
                    for (const tokenAddress in balanceChanges) {
                        const token = tokens.find((t) => t.address === tokenAddress);
                        if (token) {
                            console.log(`Balance of ${token.name} (${token.symbol}) changed by: ${balanceChanges[tokenAddress]} ${token.symbol}`);
                        }
                    }
                } catch (error) {
                    console.error("Failed to withdraw:", error);
                }
            } else {
                console.log("Withdrawal canceled.");
            }

            await aidMenu(tokens, configuration, marketAid);
        } else {
            console.log("Invalid selection. Please try again.");
            await addAssetToWithdraw();
        }
    };

    await addAssetToWithdraw();
}

/**
 * Retrieves the token balances of the MarketAid contract.
 * @param marketAid - The MarketAid contract instance.
 * @dev this is the function from marketaid.ts that uses this files variables
 */
async function getTokenBalances(marketAid: MarketAid) {
    for (const token of erc20Tokens) {
        const balance = await token.balanceOf(marketAid.address);
        const tokenInfo = tokens.find((t) => t.address === token.address);

        if (tokenInfo) {
          console.log(
            `Balance of ${tokenInfo.name} (${tokenInfo.symbol}): ${balance} ${tokenInfo.symbol}`
          );
        }
    }
}


/**
 * Allows a user to manage their generated Market Aid.
 * Provides various options for interacting with the Market Aid contract.
 * @param tokens - An array of TokenInfo objects representing available tokens.
 * @param configuration - The bot configuration.
 * @param marketAid - The MarketAid contract instance.
 * @returns A Promise that resolves to void.
 * @dev For additional commands, run `npm run aid` 
 */
async function aidMenu(tokens: TokenInfo[], configuration: BotConfiguration, marketAid: MarketAid): Promise<void> {
    console.log("\nMarket Aid Menu");
    console.log("");
    console.log("1. View Market Aid Info");
    console.log("2. Check if strategist is approved");
    console.log("3. View Market Aid Balance");
    console.log("4. Deposit to the aid");
    console.log("5. Withdraw from the aid");
    console.log("6. Pull all funds");
    console.log("")
    console.log("7. Exit");

    const answer: string = await new Promise(resolve => {
        rl.question("\nPick a number (1-7): ", (input) => {
            resolve(input.trim());
        });
    });

    let marketAddress;
    let admin;
    let aidBalances;
    let inputAddress;

    switch (answer.toLowerCase()) {
        case '1':
            console.log("\nView Market Aid Info\n");

            marketAddress = await marketAid.getRubiconMarketAddress();
            admin = await marketAid.getAdmin();

            if (admin === configuration.connections.signer.getAddress()) {
                console.log("You are the admin of this Market Aid");
            } else {
                console.log("You are not the admin of this Market Aid");
            }

            console.log("Market Address: ", marketAddress);

            await aidMenu(tokens, configuration, marketAid);
            break;

        case '2':
            console.log("\nCheck if strategist is approved\n");

            const strategistAddress: string = await new Promise(resolve => {
                rl.question("Enter the strategist address: ", (input) => {
                    resolve(input.trim());
                });
            });

            const isApproved = await marketAid.isApprovedStrategist(strategistAddress);
            console.log("Is strategist approved: ", isApproved);
            await aidMenu(tokens, configuration, marketAid);
            break;

        case '3':
            console.log("\nView Market Aid Balance\n");

            await getTokenBalances(marketAid)
            await aidMenu(tokens, configuration, marketAid);
            break;

        case "4":
            console.log("\nDeposit to the aid\n");

            console.log("Your current balances:");
            await getTokenBalances(marketAid);
            await depositMenu(tokens, marketAid, rl);
            await aidMenu(tokens, configuration, marketAid);
            break;

        case "5":
            console.log("\n Withdraw from the aid \n");

                // display the current aid balance
                console.log("The current aid balances:");

                await getTokenBalances(marketAid);
        
                // Implement withdrawal functionality here
                await withdrawMenu(tokens, configuration, marketAid)
        
                await aidMenu(tokens, configuration, marketAid);
                break;

        case "6":
            console.log("\n Pull all funds \n");

                // display the current aid balance
                console.log("The current aid balances:");

                await getTokenBalances(marketAid);
        
                // Implement pull all funds functionality here
                await withdrawAllTokens(marketAid, tokens);
        
                await aidMenu(tokens, configuration, marketAid);
                break;

        case "7":
            console.log("\nExiting the Market Aid Menu...");
            break;
    }
};



/**
 * Function allowing a user to create and interact with their MarketAid through the guided start
 * @param configuration - The bot configuration.
 * @dev many of the functions and code in here come from marketaid.ts
 */ 
async function helpUserCreateNewMarketAidInstance(configuration: BotConfiguration) {
    // get list of tokens based on selected network 
    tokens = getTokensByNetwork(configuration.network)
    // update erc20Tokens with new ERC20 instances for the new network
    for (const tokenInfo of tokens) {
        const token = new ERC20(tokenInfo.address, configuration.connections.signer);
        erc20Tokens.push(token);
    }
    console.log("Network state updated and token information retrieved")

    // step 1 - init aid factory based on the prev config settings
    const marketAidFactory = getAidFactory(configuration.network, configuration.connections.signer);
    
    // step 2 - get new address from factory
    const newMarketAidAddress = await marketAidFactory.createMarketAidInstance();
    console.log("New Market Aid Address: ", newMarketAidAddress);
    
    // step 3 - connect to aid
    console.log("\nConnecting to aid...")
    const marketAid = new MarketAid(newMarketAidAddress, configuration.connections.signer)
    console.log("\nConnected!")
    
    // step 4 - approve all tokens 
    console.log("Approving tokens for use...")
    await maxApproveMarketAidForAllTokens(erc20Tokens, marketAid, configuration.connections.signer);
    console.log("Tokens approved!")
    
    // step 5 - deposit assets
    await depositMenu(tokens, marketAid, rl)
    
    // step 6 - display balances 
    await getTokenBalances(marketAid);
    
    // step 7 - let a user manage 
    await aidMenu(tokens, configuration, marketAid)
    
    return { newMarketAidAddress, marketAid };
}

/**
 * Callback function confirming you want to start the bot 
 * @param rl - Readline instance
 * @param userMarketAidAddress - Market Aid address
 * @dev Final step before the bot is started
 */ 
function userConfirmStart(rl: any, userMarketAidAddress: string): Promise<string> {
    return new Promise(resolve => {
        rl.question('\n Do you want to start this strategy (yes/no):', (answer) => {
            if (answer.toLowerCase() === 'no') {
                console.log("Canceled");
                console.log("Your MarketAid can be found at: ", userMarketAidAddress);
                console.log("Use npm run aid to manage your aid and deposit/withdraw funds");
                resolve("no");
            } else {
                resolve("yes")
            }
        })
    });
}

/**
 * Starts a generic market-making bot based on the provided configuration.
 * @param configuration - The bot configuration.
 * @param rl - Optional readline interface for user input.
 * @param providedMarketAidAddress - Optional pre-selected MarketAid contract address.
 * @returns A Promise that resolves to void.
 * @TODO If user provides a MarketAid - make sure it has approvals and balances of tokens they want to target
 */
export async function startGenericMarketMakingBot(configuration: BotConfiguration, rl?: any, providedMarketAidAddress?: string, strategyArg?: string, premium?: number) {
    // Pass through from config (either a websocket or JSON RPC is allowed)
    var myProvider: ethers.providers.JsonRpcProvider | ethers.providers.WebSocketProvider;
    myProvider = (configuration.connections.jsonRpcProvider);

    var marketAidContractInstance: ethers.Contract;
    var userMarketAidAddress: string;
    if (providedMarketAidAddress) {
        userMarketAidAddress = providedMarketAidAddress;
    } else {
        userMarketAidAddress = await userMarketAidCheckCallback(configuration, rl);
    }

    if (userMarketAidAddress != "no") {
        console.log("The user selected to use an existing contract instance", userMarketAidAddress);
        const marketAidForExisting = new MarketAid(userMarketAidAddress, configuration.connections.signer);
        console.log("Opening menu for aid management...");
        await aidMenu(tokens, configuration, marketAidForExisting) 
        
        marketAidContractInstance = new ethers.Contract(userMarketAidAddress, MARKET_AID_INTERFACE, myProvider);
        console.log("\n This is my contract's address: ", marketAidContractInstance.address);

    } else {
        console.log("Let's create a new MarketAid...")
        userMarketAidAddress = (await helpUserCreateNewMarketAidInstance(configuration)).newMarketAidAddress;
        //console.log("The generated contract instance is at: ", userMarketAidAddress);
        marketAidContractInstance = new ethers.Contract(userMarketAidAddress, MARKET_AID_INTERFACE, myProvider);
        console.log("\n This is my contract's address: ", marketAidContractInstance.address);
    }

    const confirmation = await userConfirmStart(rl, userMarketAidAddress)
    if (confirmation === "yes") {
        console.log("Starting strat")
    } else {
        process.exit(1)
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

    var strat = getStrategyFromArg(strategyArg, referenceLiquidityVenue, premium ? premium : 0.005); // TODO: cleanup
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

    await bot.launchBot();
}

function getStrategyFromArg(strategyArg, referenceLiquidityVenue, premium: number) {
    // console.log();

    switch (strategyArg.toString().toLowerCase()) {
        // TODO extrapolate the identifiers to dictionary?
        case "riskminimized":
            return new RiskMinimizedStrategy(referenceLiquidityVenue, premium);
        case "targetvenueoutbid":
            return new TargetVenueOutBidStrategy(referenceLiquidityVenue, premium);
        default:
            throw new Error(`Invalid strategy argument: ${strategyArg}`);
    }
}


async function startBatchExecutorBotFromArgs(): Promise<void> {
    console.log("\nStarting a batch executor bot...");

    // Parse arguments and initialize configurations
    const chainId = parseFloat(process.argv[3]);
    if (!chainId) throw new Error('No chain ID found in process.argv');
    const marketAidContractAddress = process.argv[4];
    const botConfigsString = process.argv[5]; // New argument for bot configurations
    if (!botConfigsString) throw new Error('No bot configuration string found in process.argv');

    const jsonRpcUrl = process.env['JSON_RPC_URL_' + chainId.toString()];
    const websocketUrl = process.env['WEBSOCKET_URL_' + chainId.toString()];
    if (!jsonRpcUrl) throw new Error(`No JSON RPC URL found for network ${chainId}`);
    
    const staticJsonRpc = new ethers.providers.StaticJsonRpcProvider(jsonRpcUrl, chainId); // TODO: perhaps static provider for rpc consumption consciousness
    if (!process.env.EOA_PRIVATE_KEY) throw new Error('No EOA private key found in .env file');
    // Parse the bot configuration string
    // Parse the bot configuration string
    // Parse the bot configuration string
    const botConfigsArray = botConfigsString.split('_').map(config => {
        console.log("this is the config", config);
        console.log("this is the config split with $", config.split('$'));
        console.log("this is the config split with - ", config.split('-'));

        const [strategy, asset, quote, liquidityAllocation] = config.split('-');
        const strategyArgs = config.split('$')[1];

        return {
            strategy,
            asset,
            quote,
            liquidityAllocation: (liquidityAllocation),
            strategyArgs: strategyArgs
        };
    });

    // Create bots
    const bots: BatchableGenericMarketMakingBot[] = [];
    const marketAidContract = new ethers.Contract(marketAidContractAddress, MARKET_AID_INTERFACE, staticJsonRpc);

    for (const botConfig of botConfigsArray) {
        const { strategy, asset, quote, liquidityAllocation } = botConfig;

        // Log out bot configuration
        console.log(`\nStarting bot with configuration:`);
        console.log(`\tStrategy: ${strategy}`);
        console.log(`\tAsset: ${asset}`);
        console.log(`\tQuote: ${quote}`);
        console.log(`\tLiquidity Allocation: ${liquidityAllocation}`);

        const _assetLiquidityAllocation = parseFloat(liquidityAllocation.split('$')[0].split(',')[0]);
        const _quoteLiquidityAllocation = parseFloat(liquidityAllocation.split('$')[0].split(',')[1]);

        const _index = botConfigsArray.indexOf(botConfig);
        // Extract asset and quote tokens from the trading pair
        const assetTokenInfo = tokenList.tokens.find(token => token.address == asset && token.chainId == chainId);
        const quoteTokenInfo = tokenList.tokens.find(token => token.address == quote && token.chainId == chainId);

        if (!assetTokenInfo) throw new Error(`No token found for address ${asset} on network ${chainId}`);
        if (!quoteTokenInfo) throw new Error(`No token found for address ${quote} on network ${chainId}`);

        // Create strategy instance
        const referenceLiquidityVenue = new UniswapLiquidityVenue(
            {
                asset: assetTokenInfo,
                quote: quoteTokenInfo
            }, staticJsonRpc, chainId == 10 ? 500 : undefined // TODO: make this configurable
        );

        const strategyInstance = getStrategyFromArg(strategy, referenceLiquidityVenue, parseFloat(botConfig.strategyArgs));

        var config = {
            network: chainId,
            targetTokens: [assetTokenInfo, quoteTokenInfo],
            connections: {
                jsonRpcProvider: staticJsonRpc,
                websocketProvider: websocketUrl ? new ethers.providers.WebSocketProvider(websocketUrl, chainId) : undefined,
                signer: new ethers.Wallet(process.env.EOA_PRIVATE_KEY, staticJsonRpc)
            },
            botType: BotType.MarketMaking,
            strategy: strategyInstance //TODO: is this right?
        };

        const bot = new BatchableGenericMarketMakingBot(config, marketAidContract, strategyInstance, await config.connections.signer.getAddress(), _index, {
            asset: _assetLiquidityAllocation,
            quote: _quoteLiquidityAllocation
        });
        bots.push(bot);
    }

    console.log("start batch executor bot from args...");

    // Create and start the batch executor
    const batchExecutor = new BatchStrategyExecutor(bots, config, marketAidContract);

    // Start the bots
    // bots.forEach(bot => bot.launchBot());
}


async function startGenericMarketMakingBotFromArgs(): Promise<void> {
    console.log("\n Starting Generic Market Making Bot")
    
    // Parse arguments and initialize configurations
    const chainId = parseFloat(process.argv[3]);
    if (!chainId) throw new Error('No chain ID found in process.argv');
    const marketAidContractAddress = process.argv[4];
    const botConfigsString = process.argv[5]; // New argument for bot configurations
    if (!botConfigsString) throw new Error('No bot configuration string found in process.argv');
    
    const jsonRpcUrl = process.env['JSON_RPC_URL_' + chainId.toString()];
    const websocketUrl = process.env['WEBSOCKET_URL_' + chainId.toString()];
    if (!jsonRpcUrl) throw new Error(`No JSON RPC URL found for network ${chainId}`);
    
    const staticJsonRpc = new ethers.providers.StaticJsonRpcProvider(jsonRpcUrl, chainId); // TODO: perhaps static provider for rpc consumption consciousness
    if (!process.env.EOA_PRIVATE_KEY) throw new Error('No EOA private key found in .env file');
    // Parse the bot configuration string
    // Parse the bot configuration string
    // Parse the bot configuration string
    const botConfigsArray = botConfigsString.split('_').map(config => {
        console.log("this is the config", config);
        console.log("this is the config split with $", config.split('$'));
        console.log("this is the config split with - ", config.split('-'));

        const [strategy, asset, quote, liquidityAllocation] = config.split('-');
        const strategyArgs = config.split('$')[1];

        return {
            strategy,
            asset,
            quote,
            liquidityAllocation: (liquidityAllocation),
            strategyArgs: strategyArgs
        };
    });

    // Create bots 
    const bots: GenericMarketMakingBot[] = [];
    const marketAidContract = new ethers.Contract(marketAidContractAddress, MARKET_AID_INTERFACE, staticJsonRpc);

    for (const botConfig of botConfigsArray) {
        const { strategy, asset, quote, liquidityAllocation } = botConfig;

        // Log out bot configuration
        console.log(`\nStarting bot with configuration:`);
        console.log(`\tStrategy: ${strategy}`);
        console.log(`\tAsset: ${asset}`);
        console.log(`\tQuote: ${quote}`);
        console.log(`\tLiquidity Allocation: ${liquidityAllocation}`);

        const _assetLiquidityAllocation = parseFloat(liquidityAllocation.split('$')[0].split(',')[0]);
        const _quoteLiquidityAllocation = parseFloat(liquidityAllocation.split('$')[0].split(',')[1]);

        const _index = botConfigsArray.indexOf(botConfig);
        // Extract asset and quote tokens from the trading pair
        const assetTokenInfo = tokenList.tokens.find(token => token.address == asset && token.chainId == chainId);
        const quoteTokenInfo = tokenList.tokens.find(token => token.address == quote && token.chainId == chainId);

        if (!assetTokenInfo) throw new Error(`No token found for address ${asset} on network ${chainId}`);
        if (!quoteTokenInfo) throw new Error(`No token found for address ${quote} on network ${chainId}`);

        // Create strategy instance
        const referenceLiquidityVenue = new UniswapLiquidityVenue(
            {
                asset: assetTokenInfo,
                quote: quoteTokenInfo
            }, staticJsonRpc, chainId == 10 ? 500 : undefined // TODO: make this configurable
        );

        const strategyInstance = getStrategyFromArg(strategy, referenceLiquidityVenue, parseFloat(botConfig.strategyArgs));

        var config = {
            network: chainId,
            targetTokens: [assetTokenInfo, quoteTokenInfo],
            connections: {
                jsonRpcProvider: staticJsonRpc,
                websocketProvider: websocketUrl ? new ethers.providers.WebSocketProvider(websocketUrl, chainId) : undefined,
                signer: new ethers.Wallet(process.env.EOA_PRIVATE_KEY, staticJsonRpc)
            },
            botType: BotType.MarketMaking,
            strategy: strategyInstance //TODO: is this right?
        };

    // Read the premium value from the command line arguments
    const premium = parseFloat(process.argv[7]);
    if (!premium) throw new Error('No premium value found in process.argv');

    console.log("Spin up UNI reference venue with these tokens", config.targetTokens[0], config.targetTokens[1]);

    // return startGenericMarketMakingBot(config, undefined,
    //     marketAidContractAddress, strategyArg, premium);
}}

async function main(): Promise<void> {
    console.log("This is process.argv", process.argv);

    const command = process.argv[2];
    switch (command) {
        case 'startGenericMarketMakingBot':
            await startGenericMarketMakingBotFromArgs();
            break;
        case 'startBatchExecutorBot':
            await startBatchExecutorBotFromArgs();
            break;
        default:
            throw new Error(`Invalid command: ${command}`);
    }
}


//main()
