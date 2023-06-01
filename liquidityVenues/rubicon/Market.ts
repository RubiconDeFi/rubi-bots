import { ethers, BigNumber } from 'ethers';
import { GenericLiquidityVenue, AssetPair } from "../generic";
import { 
    GenericOrder, 
    SimpleBook, 
    BotConfiguration, 
    marketAddressesByNetwork, 
    routerAddressesByNetwork, 
    Network, 
    tokenList,
    BotType,
    networkSelector
} from "../../configuration/config";

import RUBICON_MARKET_INTERFACE from '../../configuration/abis/RubiconMarket';
import RUBICON_ROUTER_INTERFACE from "../../configuration/abis/RubiconRouter";

import dotenv from 'dotenv';
dotenv.config();

export class RubiconLiquidityVenue extends GenericLiquidityVenue {
    marketContract: ethers.Contract;
    routerContract: ethers.Contract;
    provider: ethers.providers.WebSocketProvider;

    constructor(
        assetPair: AssetPair,
        reader: ethers.providers.WebSocketProvider,
        botConfig: BotConfiguration
    ) {
        super(assetPair);
        this.identifier = 'rubicon';
        this.provider = reader;
        try {
            this.marketContract = new ethers.Contract(marketAddressesByNetwork[botConfig.network], RUBICON_MARKET_INTERFACE, reader);
            this.routerContract = new ethers.Contract(routerAddressesByNetwork[botConfig.network], RUBICON_ROUTER_INTERFACE, reader);
        } catch (error) {
            console.log(error);
        }
    }

    // get the book for a pair 
    async getBookForPair(
        asset: AssetPair["asset"],
        quote: AssetPair["quote"]
    ): Promise<SimpleBook> {
        try {

            // get the book for the pair
            const book = await this.routerContract.functions.getBookFromPair(asset.address, quote.address); // , depths[0]
            
            // parse the book into a simple book
            let asks: GenericOrder[] = [];
            let bids: GenericOrder[] = [];
            
            for (let i = 0; i < book[0].length; i++) {
                const pay_amt = Number(ethers.utils.formatUnits(BigNumber.from(book[0][i][0]), asset.decimals));
                const buy_amt = Number(ethers.utils.formatUnits(BigNumber.from(book[0][i][1]), quote.decimals));
                const price = buy_amt / pay_amt;
                asks.push({
                    price: price,
                    size: pay_amt,
                });
            }
            
            for (let i = 0; i < book[1].length; i++) {
                const pay_amt = Number(ethers.utils.formatUnits(BigNumber.from(book[1][i][0]), quote.decimals));
                const buy_amt = Number(ethers.utils.formatUnits(BigNumber.from(book[1][i][1]), asset.decimals));
                const price = pay_amt / buy_amt;
                bids.push({
                    price: price,
                    size: pay_amt,
                });
            }
    
            const simpleBook: SimpleBook = {
                asks: asks,
                bids: bids,
            };

            // update the book and broadcast the new book
            this.liveBook = simpleBook;
            this.emitUpdate()
    
            // return the book
            return Promise.resolve(simpleBook);
        } catch (error) {
            return Promise.reject(error);
        }
    };

    // set a websocket subscription to poll the market for updates to the book every block
    async subscribeToBookUpdates(
        asset: AssetPair["asset"],
        quote: AssetPair["quote"],
        callback?: (book: SimpleBook) => void
    ): Promise<void> {
        
        // on every block, get the book for the pair and emit it to the callback
        this.provider.on('block', async (blockNumber) => {

            // get the book for the pair
            const book = await this.getBookForPair(asset, quote); // current time to beat: 197ms :we will get there :D

            // emit the book to the callback
            if (callback) {
                callback(book);
            }
        });
    };
}; 

async function main() {

    const chainID = process.argv[2]; 
    const assetSymbol = process.argv[3];
    const quoteSymbol = process.argv[4];

    console.log('the chain: ' + chainID);
    console.log('the asset: ' + assetSymbol);
    console.log('the quote: ' + quoteSymbol);

    const networkID = Network[chainID];
    console.log('the network: ' + networkID);

    const jsonRpcVar = 'JSON_RPC_URL_' + chainID;
    const websocketVar = 'WEBSOCKET_URL_' + chainID;    
    const jsonRpcUrl = process.env[jsonRpcVar];
    const websocketUrl = process.env[websocketVar];

    const jsonProvider = new ethers.providers.JsonRpcProvider(jsonRpcUrl);
    const websocketProvider = new ethers.providers.WebSocketProvider(websocketUrl);
    
    const marketAddress = marketAddressesByNetwork[chainID];
    const routerAddress = routerAddressesByNetwork[chainID];
    
    console.log('the json rpc url is: ' + websocketUrl);
    console.log('the market address is: ' + marketAddress)
    console.log('the router address is: ' + routerAddress)

    const assetToken = tokenList.tokens.find((token) => token.symbol === assetSymbol && token.chainId === Number(chainID));
    const quoteToken = tokenList.tokens.find((token) => token.symbol === quoteSymbol && token.chainId === Number(chainID));

    const privateKey = process.env['EOA_PRIVATE_KEY'];
    const signer = new ethers.Wallet(privateKey, jsonProvider);
    console.log('the signer address is ' + signer.address)

    const pair: AssetPair = {
        asset: assetToken,
        quote: quoteToken
    };

    const networkSelected = networkSelector(Number(chainID));
    
    const botConfig: BotConfiguration = {
        botType: BotType.MarketMaking,
        network: networkSelected,
        connections: {
          jsonRpcProvider: jsonProvider,
          signer: signer,
          websocketProvider: websocketProvider
        }
      };

    const rubiconMarket = new RubiconLiquidityVenue(pair, websocketProvider, botConfig);
    const trades = rubiconMarket.getBookForPair(pair.asset, pair.quote);
};

if (require.main === module) {
    main();
}