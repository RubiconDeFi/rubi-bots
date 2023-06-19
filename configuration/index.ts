import * as dotenv from "dotenv";

import { TokenInfo } from "@uniswap/token-lists";
import { BotConfiguration, BotType, ETH_ZERO_ADDRESS, MarketMakingStrategy, Network, tokenList } from "./config";
import { startGenericMarketMakingBot } from "../executionClients/marketMaking";
import { ethers } from "ethers";

import { rl } from "./marketAid"
import { guidedStartGenericMarketMakingBot } from "../executionClients/marketMaking/GuidedStartGenericMarketMakingBot";

dotenv.config();

/**
 * Allows the user to choose the type of bot they want to deploy.
 * @returns {Promise<BotType>} A promise that resolves with the selected BotType.
 */
async function botTypeUserCallback(): Promise<BotType> {
    return new Promise(async (resolve) => {
      const askQuestion = async () => {
        rl.question('\n What type of bot would you like to run?\n1. Market-Making Bot\n2. Trading Bot\n3. Liquidator Bot\n4. Quit\n:', async (answer) => {
          switch (answer.toLowerCase()) {
            case '1':
              console.log('\nSuper! Time to market-make!');
              resolve(BotType.MarketMaking);
              break;
            case '2':
              console.log('Sorry! :( No trading bots yet');
              await askQuestion();
              break;
            case '3':
              console.log('Sorry! :( No liquidator bots yet');
              await askQuestion();
              break;
            case '4':
              console.log('SEE YOU DEFI COWBOY...');
              process.exit(0);
            default:
              console.log('Invalid answer! Pick a number 1 through 4');
              await askQuestion();
              break;
            }});
        };
        await askQuestion();
    });
}

/**
 * Allows the user to choose a market making strategy.
 * @returns {Promise<MarketMakingStrategy>} A promise that resolves with the selected market making strategy.
 */
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

/**
 * Asks the user to select an Ethereum Layer 2 Network for their selected strategy.
 * @returns {Promise<Network>} A promise that resolves with the selected network.
 */
async function networkCallback(): Promise<Network> {
    return new Promise(async (resolve) => {
        const askQuestion = async () => {    
            rl.question('\n What network would you like to execute this strategy on?\n1. Optimism Mainnet\n2. Optimism Goerli\n3. Arbitrum Mainnet\n\n4. Arbitrum Goerli\n5. Polygon Mainnet\n6. Polygon Mumbai\n:', async (answer) => {
                switch (answer.toLowerCase()) {
                    case '1':
                        console.log('\n Selected Optimism Mainnet');
                        resolve(Network.OPTIMISM_MAINNET);
                        break;
                    case '2':
                        console.log('\n Selected Optimism Goerli');
                        resolve(Network.OPTIMISM_GOERLI);
                        break;
                    case '3':
                        console.log('We are currenly working on Arbitrum Mainnet support!');
                        await askQuestion();
                        // console.log('\n Selected Arbitrum Mainnet');
                        // resolve(Network.ARBITRUM_MAINNET);
                        break;
                    case '4':
                        console.log('We are currenly working on Arbitrum Goerli support!');
                        await askQuestion();
                        // console.log('\n Selected Arbitrum Goerli');
                        // resolve(Network.ARBITRUM_TESTNET);
                        break;
                    case '5':
                        console.log('We are currenly working on Polygon Mainnet support!');
                        await askQuestion();
                        // console.log('\n Selected Polygon Mainnet');
                        // resolve(Network.POLYGON_MAINNET);
                        break;
                    case '6':
                        console.log('\n Selected Polygon Mumbai');
                        resolve(Network.POLYGON_MUMBAI);
                        break;
                    default:
                        console.log('Invalid answer! Pick a number 1 through 4');
                        resolve(Network.ERROR);
                        break;
                }
            })
        }
        await askQuestion()
    });
}

// token information based on network selected
var selectedTokens: TokenInfo[] = [];

