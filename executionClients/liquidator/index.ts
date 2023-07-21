import { ethers } from "ethers";
import { BotConfiguration } from "../../configuration/config";
import COMPTROLLER_INTERFACE from "../../configuration/abis/Comptroller";
import { liquidatorBot } from "./liquidatorBot";
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

    // TODO: Deploy or find the liquidator bot contract

    let myLiqBot = new liquidatorBot(configuration, comptrollerInstance);
    myLiqBot.start();
    // Ask any config questions while reader is loading
    // TODO: how to do this now since we're starting the reader in liquidatorBot?

}


