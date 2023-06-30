import { BotConfiguration, Position } from "../../configuration/config";
import { reader } from "./reader";
import { ethers } from "ethers";


export class graphReader extends reader {

    constructor(
        configuration: BotConfiguration, 
        comptrollerInstance: ethers.Contract
        ) {
        super(configuration, comptrollerInstance);
    }

    async start() {

    }

    async saveData() {
        
    }

    async receiveHandoff(block: number) {

    }
}