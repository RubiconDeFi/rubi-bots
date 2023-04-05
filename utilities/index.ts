import { NonceManager } from "@ethersproject/experimental";
import { providers } from "ethers";


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