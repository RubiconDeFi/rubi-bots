import { ethers } from "ethers";
import fs from 'fs';
import { BotConfiguration, Position } from "../../configuration/config";

export class chainReader {

    public myProvider: ethers.providers.JsonRpcProvider | ethers.providers.WebSocketProvider;
    public comptrollerInstance: ethers.Contract;
    public botStartBlock: number;
    public activePositions: Position[];
    public savedPositionsFile: string;
    public loadingHistoricPositions: boolean;
    private backlogMarketExits: Position[];
    
    constructor(
        configuration: BotConfiguration, 
        comptrollerInstance: ethers.Contract
        ) {
        this.myProvider = configuration.connections.jsonRpcProvider;
        this.comptrollerInstance = comptrollerInstance;
        this.activePositions = [];
        this.botStartBlock = 0;
        this.savedPositionsFile = 'executionClients/liquidator/activePositions.json';
        this.backlogMarketExits = [];
        this.loadingHistoricPositions = false;
    }

    async start() {
        let startBlock: number;

        this.botStartBlock = await this.myProvider.getBlockNumber();

        // First check if we already have some historical data
        const lastKnownBlock = this.loadData();
        if (lastKnownBlock > 0) {
            startBlock = lastKnownBlock;
        }
        else {
            console.log('activePositions.json does not exist.  Rebuilding historical data.');
            // find comptroller creation block to start search from
            startBlock = await this.findComptrollerCreationBlock(0, this.botStartBlock);
            console.log("Comptroller creation block found: " + startBlock);
        }

        // start both processes
        let historicPositions = this.getHistoricPositions(startBlock);
        this.listenForUpdates();  

        // wait until done finding historic positions, then combine both arrays
        this.activePositions = this.activePositions.concat(await historicPositions);

        // Now we can remove MarketExits that were emitted while we were finding historic positions
        this.removeExitedFromActive(this.backlogMarketExits, this.activePositions);

        // since we just queried historical positions we should save so we don't have to again
        this.saveData();

        console.log("Number of open positions: " + this.activePositions.length);
    }


    // writes the most recent block number and entire activePositions array
    // to activePositions.json
    async saveData() {
        const lastBlock = await this.myProvider.getBlockNumber();
        const data = {
            lastBlock: lastBlock,
            activePositions: this.activePositions
        }

        fs.writeFileSync(this.savedPositionsFile, JSON.stringify(data));
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



    // TODO: does ethers .on Event Listener wait for block to be confirmed?
    // starts an event listener for MarketEntered and MarketExited events
    // when an event is found, adds (MarketEntered) or removes (MarketExited) from activePositions
    async listenForUpdates() {

        this.comptrollerInstance.on('MarketEntered', (cToken, account) => {
            console.log("NEW MARKET ENTERED EVENT");
            this.addPositionTo(this.activePositions, cToken, account);
        }) 

        this.comptrollerInstance.on('MarketExited', (cToken, account) => {
            console.log("NEW MARKET EXITED EVENT");
            // If reader is still discovering historic positions then we can't just remove 
            // this MarketExited position because the corresponding MarketEntered 
            // from the past might not be discovered yet.
            // Save and remove when were done finding historic positions.
            if (this.loadingHistoricPositions) {
                this.addPositionTo(this.backlogMarketExits, cToken, account);
            }
            else {
                // activePositions is up to date, so it's safe to try to remove a Position
                this.removeExitedFromActive([{ cToken: [cToken], account }], this.activePositions);
            }       
        })
    }


    // starts process of getting historic active positions
    private async getHistoricPositions(startBlock: number) {
        this.loadingHistoricPositions = true;

        const enterFilter = this.comptrollerInstance.filters['MarketEntered']();
        const exitFilter = this.comptrollerInstance.filters['MarketExited']();

        const enteredEvents: Position[] = [];
        const exitedEvents: Position[] = [];

        // call to recursive function to make the query
        await this.getHistoricMarketEnterExit(
            startBlock, 
            this.botStartBlock, 
            enteredEvents, 
            exitedEvents, 
            enterFilter, 
            exitFilter
        );

        console.log("Final queried enter / exit lengths: " + enteredEvents.length + " \ " + exitedEvents.length);

        // remove matching elements of exitedEvents from enteredEvents. 
        // results in entered events consisting of only active positions at time of bot start
        this.removeExitedFromActive(exitedEvents, enteredEvents);

        this.loadingHistoricPositions = false;

        return enteredEvents;
    }


    // Query for all MarketEntered and MarketExited events.
    // If the provider limits the number of query results (ex: Infura), split the query in half and 
    // recursively call function twice more, searching upper and lower halves until it succeeds.
    // If the provider is your own node, this should be quick :)
    // initially called with:
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

        // try the query
        try {
            currEnterEvents = await this.comptrollerInstance.queryFilter(enterFilter, startBlock, endBlock);
            currExitEvents = await this.comptrollerInstance.queryFilter(exitFilter, startBlock, endBlock);    
        }
        catch (error) { // TODO: how tf to catch only "query returned more than 10000 results" errors
            // cut block range in half
            const middleBlock = Math.round((startBlock + endBlock) / 2);
            // query lower half
            await this.getHistoricMarketEnterExit(startBlock, middleBlock, enteredEvents, exitedEvents, enterFilter, exitFilter);
            // query upper half
            await this.getHistoricMarketEnterExit(middleBlock + 1, endBlock, enteredEvents, exitedEvents, enterFilter, exitFilter);
            return;
        }
        console.log("Query success!  Size of entered / exited: " + currEnterEvents.length + " / " + currExitEvents.length);
        
        // add to array of accounts who have entered a market
        for (const event of currEnterEvents) {
            this.addPositionTo(enteredEvents, event.args.cToken, event.args.account);
        }

        // add to array of accounts who have exited a market
        for (const event of currExitEvents) {
            this.addPositionTo(exitedEvents, event.args.cToken, event.args.account);
        }
    }


