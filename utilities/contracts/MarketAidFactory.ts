import { Contract, Signer, ethers } from "ethers";
import MARKET_AID_FACTORY_INTERFACE from "../../configuration/abis/MarketAidFactory" 

/**
 * MarketAidFactory class to interact with the MarketAidFactory smart contract.
 */
export class MarketAidFactory {
    public contract: Contract;
    public address: string;

    /**
     * Creates an instance of the MarketAidFactory class.
     * @param factoryAddress - The address of the MarketAidFactory smart contract.
     * @param signer - An ethers.js Signer instance.
     */
    constructor(factoryAddress: string, signer: Signer) {
        this.contract = new Contract(factoryAddress, MARKET_AID_FACTORY_INTERFACE, signer);
        this.address = this.contract.address;
    }

    /**
     * Creates a new MarketAid instance.
     * @returns The address of the newly created MarketAid instance.
     */
    public async createMarketAidInstance(): Promise<string> {
        const createMarketAidTx = await this.contract.createMarketAidInstance();
        const receipt = await createMarketAidTx.wait();
    
        // Find the NotifyMarketAidSpawn event in the receipt logs
        const eventTopic = this.contract.interface.getEventTopic("NotifyMarketAidSpawn");
        const eventLog = receipt.logs.find(log => log.topics[0] === eventTopic);
    
        if (!eventLog) {
            throw new Error("MarketAid instance creation event not found");
        }
    
        // Decode the log data to get the newMarketAidAddress
        const decodedLog = this.contract.interface.decodeEventLog("NotifyMarketAidSpawn", eventLog.data, eventLog.topics);
        const newMarketAidAddress = decodedLog[0]; // Assuming the first indexed parameter is the newMarketAidAddress
    
        return newMarketAidAddress;
    }
    

    /**
     * Retrieves the MarketAid instances associated with the specified user.
     * @param user - The user's address.
     * @returns An array of MarketAid instance addresses.
     */
    public async getUserMarketAids(user: string): Promise<string[]> {
        const userMarketAids = await this.contract.getUserMarketAids(user);
        return userMarketAids;
    }

    /**
     * Retrieves the admin address of the MarketAidFactory contract.
     * @returns The admin address.
     */
    public async getAdmin(): Promise<string> {
        const admin = await this.contract.admin();
        return admin;
    }

    /**
     * Retrieves the Rubicon Market address associated with the MarketAidFactory contract.
     * @returns The Rubicon Market address.
     */
    public async getRubiconMarket(): Promise<string> {
        const rubiconMarket = await this.contract.rubiconMarket();
        return rubiconMarket;
    }
}