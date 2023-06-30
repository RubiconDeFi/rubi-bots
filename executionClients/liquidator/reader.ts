import { ethers } from "ethers";
import fs from 'fs';
import { BotConfiguration, Position } from "../../configuration/config";
import { liquidatorBot } from "./liquidatorBot";
import { graphReader } from "./graphReader";
import { chainReader } from "./chainReader";

export abstract class reader {
    public myProvider: ethers.providers.JsonRpcProvider | ethers.providers.WebSocketProvider;
    public comptrollerInstance: ethers.Contract;
    public botStartBlock: number;
    public activePositions: Position[];
    public savedPositionsFile: string;


    constructor(
        configuration: BotConfiguration,
        comptrollerInstance: ethers.Contract,
    ) {
        this.myProvider = configuration.connections.jsonRpcProvider;
        this.myProvider = configuration.connections.jsonRpcProvider;
        this.activePositions = [];
        this.botStartBlock = 0;
        this.savedPositionsFile = 'executionClients/liquidator/activePositions.json';
    }

    abstract start();

    abstract receiveHandoff(block: number);

    abstract saveData();

    async handoff(liquidatorBot: liquidatorBot, reader: graphReader | chainReader) {
        liquidatorBot.reader = reader;
        const block = await this.myProvider.getBlockNumber();
        reader.receiveHandoff(block);
    }

    // attempts to load activePositions.json
    // on success, returns the stored block number to be used as the block to start searching from
    // on failure, returns -1
    loadData(): number {

        let storedData: string, storedObj: any, lastBlock: number;

        try {
            storedData = fs.readFileSync(this.savedPositionsFile, 'utf-8');
            storedObj = JSON.parse(storedData);  
        }
        catch ( error ) {
            if (error.code === 'ENOENT') {
                // file does not exist
                return -1;
            }
            console.error("Error reading file: " + error);
            throw error;
        }

        if ( 
            storedObj.lastBlock !== undefined && 
            storedObj.activePositions !== undefined
        ) {
            lastBlock = storedObj.lastBlock;
            this.activePositions = storedObj.activePositions;
            console.log("Data successfully loaded.  Starting from block " + lastBlock);
        }
        else {
            lastBlock = -1;
            console.log("data loaded but couldn't read data");
        }

        return lastBlock;
    }

}