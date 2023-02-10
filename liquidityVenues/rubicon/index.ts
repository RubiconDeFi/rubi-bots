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
//console.log(process.env.JSON_RPC_URL_OPTIMISM_MAINNET);
//console.log(process.env.WEBSOCKET_URL_OPTIMISM_MAINNET);
const jsonRpcUrl = process.env['JSON_RPC_URL_OPTIMISM_MAINNET'];
const websocketUrl = process.env['WEBSOCKET_URL_OPTIMISM_MAINNET'];
const marketContractAddress = process.env['RUBICON_MARKET_ADDRESS_OPTIMISM_MAINNET'];


import * as WebSocket from 'ws';
import { ethers } from 'ethers';
import RUBICON_MARKET_INTERFACE from '../../configuration/abis/RubiconMarket';

// set up ethers provider
const jsonProvider = new ethers.providers.JsonRpcProvider(jsonRpcUrl);
const websocketProvider = new ethers.providers.WebSocketProvider(websocketUrl);

// set up the market contract
const marketContract = new ethers.Contract(marketContractAddress, RUBICON_MARKET_INTERFACE, websocketProvider);
//const marketContract = new ethers.Contract(marketContractAddress, RUBICON_MARKET_INTERFACE, jsonProvider);

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


// general notes: 

// shared config variables: 
// - chainId
    // - market contract address based on chainId
// - market contract object 