import * as dotenv from "dotenv";

import { ethers, Signer, BigNumber } from "ethers";
import { TokenInfo } from "@uniswap/token-lists";

import { tokenList } from "../configuration/config";
import { BotConfiguration, OnChainBookWithData, SimpleBook, StrategistTrade, marketAddressesByNetwork, Network, marketAidFactoriesByNetwork } from "../configuration/config";

import { ERC20 } from "../utilities/contracts/ERC20";
import { MarketAid } from "../utilities/contracts/MarketAid" 
import { MarketAidFactory } from "../utilities/contracts/MarketAidFactory"
import { escape } from "querystring";

dotenv.config();

// set a default network to use
let network: Network = Network.OPTIMISM_MAINNET;

// set variables for the json rpc provider, signer, and market aid factory
// TODO: setting these state variables makes it harder to export the functions using them
let jsonRpcProvider;
let signer;
let marketAidFactory;   
let tokens: TokenInfo[] = [];
let erc20Tokens: ERC20[] = [];

// this readline is used across the guided start and aid
const readline = require('node:readline');
let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Checks if the provided address is a valid Ethereum address.
 * @param {string} address - The address to be validated.
 * @returns {boolean} Returns true if the address is valid, false otherwise.
 */
function isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Asks the user to enter an Ethereum address and validates the input.
 * @returns {Promise<string>} A promise that resolves with the valid Ethereum address entered by the user.
 * @throws {Error} Throws an error if the input address is invalid.
 */
async function askForAddress(): Promise<string> {
    return new Promise((resolve, reject) => {
        rl.question("Please enter an Ethereum address: ", (input) => {
            const address = input.trim();
            if (isValidEthereumAddress(address)) {
                resolve(address);
            } else {
                console.log("Invalid Ethereum address. Please try again.");
                askForAddress().then(resolve).catch(reject);
            }
        });
    });
}


/**
 * Takes a network object and returns the json rpc provider and signer for the network
 * @param network the network object to get the json rpc provider and signer for
 * @returns the json rpc provider and signer for the network
 */
function getNetworkInfo(network: Network): { jsonRpcProvider: ethers.providers.JsonRpcProvider, signer: ethers.Signer, websocketProvider?: ethers.providers.WebSocketProvider } {
    const jsonRpcUrl = process.env['JSON_RPC_URL_' + network.toString()];
    const websocketUrl = process.env['WEBSOCKET_URL_' + network.toString()];
    if (!jsonRpcUrl) throw new Error(`No JSON RPC URL found for network ${network}`);

    const jsonrpc = new ethers.providers.JsonRpcProvider(jsonRpcUrl); // TODO: perhaps static provider for rpc consumption consciousness
    if (!process.env.EOA_PRIVATE_KEY) throw new Error('No EOA private key found in .env file');
    
    return {
        jsonRpcProvider: jsonrpc,
        signer: new ethers.Wallet(process.env.EOA_PRIVATE_KEY, jsonrpc),
        websocketProvider: websocketUrl ? new ethers.providers.WebSocketProvider(websocketUrl) : undefined
    }
}

/**
 * Takes a network object and returns the token list for the network
 * @param network the network object to get the token list for
 * @returns the token list for the network
 */
function getTokensByNetwork(network: Network): TokenInfo[] {
    return tokenList.tokens.filter((token) => token.chainId === network);
}

/**
 * Takes a network object and returns the market aid factory for the network
 * @param network the network object to get the market aid factory for
 * @param signer the signer to use for the market aid factory
 * @returns the market aid factory for the network
 * @throws an error if no market aid factory address is found for the network 
 * @TODO instead of throwing an error, prompt the user to choose a different network (this requires changing the networkMenu code)
 */
function getAidFactory(network: Network, signer: ethers.Signer): MarketAidFactory {
    const factoryAddress = marketAidFactoriesByNetwork[network];
    if (!factoryAddress) {
      throw new Error(`No Market Aid Factory address found for network ${network}`);
    }
    const marketAidFactory = new MarketAidFactory(factoryAddress, signer);
    return marketAidFactory;
}

/**
 * Takes a network object and updates the network, tokens, and erc20Tokens variables
 * @param newNetwork the network object to update the network, tokens, and erc20Tokens variables for
 * @returns void
 */ 
