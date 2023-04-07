// script to help the user setup their own market aid instance for use if they don't already have one
// requires a private key in the user ENV via a defined API

// Needs two parts I think
// 1. A function that helps the user create a new market aid instance from scratch
// 2. A function that validates a given market aid instance AGAINST the needs of a specific configuration/strategy to ensure they have
//      the requisite approvals and balances for the tokens they want to target as well as
//      correct permissions within market aid itself

import * as dotenv from "dotenv";

import { TokenInfo } from "@uniswap/token-lists";
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

// relevant to this file for interacting with the market aid 
function getMarketAidFactoryContract(network: Network, signer: ethers.Signer): MarketAidFactory {
    const factoryAddress = marketAidFactoriesByNetwork[network];
  
    if (!factoryAddress) {
      throw new Error(`No Market Aid Factory address found for network ${network}`);
    }
  
    const marketAidFactory = new MarketAidFactory(factoryAddress, signer);
  
    return marketAidFactory;
}

// a function to get the existing market aid instances from an EOA from the factory contract
export async function getUserMarketAids(
    contract: ethers.Contract,
    strategist: string
): Promise<String[] | undefined> {
    const result = contract.getUserMarketAids(
        strategist
    )

    return result;
}

// a function to create a new market aid instance 
async function createMarketAidInstance(
    marketAidFactoryContract: ethers.Contract
  ): Promise<string> {
    const createMarketAidTx = await marketAidFactoryContract.createMarketAidInstance();
    await createMarketAidTx.wait(); // Wait for the transaction to be mined
  
    // Get the event logs
    const eventFilter = marketAidFactoryContract.filters.NotifyMarketAidSpawn(null);
    const eventLogs = await marketAidFactoryContract.queryFilter(eventFilter, createMarketAidTx.blockNumber, "latest");
  
    if (eventLogs.length === 0) {
      throw new Error("MarketAid instance creation event not found");
    }
  
    // Extract the new MarketAid instance address from the event
    const newMarketAidAddress = eventLogs[0].args[0];
  
    return newMarketAidAddress;
}

async function main(): Promise<void> {
    try {
        const network = await networkCallback();
        if (network === Network.ERROR) {
            console.log("Error selecting network. Exiting...");
            process.exit(1);
        }
        const { jsonRpcProvider, signer, websocketProvider } = getNetworkConnectionsInfo(network);
        const address = await signer.getAddress();

        console.log("Network:", network);
        console.log("Signer:", address);

        // Get the market aid factory object for the network
        const marketAidFactoryContract = getMarketAidFactoryContract(network, signer);
        console.log("MarketAidFactory address:", marketAidFactoryContract.address);

        // See if the user has any existing market aids
        console.log("Fetching existing market aids for address:", address);
        const aidCheck = await marketAidFactoryContract.getUserMarketAids(address);
        console.log("aidCheck:", aidCheck);
        console.log("Existing market aids:", aidCheck);

        let marketAidAddress = "";

        // If the user has existing MarketAid instances, ask if they want to connect to one or create a new one
        if (aidCheck.length > 0) {
            const connectToExisting = await confirmConnectToExistingMarketAid();
            if (connectToExisting) {
                marketAidAddress = await selectExistingMarketAid(aidCheck);
                console.log("Connecting to existing MarketAid instance at:", marketAidAddress);
            } else {
                const createNewMarketAid = await confirmNewMarketAid();
                if (createNewMarketAid) {
                    marketAidAddress = await marketAidFactoryContract.createMarketAidInstance();
                    console.log("New MarketAid instance created at:", marketAidAddress);
                } else {
                    console.log("User chose not to create a new MarketAid instance or connect to an existing one.");
                    return;
                }
            }
        } else {
            const createNewMarketAid = await confirmNewMarketAid();
            if (createNewMarketAid) {
                marketAidAddress = await marketAidFactoryContract.createMarketAidInstance();
                console.log("New MarketAid instance created at:", marketAidAddress);
            } else {
                console.log("User chose not to create a new MarketAid instance.");
                return;
            }
        }

        // Create the MarketAid instance object
        console.log("Creating MarketAid object at:", marketAidAddress, "with signer:", signer)

        const marketAid = new MarketAid(marketAidAddress, signer);
        console.log("MarketAid object created at:", marketAidAddress);

    } catch (error) {
        console.error("Error in main function:", error.message);
    } finally {
        rl.close();
    }
}


// main function
/*
async function main(): Promise<void> {
    try {
      const network = await networkCallback();
      if (network === Network.ERROR) {
        console.log("Error selecting network. Exiting...");
        process.exit(1);
      }
      const { jsonRpcProvider, signer, websocketProvider } = getNetworkConnectionsInfo(network);
      const address = await signer.getAddress();
  
      console.log("Network:", network);
      console.log("Signer:", address);
  
      // Get the market aid factory object for the network
      const marketAidFactoryContract = getMarketAidFactoryContract(network, signer);
      console.log(marketAidFactoryContract.address);
  
      // See if the user has a market aid
      const aidCheck = await marketAidFactoryContract.getUserMarketAids(address);
      console.log("here are the existing market aids: ", aidCheck);
  
      // Check if the user wants to create a new MarketAid instance
      const createNewMarketAid = await confirmNewMarketAid();
      if (createNewMarketAid) {
        const newMarketAidAddress = await marketAidFactoryContract.createMarketAidInstance();
        console.log("New MarketAid instance created at:", newMarketAidAddress);

        // create the market aid instance object
        const marketAid = new MarketAid(newMarketAidAddress, signer);
        console.log("MarketAid object created at:", marketAid.address);

      } else {
        console.log("User chose not to create a new MarketAid instance.");
      }
      

    } catch (error) {
      console.error("Error in main function:", error.message);
    } finally {
      rl.close();
    }
}
*/

if (require.main === module) {
    main();
}