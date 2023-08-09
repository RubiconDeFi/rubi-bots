import * as dotenv from "dotenv";

import { ethers } from "ethers";
import { BotConfiguration, BotType, MarketMakingStrategy, Network, tokenList } from "../../configuration/config";
import { getAddress } from "ethers/lib/utils";
import MARKET_AID_INTERFACE from "../../configuration/abis/MarketAid";
import { RiskMinimizedStrategy } from "../../strategies/marketMaking/riskMinimizedUpOnly";
import { UniswapLiquidityVenue } from "../../liquidityVenues/uniswap";
import { GenericMarketMakingBot } from "./GenericMarketMakingBot";
import { TargetVenueOutBidStrategy } from "../../strategies/marketMaking/targetVenueOutBid";
import BatchableGenericMarketMakingBot from "./BatchableGenericMarketMakingBot";
import BatchStrategyExecutor from "./BatchStrategyExecutor";

dotenv.config();

// function to prompt the user to select an existing contract instance or create a new one
function userMarketAidCheckCallback(rl): Promise<string> {
    return new Promise(resolve => {
        rl.question('\n Do you have an existing MarketAid contract instance you would like to use? (Enter the address of the contract instance you want to use then enter to add, or enter "no" to create one):', (answer) => {
            if (answer.toLowerCase() === 'no') {
                // console.log('\n Creating a new MarketAid contract instance...');
                resolve(null);
            } else {
                console.log('\n Using existing MarketAid contract instance...');
                try {
                    const address = getAddress(answer);
                    resolve(address);
                } catch (error) {
                    console.log("Invalid answer! Enter the address of the contract instance you want to use or enter 'no' to create one");
                    resolve(userMarketAidCheckCallback(rl));
                }
            }
        })
    });
}

// Function 
export async function startGenericMarketMakingBot(configuration: BotConfiguration, rl?: any, providedMarketAidAddress?: string, strategyArg?: string, premium?: number) {
    console.log("\nStarting a generic market-making bot...");


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
        userMarketAidAddress = await userMarketAidCheckCallback(rl);
    }
    // console.log("\nGeneric market-making bot targetting this userMarketAid", userMarketAidAddress);

    // TODO: guided start flow to ask them if they want to use an existing contract instance or create a new one
    if (userMarketAidAddress) {
        console.log("The user selected to use an existing contract instance", userMarketAidAddress);
        marketAidContractInstance = new ethers.Contract(userMarketAidAddress, MARKET_AID_INTERFACE, myProvider);
        console.log("\n This is my contract's address: ", marketAidContractInstance.address);

    } else {
        console.log("The user did not provide an existing contract instance. Creating a new one...");
        // marketAidContractInstance = await helpUserCreateNewMarketAidInstance(configuration);
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

    // 4. Start the bot and listen to log feed
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


    console.log("this bot configs array", botConfigsArray);


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
            }, staticJsonRpc, chainId == 10 ? 500 : undefined, // TODO: make this configurable
            chainId == Network.BASE_MAINNET ? true : undefined // TODO: hacky
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
            botType: BotType.MarketMaking
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
    console.log("This is process.argv", process.argv);
    // Parse through process.argv to get custom configuration details from the user and start the correct bot process
    // TODO:
    const chainId = parseFloat(process.argv[3]);
    if (!chainId) throw new Error('No chain ID found in process.argv');
    const marketAidContractAddress = process.argv[4];
    const jsonRpcUrl = process.env['JSON_RPC_URL_' + chainId.toString()];
    const websocketUrl = process.env['WEBSOCKET_URL_' + chainId.toString()];
    if (!jsonRpcUrl) throw new Error(`No JSON RPC URL found for network ${chainId}`);
    const staticJsonRpc = new ethers.providers.StaticJsonRpcProvider(jsonRpcUrl, chainId); // TODO: perhaps static provider for rpc consumption consciousness
    if (!process.env.EOA_PRIVATE_KEY) throw new Error('No EOA private key found in .env file');
    const strategyArg = process.argv[5];

    const asset = process.argv[6];
    const quote = process.argv[7];
    const assetTokenInfo = tokenList.tokens.find(token => token.address == asset && token.chainId == chainId);
    const quoteTokenInfo = tokenList.tokens.find(token => token.address == quote && token.chainId == chainId);

    if (!assetTokenInfo) throw new Error(`No token found for address ${asset} on network ${chainId}`);
    if (!quoteTokenInfo) throw new Error(`No token found for address ${quote} on network ${chainId}`);

    // Read the premium value from the command line arguments
    const premium = parseFloat(process.argv[8]);
    if (!premium) throw new Error('No premium value found in process.argv');

    var config = {
        network: chainId,
        targetTokens: [assetTokenInfo, quoteTokenInfo],
        connections: {
            jsonRpcProvider: staticJsonRpc,
            websocketProvider: websocketUrl ? new ethers.providers.WebSocketProvider(websocketUrl, chainId) : undefined,
            signer: new ethers.Wallet(process.env.EOA_PRIVATE_KEY, staticJsonRpc)
        },
        botType: BotType.MarketMaking
    };

    console.log("Spin up UNI reference venue with these tokens", config.targetTokens[0], config.targetTokens[1]);

    return startGenericMarketMakingBot(config, undefined,
        marketAidContractAddress, strategyArg, premium);
}



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


main();