/**
 * Displays all the tokens available on the selected network and allows the user to select tokens for their strategy.
 * @param {Network} network - The selected network.
 * @returns {Promise<TokenInfo[]>} A promise that resolves with an array of selected TokenInfo objects.
 * @TODO Strategy-specific UX flow here or warnings?? e.g. pair-based strategies. Also maybe let user type in space deliminated tokens in 1 line
 */
async function tokenSelectionCallback(network: Network): Promise<TokenInfo[]> {
    const availableTokens = tokenList.tokens.filter(token => token.chainId === network);
    const availableTokensSymbols = availableTokens.map(token => token.symbol);
    return new Promise(resolve => {
        console.log("\nThese are the available tokens on your selected Network. Please choose a pair of tokens: ", availableTokensSymbols);
        console.log("\nThe first asset you select will be your BASE ASSET and the second will be your QUOTE ASSET (ex. BASE/QUOTE)")
        rl.question('\n What tokens would you like to target in your strategy? (Enter the symbol of the token you want to target then enter to add, or enter "done" to finish):', (answer) => {
            if (answer.toLowerCase() === 'done') {
                if (selectedTokens.length < 2){
                    console.log("\nPlease select atleast 2 tokens for the strategy\n")
                    resolve(tokenSelectionCallback(network))
                }
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
                if (selectedTokens.length === 1) {
                    console.log(`\n${selectedTokens[0].symbol} selected as the base asset.\n`);
                } else if (selectedTokens.length === 2) {
                    console.log(`\n${selectedTokens[1].symbol} selected as the quote asset.\n`);
                }
                resolve(tokenSelectionCallback(network));
            } else {
                console.log('Invalid answer! Pick a token symbol from the list or enter "done" to finish');
                resolve(tokenSelectionCallback(network));
            }
        });
    });
}

/**
 * Retrieves the network connection information for the specified network.
 * @param {Network} network - The selected network.
 * @returns {Object} An object containing the JSON-RPC provider, signer, and optional WebSocket provider.
 * - jsonRpcProvider: An instance of ethers.providers.JsonRpcProvider for JSON-RPC connection.
 * - signer: An instance of ethers.Signer for signing transactions.
 * - websocketProvider: (optional) An instance of ethers.providers.WebSocketProvider for WebSocket connection.
 * @throws {Error} Throws an error if the JSON RPC URL or EOA private key is not found.
 * @dev Make sure your .env file is formatted according to the README.md
 */
function getNetworkConnectionsInfo(network: Network): { jsonRpcProvider: ethers.providers.JsonRpcProvider, signer: ethers.Signer, websocketProvider?: ethers.providers.WebSocketProvider } {
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
        switch (r) {
            case BotType.MarketMaking:
                // 2. What strategy would you like to employ?
                return marketMakingStrategyCallback().then((selectedStrat: MarketMakingStrategy) => {
                    console.log("The user selected this market-making strategy", selectedStrat);
                    // 3. What network(s) would you like to execute this strategy on?
                    return networkCallback().then(async (selectedNetwork: Network) => {
                        console.log("The user selected this network", selectedNetwork, "this strategy", selectedStrat);
                        // 4. What tokens would you like to target in your strategy? 
                        return tokenSelectionCallback(selectedNetwork).then((selectedTokens: TokenInfo[]) => {
                            console.log("The user selected these tokens", selectedTokens);
                            console.log(`\nThe user has selected to trade the following pair: ${selectedTokens[0].symbol}/${selectedTokens[1].symbol}\n`);
                            const botConfiguration: BotConfiguration = {
                                botType: BotType.MarketMaking,
                                strategy: selectedStrat,
                                network: selectedNetwork,
                                targetTokens: selectedTokens,
                                connections: getNetworkConnectionsInfo(selectedNetwork)
                            };
                            console.log("\nThe bot is configured and ready to start!");
                            // 5. Start the bot with the configuration
                            return guidedStartGenericMarketMakingBot(botConfiguration, rl);
                        });
                    });
                });
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
        };
    });
};

main();