async function switchNetwork(newNetwork: Network) {
    network = newNetwork;
    tokens = getTokensByNetwork(network);
  
    // Clear the existing erc20Tokens array
    erc20Tokens = [];
    
    // Update the signer and jsonRpcProvider for the new network
    const networkInfo = getNetworkInfo(network);
    signer = networkInfo.signer;
    jsonRpcProvider = networkInfo.jsonRpcProvider;
  
    // Update erc20Tokens with new ERC20 instances for the new network
    for (const tokenInfo of tokens) {
      const token = new ERC20(tokenInfo.address, signer);
      erc20Tokens.push(token);
    }
}

/**
 * Helper function to print the token balances for a given address
 * @param address the address to print the token balances for
 * @returns void
 */
async function printTokenBalances(address: string) {
    for (const token of erc20Tokens) {
      const balance = await token.balanceOf(address);
      const tokenInfo = tokens.find((t) => t.address === token.address);
  
      if (tokenInfo) {
        console.log(
          `Balance of ${tokenInfo.name} (${tokenInfo.symbol}): ${balance} ${tokenInfo.symbol}`
        );
      }
    }
}

/**
 * Retrieves the token balances for the provided Ethereum address.
 * @param {string} address - The Ethereum address for which to retrieve token balances.
 * @returns {Promise<Array<{ name: string, symbol: string, balance: string }>>} A promise that resolves with an array of token balance objects containing name, symbol, and balance information.
 */
async function getTokenBalances(address: string) {
    const balancePromises = erc20Tokens.map(async (token) => {
        const balance = await token.balanceOf(address);
        const tokenInfo = tokens.find((t) => t.address === token.address);
        if (tokenInfo) {
            return {
                name: tokenInfo.name,
                symbol: tokenInfo.symbol,
                balance: balance,
            };
        }
    });
    const balances = await Promise.all(balancePromises);
    return balances.filter((balance) => balance !== undefined);
}

/**
 * Max approve the Market Aid for all tokens in the ERC20 token list.
 * @param tokens - An array of ERC20 token instances.
 * @param marketAid - The MarketAid instance.
 * @param signer - The signer to send the transaction from.
 * @returns An array of transaction receipts.
 * @TODO all of these calls should be batched into a single transaction
 */
async function maxApproveMarketAidForAllTokens(tokens: ERC20[], marketAid: MarketAid, signer: Signer): Promise<string> {
    for (const token of tokens) {
        try {
            const max = await token.maxApprove(signer, marketAid.address);
            console.log(`\nMax approved ${await token.symbol()} for Market Aid at ${marketAid.address}\n`);
        } catch (error) {
            console.error(`Failed to max approve ${await token.symbol()} for Market Aid at ${marketAid.address}:`, error);
        }
    }
    return "success!";
    
}  

/**
 * Withdraw all tokens from the Market Aid.
 * @param marketAid - The MarketAid instance.
 * @param tokens - An array of token info objects.
 * @returns void
 */
async function withdrawAllTokens(marketAid: MarketAid, tokens: TokenInfo[]): Promise<void> {
    console.log("\nWithdrawing all tokens...");
    // Extract the token addresses from the tokens array
    const tokenAddresses = tokens.map(token => token.address);
    try {
        const pulledFunds = await marketAid.adminPullAllFunds(tokenAddresses);
        console.log("\nWithdrawal successful. Pulled funds:");
        for (const tokenAddress in pulledFunds) {
            const token = tokens.find((t) => t.address === tokenAddress);
            if (token) {
                const pulledAmount = pulledFunds[tokenAddress];
                const humanReadableAmount = pulledAmount.div(BigNumber.from(10).pow(token.decimals)).toNumber();
                console.log(`Pulled ${humanReadableAmount} ${token.symbol} (${token.name})`);
            }
        }
    } catch (error) {
        console.error("Failed to withdraw all tokens:", error);
    }
}

/**
 * Allows the user to select an existing MarketAid instance by providing the corresponding number.
 * @param {string[]} aidCheck - An array of existing MarketAid instances to choose from.
 * @returns {Promise<string>} A promise that resolves with the selected MarketAid instance.
 */
