import { ethers } from "ethers";

// TODO: maybe rename to event?  More accurate
export type Position = {
    account: string; // address
    cToken: string;  // address
    blockNumber: number;
}

export class reader {

    public myProvider: ethers.providers.JsonRpcProvider | ethers.providers.WebSocketProvider;
    public comptrollerInstance: ethers.Contract;
    public botCreationBlock: number;
    public historicPositions: Position[];
    private enterFilter;
    private exitFilter;
    
    constructor(myProvider: ethers.providers.JsonRpcProvider | ethers.providers.WebSocketProvider, comptrollerInstance: ethers.Contract, botCreationBlock: number) {
        this.myProvider = myProvider;
        this.comptrollerInstance = comptrollerInstance;
        this.botCreationBlock = botCreationBlock;
    }

    async getHistoricPositions() {
        const comptrollerCreationBlock = await this.findComptrollerCreationBlock(0, this.botCreationBlock);
        console.log("Comptroller creation block found: " + comptrollerCreationBlock);

        this.enterFilter = this.comptrollerInstance.filters['MarketEntered']();
        this.exitFilter = this.comptrollerInstance.filters['MarketExited']();

        const enteredEvents: Position[] = [];
        const exitedEvents: Position[] = [];
        await this.getHistoricMarketEnterExit(comptrollerCreationBlock, this.botCreationBlock, enteredEvents, exitedEvents);

        console.log("Final enter / exit lengths: " + enteredEvents.length + " \ " + exitedEvents.length);
        
        // compare entered and exited arrays.  
        // Result: historicPositions holds only currently open positions
        // iterates over every element in enteredEvents and removes the element if it matches an entry in exitedEvents
        const historicPositions = enteredEvents.filter(currEnteredMarketAccount => {

            // Searches exitedEvents for entries that match (on account address and cToken address) current account from enteredEvents
            const matched = exitedEvents.find(currExitedMarketAccount =>
                currExitedMarketAccount.account == currEnteredMarketAccount.account &&
                currExitedMarketAccount.cToken == currEnteredMarketAccount.cToken && 
                currExitedMarketAccount.blockNumber > currEnteredMarketAccount.blockNumber // ensure that the exit corresponds to a previous enter     
            );

            if (matched) {
                return false; // remove this entry from enteredEvents
            }
            else {
                return true; // keep this entry in enteredEvents
            }
        });

        this.historicPositions = historicPositions;
    }

    private async getHistoricMarketEnterExit(startBlock: number, endBlock: number, enteredEvents: Position[], exitedEvents: Position[]) {

        let currEnterEvents, currExitEvents;
        let success: boolean = true;

        try {
            currEnterEvents = await this.comptrollerInstance.queryFilter(this.enterFilter, startBlock, endBlock);
            currExitEvents = await this.comptrollerInstance.queryFilter(this.exitFilter, startBlock, endBlock);    
        }
        catch (error) { // TODO: how tf to catch only "query returned more than 10000 results" errors
            const middleBlock = Math.round((startBlock + endBlock) / 2);
            await this.getHistoricMarketEnterExit(startBlock, middleBlock, enteredEvents, exitedEvents);
            await this.getHistoricMarketEnterExit(middleBlock + 1, endBlock, enteredEvents, exitedEvents);
            return;
        }
        console.log("Got one!  Size of entered / exited: " + currEnterEvents.length + " / " + currExitEvents.length);
        
        // add to array of accounts who have entered a market
        for (const event of currEnterEvents) {
            enteredEvents.push({
                account: event.args.account,
                cToken: event.args.cToken,
                blockNumber: event.blockNumber
            });
        }

        // add to array of accounts who have exited a market
        for (const event of currExitEvents) {
            exitedEvents.push({
                account: event.args.account,
                cToken: event.args.cToken,
                blockNumber: event.blockNumber
            });
        }
        
    }

    // Binary search on-chain to find block at which contract is created
    // Use returned block number as starting block to find historical positions (positions opened before bot creation)
    // This seems to usually miss the correct block by 1 or 2.  Not important for its current use.
    async findComptrollerCreationBlock(startBlock: number, endBlock: number): Promise<number> {

        const address = this.comptrollerInstance.address;

        if (startBlock >= endBlock) {
            return startBlock;
        }

        let midBlock = Math.floor((startBlock + endBlock) / 2);

        // returns contract code (as hex) of address at midBlock.  If no contract is deployed, returns '0x'
        let codeHex = await this.myProvider.getCode(address, midBlock);

        if (codeHex == "0x") {
            // contract hasn't been created yet, search upper half
            return this.findComptrollerCreationBlock(midBlock+1, endBlock);
        }
        else {
            // contract was already created, search lower half
            return this.findComptrollerCreationBlock(startBlock, midBlock-1);
        }
    }
}