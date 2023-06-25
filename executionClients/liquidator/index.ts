import { ethers } from "ethers";
import { BotConfiguration } from "../../configuration/config";
import COMPTROLLER_INTERFACE from "../../configuration/abis/Comptroller";
import { reader } from "./historicalData"
import { start } from "repl";

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

    const botCreationBlock = await myProvider.getBlockNumber();
    let myReader = new reader(myProvider, comptrollerInstance, botCreationBlock);

    await myReader.getPastPositions();
    console.log("Done! It only took " + myReader.runningJobs + " tries!");
    // first test a call to closeFactorMantissa() view returns uint
    //console.log(await comptrollerInstance.closeFactorMantissa());

}


