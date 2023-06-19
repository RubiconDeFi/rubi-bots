import { NonceManager } from "@ethersproject/experimental";
import { providers, ethers, BigNumber, Contract } from "ethers";
import { TokenInfo } from "@uniswap/token-lists";
import { ERC20_INTERFACE } from "../configuration/abis/ERC20";
import { formatUnits } from "ethers/lib/utils";


export function updateNonceManagerTip(
    mySigner: NonceManager,
    provider: providers.Provider
  ): Promise<number> {
    return mySigner
      .getAddress()
      .then((address) => provider.getTransactionCount(address))
      .then((nonce) => {
        console.log("QUERIED & Updated TIP NONCE to", nonce);
        mySigner.setTransactionCount(nonce);
        return nonce;
      });
  }

type TokenAmountCallback = (tokenInfo: TokenInfo) => Promise<BigNumber>;

export async function approveTokensForContract(
  signer: ethers.Signer,
  contractAddress: string,
  tokens: TokenInfo[],
  tokenAmounts?: BigNumber[],
  tokenAmountCallback?: TokenAmountCallback
): Promise<void> {
  for (const [index, tokenInfo] of tokens.entries()) {
    console.log(`\nApproving ${tokenInfo.symbol} (${tokenInfo.name}):`);
    const tokenContract = new Contract(tokenInfo.address, ERC20_INTERFACE, signer);

    let approveAmount: BigNumber;

    if (tokenAmounts && tokenAmounts[index]) {
      approveAmount = tokenAmounts[index];
    } else if (tokenAmountCallback) {
      approveAmount = await tokenAmountCallback(tokenInfo);
    } else {
      throw new Error(
        `Token amount for ${tokenInfo.symbol} not provided and no callback function supplied.`
      );
    }

    console.log(
      `Approving ${formatUnits(
        approveAmount,
        tokenInfo.decimals
      )} ${tokenInfo.symbol} for the contract...`
    );
    const approveTx = await tokenContract.approve(contractAddress, approveAmount);
    await approveTx.wait();
    console.log(
      `Approved ${formatUnits(
        approveAmount,
        tokenInfo.decimals
      )} ${tokenInfo.symbol} for the contract.`
    );
  }
}
