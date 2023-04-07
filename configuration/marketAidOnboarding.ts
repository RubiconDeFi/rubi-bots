// script to help the user setup their own market aid instance for use if they don't already have one
// requires a private key in the user ENV via a defined API

// Needs two parts I think
// 1. A function that helps the user create a new market aid instance from scratch
// 2. A function that validates a given market aid instance AGAINST the needs of a specific configuration/strategy to ensure they have
//      the requisite approvals and balances for the tokens they want to target as well as
//      correct permissions within market aid itself

import * as dotenv from "dotenv";

import { TokenInfo } from "@uniswap/token-lists";
import { tokenList } from "../configuration/config";
import { BotConfiguration, OnChainBookWithData, SimpleBook, StrategistTrade, marketAddressesByNetwork, Network, marketAidFactoriesByNetwork } from "../configuration/config";
import { AssetPair, GenericLiquidityVenue } from "../liquidityVenues/generic" // "../generic";
import { BigNumber, Contract, ethers } from "ethers";
import { formatUnits } from "ethers/lib/utils";
// import MARKET_INTERFACE from  "../../configuration/abis/Market";
import ERC20_INTERFACE from "./abis/ERC20";
import MARKET_INTERFACE from "./abis/Market";
import MARKET_AID_INTERFACE from "./abis/MarketAid";
import MARKET_AID_FACTORY_INTERFACE from "./abis/MarketAidFactory";
import { approveTokensForContract } from "../utilities/index";

import { ERC20 } from "../utilities/contracts/ERC20";
import { MarketAid } from "../utilities/contracts/MarketAid" 
import { MarketAidFactory } from "../utilities/contracts/MarketAidFactory"

// main file parts 

dotenv.config();

const readline = require('node:readline');
let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function networkCallback(): Promise<Network> {
    return new Promise(resolve => {
        rl.question('\n What network would you like to access a market aid on?\n1. Optimism Mainnet\n2. Optimism Goerli\n3. Arbitrum Mainnet\n4. Arbitrum Goerli\n:', (answer) => {
            switch (answer.toLowerCase()) {
                case '1':
                    console.log('\n Selected Optimism');
                    resolve(Network.OPTIMISM_MAINNET);
                    break;
                case '2':
                    console.log('\n Selected Optimism Goerli');
                    resolve(Network.OPTIMISM_GOERLI);
                    break;
                case '3':
                    console.log('\n Selected Arbitrum');
                    resolve(Network.ARBITRUM_MAINNET);
                    break;
                case '4':
                    console.log('\n Selected Arbitrum Goerli');
                    resolve(Network.ARBITRUM_TESTNET);
                    break;
                default:
                    console.log('Invalid answer! Pick a number 1 through 4');
                    resolve(Network.ERROR);
                    break;
            }
        })
    });
}

function getTokensByNetwork(network: Network): TokenInfo[] {
    return tokenList.tokens.filter((token) => token.chainId === network);
}

async function selectToken(tokens: TokenInfo[]): Promise<TokenInfo> {
    return new Promise((resolve) => {
        console.log("\nSelect the token you want to manage:");

        tokens.forEach((token, index) => {
            console.log(`${index + 1}. ${token.symbol} (${token.name})`);
        });

        rl.question("Enter the number corresponding to the token you want to manage: ", (answer) => {
            const selectedIndex = parseInt(answer.trim()) - 1;
            if (selectedIndex >= 0 && selectedIndex < tokens.length) {
                resolve(tokens[selectedIndex]);
            } else {
                console.log("Invalid selection. Please try again.");
                resolve(selectToken(tokens));
            }
        });
    });
}

async function askTokenApprovalAmount(): Promise<string> {
    return new Promise((resolve) => {
        rl.question("Enter the amount of tokens you want to approve for the MarketAid: ", (answer) => {
            if (!isNaN(parseFloat(answer))) {
                resolve(answer.trim());
            } else {
                console.log("Invalid input! Please enter a valid amount.");
                resolve(askTokenApprovalAmount());
            }
        });
    });
}