async function selectExistingMarketAid(aidCheck: string[]): Promise<string> {
    return new Promise((resolve) => {
        console.log("Here are your existing MarketAid instances:");
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
 * Displays a menu for depositing assets into a MarketAid instance.
 * @param {MarketAid} marketAid - The MarketAid instance to deposit assets into.
 * @param {readline.Interface} rl - The readline interface for user input.
 * @returns {Promise<void>} A promise that resolves when the deposit process is completed.
 */
async function depositMenu(marketAid: MarketAid, rl): Promise<void> {
    const depositAssets: string[] = [];
    const depositAmounts: BigNumber[] = [];
    console.log("break")
    const addAssetToDeposit = async () => {
        console.log("\nSelect an asset to deposit:");
        tokens.forEach((token, index) => {
            console.log(`${index + 1}: ${token.name} (${token.symbol})`);
        });
        console.log(`${tokens.length + 1}: Done`);

        rl.question("Enter the number corresponding to the asset you want to deposit: ", async (answer) => {
            const selectedIndex = parseInt(answer.trim()) - 1;
            if (selectedIndex >= 0 && selectedIndex < tokens.length) {
                const selectedToken = tokens[selectedIndex];
                depositAssets.push(selectedToken.address);

                rl.question(`Enter the amount of ${selectedToken.symbol} to deposit: `, (amountAnswer) => {
                    const amount = parseFloat(amountAnswer.trim());
                    // Convert the input amount to the smallest token unit using the token decimals
                    const smallestUnitAmount = BigNumber.from((amount * 10 ** selectedToken.decimals).toFixed());
                    depositAmounts.push(smallestUnitAmount);
                    addAssetToDeposit();
                });
            } else if (selectedIndex === tokens.length) {
                console.log("\nDeposit summary:");
                if (depositAssets.length === 0) {
                    console.log("No assets selected to deposit. Exiting deposit menu.");
                    aidMenu(marketAid) // Exit back to menu
                }
                depositAssets.forEach((asset, index) => {
                    const token = tokens.find((t) => t.address === asset);
                    if (token) {
                        console.log(`Deposit ${depositAmounts[index]} ${token.symbol}`);
                    }
                });

                rl.question("\nAre you sure you want to proceed with the deposit? (yes/no): ", async (confirmation) => {
                    if (confirmation.trim().toLowerCase() === "yes") {
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
                    aidMenu(marketAid);
                });
            } else {
                console.log("Invalid selection. Please try again.");
                addAssetToDeposit();
            }
        });
    };
    addAssetToDeposit();
}

/**
 * Displays a menu for withdrawing assets from a MarketAid instance.
 * @param {MarketAid} marketAid - The MarketAid instance to withdraw assets from.
 * @returns {Promise<void>} A promise that resolves when the withdrawal process is completed.
 */
async function withdrawMenu(marketAid: MarketAid): Promise<void> {
    const withdrawAssets: string[] = [];
    const withdrawAmounts: BigNumber[] = [];

    const addAssetToWithdraw = async () => {
        console.log("\nSelect an asset to withdraw:");
        tokens.forEach((token, index) => {
            console.log(`${index + 1}: ${token.name} (${token.symbol})`);
        });
        console.log(`${tokens.length + 1}: Done`);

        rl.question("Enter the number corresponding to the asset you want to withdraw: ", async (answer) => {
            const selectedIndex = parseInt(answer.trim()) - 1;
            if (selectedIndex >= 0 && selectedIndex < tokens.length) {
                const selectedToken = tokens[selectedIndex];
                withdrawAssets.push(selectedToken.address);

                rl.question(`Enter the amount of ${selectedToken.symbol} to withdraw: `, (amountAnswer) => {
                    const amount = parseFloat(amountAnswer.trim());
                    // Convert the input amount to the smallest token unit using the token decimals
                    const smallestUnitAmount = BigNumber.from((amount * 10 ** selectedToken.decimals).toFixed());
                    withdrawAmounts.push(smallestUnitAmount);
                    addAssetToWithdraw();
                });
            } else if (selectedIndex === tokens.length) {
                console.log("\nWithdrawal summary:");
                withdrawAssets.forEach((asset, index) => {
                    const token = tokens.find((t) => t.address === asset);
                    if (token) {
                        console.log(`Withdraw ${withdrawAmounts[index]} ${token.symbol}`);
                    }
                });

                rl.question("\nAre you sure you want to proceed with the withdrawal? (yes/no): ", async (confirmation) => {
                    if (confirmation.trim().toLowerCase() === "yes") {
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
                    aidMenu(marketAid);
                });
            } else {
                console.log("Invalid selection. Please try again.");
                addAssetToWithdraw();
            }
        });
    };
    addAssetToWithdraw();
}

/**
 * Displays the admin menu for maximum approval of an asset for a venue.
 * Prompts the user to enter the address of the venue to approve, and then
 * allows the user to select an asset to approve for the venue.
 * After approving an asset, the user is presented with post-approval options.
 * The function loops until the user chooses to return to the aid menu.
 * @param {MarketAid} marketAid The MarketAid instance
 * @returns {Promise<void>} A Promise that resolves once the admin menu is completed
 */
async function adminMaxApproveMenu(marketAid: MarketAid): Promise<void> {
    let venueAddress: string;

    const inputVenueAddress = async () => {
        rl.question("\nEnter the address of the venue you want to approve: ", (address) => {
            venueAddress = address.trim();
            approveAssetForVenue();
        });
    };

    const approveAssetForVenue = async () => {
        console.log("\nSelect an asset to approve:");
        tokens.forEach((token, index) => {
            console.log(`${index + 1}: ${token.name} (${token.symbol})`);
        });

        rl.question("Enter the number corresponding to the asset you want to approve: ", async (answer) => {
            const selectedIndex = parseInt(answer.trim()) - 1;
            if (selectedIndex >= 0 && selectedIndex < tokens.length) {
                const selectedToken = tokens[selectedIndex];
                const asset = selectedToken.address;

                try {
                    const txHash = await marketAid.adminMaxApproveTarget(venueAddress, asset);
                    console.log(`\nApproved ${selectedToken.name} (${selectedToken.symbol}) for address ${venueAddress}. Transaction hash: ${txHash}`);
                } catch (error) {
                    console.error("Failed to approve:", error);
                }

                postApprovalMenu();
            } else {
                console.log("Invalid selection. Please try again.");
                approveAssetForVenue();
            }
        });
    };

    const postApprovalMenu = () => {
        console.log("\nOptions:");
        console.log("1: Approve another asset for the same venue");
        console.log("2: Change venue and approve assets");
        console.log("3: Return to the aid menu");

        rl.question("Enter the number corresponding to your choice: ", (answer) => {
            const choice = parseInt(answer.trim());

            switch (choice) {
                case 1:
                    approveAssetForVenue();
                    break;
                case 2:
                    inputVenueAddress();
                    break;
                case 3:
                    aidMenu(marketAid);
                    break;
                default:
                    console.log("Invalid selection. Please try again.");
                    postApprovalMenu();
            }
        });
    };

    inputVenueAddress();
}

/**
 * Displays the Market Aid menu allowing a user to manage their aid
 * @param {MarketAid} marketAid The MarketAid instance
 * @returns {Promise<void>} A Promise that resolves once the admin menu is completed
 */
async function aidMenu(marketAid: MarketAid): Promise<void> {
    console.log("\nMarket Aid Menu");
    console.log("");
    console.log("1. View Market Aid Info");
    console.log("2. Check if strategist is approved");
    console.log("3. View Market Aid Balance");
    console.log("4. Deposit to the aid");
    console.log("5. Withdraw from the aid");
    console.log("6. Pull all funds");
    console.log("7. Approve a target venue");
    console.log("8. Approve a strategist");
    console.log("9. Remove a strategist");
    console.log("10. Max approve the token list for the Market Aid");
    console.log("")
    console.log("11. Change Market Aids");
    console.log("12. Exit");

    rl.question("\n Pick a number (1-12): ", async (answer: string) => {
        let marketAddress;
        let admin;
        let aidBalances;
        let inputAddress;

        switch (answer.toLowerCase()) {
            case '1':
                console.log("\n View Market Aid Info \n");
                marketAddress = await marketAid.getRubiconMarketAddress();
                admin = await marketAid.getAdmin();
                
                // check if the admin address is the same as the connected EOA
                if (admin === signer.address) {
                    console.log("You are the admin of this Market Aid");
                } else {
                    console.log("You are not the admin of this Market Aid");
                }
                
                console.log("Market Address: ", marketAddress);
                aidMenu(marketAid)
                break;
                
            case '2':
                console.log("\n Check if strategist is approved \n");

                rl.question("Enter the strategist address: ", async (answer: string) => {
                    const strategistAddress = answer.trim();
                    const isApproved = await marketAid.isApprovedStrategist(strategistAddress);
                    console.log("Is strategist approved: ", isApproved);
                    aidMenu(marketAid)
                });
                break;

            case '3':
                console.log("\n View Market Aid Balance \n");

                aidBalances = await getTokenBalances(marketAid.address);
                aidBalances.forEach((balance) => {
                  console.log(
                    `Balance of ${balance.name} (${balance.symbol}): ${balance.balance} ${balance.symbol}`
                  );
                });
        
                aidMenu(marketAid);
                break;

            case "4":
                console.log("\n Deposit to the aid \n");
                // diplay the current user balance
                console.log("Your current balances:");

                const userBalances = await getTokenBalances(signer.address);
                userBalances.forEach((balance) => {
                    console.log(
                        `Balance of ${balance.name} (${balance.symbol}): ${balance.balance} ${balance.symbol}`
                    );
                });

                await depositMenu(marketAid, rl);
                break;

            case "5":
                console.log("\n Withdraw from the aid \n");
                // display the current aid balance
                console.log("The current aid balances:");

                aidBalances = await getTokenBalances(marketAid.address);
                aidBalances.forEach((balance) => {
                    console.log(
                        `Balance of ${balance.name} (${balance.symbol}): ${balance.balance} ${balance.symbol}`
                    );
                });
        
                await withdrawMenu(marketAid)
                break;
        
            case "6":
                console.log("\n Pull all funds \n");
                // display the current aid balance
                console.log("The current aid balances:");

                aidBalances = await getTokenBalances(marketAid.address);
                aidBalances.forEach((balance) => {
                    console.log(
                        `Balance of ${balance.name} (${balance.symbol}): ${balance.balance} ${balance.symbol}`
                    );
                });
        
                await withdrawAllTokens(marketAid, tokens);
                aidMenu(marketAid);
                break;

            case "7":
                console.log("\nApprove a target venue\n");
                await adminMaxApproveMenu(marketAid)
                await aidMenu(marketAid);
                break

            case "8":
                console.log("\nApprove a strategist\n");
                
                inputAddress = await askForAddress();
                console.log("The entered address is:", inputAddress);
                
                await marketAid.approveStrategist(inputAddress);
                console.log(`Strategist ${inputAddress} approved`);
                
                await aidMenu(marketAid);
                break;

            case "9":
                console.log("\nRemove a strategist\n");

                inputAddress = await askForAddress();
                console.log("The entered address is:", inputAddress);

                await marketAid.removeStrategist(inputAddress);
                console.log(`Strategist ${inputAddress} removed`);

                aidMenu(marketAid);
                break;

            case "10":
                console.log("\n Max approve the token list for the Market Aid \n");
                
                await maxApproveMarketAidForAllTokens(erc20Tokens, marketAid, signer);
                aidMenu(marketAid);
                break;

            case "11": 
                aidFactoryMenu(marketAidFactory);
                break;

            case "12":
                console.log("\n SEE YOU DEFI COWBOY...");
                rl.close();
                process.exit(0);
                break;
        };
    });
};

/**
 * Displays the Market Aid Factory menu. This is 1 level higher than the Market Aid menu
 * @param {MarketAidFactory} marketAidFactory The MarketAid Factory instance 
 * @returns {Promise<void>} A Promise that resolves once the admin menu is completed
 */
async function aidFactoryMenu(marketAidFactory: MarketAidFactory): Promise<void> {
    console.log("\nMarket Aid Factory Menu");
    console.log("");
    console.log("1. Connect to an existing Market Aid");
    console.log("2. View existing Market Aids");
    console.log("3. Create a new Market Aid");
    console.log("4. Return to Network Menu");
    console.log("5. Quit (exit the program)");

    rl.question("\n Pick a number (1-5): ", async (answer: string) => {
        let aids;
        let selectedAidAddress: string;
        let marketAid: MarketAid;

        switch (answer.toLowerCase()) {
            case '1':
                console.log("\n Connect to an existing Market Aid \n");
    
                aids = await marketAidFactory.getUserMarketAids(signer.address);
                
                if (aids.length === 0) {
                    console.log("You have no Market Aids. Returning to Network Menu...\n");
                    networkMenu();
                    break;
                }
    
                selectedAidAddress = await selectExistingMarketAid(aids);
                marketAid = new MarketAid(selectedAidAddress, signer);
                console.log("Connected to Market Aid: ", marketAid.address);

                aidMenu(marketAid);
                break;

            case '2':
                console.log("\n View existing Market Aids \n");

                aids = await marketAidFactory.getUserMarketAids(signer.address);
                console.log("Market Aids: ", aids);

                aidFactoryMenu(marketAidFactory);
                break;

            case '3':
                console.log("\n Create a new Market Aid \n");

                // TODO: add a confimation prompt here that the user wants to create a new market aid

                const newMarketAidAddress = await marketAidFactory.createMarketAidInstance();
                console.log("New Market Aid Address: ", newMarketAidAddress);

                aidFactoryMenu(marketAidFactory);
                break;

            case '4':
                console.log("\n Returning to Network Menu... \n");
                
                networkMenu();
                break;

            case '5':
                console.log("\n SEE YOU DEFI COWBOY...");
                rl.close();
                process.exit(0);
                break;

            default:
                console.log("Invalid answer! Pick a number 1 through 5");
                aidFactoryMenu(marketAidFactory);
                break;
        }
    });
}



/**
 * Menu to select different L2 mainnets and testnets
 * @returns {Promise<void>} A Promise that resolves once the network is selected
 */
async function networkMenu(): Promise<void> {
    console.log("\nNetwork Selection Menu");
    console.log("");
    console.log("Mainnets:");
    console.log("");
    console.log("1. Optimism Mainnet");
    console.log("2. Arbitrum One");
    console.log("3. Polygon Mainnet");
    console.log("");
    console.log("Testnets:");
    console.log("");
    console.log("4. Optimism Goerli");
    console.log("5. Arbitrum Goerli");
    console.log("6. Polygon Mumbai");
    console.log("");
    console.log("7. Quit (exit the program)")

    rl.question("\n Pick a number (1-7): ", (answer: string) => { 

        switch (answer.toLowerCase()) {
            case '1':
                console.log("\n Selected Optimism Mainnet \n");
                switchNetwork(Network.OPTIMISM_MAINNET);

                ({ jsonRpcProvider, signer } = getNetworkInfo(network));
                console.log("signer: ", signer.address);

                marketAidFactory = getAidFactory(network, signer);
                console.log("marketAidFactory: ", marketAidFactory.address);

                aidFactoryMenu(marketAidFactory);
                break;

            case '2':
                console.log("\n Selected Arbitrum One \n");
                switchNetwork(Network.ARBITRUM_MAINNET);

                ({ jsonRpcProvider, signer } = getNetworkInfo(network));
                console.log("signer: ", signer.address);

                marketAidFactory = getAidFactory(network, signer);
                console.log("marketAidFactory: ", marketAidFactory.address);
                
                aidFactoryMenu(marketAidFactory);
                break;

            case '3':
                console.log("\n Selected Polygon Mainnet \n");
                switchNetwork(Network.POLYGON_MAINNET);

                ({ jsonRpcProvider, signer } = getNetworkInfo(network));
                console.log("signer: ", signer.address);

                marketAidFactory = getAidFactory(network, signer);
                console.log("marketAidFactory: ", marketAidFactory.address);

                aidFactoryMenu(marketAidFactory);
                break;

            case '4':
                console.log("\n Selected Optimism Goerli \n");
                switchNetwork(Network.OPTIMISM_GOERLI);

                ({ jsonRpcProvider, signer } = getNetworkInfo(network));
                console.log("signer: ", signer.address);

                marketAidFactory = getAidFactory(network, signer);
                console.log("marketAidFactory: ", marketAidFactory.address);

                aidFactoryMenu(marketAidFactory);
                break;

            case '5':
                console.log("\n Selected Arbitrum Goerli \n");
                switchNetwork(Network.ARBITRUM_TESTNET);

                ({ jsonRpcProvider, signer } = getNetworkInfo(network));
                console.log("signer: ", signer.address);

                marketAidFactory = getAidFactory(network, signer);
                console.log("marketAidFactory: ", marketAidFactory.address);

                aidFactoryMenu(marketAidFactory);
                break;

            case '6':
                console.log("\n Selected Polygon Mumbai \n");
                switchNetwork(Network.POLYGON_MUMBAI);

                ({ jsonRpcProvider, signer } = getNetworkInfo(network));
                console.log("signer: ", signer.address);

                marketAidFactory = getAidFactory(network, signer);
                console.log("marketAidFactory: ", marketAidFactory.address);

                aidFactoryMenu(marketAidFactory);
                break;

            case '7':
                console.log("\n SEE YOU DEFI COWBOY... \n");
                rl.close();
                process.exit(0);
                break;
            default:
                console.log("\n Invalid answer! Pick a number 1 through 6 \n");
                networkMenu();
                break;
        }
    });
}

async function main(): Promise<void> {
    try { 
        // ask the user what network they want to use to manage their market aid instance
        networkMenu();
    } catch (error) {
        console.log(error);
    }
}

// functions used in guidedStart
export {rl, getTokensByNetwork, getAidFactory, switchNetwork, maxApproveMarketAidForAllTokens, depositMenu, aidFactoryMenu, networkMenu, getTokenBalances, withdrawAllTokens, selectExistingMarketAid}

if (require.main === module) {
    main();
}