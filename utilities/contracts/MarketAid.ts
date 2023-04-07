import { Contract, Signer, BigNumber } from "ethers";
import { MARKET_AID_INTERFACE } from "../../configuration/abis/MarketAid"

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
        await this.contract.adminMaxApproveTarget(target, token);
    }

    /**
     * Allows admin to deposit funds to the contract for market-making purposes.
     * @param erc20s - An array of token addresses to deposit.
     * @param amounts - An array of amounts for each token.
     * @returns An array of amounts that were actually deposited.
     */
    public async adminDepositToBook(erc20s: string[], amounts: number[]): Promise<BigNumber[]> {
        const depositTx = await this.contract.adminDepositToBook(erc20s, amounts);
        await depositTx.wait();

        const eventFilter = this.contract.filters.NotifyAdminDepositToBook(null, null, null, null);
        const eventLogs = await this.contract.queryFilter(eventFilter, depositTx.blockNumber, "latest");

        if (eventLogs.length === 0) {
            throw new Error("Admin deposit to book event not found");
        }

        const amountChangedArray: BigNumber[] = [];
        for (const eventLog of eventLogs) {
            amountChangedArray.push(eventLog.args[2]);
        }
        return amountChangedArray;
    }

    /**
     * Allows admin to withdraw funds from the contract.
     * @param erc20s - An array of token addresses to withdraw.
     * @param amounts - An array of amounts for each token.
     * @returns An array of amounts that were actually withdrawn.
     */
    public async adminWithdrawFromBook(erc20s: string[], amounts: number[]): Promise<BigNumber[]> {
        const withdrawTx = await this.contract.adminWithdrawFromBook(erc20s, amounts);
        await withdrawTx.wait();

        const eventFilter = this.contract.filters.NotifyAdminWithdrawFromBook(null, null, null, null);
        const eventLogs = await this.contract.queryFilter(eventFilter, withdrawTx.blockNumber, "latest");

        if (eventLogs.length === 0) {
            throw new Error("Admin withdraw from book event not found");
        }

        const amountChangedArray: BigNumber[] = [];
        for (const eventLog of eventLogs) {
            amountChangedArray.push(eventLog.args[2]);
        }

        return amountChangedArray;
    }

    /**
     * Allows the admin to pull all funds of specified ERC20 tokens.
     * @param erc20s - An array of token addresses to pull funds from.
     * @returns An array of objects containing the token address and the amount pulled for each token.
     */
    public async adminPullAllFunds(erc20s: string[]): Promise<{token: string, amount: number}[]> {
        const adminPullAllFundsTx = await this.contract.adminPullAllFunds(erc20s);
        const receipt = await adminPullAllFundsTx.wait();
    
        const eventFilter = this.contract.filters.LogAdminPullFunds(null, null, null, null);
        const eventLogs = await this.contract.queryFilter(eventFilter, receipt.blockNumber, "latest");
    
        if (eventLogs.length === 0) {
            throw new Error("LogAdminPullFunds event not found");
        }
    
        const pulledFunds: {token: string, amount: number}[] = [];
    
        for (const log of eventLogs) {
            pulledFunds.push({
                token: log.args.asset,
                amount: log.args.amountOfReward.toNumber()
            });
        }
    
        return pulledFunds;
    }
    

}
