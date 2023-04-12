import * as dotenv from "dotenv";

import { ethers, Signer } from "ethers";
import { TokenInfo } from "@uniswap/token-lists";
import { tokenList } from "../configuration/config";
import { BotConfiguration, OnChainBookWithData, SimpleBook, StrategistTrade, marketAddressesByNetwork, Network, marketAidFactoriesByNetwork } from "../configuration/config";

import { ERC20 } from "../utilities/contracts/ERC20";
import { MarketAid } from "../utilities/contracts/MarketAid" 
import { MarketAidFactory } from "../utilities/contracts/MarketAidFactory"

dotenv.config();

// set a default network to use
let network: Network = Network.OPTIMISM_MAINNET;

// set variables for the json rpc provider, signer, and market aid factory
let jsonRpcProvider;
let signer;
let marketAidFactory;   
let tokens: TokenInfo[] = [];
let erc20Tokens: ERC20[] = [];

const readline = require('node:readline');
let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// helper functions 

/**
 * takes a network object and returns the json rpc provider and signer for the network
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
 * takes a network object and returns the token list for the network
 * @param network the network object to get the token list for
 * @returns the token list for the network
 */
function getTokensByNetwork(network: Network): TokenInfo[] {
    return tokenList.tokens.filter((token) => token.chainId === network);
}

/**
 * takes a network object and returns the market aid factory for the network
 * @param network the network object to get the market aid factory for
 * @param signer the signer to use for the market aid factory
 * @returns the market aid factory for the network
 * @throws an error if no market aid factory address is found for the network 
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
 * takes a network object and updates the network, tokens, and erc20Tokens variables
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
 * a helper function to print the token balances for a given address
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
 */
async function maxApproveMarketAidForAllTokens(tokens: ERC20[], marketAid: MarketAid, signer: Signer): Promise<ethers.ContractTransaction[]> {
    const transactionReceipts: ethers.ContractTransaction[] = [];

    for (const token of tokens) {
        try {
            const receipt = await token.maxApprove(signer, marketAid.address);
            transactionReceipts.push(receipt);
            console.log(`Max approved ${await token.symbol()} for Market Aid at ${marketAid.address}`);
        } catch (error) {
            console.error(`Failed to max approve ${await token.symbol()} for Market Aid at ${marketAid.address}:`, error);
        }
    }

    return transactionReceipts;
}  

