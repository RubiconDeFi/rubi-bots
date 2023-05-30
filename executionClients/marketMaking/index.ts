import * as dotenv from "dotenv";
import { ethers, BigNumber } from "ethers";
import { BotConfiguration, BotType, MarketMakingStrategy, tokenList } from "../../configuration/config";
import { getAddress } from "ethers/lib/utils";
import  MARKET_AID_INTERFACE  from "../../configuration/abis/MarketAid"; //weird error when this import is in { }
import { RiskMinimizedStrategy } from "../../strategies/marketMaking/riskMinimizedUpOnly";
import { UniswapLiquidityVenue } from "../../liquidityVenues/uniswap";
import { GenericMarketMakingBot } from "./GenericMarketMakingBot";
import { rl, getAidFactory, maxApproveMarketAidForAllTokens, getTokensByNetwork, withdrawAllTokens } from "../../configuration/marketAid";
import { MarketAidFactory } from "../../utilities/contracts/MarketAidFactory";
import { MarketAid } from "../../utilities/contracts/MarketAid";
import { TokenInfo } from "@uniswap/token-lists";
import { ERC20 } from "../../utilities/contracts/ERC20";
import { start } from "repl";
dotenv.config();

// set variables 
let tokens: TokenInfo[] = [];
let erc20Tokens: ERC20[] = [];

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

// function for a simple custom deposit menu 
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

// function for a custom withdraw menu
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

// function from marketaid implemented here to use the state variables in this file
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


// function that lets a user manage their generated market aid (similar to npm run aid)
// for further options, a user should use npm run aid 
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



// function that lets a user create a MarketAid contract 
async function helpUserCreateNewMarketAidInstance(configuration: BotConfiguration) {
    //creating token states to pull them for different networks
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
    await depositMenu(tokens, marketAid, rl)
    //step 6 - display balances 
    await getTokenBalances(marketAid);
    //step 7 - let a user manage 
    await aidMenu(tokens, configuration, marketAid)
    return { newMarketAidAddress, marketAid };
}

// callback function confirming you want to start the bot 
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
        userMarketAidAddress = (await helpUserCreateNewMarketAidInstance(configuration)).newMarketAidAddress;
        console.log("The generated contract instance is at: ", userMarketAidAddress);
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
  