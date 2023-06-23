import { ethers, utils } from "ethers";
import { BotConfiguration } from "../../configuration/config";
import COMPTROLLER_INTERFACE from "../../configuration/abis/Comptroller";

export async function startLiquidatorBot(configuration: BotConfiguration) {
    console.log("Starting Liquidator Bot.")

    // get all accounts on startup [TODO] might have to use graph

    // start listeners for all marketEntered and marketExited events

    
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

    // const filter = {
    //     address: "0x05Df6C772A563FfB37fD3E04C1A279Fb30228621",
    //     topics: [
    //         utils.id("MarketEntered(CToken,address)")
    //     ]
    // }
    //let eventFilter = comptrollerInstance.filters.MarketEntered();

    // TODO: make this work if query returns more than 10 000 events
    const currBlock = await myProvider.getBlockNumber();
    const fromBlock = currBlock - 100000;
    const toBlock = 'latest';

    const enterFilter = comptrollerInstance.filters['MarketEntered']()
    const exitFilter = comptrollerInstance.filters['MarketExited']()

    let enterEvents = await comptrollerInstance.queryFilter(enterFilter, fromBlock, toBlock);
    let exitEvents = await comptrollerInstance.queryFilter(exitFilter, fromBlock, toBlock);

    // const enteredMarket = [];

    // let account, cToken;
    // for (const event of enterEvents) {
    //     account = event.args.account
    //     cToken = event.args.cToken;
    //     enteredMarket.push({ account, cToken });
    // }
    const enteredMarkets = enterEvents.map(event => ({
        account: event.args.account,
        cToken: event.args.cToken,
        blockNumber: event.blockNumber // TODO: is this enough to guarentee sequence?
    }));
    //console.log(enteredMarkets);


    //console.log("\nEXITED markets\n");
    // const exitedMarket = [];

    // for (const event of enterEvents) {
    //     account = event.args.account
    //     cToken = event.args.cToken;
    //     exitedMarket.push({ account, cToken });
    // }
    const exitedMarkets = exitEvents.map(event => ({
        account: event.args.account,
        cToken: event.args.cToken,
        blockNumber: event.blockNumber // TODO: is this enough to guarentee sequence?
    }));
    //console.log(exitedMarkets);

    // iterates over every element in enteredMarkets and only keeps the elements if it does not also exist in exitedMarkets
    const filteredEnteredMarkets = enteredMarkets.filter(currEnteredMarketAccount => {

        const matched = exitedMarkets.find(currExitedMarketAccount =>
            currExitedMarketAccount.account == currEnteredMarketAccount.account &&
            currExitedMarketAccount.cToken == currEnteredMarketAccount.cToken && 
            currExitedMarketAccount.blockNumber > currEnteredMarketAccount.blockNumber // ensure that the exit corresponds to a previous enter     
        );

        if (matched) {
            console.log('Matching entry found: ', currEnteredMarketAccount);
            return false; // remove this entry from enteredMarkets
        }
        else {
            return true; // keep this entry in enteredMarkets
        }

    //     !exitedMarkets.some(exitedMarket =>
    //         exitedMarket.account == currEnteredMarketAccount.account &&
    //         exitedMarket.cToken == currEnteredMarketAccount.cToken
    //     )
    });

    
}

