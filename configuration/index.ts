// Goal is to configure according to the following heirarchy:
// 1. What type of bot would you like to run? 
// 2. What strategy would you like to employ?
// 3. What network(s) would you like to execute this strategy on?
// 4. What tokens would you like to target in your strategy? (strategy-specific UX flow here!)
import * as dotenv from "dotenv";

import { TokenInfo } from "@uniswap/token-lists";
import { BotConfiguration, BotType, ETH_ZERO_ADDRESS, MarketMakingStrategy, Network, tokenList } from "./config";
import { startMarketMakingBot } from "../executionClients/marketMaking";
import { ethers } from "ethers";
dotenv.config();

// 5. Start
const readline = require('node:readline');
let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function botTypeUserCallback(): Promise<BotType> {
    return new Promise(resolve => {
        rl.question('\n What type of bot would you like to run?\n1. Market-Making Bot\n2. Trading Bot\n3. Liquidator Bot\n:', (answer) => {
            switch (answer.toLowerCase()) {
                case '1':
                    console.log('\nSuper! Time to market-make!');
                    resolve(BotType.MarketMaking);
                    break;
                case '2':
                    console.log('Sorry! :( No trading bots yet');
                    resolve(BotType.Trading);
                    break;
                case '3':
                    console.log('Sorry! :( No liquidator bots yet');
                    resolve(BotType.Liquidator);
                    break;
                default:
                    console.log('Invalid answer! Pick a number 1 through 3');
                    resolve(BotType.ErrorOrNone);
                    break;
            }
        })
    });
}

// function that takes user command line input and returns a MarketMakingStrategy as a promise
async function marketMakingStrategyCallback(): Promise<MarketMakingStrategy> {
    return new Promise(resolve => {
        rl.question('\n What strategy would you like to employ?\n1. Risk Minimized Up Only\n2. Target Venue Out Bid\n:', (answer) => {
            switch (answer.toLowerCase()) {
                case '1':
                    console.log('\n Selected Risk Minimized Up Only');
                    resolve(MarketMakingStrategy.RiskMinimizedUpOnly);
                    break;
                case '2':
                    console.log('\n Selected Target Venue Out Bid');
                    resolve(MarketMakingStrategy.TargetVenueOutBid);
                    break;
                default:
                    console.log('Invalid answer! Pick a number 1 through 2');
                    resolve(MarketMakingStrategy.ErrorOrNone);
                    break;
            }
        })
    });
}

// Function that asks the user what ETH L2 Network they want to use for their selected strategy, takes user command line input to get their answer after displaying options
async function networkCallback(): Promise<Network> {
    return new Promise(resolve => {
        rl.question('\n What network would you like to execute this strategy on?\n1. Optimism Mainnet\n2. Optimism Goerli\n3. Arbitrum Mainnet\n4. Arbitrum Goerli\n:', (answer) => {
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
var selectedTokens: TokenInfo[] = [];
// Function that displays all the tokens available in the token list (config.ts) that are on the selected network and asks the user to select the tokens they want to target for their selected strategy
// User can select multiple tokens and is asked after selecting one to choose another. All selected tokens are returned as an array of TokenInfo objects
async function tokenSelectionCallback(network: Network): Promise<TokenInfo[]> {
    const availableTokens = tokenList.tokens.filter(token => token.chainId === network);
    const availableTokensSymbols = availableTokens.map(token => token.symbol);
    return new Promise(resolve => {
        // Prompt the user to select tokens based on their symbol from availableTokensSymbols
        console.log("These are the available tokens on your selected Network: ", availableTokensSymbols);

        // TODO: strateyg-specific UX flow here or warnings?? e.g. pair-based strategies
        // after done is input, return the selectedTokens array
        rl.question('\n What tokens would you like to target in your strategy? (Enter the symbol of the token you want to target then enter to add, or enter "done" to finish):', (answer) => {
            if (answer.toLowerCase() === 'done') {
                console.log('\n Selected tokens: ', selectedTokens);
                resolve(selectedTokens);
            } else if (availableTokensSymbols.includes(answer) || availableTokensSymbols.map(symbol => symbol.toLowerCase()).includes(answer)) {
                const selectedToken = availableTokens.find(token => token.symbol === answer);
                if (!selectedToken) {
                    selectedTokens.push(availableTokens.find(token => token.symbol.toLowerCase() === answer));
                } else {
                    selectedTokens.push(selectedToken);
                }
                console.log('\n Selected tokens: ', selectedTokens);
                resolve(tokenSelectionCallback(network));
            } else {
                console.log('Invalid answer! Pick a token symbol from the list or enter "done" to finish');
                resolve(tokenSelectionCallback(network));
            }
        });
    });
}

function getNetworkConnectionsInfo(network: Network): { jsonRpcProvider: ethers.providers.JsonRpcProvider, signer: ethers.Signer, websocketProvider?: ethers.providers.WebSocketProvider } {
    // TODO: make clear to the user the patterns they need to provide in their .env file... today env TODO: allow them to also pass them through during the guided start
    // Note the API that matters is network + '_JSON_RPC_URL' and network + '_WEBSOCKET_URL' for defined variables in .env
    console.log("this env", process.env);

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

async function main() {
    console.log("\n Hello there! Welcome to Rubi Bots 🤖");
    // 1. What type of bot would you like to run? 
    botTypeUserCallback().then((r: BotType) => {
        console.log("The user selected this BotType", r);
        // Switch based on outcome to the relevant function for the bot type
        switch (r) {
            case BotType.MarketMaking:
                // Call a function that starts a market-making bot process. The function is a Strategy class that is instantiated with the relevant parameters
                // 2. What strategy would you like to employ?
                return marketMakingStrategyCallback().then((selectedStrat: MarketMakingStrategy) => {
                    console.log("The user selected this market-making strategy", selectedStrat);

                    // Conceptually we know that they want to do now, but we need to know what tokens they want to target, what network they want to target, etc. = configuration
                    // 3. What network(s) would you like to execute this strategy on?
                    return networkCallback().then(async (selectedNetwork: Network) => {
                        console.log("The user selected this network", selectedNetwork, "this strategy", selectedStrat);
                        // 4. What tokens would you like to target in your strategy? 
                        // TODO: (strategy-specific UX flow here!) and block certain configurations based on the strategy and context
                        return tokenSelectionCallback(selectedNetwork).then((selectedTokens: TokenInfo[]) => {
                            console.log("The user selected these tokens", selectedTokens);

                            const botConfiguration: BotConfiguration = {
                                botType: BotType.MarketMaking,
                                strategy: selectedStrat,
                                network: selectedNetwork,
                                targetTokens: selectedTokens,
                                connections: getNetworkConnectionsInfo(selectedNetwork)
                            };

                            console.log("\nThis is the bot configuration", botConfiguration, "\n");
                            // 5. Start the bot with the configuration
                            return startMarketMakingBot(botConfiguration, rl);
                        });
                    });

                });

            // break;
            case BotType.Trading:
                // Configure the trading bot...
                // Start the trading bot
                // return startTradingBot();
                break;
            case BotType.Liquidator:
                // Configure the liquidator bot...
                // Start the liquidator bot
                // return startLiquidatorBot();

                break;
            default:
                console.log("\n No bot type selected. Exiting...");
                break;
        }

    })
    // Ends input collection
    // rl.close();
}

main();

// export {};