/**
 * 
 * @param aidCheck an array of market aid addresses
 * @returns a promise that resolves to the selected market aid address
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

// - [] allow the user to connect to the market aid and do
// - [] deposit to the aid 
// - [] withdraw from the aid 
// - [] pull all funds 
// - [] approve a target venue 
// - [] approve a strategist 
// - [] remove a strategist 

// a market aid menu, executes the user action on the market aid
async function aidMenu(marketAid: MarketAid): Promise<void> {
    console.log("\nMarket Aid Menu");
    console.log("");
    console.log("1. View Market Aid Info");
    console.log("2. Check if strategist is approved");
    console.log("3. View Market Aid Balance");
    // console.log("3. View Market Aid Outstanding Offers");
    // console.log("4. View Market Aid Kill Switch Operator");
    // console.log("5. View Market Aid Shut Down Status");
    console.log("4. Deposit to the aid");
    console.log("5. Withdraw from the aid");
    console.log("6. Pull all funds");
    console.log("7. Approve a target venue");
    console.log("8. Approve a strategist");
    console.log("9. Remove a strategist");
    console.log("10. Max approve the token list for the Market Aid");


    rl.question("\n Pick a number (1-5): ", async (answer: string) => {
        let marketAddress;
        let admin;

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
                }
                );
                break;
            case '3':
                console.log("\n View Market Aid Balance \n");

                const balances = await getTokenBalances(marketAid.address);
                balances.forEach((balance) => {
                  console.log(
                    `Balance of ${balance.name} (${balance.symbol}): ${balance.balance} ${balance.symbol}`
                  );
                });
        
                aidMenu(marketAid);
        
                break;

            case "4":
                console.log("\n Deposit to the aid \n");
        
                // Implement deposit functionality here
        
                aidMenu(marketAid);
                break;
        
            case "5":
                console.log("\n Withdraw from the aid \n");
        
                // Implement withdrawal functionality here
        
                aidMenu(marketAid);
                break;
        
            case "6":
                console.log("\n Pull all funds \n");
        
                // Implement pull all funds functionality here
        
                aidMenu(marketAid);
                break;
        
            case "7":
                console.log("\n Approve a target venue \n");
        
                // Implement approve a target venue functionality here
        
                aidMenu(marketAid);
                break;
        
            case "8":
                console.log("\n Approve a strategist \n");
        
                // Implement approve a strategist functionality here
        
                aidMenu(marketAid);
                break;
        
            case "9":
                console.log("\n Remove a strategist \n");
        
                // Implement remove a strategist functionality here
        
                aidMenu(marketAid);
                break;
            

            case "10":
                console.log("\n Max approve the token list for the Market Aid \n");

                maxApproveMarketAidForAllTokens(erc20Tokens, marketAid, signer);

                aidMenu(marketAid);
                break;
        }
    });
}

// a market aid factory menu, set the aid instance variable upon selection, or returns to the network menu. takes a market aid factory as a parameter
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
                // console.log("Market Aids: ", aids);

                selectedAidAddress = await selectExistingMarketAid(aids);
                marketAid = new MarketAid(selectedAidAddress, signer);
                console.log("Connected to Market Aid: ", marketAid.address);

                // connect to the market aid menu
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



// a network selection menu, set the network variable and current market aid factory upon selection
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
    console.log("7. quite (exit the program)")

    
    rl.question("\n Pick a number (1-7): ", (answer: string) => { 

        switch (answer.toLowerCase()) {
            case '1':
                console.log("\n Selected Optimism Mainnet \n");
                // network = Network.OPTIMISM_MAINNET;
                switchNetwork(Network.OPTIMISM_MAINNET);

                ({ jsonRpcProvider, signer } = getNetworkInfo(network));
                console.log("signer: ", signer.address);

                marketAidFactory = getAidFactory(network, signer);
                console.log("marketAidFactory: ", marketAidFactory.address);

                aidFactoryMenu(marketAidFactory);

                break;
            case '2':
                console.log("\n Selected Arbitrum One \n");
                // network = Network.ARBITRUM_MAINNET;
                switchNetwork(Network.ARBITRUM_MAINNET);

                ({ jsonRpcProvider, signer } = getNetworkInfo(network));

                marketAidFactory = getAidFactory(network, signer);

                aidFactoryMenu(marketAidFactory);

                break;
            case '3':
                console.log("\n Selected Polygon Mainnet \n");
                // network = Network.POLYGON_MAINNET;
                switchNetwork(Network.POLYGON_MAINNET);

                ({ jsonRpcProvider, signer } = getNetworkInfo(network));

                marketAidFactory = getAidFactory(network, signer);

                aidFactoryMenu(marketAidFactory);
                
                break;
            case '4':
                console.log("\n Selected Optimism Goerli \n");
                // network = Network.OPTIMISM_GOERLI;
                switchNetwork(Network.OPTIMISM_GOERLI);

                ({ jsonRpcProvider, signer } = getNetworkInfo(network));

                marketAidFactory = getAidFactory(network, signer);

                aidFactoryMenu(marketAidFactory);

                break;
            case '5':
                console.log("\n Selected Arbitrum Goerli \n");
                // network = Network.ARBITRUM_TESTNET;
                switchNetwork(Network.ARBITRUM_TESTNET);

                ({ jsonRpcProvider, signer } = getNetworkInfo(network));

                marketAidFactory = getAidFactory(network, signer);

                aidFactoryMenu(marketAidFactory);

                break;
            case '6':
                console.log("\n Selected Polygon Mumbai \n");
                // network = Network.POLYGON_MUMBAI;
                switchNetwork(Network.POLYGON_MUMBAI);

                ({ jsonRpcProvider, signer } = getNetworkInfo(network));

                marketAidFactory = getAidFactory(network, signer);

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

// main function to run the script
async function main(): Promise<void> {

    try { 

        // 1. ask the user what network they want to use to manage their market aid instance
        networkMenu();

    } catch (error) {
        console.log(error);
    }
}

if (require.main === module) {
    main();
}