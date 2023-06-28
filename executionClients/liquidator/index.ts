import { ethers } from "ethers";
import { BotConfiguration } from "../../configuration/config";
import COMPTROLLER_INTERFACE from "../../configuration/abis/Comptroller";
import { chainReader } from "./reader"
import { start } from "repl";

export async function startLiquidatorBot(configuration: BotConfiguration) {
    console.log("Starting Liquidator Bot.");
    
    // pass through from config
    // Note that either a websocket or json rpc provider is allowed
    const myProvider = (configuration.connections.jsonRpcProvider);

    // TODO: move
    const comptrollerInstance = new ethers.Contract(
        '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B', //TODO put in config
        COMPTROLLER_INTERFACE,
        myProvider // TODO: use websocket (why?)
    );

    let myChainReader = new chainReader(configuration, comptrollerInstance);

    process.on('exit', async (code) => {
        console.log('Process exiting with code:', code);
        await myChainReader.saveData();
    });

    // build list of active accounts by starting a listener and finding historic 
    // MarketEntered/Exited events
    let readerStarted = myChainReader.start();
    
    // Ask any config questions while reader is loading
    await readerStarted;
    console.log("Length: " + myChainReader.activePositions.length);

    //console.log(await comptrollerInstance.closeFactorMantissa());
    console.log("Our lucky guest: ");
    console.log(await comptrollerInstance.getAssetsIn(myChainReader.activePositions[69].account));
    console.log(await comptrollerInstance.getAccountLiquidity(myChainReader.activePositions[69].account));


}


