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

import { ERC20 } from "../../utilities/contracts/ERC20";
import { MarketAid } from "../../utilities/contracts/MarketAid";

import { TokenInfo } from "@uniswap/token-lists";
import { start } from "repl";

dotenv.config();

// set variables for use in function 
let tokens: TokenInfo[] = [];
let erc20Tokens: ERC20[] = [];

/**
 * Checks if the user has an existing MarketAid contract instance to use
 * @param configuration - The bot configuration.
 * @param rl - The readline interface.
 * @returns A Promise that resolves to a string indicating the user's choice:
 * If the user wants to create a new contract instance, the Promise resolves to "no".
 * If the user wants to use an existing contract instance, the Promise resolves to the address of that instance.
 */
function userMarketAidCheckCallback(configuration: BotConfiguration, rl): Promise<string> {
    return new Promise(resolve => {
        rl.question('\n Do you have an existing MarketAid contract instance you would like to use? (Enter "yes" to connect to an existing aid, or enter "no" to create one):', async (answer) => {
            if (answer.toLowerCase() === 'no') {
                resolve("no");
            } 
            else if (answer.toLowerCase() === 'yes') {
                console.log("Opening connection menu")
                resolve("yes")
            }
            else {
                console.log("Invalid input. Please choose either 'yes' or 'no'")
                guidedStartGenericMarketMakingBot(configuration, rl)
            }
        })
    })
};

/**
 * Callback to select an existing marketaid 
 * @param aidCheck list of all the market aids
 * @returns {Promise<string>} the address of an existing marketaid selection
 */
async function selectExistingMarketAid(aidCheck: string[]): Promise<string> {
    return new Promise((resolve) => {
        console.log("Here are you existing MarketAid instances: ")
        aidCheck.forEach((aid, index) => {
            console.log(`${index + 1}: ${aid}`);
        });
        rl.question("Please enter the number corresponding to the MarketAid instance you want to connect to: ", (answer) => {
            const selectedIndex = parseInt(answer.trim()) - 1;
            if (selectedIndex >= 0 && selectedIndex < aidCheck.length) {
                resolve(aidCheck[selectedIndex]);
            } else {
                console.log("Invalid selection. Please try again.");
                resolve(selectExistingMarketAid(aidCheck));
            }
        });
    });
}

/**
 * Connect to an existing market aid 
 * @param configuration bot configs for the strategy 
 * @param rl readline instance
 * @returns {Promise<MarketAid>} a market aid 
 */
async function connectToExistingMarketAid(configuration: BotConfiguration, rl): Promise<MarketAid> {
    let aids;
    let signer: string
    let selectedAidAddress: string;
    let marketAid: MarketAid;

    // get the eth address 
    signer = await configuration.connections.signer.getAddress()
    
    // get a list of the signer aids 
    const marketAidFactory = getAidFactory(configuration.network, configuration.connections.signer);
    aids = await marketAidFactory.getUserMarketAids(signer)

    if (aids.length === 0){
        console.log("You have no Market Aids. Please create a new one")
        userMarketAidCheckCallback(configuration, rl)
    }

    selectedAidAddress = await selectExistingMarketAid(aids);
    marketAid = new MarketAid(selectedAidAddress, configuration.connections.signer)
    console.log("Connected to MarketAid: ", marketAid.address)

    return marketAid;
}

/**
 * Function allowing a user to create and interact with their MarketAid through the guided start
 * @param configuration - The bot configuration.
 * @dev many of the functions and code in here come from marketaid.ts
 */ 
async function helpUserCreateNewMarketAidInstance(configuration: BotConfiguration) {
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
    console.log("7. Exit menu and run bot");

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
            const formattedAmount = ethers.utils.parseUnits(amountAnswer, selectedToken.decimals)
            depositAmounts.push(formattedAmount);

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
 * Callback function to input premium for strategy 
 * @param rl - Readline instance
 */ 
function userPremium(rl: any): Promise<number> {
    return new Promise(resolve => {
        rl.question("Please provide a premium for your strategy (this is the additional spread, measured as a percent of price, to be applied to the strategy):" , (answer) => {
            if (answer > 0) {
                resolve(answer)
            }
            else {
                console.log("Invalid input. Please try again")
                userPremium(rl);
            }
        })}
    )
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

export function getStrategyFromArg(strategyArg: string, referenceLiquidityVenue: any, premium: number) {
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

/**
 * Starts a generic market-making bot based on the provided configuration.
 * This function is for the guidedStart. Directly calling the generic function will use generic market making with arguments
 * @param configuration - The bot configuration.
 * @param rl - Optional readline interface for user input.
 * @param providedMarketAidAddress - Optional pre-selected MarketAid contract address.
 * @returns A Promise that resolves to void.
 * @TODO If user provides a MarketAid - make sure it has approvals and balances of tokens they want to target
 */
export async function guidedStartGenericMarketMakingBot(configuration: BotConfiguration, rl?: any, providedMarketAidAddress?: string, premium?: number) {
    // Update the tokens based on network to use throughout flow
    tokens = getTokensByNetwork(configuration.network)
    // Update erc20Tokens with new ERC20 instances for the new network
    for (const tokenInfo of tokens) {
        const token = new ERC20(ethers.utils.getAddress(tokenInfo.address), configuration.connections.signer);
        erc20Tokens.push(token);
    }
    
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

    if (userMarketAidAddress == "yes") {
        const marketAidForExisting = await connectToExistingMarketAid(configuration, rl)
        userMarketAidAddress = marketAidForExisting.address
        // health check for marketaid
        // 1. have they approved market aid for assets they selected in their strategy
        // 2. what are the balances for the market aid
        console.log("--------------------------------------------");
        console.log("⛑ Market Aid Health Checkup ⛑");
        console.log("\nMarket Aid Balance");
        await getTokenBalances(marketAidForExisting);
        console.log("\nToken approvals\n");

        const allowancePromises = erc20Tokens.map(async (token) => {
            return token.allowance(process.env.DEV_EOA, marketAidForExisting.address, true);
        });
  
        const allowances = await Promise.all(allowancePromises);
  
        allowances.forEach((allowance, index) => {
            if (allowance === "0.0") {
                console.log(tokens[index].name, " is NOT approved. Please run Max Approve in the market aid menu below")
            }
            else {
                console.log("Use of", tokens[index].name, "is confirmed")
            }
        });
        console.log("--------------------------------------------");

        console.log("Opening menu for aid management...");
        await aidMenu(tokens, configuration, marketAidForExisting);

        marketAidContractInstance = new ethers.Contract(userMarketAidAddress, MARKET_AID_INTERFACE, myProvider);
        console.log("\n This is my contract's address: ", marketAidContractInstance.address);

    } else {
        console.log("Let's create a new MarketAid...")
        userMarketAidAddress = (await helpUserCreateNewMarketAidInstance(configuration)).newMarketAidAddress;
        marketAidContractInstance = new ethers.Contract(userMarketAidAddress, MARKET_AID_INTERFACE, myProvider);
        console.log("\n This is my contract's address: ", marketAidContractInstance.address);
    }

    const getPremium = await userPremium(rl)
    
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

    if (configuration.strategy == 1) {
        var strat = getStrategyFromArg("riskminimized", referenceLiquidityVenue, getPremium); // TODO: cleanup
    }
    else if (configuration.strategy == 2) {
        var strat = getStrategyFromArg("targetoutbid", referenceLiquidityVenue, getPremium); // TODO: cleanup
    }

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