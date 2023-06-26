import { ethers } from "ethers";
import { BotConfiguration } from "../../configuration/config";

// TODO: move
export type Position = {
    cToken: string;  // address
    account: string; // address
    health?: number;
}

export class chainReader {

    public configuration: BotConfiguration;
    public myProvider: ethers.providers.JsonRpcProvider | ethers.providers.WebSocketProvider;
    public comptrollerInstance: ethers.Contract;
    public botStartBlock: number;
    public loadingHistoricPositions: boolean; 
    public activePositions: Position[];
    private historicPositions: Position[];  // TODO: we don't need this to be a class variable.  refactor so it can be garbage collected when we're done discovering historic positions
    private backlogMarketExits: Position[]; // TODO: we don't need this to be a class variable.  refactor so it can be garbage collected when we're done discovering historic positions
    
    constructor(
        configuration: BotConfiguration, 
        comptrollerInstance: ethers.Contract
        ) {

        this.myProvider = configuration.connections.jsonRpcProvider;
        this.comptrollerInstance = comptrollerInstance;
        this.historicPositions = [];
        this.activePositions = [];
        this.backlogMarketExits = [];
        this.loadingHistoricPositions = false;
    }

    async start() {
        this.botStartBlock = await this.myProvider.getBlockNumber();

        // start both processes
        // TODO: ensure these start on the same block
        let historicPositions = this.getHistoricPositions();
        this.listenForUpdates();

        // wait until done finding historic positions, then combine both arrays
        await historicPositions;
        this.activePositions = this.activePositions.concat(this.historicPositions);

        // Now we can remove MarketExits that were emitted while we were finding historic positions
        this.removeExitedFromActive(this.backlogMarketExits, this.activePositions);

        console.log("Number of open positions: " + this.activePositions.length);
    }

    // TODO: does ethers .on Event Listener wait for block to be confirmed?
    async listenForUpdates() {

        this.comptrollerInstance.on('MarketEntered', (cToken, account) => {
            console.log("NEW MARKET ENTERED EVENT");
            this.activePositions.push({
                cToken: cToken,
                account: account
            });
        }) 
        console.log("Listening for MarketEntered events!");

        this.comptrollerInstance.on('MarketExited', (cToken, account) => {
            console.log("NEW MARKET EXITED EVENT");
            // If reader is still discovering historic positions then we can't just remove 
            // this MarketExited position because the corresponding MarketEntered 
            // from the past might not be discovered yet.
            // Save and remove when were done finding historic positions.
            if (this.loadingHistoricPositions) {
                this.backlogMarketExits.push({
                    cToken: cToken,
                    account: account
                });
            }
            else {
                // activePositions is up to date, so it's safe to try to remove a Position
                this.removeExitedFromActive([{cToken, account}], this.activePositions);
            }
            
        }) 
        console.log("Listening for MarketExited events!");
    }

    private async getHistoricPositions() {
        this.loadingHistoricPositions = true;

        const comptrollerCreationBlock = await this.findComptrollerCreationBlock(0, this.botStartBlock);
        console.log("Comptroller creation block found: " + comptrollerCreationBlock);

        const enterFilter = this.comptrollerInstance.filters['MarketEntered']();
        const exitFilter = this.comptrollerInstance.filters['MarketExited']();

        const enteredEvents: Position[] = [];
        const exitedEvents: Position[] = [];
        await this.getHistoricMarketEnterExit(
            comptrollerCreationBlock, 
            this.botStartBlock, 
            enteredEvents, 
            exitedEvents, 
            enterFilter, 
            exitFilter
        );

        console.log("Final enter / exit lengths: " + enteredEvents.length + " \ " + exitedEvents.length);

        // remove matching elements of exitedEvents from enteredEvents 
        // resulting in entered events being only active positions at time of bot start
        this.removeExitedFromActive(exitedEvents, enteredEvents);

        this.historicPositions = enteredEvents;

        this.loadingHistoricPositions = false;
    }

    // Removes a Position from activePositions if there is a matching position in exitedPositions
    private removeExitedFromActive(exitedPositions: Position[], activePositions: Position[]) {
        console.log("Doing some trimming...");

        for (const currExitedPosition of exitedPositions) {

            const index = activePositions.findIndex(activePosition => 
                activePosition.cToken === currExitedPosition.cToken && 
                activePosition.account === currExitedPosition.account
            );

            // If we found a matching Position of currently active position, remove it.
            // Otherwise, throw an error.  A MarketExited event can only come after a matching
            // MarketEntered event.
            if (index !== -1) {
                activePositions.splice(index, 1);
            } else {
                throw new Error(`Matching event not found for cToken: ${currExitedPosition.cToken}, account: ${currExitedPosition.account}`);
            }
        }
    }

    // Recursively ...
    // initially called with
    // startBlock = comptrollerCreationBlock
    // endBlock = this.botStartBlock
    private async getHistoricMarketEnterExit(
        startBlock: number, 
        endBlock: number, 
        enteredEvents: Position[], 
        exitedEvents: Position[], 
        enterFilter: ethers.EventFilter, 
        exitFilter: ethers.EventFilter
        ) {

        // termination condition
        if (startBlock >= endBlock) {
            return;
        }

        let currEnterEvents: ethers.Event[], currExitEvents: ethers.Event[];

        try {
            currEnterEvents = await this.comptrollerInstance.queryFilter(enterFilter, startBlock, endBlock);
            currExitEvents = await this.comptrollerInstance.queryFilter(exitFilter, startBlock, endBlock);    
        }
        catch (error) { // TODO: how tf to catch only "query returned more than 10000 results" errors
            const middleBlock = Math.round((startBlock + endBlock) / 2);
            await this.getHistoricMarketEnterExit(startBlock, middleBlock, enteredEvents, exitedEvents, enterFilter, exitFilter);
            await this.getHistoricMarketEnterExit(middleBlock + 1, endBlock, enteredEvents, exitedEvents, enterFilter, exitFilter);
            return;
        }
        console.log("Got one!  Size of entered / exited: " + currEnterEvents.length + " / " + currExitEvents.length);
        
        // add to array of accounts who have entered a market
        for (const event of currEnterEvents) {
            enteredEvents.push({
                cToken: event.args.cToken,
                account: event.args.account
            });
        }

        // add to array of accounts who have exited a market
        for (const event of currExitEvents) {
            exitedEvents.push({
                cToken: event.args.cToken,
                account: event.args.account
            });
        }
    }

    // Binary search on-chain to find block at which contract is created
    // Use returned block number as starting block to find historical positions
    // This seems to usually miss the correct block by 1 or 2.  Negligible for its current use.
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