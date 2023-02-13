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

// for testing and local development, these will be obfuscated to setup later 
import * as dotenv from "dotenv";
dotenv.config();   

const jsonRpcUrl = process.env['JSON_RPC_URL_OPTIMISM_MAINNET'];
const websocketUrl = process.env['WEBSOCKET_URL_OPTIMISM_MAINNET'];
const marketContractAddress = process.env['RUBICON_MARKET_ADDRESS_OPTIMISM_MAINNET'];
const routerContractAddress = process.env['RUBICON_ROUTER_ADDRESS_OPTIMISM_MAINNET'];

import * as WebSocket from 'ws';
import { ethers, BigNumber } from 'ethers';
import { GenericOrder, SimpleBook } from "../../configuration/config";
import { tokenList } from "../../configuration/config";
import { TokenInfo, TokenList } from "@uniswap/token-lists";
import RUBICON_MARKET_INTERFACE from '../../configuration/abis/RubiconMarket';
import RUBICON_ROUTER_INTERFACE from "../../configuration/abis/RubiconRouter";

// set up ethers provider
const jsonProvider = new ethers.providers.JsonRpcProvider(jsonRpcUrl);
const websocketProvider = new ethers.providers.WebSocketProvider(websocketUrl);

// set up the market contract
const marketContract = new ethers.Contract(marketContractAddress, RUBICON_MARKET_INTERFACE, websocketProvider);
const routerContract = new ethers.Contract(routerContractAddress, RUBICON_ROUTER_INTERFACE, websocketProvider);

// get usdc and weth from the token list 
const usdc = tokenList.tokens.find((token) => token.symbol === 'USDC');
const weth = tokenList.tokens.find((token) => token.symbol === 'WETH');
console.log(usdc.address);
console.log(weth.address);

/*
// set up the websocket server
const port = 8080;
const wss = new WebSocket.Server({ port });

// connect the server and start listening for events to broadcast
wss.on('connection', (ws) => {
    console.log('connected');

    // subscribe to the market events
    marketContract.on('LogMake', (...args) => {
        console.log('LogMake', args);
    });

    marketContract.on('LogTake', (...args) => {
        console.log('LogTake', args);
    });

    marketContract.on('LogKill', (...args) => {
        console.log('LogKill', args);
    });
});

console.log('listening on port 8080');
*/

// this is going to be not that great for right now, we will iterate away from this as fast as possible
// basically heres the problem: 
    // - we currently don't have a getBookFromPair function live at market that does not require a depth parameter
    // - when you pass in an arbitrarily long depth parameter, the function will spend a long time looking through all depth levels and return back a large book with many empty levels
    // - we have to call `getOfferCount` for both directions to get the number of offers in each direction in order to make sure we get all the offers in the book
// we could use multicall to speed this up, but im not sure if we are able to do comparisons in a multical to decide the depth parameter or if it would still have to be two separate calls
async function getBookForPair(input: {
    asset: TokenInfo;
    quote: TokenInfo;
}): Promise<SimpleBook> {
    try {
        // get the bid depth 
        const bidDepth = await marketContract.functions.getOfferCount(input.quote.address, input.asset.address);

        // get the ask depth
        const askDepth = await marketContract.functions.getOfferCount(input.asset.address, input.quote.address);

        // get the max depth to use for the book 
        const askDepthValue = askDepth[0].toNumber();
        const bidDepthValue = bidDepth[0].toNumber();
        const depths = bidDepthValue > askDepthValue ? [bidDepthValue, askDepthValue, bidDepthValue] : [askDepthValue, askDepthValue, bidDepthValue];
        
        // get the book for the pair
        const book = await routerContract.functions.getBookFromPair(input.asset.address, input.quote.address, depths[0]);
        
        // parse the book into a simple book
        let asks: GenericOrder[] = [];
        let bids: GenericOrder[] = [];
        
        for (let i = 0; i < depths[1]; i++) {
            const pay_amt = Number(ethers.utils.formatUnits(BigNumber.from(book[0][i][0]), input.asset.decimals));
            const buy_amt = Number(ethers.utils.formatUnits(BigNumber.from(book[0][i][1]), input.quote.decimals));
            const price = buy_amt / pay_amt;
            asks.push({
                price: price,
                size: pay_amt,
            });
        }

        for (let i = 0; i < depths[2]; i++) {
            const pay_amt = Number(ethers.utils.formatUnits(BigNumber.from(book[1][i][0]), input.quote.decimals));
            const buy_amt = Number(ethers.utils.formatUnits(BigNumber.from(book[1][i][1]), input.asset.decimals));
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

        // return the book
        return Promise.resolve(simpleBook);
    } catch (error) {
        return Promise.reject(error);
    }
};

// get the weth/usdc book
const test = getBookForPair({asset: weth, quote: usdc}).then(book => {
    console.log(book);
}).catch(error => {
    console.log(error);
});

// schedule the book update function to run every minute
//setInterval(updateBook("0x4200000000000000000000000000000000000006", "0x7F5c764cBc14f9669B88837ca1490cCa17c31607"), 10 * 1000);

// general notes: 

// shared config variables: 
// - chainId
    // - market contract address based on chainId
// - market contract object 

// TODOS:
// currently we are having to parse the chain response and then pass it to the SimpleBook and GenericOrder objects
// i think in an ideal world, we would be able to pass the chain response directly to the SimpleBook and GenericOrder objects
// this would require us to have a way to map the chain response to the SimpleBook and GenericOrder objects
// i bet this is possible with some type of transformtation? we could also modify the SimpleBook and GenericOrder objects to be more flexible? 
// i imagine we will run into this problem multiple times, so we should figure out a way to solve it for one and all

// questions:
// should we be using BigNumber instead of Number?

// within the generic order object, is price always the asset in the quote currency?
// is size then always the amount of the asset? 