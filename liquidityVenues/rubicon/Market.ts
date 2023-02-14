import { ethers, BigNumber } from 'ethers';
import { GenericLiquidityVenue,  AssetPair } from "../generic";
import { GenericOrder, SimpleBook, BotConfiguration, marketAddressesByNetwork, routerAddressesByNetwork } from "../../configuration/config";

import RUBICON_MARKET_INTERFACE from '../../configuration/abis/RubiconMarket';
import RUBICON_ROUTER_INTERFACE from "../../configuration/abis/RubiconRouter";

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
        this.marketContract = new ethers.Contract(marketAddressesByNetwork[botConfig.network], RUBICON_MARKET_INTERFACE, reader);
        this.routerContract = new ethers.Contract(routerAddressesByNetwork[botConfig.network], RUBICON_ROUTER_INTERFACE, reader);
    }

    // get the book for a pair 
    async getBookForPair(
        asset: AssetPair["asset"],
        quote: AssetPair["quote"]
    ): Promise<SimpleBook> {
        try {

            // get the bid depth 
            const bidDepth = await this.marketContract.functions.getOfferCount(quote.address, asset.address);
    
            // get the ask depth
            const askDepth = await this.marketContract.functions.getOfferCount(asset.address, quote.address);
    
            // get the max depth to use for the book 
            const askDepthValue = askDepth[0].toNumber();
            const bidDepthValue = bidDepth[0].toNumber();
            const depths = bidDepthValue > askDepthValue ? [bidDepthValue, askDepthValue, bidDepthValue] : [askDepthValue, askDepthValue, bidDepthValue];
            
            // get the book for the pair
            const book = await this.routerContract.functions.getBookFromPair(asset.address, quote.address, depths[0]);
            
            // parse the book into a simple book
            let asks: GenericOrder[] = [];
            let bids: GenericOrder[] = [];
            
            for (let i = 0; i < depths[1]; i++) {
                const pay_amt = Number(ethers.utils.formatUnits(BigNumber.from(book[0][i][0]), asset.decimals));
                const buy_amt = Number(ethers.utils.formatUnits(BigNumber.from(book[0][i][1]), quote.decimals));
                const price = buy_amt / pay_amt;
                asks.push({
                    price: price,
                    size: pay_amt,
                });
            }
    
            for (let i = 0; i < depths[2]; i++) {
                const pay_amt = Number(ethers.utils.formatUnits(BigNumber.from(book[1][i][0]), quote.decimals));
                const buy_amt = Number(ethers.utils.formatUnits(BigNumber.from(book[1][i][1]), asset.decimals));
                const price = pay_amt / buy_amt;
                bids.push({
                    price: price,
                    size: buy_amt,
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
}

// this is going to be not that great for right now, we will iterate away from this as fast as possible
// basically heres the problem: 
    // - we currently don't have a getBookFromPair function live at market that does not require a depth parameter
    // - when you pass in an arbitrarily long depth parameter, the function will spend a long time looking through all depth levels and return back a large book with many empty levels
    // - we have to call `getOfferCount` for both directions to get the number of offers in each direction in order to make sure we get all the offers in the book
// we could use multicall to speed this up, but im not sure if we are able to do comparisons in a multical to decide the depth parameter or if it would still have to be two separate calls

// TODOS:
// currently we are having to parse the chain response and then pass it to the SimpleBook and GenericOrder objects
// i think in an ideal world, we would be able to pass the chain response directly to the SimpleBook and GenericOrder objects
// this would require us to have a way to map the chain response to the SimpleBook and GenericOrder objects
// i bet this is possible with some type of transformtation? we could also modify the SimpleBook and GenericOrder objects to be more flexible? 
// i imagine we will run into this problem multiple times, so we should figure out a way to solve it for one and all

// questions:
// none for now... but that should change soon :)

// general notes: 

// we are going to do this piece by piece for now, and then abstract it out later
// this is first going to be a simple server that connects to the market and maintains a live book based on the market events

// in its v0 form, this will look something like this:
    // 1. set up a websocket connection that will poll the market to get the most current book on a block by block basis
        // a. we will benefit from the websocket connection getting notified of new blocks, but we this will be less performance than later versions of this server
    // 2. when a client connects, they will have the option to subscribe to a set book based on a pair 
    // 3. when a book for a certain book changes, broadcast the new book to all clients that are subscribed to that pair

// in its v1 form, this will look something like this: 
    // 1. set up a websocket connection that subscribes to events from the market *note this will need to be dynamic for each chain*
    // 2. poll the market to get the current orderbook and store it in memory (for now we will just be tracking WETH/USDC) *note we will need to decide how we are going to handle multiple books*
    // 3. when a new event comes in, update the book in memory
            // to ensure we are processing the events in the correct order, we will need to keep an order of the events and update the book in memory based on that order 
            // this will be a bit tricky, due to the fact that we will not want to broadcast the book until the entire block has been processed 
            // in order to do this, we will need to keep track of the block number and the index of the event in the block, and then have some way of knowing when the entire block has been processed
    // 4. when the book changes, broadcast the new book 

    // error handling:
        // 1. every minute, send a ping to the websocket to ensure the connection is still alive
            // a. if the connection is not alive, reconnect
            // b. re-subscribe to the market events
            // c. poll the market to get the current orderbook and store it in memory
        // 2. every minute, poll the market to get the current orderbook and check it against the book in memory
            // a. if the book in memory is different from the book from the market, update the book in memory and broadcast the new book

// in its v2 form, this will look something like this:
    // 1. set up a websocket connection that subscribes to events from the market *note this will need to be dynamic for each chain*
    // 2. wait until a client creates a subscription to the book (the client will pass in a desired pair to track), then poll the market to get the current book for that pair and store it in memory
    // 3. when a new event comes in for any pair that we are currently tracking, update that pairs book in memory
    // 4. when the book changes, broadcast the new book to all clients that are subscribed to that pair

    // error handling:
        // 1. every minute, send a ping to the websocket to ensure the connection is still alive
            // a. if the connection is not alive, reconnect
            // b. keep track of all current subscriptions and re-subscribe to the market events for each pair
            // c. poll the market to get the current books for every subscribed pair and compare them to the books in memory
                // i. if the book in memory is different from the book from the market, update the book in memory and broadcast the new book
        // 2. every minute, poll the market to get the current books for every subscribed pair and compare them to the books in memory
            // a. if the book in memory is different from the book from the market, update the book in memory and broadcast the new book to all clients that are subscribed to that pair

// in its v3 form, this will look something like this:

    // 1. set up a websocket connection that subscribes to events from the market *note this will need to be dynamic for each chain*
    // 2. wait until a client creates a subscription to the book (the client will pass in a desired pair to track), then poll the market to get the current book for that pair and store it in memory
        // a. clients can subscribe to: 
            // i. a specific pair
            // ii. multiple pairs
            // iii. the status of THEIR orders for a specific pair
            // iv. the status of THEIR orders for multiple pairs
    // 3. when a new event comes in for any pair that we are currently tracking, update that pairs book in memory
    // 4. when the book changes, broadcast the new book to all clients that are subscribed to that pair

    // error handling:
        // 1. every minute, send a ping to the websocket to ensure the connection is still alive
            // a. if the connection is not alive, reconnect
            // b. keep track of all current subscriptions and re-subscribe to the market events for each pair
            // c. poll the market to get the current books for every subscribed pair and compare them to the books in memory
                // i. if the book in memory is different from the book from the market, update the book in memory and broadcast the new book
        // 2. every minute, poll the market to get the current books for every subscribed pair and compare them to the books in memory
            // a. if the book in memory is different from the book from the market, update the book in memory and broadcast the new book to all clients that are subscribed to that pair
        // 3. every minute, poll the market to check the status of specific clients books and compare them to the books in memory
            // a. if the book in memory is different from the book from the market, update the book in memory and broadcast the new book to all clients that are subscribed to that pair
        // 4. every minute, poll the client to make sure they are still connected
            // a. if the client is not connected, remove them from the list of clients *maybe?*