function getNetworkConnectionsInfo(network: Network): { jsonRpcProvider: ethers.providers.JsonRpcProvider, signer: ethers.Signer, websocketProvider?: ethers.providers.WebSocketProvider } {
    // TODO: make clear to the user the patterns they need to provide in their .env file... today env TODO: allow them to also pass them through during the guided start
    // Note the API that matters is network + '_JSON_RPC_URL' and network + '_WEBSOCKET_URL' for defined variables in .env

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

// some helper functions
async function confirmNewMarketAid(): Promise<boolean> {
    return new Promise((resolve) => {
      rl.question("\nDo you want to create a new MarketAid instance? (yes/no): ", (answer) => {
        const response = answer.toLowerCase();
        if (response === "yes" || response === "y") {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  async function confirmConnectToExistingMarketAid(): Promise<boolean> {
    return new Promise((resolve) => {
        rl.question("Would you like to connect to an existing MarketAid instance? (y/n): ", (answer) => {
            const response = answer.trim().toLowerCase();
            if (response === "y" || response === "yes") {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}

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

async function manageERC20Token(erc20: ERC20, marketAid: MarketAid, signer: ethers.Signer): Promise<void> {
    console.log("\nWhat would you like to do with the selected token?");
    console.log("1. Check the balance of the token");
    console.log("2. Check the allowance of the token");
    console.log("3. Approve the token for the MarketAid");
    console.log("4. Go back");

    rl.question("Enter the number corresponding to the action you want to perform: ", async (answer) => {
        const userAddress = await signer.getAddress();
        switch (answer.trim()) {
            case '1':
                // 5b1. Check the balance of the token
                const balance = await erc20.balanceOf(userAddress);
                console.log(`Your ${await erc20.symbol()} balance: ${balance}`);
                await manageERC20Token(erc20, marketAid, signer);
                break;
            case '2':
                // 5b2. Check the allowance of the token
                const allowance = await erc20.allowance(userAddress, marketAid.address);
                console.log(`Your ${await erc20.symbol()} allowance for the MarketAid: ${allowance}`);
                await manageERC20Token(erc20, marketAid, signer);
                break;
            case '3':
                // 5b3. Approve the token for the MarketAid
                const amount = await askTokenApprovalAmount();
                const formattedAmount = ethers.utils.parseUnits(amount, await erc20.decimals());
                const tx = await erc20.approve(signer, marketAid.address, formattedAmount);
                await tx.wait();
                console.log(`Successfully approved ${amount} ${await erc20.symbol()} for the MarketAid.`);
                await manageERC20Token(erc20, marketAid, signer);
                break;
            case '4':
                // Go back
                break;
            default:
                console.log("Invalid input! Please choose a valid option.");
                await manageERC20Token(erc20, marketAid, signer);
                break;
        }
    });
}

async function askMarketAidManagementAction(network: Network): Promise<{ action: string; token?: TokenInfo }> {
    return new Promise(async (resolve) => {
        console.log("\nWhat would you like to do with your MarketAid?");
        console.log("1. Check the admin address");
        console.log("2. Check the market address");
        console.log("3. Manage an ERC20 related to the market aid");
        console.log("4. Exit");

        rl.question("Enter the number corresponding to the action you want to perform: ", async (answer) => {
            switch (answer.trim()) {
                case '1':
                    resolve({ action: 'admin' });
                    break;
                case '2':
                    resolve({ action: 'market' });
                    break;
                case '3':
                    const tokens = getTokensByNetwork(network);
                    const selectedToken = await selectToken(tokens);
                    resolve({ action: 'erc20', token: selectedToken });
                    break;
                case '4':
                    resolve({ action: 'exit' });
                    break;
                default:
                    console.log("Invalid input! Please choose a valid option.");
                    resolve(await askMarketAidManagementAction(network));
                    break;
            }
        });
    });
}

// relevant to this file for interacting with the market aid 
function getMarketAidFactoryContract(network: Network, signer: ethers.Signer): MarketAidFactory {
    const factoryAddress = marketAidFactoriesByNetwork[network];
  
    if (!factoryAddress) {
      throw new Error(`No Market Aid Factory address found for network ${network}`);
    }
  
    const marketAidFactory = new MarketAidFactory(factoryAddress, signer);
  
    return marketAidFactory;
}


async function main(): Promise<void> {

    try { 

        // 1. ask the user what network they want to use to manage their market aid instance
        const network = await networkCallback();
        if (network === Network.ERROR) {
            console.log("Error selecting network. Exiting...");
            process.exit(1);
        }

        // collect the relevant info from the user's .env file
        const { jsonRpcProvider, signer, websocketProvider } = getNetworkConnectionsInfo(network);
        const userAddress = await signer.getAddress();

        // check that the relevant info was properly loaded from the .env file
        if (!jsonRpcProvider || !signer) {
            console.log("Error loading network info from .env file. Exiting...");
            process.exit(1);
        }

        // 2a. check the factory on that network 
        const marketAidFactory = getMarketAidFactoryContract(network, signer);
        console.log("the market aid factory is: ", marketAidFactory.address);

        // 2b. check the market aid instances that the user has already created
        const aidCheck = await marketAidFactory.getUserMarketAids(userAddress);
        console.log("the market aids that the user has created are: ", aidCheck);

        // 3a. if they want to connect to an existing market aid, ask them which one they want to connect to
        if (aidCheck.length > 0) {
            const connectToExisting = await confirmConnectToExistingMarketAid();
            if (connectToExisting) {
                const selectedMarketAid = await selectExistingMarketAid(aidCheck);
                console.log("the selected market aid is: ", selectedMarketAid);

                // create an object for the selected market aid
                var marketAid = new MarketAid(selectedMarketAid, signer);
            }
        } else {
            console.log("You have not created any MarketAid instances yet.");

            // 3b. if they want to create a new market aid, create a new market aid instance and connect to it
            const createNewMarketAid = await confirmNewMarketAid();
            if (createNewMarketAid) {
                const newMarketAid = await marketAidFactory.createMarketAidInstance();

                // create an object for the newly created market aid
                var marketAid = new MarketAid(newMarketAid, signer);

                console.log("the market aid address is: ", marketAid.address);
            }
        }

        // 4. after the user is connected to the market aid, ask them what they would like to do with it. the user can: 
            // 4a. check the admin address
            // 4b. check the market address 
            // 4c. manage an erc20 related to the market aid
        let continueManaging = true;
        while (continueManaging) {
            const managementInfo = await askMarketAidManagementAction(network);
            switch (managementInfo.action) {
                case 'admin':
                    // 4a. Check the admin address
                    const admin = await marketAid.getAdmin();
                    console.log("Admin address:", admin);
                    break;
                case 'market':
                    // 4b. Check the market address
                    const marketAddress = await marketAid.getRubiconMarketAddress();
                    console.log("Market address:", marketAddress);
                    break;
                case 'erc20':
                    // 4c. Manage an ERC20 related to the market aid
                    const selectedToken = managementInfo.token;
                    if (selectedToken) {
                        console.log(`Managing token: ${selectedToken.symbol} (${selectedToken.name})`);
                        
                        // Your code to manage the selected ERC20 token
                        const erc20 = new ERC20(selectedToken.address, signer);

                        // Manage the selected ERC20 token
                        await manageERC20Token(erc20, marketAid, signer);

                    } else {
                        console.log("No token selected.");
                    }
                    break;
                case 'exit':
                    continueManaging = false;
                    break;
            }
        }
    } catch (error) {
        console.log(error);
    }
}

if (require.main === module) {
    main();
}



// here are the flows we want: 



        