    // Removes a Position from activePositions if there is a matching position in exitedPositions
    private removeExitedFromActive(exitedPositions: Position[], activePositions: Position[]) {
        // Map to store exited positions cTokens by account for fast lookups
        const exitedMap = new Map<string, string[]>(); 

        // Build the exitedMap
        for (const { account, cToken } of exitedPositions) {
          if (!exitedMap.has(account)) {
            exitedMap.set(account, []);
          }
          exitedMap.get(account)?.push(...cToken);
        }
      
        // matches exitedPositions and activePositions on account and removes cTokens 
        // from the matched activePosition that exist in the matched exitedPosition
        // Also removes activePositions entries that have no cTokens
        // iterate backwards so we can safely .splice() without affecting loop's iteration
        for (let i = activePositions.length - 1; i >= 0; i--) {
            const { account, cToken } = activePositions[i];

            if (exitedMap.has(account)) {
                const exitedCTokens = exitedMap.get(account);
                // removes exited cTokens from current activePosition's cToken array
                activePositions[i].cToken = cToken.filter((token) => !exitedCTokens.includes(token));

                // If the current activePosition has no cToken's associated, remove it
                if (activePositions[i].cToken.length == 0) {
                    activePositions.splice(i, 1); 
                }
            }
        }
    }


    private addPositionTo(addToThis: Position[], cToken: string, account: string) {
        const existingPosition = addToThis.find((position) => position.account === account);

        if (existingPosition) {
            existingPosition.cToken.push(cToken);
        }
        else {
            addToThis.push({
                cToken: [cToken],
                account: account
            });
        }
    }

    
    // Binary search on-chain to find block at which contract is created
    // Use returned block number as starting block to find historical positions
    // This seems to usually miss the correct block by 1 or 2.  Negligible for its current use.
    async findComptrollerCreationBlock(startBlock: number, endBlock: number): Promise<number> {

        // we're looking for the Comptroller.sol creation block
        const address = this.comptrollerInstance.address;

        // termination condition
        if (startBlock >= endBlock) {
            return startBlock;
        }

        let midBlock = Math.floor((startBlock + endBlock) / 2);

        // returns contract code (as hex) of address at midBlock.  
        // If the contract is NOT found at midBlock, returns '0x'
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