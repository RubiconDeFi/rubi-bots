import { ethers } from "ethers";

// TODO: maybe rename to event?  More accurate
export type Position = {
    account: any; // TODO: not any
    cToken: any;
    blockNumber: number;
}

export async function historicAccountsViaChainState(myProvider: ethers.providers.JsonRpcProvider | ethers.providers.WebSocketProvider, comptrollerInstance: ethers.Contract) {
    console.log("Finding comptroller creation block...")
    const botStartBlock = await myProvider.getBlockNumber();
    const fromBlock = 0;
    const comptrollerCreationBlock = await findContractCreationBlock(myProvider, '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B', fromBlock, botStartBlock);
    console.log("Found creation block: " + comptrollerCreationBlock);

    const enterFilter = comptrollerInstance.filters['MarketEntered']()
    const exitFilter = comptrollerInstance.filters['MarketExited']()

    // cumulative entered and exited events
    const cumEnteredEvents: Position[] = [];
    const cumExitedEvents: Position[] = [];
    let currEnterEvents: ethers.Event[];
    let currExitEvents: ethers.Event[];
    let progress;
    let blockIncrementReduced: boolean = false; // true if block-increment was reduced and needs to be returned to original size
    //let blockIncrementIncreased: boolean = false; // true if block-increment was increased and needs to be returned to original size
    let currentBlock = comptrollerCreationBlock;
    let blockIncrement = 50000; // 50 000 TODO: is this too large?  too small?
    const originalBlockIncrement = blockIncrement; // for returning increment to original size
    // TODO: make sure we don't have loop overlap (querying for after botcurrentBlock).  Could result in some events getting added multiple times.  Possible solution is to just remove duplicate entries at the end but that's extra work
    //for (let currentBlock = comptrollerCreationBlock; currentBlock <= botcurrentBlock; currentBlock += blockIncrement) {
    while (currentBlock <= botStartBlock) {

        // Finds all MarketEntered and MarketExited events from comptroller contract creation block to block bot started on
        try {
            currEnterEvents = await comptrollerInstance.queryFilter(enterFilter, currentBlock, currentBlock + blockIncrement);
            currExitEvents = await comptrollerInstance.queryFilter(exitFilter, currentBlock, currentBlock + blockIncrement);    
        }
        catch (error) { //TODO: catch only query too large errors from provider
            console.log("query too large. Rescaling and trying again");
            currentBlock -= blockIncrement; // revert last loop's increment because it was too large
            blockIncrement = Math.floor(blockIncrement / 2) // reduce size of increment
            currentBlock += blockIncrement; // add new increment
            blockIncrementReduced = true;
            continue; // skip to start of next loop. re-try query with smaller blockIncrement
        }

        // if blockIncrement was reduced, return it to its original size
        if ( blockIncrementReduced ) {
            blockIncrement = originalBlockIncrement;
            blockIncrementReduced = false;
        }

        // add to array of accounts who have entered a market
        for (const event of currEnterEvents) {
            cumEnteredEvents.push({
              account: event.args.account,
              cToken: event.args.cToken,
              blockNumber: event.blockNumber
            });
        }

        // add to array of accounts who have exited a market
        for (const event of currExitEvents) {
            cumExitedEvents.push({
              account: event.args.account,
              cToken: event.args.cToken,
              blockNumber: event.blockNumber
            });
        }
        
        progress = (((currentBlock - comptrollerCreationBlock) / (botStartBlock - comptrollerCreationBlock)) * 100).toFixed(2);
        console.log("Number of currEnterEvents / currExitEvents: " + currEnterEvents.length + " / " + currExitEvents.length + "   " + progress + "%");
        //console.log("Current MarketEntered / MarketExited: " + cumEnteredEvents.length + " / " + cumExitedEvents.length + "   " + progress + "%");
        
        // last query was successful, so try a larger range of blocks
        //blockIncrement = blockIncrement*2;
        currentBlock += blockIncrement; // increment current block by blockIncrement
        // TODO: if currentBlock is close to botStartBlock, don't go over
    }

    console.log("Number of MarketEntered Events: " + cumEnteredEvents.length);
    console.log("Number of MarketExited Events: " + cumExitedEvents.length);

    console.log("Comparing results and building list of active accounts");
    // compare entered and exited arrays.  Result: filteredcumEnteredEvents entries are only currently open positions
    // iterates over every element in cumEnteredEvents and removes the element if it matches an entry in cumExitedEvents
    const filteredcumEnteredEvents = cumEnteredEvents.filter(currEnteredMarketAccount => {

        // Searches cumExitedEvents for entries that match (on account address and cToken address) current account from cumEnteredEvents
        const matched = cumExitedEvents.find(currExitedMarketAccount =>
            currExitedMarketAccount.account == currEnteredMarketAccount.account &&
            currExitedMarketAccount.cToken == currEnteredMarketAccount.cToken && 
            currExitedMarketAccount.blockNumber > currEnteredMarketAccount.blockNumber // ensure that the exit corresponds to a previous enter     
        );

        if (matched) {
            //console.log('Matching entry found: ', currEnteredMarketAccount);
            return false; // remove this entry from cumEnteredEvents
        }
        else {
            return true; // keep this entry in cumEnteredEvents
        }
    });

    console.log("Found " + filteredcumEnteredEvents.length + " currently active accounts");
    return filteredcumEnteredEvents;
}

// Binary search on-chain to find block at which contract is created
// Use returned block number as starting block to find historical positions (positions opened before bot creation)
// TODO: should I not pass in provider?
// TODO: this is ugly as hell.  Refactor to trim parameters.  Shouldn't have to pass provider each time
async function findContractCreationBlock(myProvider: ethers.providers.JsonRpcProvider | ethers.providers.WebSocketProvider, address: string, currentBlock: number, endBlock: number): Promise<number> {

    if (currentBlock >= endBlock) {
        return currentBlock;
    }

    let midBlock = Math.floor((currentBlock + endBlock) / 2);
    // returns contract code (as hex) of address at midBlock.  If no contract is deployed, returns '0x'
    let codeHex = await myProvider.getCode(address, midBlock);

    if (codeHex == "0x") {
        // contract hasn't been created yet, search upper half
        return findContractCreationBlock(myProvider, address, midBlock+1, endBlock);
    }
    else {
        // contract was already created, search lower half
        return findContractCreationBlock(myProvider, address, currentBlock, midBlock-1);
    }
}