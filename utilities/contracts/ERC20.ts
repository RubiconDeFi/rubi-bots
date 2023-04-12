import { ethers, Contract, Signer } from "ethers";
import ERC20_INTERFACE from "../../configuration/abis/ERC20";

/**
 * Class representing an ERC20 token.
 */
export class ERC20 {
    public contract: Contract;
    public address: string;

    /**
     * Create an ERC20 instance.
     * @param provider - An ethers provider instance.
     * @param address - The ERC20 token contract address.
     */
    constructor(address: string, signer: Signer) {
        this.contract = new Contract(address, ERC20_INTERFACE, signer);
        this.address = this.contract.address;
    }

    /**
     * Get the token name.
     * @returns The name of the token.
     */
    public async name(): Promise<string> {
        return await this.contract.name();
    }

    /**
     * Get the token symbol.
     * @returns The symbol of the token.
     */
    public async symbol(): Promise<string> {
        return await this.contract.symbol();
    }

    /**
     * Get the token decimals.
     * @returns The number of decimals for the token.
     */
    public async decimals(): Promise<number> {
        return await this.contract.decimals();
    }

    /**
     * Get the token total supply.
     * @returns The total supply of the token.
     */
    public async totalSupply(): Promise<ethers.BigNumber> {
        return await this.contract.totalSupply();
    }

    /**
     * Get the token balance of an address.
     * @param owner - The address to query the balance of.
     * @param humanReadable - Whether to return the balance in a human-readable format. Defaults to false.
     * @returns The balance of the specified address.
     */
    public async balanceOf(owner: string, humanReadable: boolean = true): Promise<ethers.BigNumber | string> {
        const balance = await this.contract.balanceOf(owner);

        if (humanReadable) {
            const decimals = await this.decimals();
            return ethers.utils.formatUnits(balance, decimals);
        }

        return balance;
    }

    /**
     * Get the allowance given to a spender by an owner.
     * @param owner - The address of the token owner.
     * @param spender - The address of the token spender.
     * @param humanReadable - Whether to return the allowance in a human-readable format. Defaults to false.
     * @returns The remaining allowance.
     */
    public async allowance(owner: string, spender: string, humanReadable: boolean = true): Promise<ethers.BigNumber | string> {
        const remainingAllowance = await this.contract.allowance(owner, spender);

        if (humanReadable) {
            const decimals = await this.decimals();
            return ethers.utils.formatUnits(remainingAllowance, decimals);
        }

        return remainingAllowance;
    }

    /**
         * Approve a spender to spend tokens on behalf of the message sender.
         * @param signer - The signer to send the transaction from.
         * @param spender - The address of the spender.
         * @param value - The amount of tokens to approve.
         * @returns The approved value.
         */
    public async approve(signer: ethers.Signer, spender: string, value: ethers.BigNumberish): Promise<ethers.BigNumber> {
        const contractWithSigner = this.contract.connect(signer);
        const tx = await contractWithSigner.approve(spender, value);
        await tx.wait();
        return ethers.BigNumber.from(value);
    }

    /**
     * Approve a spender to spend the maximum amount of tokens on behalf of the message sender.
     * @param signer - The signer to send the transaction from.
     * @param spender - The address of the spender.
     * @returns The approved maximum value.
     */
    public async maxApprove(signer: ethers.Signer, spender: string): Promise<ethers.BigNumber> {
        const MAX_UINT256 = ethers.constants.MaxUint256;
        const contractWithSigner = this.contract.connect(signer);
        const tx = await contractWithSigner.approve(spender, MAX_UINT256);
        await tx.wait();
        return MAX_UINT256;
    }

    /**
     * Transfer tokens from the message sender to another address.
     * @param signer - The signer to send the transaction from.
     * @param to - The address to transfer tokens to.
     * @param value - The amount of tokens to transfer.
     * @returns The transferred value.
     */
    public async transfer(signer: ethers.Signer, to: string, value: ethers.BigNumberish): Promise<ethers.BigNumber> {
        const contractWithSigner = this.contract.connect(signer);
        const tx = await contractWithSigner.transfer(to, value);
        await tx.wait();
        return ethers.BigNumber.from(value);
    }

    /**
     * Transfer tokens from a specified address to another address.
     * @param signer - The signer to send the transaction from.
     * @param from - The address to transfer tokens from.
     * @param to - The address to transfer tokens to.
     * @param value - The amount of tokens to transfer.
     * @returns The transferred value.
     */
    public async transferFrom(signer: ethers.Signer, from: string, to: string, value: ethers.BigNumberish): Promise<ethers.BigNumber> {
        const contractWithSigner = this.contract.connect(signer);
        const tx = await contractWithSigner.transferFrom(from, to, value);
        await tx.wait();
        return ethers.BigNumber.from(value);
    }
}
