import { ethers, utils } from "ethers";
import { BotConfiguration } from "../../configuration/config";
import COMPTROLLER_INTERFACE from "../../configuration/abis/Comptroller";

export async function startLiquidatorBot(configuration: BotConfiguration) {
    console.log("Starting Liquidator Bot.")
    
    // TODO: move setup elsewhere to streamline
    var myProvider: ethers.providers.JsonRpcProvider | ethers.providers.WebSocketProvider;
    // pass through from config
    // Note that either a websocket or json rpc provider is allowed
    myProvider = (configuration.connections.jsonRpcProvider);

    const comptrollerInstance = new ethers.Contract(
        '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B', //TODO abstract this away
        COMPTROLLER_INTERFACE,
        myProvider // TODO: use websocket (why?)
    );

    // first test a call to closeFactorMantissa() view returns uint
    //console.log(await comptrollerInstance.closeFactorMantissa());

    const currBlock = await myProvider.getBlockNumber();
    const fromBlock = currBlock - 100000;
    const toBlock = 'latest';

    //console.log(currBlock);

    const creationBlock = await findContractCreationBlock(myProvider, '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B', 0, currBlock);

    const enterFilter = comptrollerInstance.filters['MarketEntered']()
    const exitFilter = comptrollerInstance.filters['MarketExited']()
    
    // TODO: make this work if query returns more than 10 000 events
    let enterEvents = await comptrollerInstance.queryFilter(enterFilter, fromBlock, toBlock);
    let exitEvents = await comptrollerInstance.queryFilter(exitFilter, fromBlock, toBlock);

    // build array of accounts who have entered a market
    const enteredMarkets = enterEvents.map(event => ({
        account: event.args.account,
        cToken: event.args.cToken,
        blockNumber: event.blockNumber // TODO: is this enough to guarentee sequence?
    }));
    //console.log(enteredMarkets);

    // build array of accounts who have exited a market
    const exitedMarkets = exitEvents.map(event => ({
        account: event.args.account,
        cToken: event.args.cToken,
        blockNumber: event.blockNumber // TODO: is this enough to guarentee sequence?
    }));
    //console.log(exitedMarkets);

    // compare entered and exited arrays.  Result: filteredEnteredMarkets entries are only currently open positions
    // iterates over every element in enteredMarkets and removes the element if it matches an entry in exitedMarkets
    const filteredEnteredMarkets = enteredMarkets.filter(currEnteredMarketAccount => {

        // Searches exitedMarkets for entries that match (on account address and cToken address) current account from enteredMarkets
        const matched = exitedMarkets.find(currExitedMarketAccount =>
            currExitedMarketAccount.account == currEnteredMarketAccount.account &&
            currExitedMarketAccount.cToken == currEnteredMarketAccount.cToken && 
            currExitedMarketAccount.blockNumber > currEnteredMarketAccount.blockNumber // ensure that the exit corresponds to a previous enter     
        );

        if (matched) {
            //console.log('Matching entry found: ', currEnteredMarketAccount);
            return false; // remove this entry from enteredMarkets
        }
        else {
            return true; // keep this entry in enteredMarkets
        }
    });
}

// Binary search on-chain to find block at which contract is created
// Use returned block number as starting block to find historical positions (positions opened before bot creation)
// TODO: should I not pass in provider?
// TODO: this is ugly as hell.  Refactor to trim parameters.  Shouldn't have to pass provider each time
async function findContractCreationBlock(myProvider: ethers.providers.JsonRpcProvider | ethers.providers.WebSocketProvider, address: string, startBlock: number, endBlock: number): Promise<number> {

    if (startBlock >= endBlock) {
        console.log("Found creation block: " + startBlock);
        return startBlock;
    }

    let midBlock = Math.floor((startBlock + endBlock) / 2);
    // returns contract code (as hex) of address at midBlock.  If no contract is deployed, returns '0x'
    let codeHex = await myProvider.getCode(address, midBlock);

    if (codeHex == "0x") {
        // contract hasn't been created yet, search upper half
        return findContractCreationBlock(myProvider, address, midBlock+1, endBlock);
    }
    else {
        // contract was already created, search lower half
        return findContractCreationBlock(myProvider, address, startBlock, midBlock-1);
    }
}
