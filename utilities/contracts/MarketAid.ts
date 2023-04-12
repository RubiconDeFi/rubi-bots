import { Contract, Signer, BigNumber } from "ethers";
import MARKET_AID_INTERFACE from "../../configuration/abis/MarketAid";


/**
 * MarketAid class to interact with the MarketAid smart contract.
 */
export class MarketAid {
    public contract: Contract;
    public address: string;

    /**
     * Creates an instance of the MarketAid class.
     * @param marketAidAddress - The address of the MarketAid smart contract.
     * @param signer - An ethers.js Signer instance.
     */
    constructor(marketAidAddress: string, signer: Signer) {
        this.contract = new Contract(marketAidAddress, MARKET_AID_INTERFACE, signer);
        this.address = this.contract.address;
    }

    /**
     * Retrieves the admin address of the MarketAid smart contract.
     * @returns The admin address as a string.
     */
    public async getAdmin(): Promise<string> {
        const admin = await this.contract.admin();
        return admin;
    }

    /**
     * Retrieves the Rubicon Market address that the MarketAid smart contract is pointed to.
     * @returns The Rubicon Market address as a string.
     */
    public async getRubiconMarketAddress(): Promise<string> {
        const rubiconMarketAddress = await this.contract.RubiconMarketAddress();
        return rubiconMarketAddress;
    }

    /**
     * Checks if an address is an approved strategist.
     * @param wouldBeStrategist - The address to check.
     * @returns A boolean indicating if the address is an approved strategist.
     */
    public async isApprovedStrategist(wouldBeStrategist: string): Promise<boolean> {
        const result = await this.contract.isApprovedStrategist(wouldBeStrategist);
        return result;
    }

    /**
     * Allows the admin to grant max approval for a specific token to a target address.
     * @param target - The target address to grant approval to.
     * @param token - The token address to grant approval for.
     */
    public async adminMaxApproveTarget(target: string, token: string): Promise<void> {
        const approveTx = await this.contract.adminMaxApproveTarget(target, token);
        const receipt = await approveTx.wait();

        // return the transaction hash
        return receipt.transactionHash;
    }

    /**
     * Allows admin to deposit funds to the contract for market-making purposes.
     * @param erc20s - An array of token addresses to deposit.
     * @param amounts - An array of amounts for each token.
     * @returns a dictionary of token addresses to amounts that were actually deposited.
     */
    public async adminDepositToBook(erc20s: string[], amounts: BigNumber[]): Promise<{[token: string]: BigNumber}> {
        const depositTx = await this.contract.adminDepositToBook(erc20s, amounts);
        const receipt = await depositTx.wait();
    
        const eventTopic = this.contract.interface.getEventTopic("LogBookUpdate");
        const eventLogs = receipt.logs.filter(log => log.topics[0] === eventTopic);
    
        if (eventLogs.length === 0) {
            throw new Error("Admin deposit to book event not found");
        }
    
        const balanceChanges: {[token: string]: BigNumber} = {};
        for (const eventLog of eventLogs) {
            const decodedLog = this.contract.interface.decodeEventLog("LogBookUpdate", eventLog.data, eventLog.topics);
            const token = decodedLog.token;
            const amountChanged = decodedLog.amountChanged;
            if (balanceChanges[token]) {
                balanceChanges[token] = balanceChanges[token].add(amountChanged);
            } else {
                balanceChanges[token] = amountChanged;
            }
        }
        return balanceChanges;
    }

    /**
     * Allows admin to withdraw funds from the contract.
     * @param erc20s - An array of token addresses to withdraw.
     * @param amounts - An array of amounts for each token.
     * @returns a dictionary of token addresses to amounts that were actually withdrawn.
     */
    public async adminWithdrawFromBook(erc20s: string[], amounts: BigNumber[]): Promise<{[token: string]: BigNumber}> {
        const withdrawTx = await this.contract.adminWithdrawFromBook(erc20s, amounts);
        const receipt = await withdrawTx.wait();
    
        const eventTopic = this.contract.interface.getEventTopic("LogBookUpdate");
        const eventLogs = receipt.logs.filter(log => log.topics[0] === eventTopic);
    
        if (eventLogs.length === 0) {
            throw new Error("Admin withdraw from book event not found");
        }
    
        const balanceChanges: {[token: string]: BigNumber} = {};
        for (const eventLog of eventLogs) {
            const decodedLog = this.contract.interface.decodeEventLog("LogBookUpdate", eventLog.data, eventLog.topics);
            const token = decodedLog.token;
            const amountChanged = decodedLog.amountChanged;
            if (balanceChanges[token]) {
                balanceChanges[token] = balanceChanges[token].add(amountChanged);
            } else {
                balanceChanges[token] = amountChanged;
            }
        }
        return balanceChanges;
    }

    /**
     * Allows the admin to pull all funds of specified ERC20 tokens.
     * @param erc20s - An array of token addresses to pull funds from.
     * @returns a dictionary of token addresses to amounts that were actually pulled.
     */
    public async adminPullAllFunds(erc20s: string[]): Promise<{[token: string]: BigNumber}> {
        const adminPullAllFundsTx = await this.contract.adminPullAllFunds(erc20s);
        const receipt = await adminPullAllFundsTx.wait();
    
        const eventTopic = this.contract.interface.getEventTopic("LogAdminPullFunds");
        const eventLogs = receipt.logs.filter(log => log.topics[0] === eventTopic);
    
        if (eventLogs.length === 0) {
            throw new Error("LogAdminPullFunds event not found");
        }
    
        const pulledFunds: {[token: string]: BigNumber} = {};
        for (const eventLog of eventLogs) {
            const decodedLog = this.contract.interface.decodeEventLog("LogAdminPullFunds", eventLog.data, eventLog.topics);
            const token = decodedLog.asset;
            const amountOfReward = decodedLog.amountOfReward;
            if (pulledFunds[token]) {
                pulledFunds[token] = pulledFunds[token].add(amountOfReward);
            } else {
                pulledFunds[token] = amountOfReward;
            }
        }
        return pulledFunds;
    }

    /**
     * Allows the admin to approve a new permissioned strategist.
     * @param strategist - The address of the strategist to be approved.
     * @returns The transaction hash of the approveStrategist function call.
     */
    public async approveStrategist(strategist: string): Promise<string> {
        const approveTx = await this.contract.approveStrategist(strategist);
        const receipt = await approveTx.wait();
        return receipt.transactionHash;
    }

    /**
     * Allows the admin to remove a permissioned strategist.
     * @param strategist - The address of the strategist to be removed.
     * @returns The transaction hash of the removeStrategist function call.
     */
    public async removeStrategist(strategist: string): Promise<string> {
        const removeTx = await this.contract.removeStrategist(strategist);
        const receipt = await removeTx.wait();
        return receipt.transactionHash;
    }

    /**
     * Allows the admin to assign a kill-switch operator.
     * @param kso - The address of the kill-switch operator to be assigned.
     * @returns The transaction hash of the assignKillSwitchOperator function call.
     */
    public async assignKillSwitchOperator(kso: string): Promise<string> {
        const assignTx = await this.contract.assignKillSwitchOperator(kso);
        const receipt = await assignTx.wait();
        return receipt.transactionHash;
    }
}