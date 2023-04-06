# README

## Running the Market Making Bot

To start the Market Making Bot, use the following command:
```
yarn run startMarketMakingBot -- <chainId> <marketAidContractAddress> <asset> <quote>
```

Note that via `yarn run startGenericMarketMakingBot -- PARAMS` where params are the custom configuration for the bot you want to run. This avoids the need to use the guidedStart and allows for bot processes to be quickly spun up in the cloud for operators.

The API for the `MarketMakingBot` command-line parameters is as follows:
API with the following hierarchy of arguments:

```
yarn run startMarketMakingBot -- <chainId> <marketAidContractAddress> <asset> <quote>
```

### Parameters

- `<chainId>`: The Chain ID of the network you want to run the bot on (e.g., `1` for Ethereum mainnet, `3` for Ropsten).
- `<marketAidContractAddress>`: The address of the MarketAid contract.
- `<asset>`: The address of the asset token.
- `<quote>`: The address of the quote token.

### Example
```
yarn run startMarketMakingBot -- 1 0xMarketAidAddress 0xAssetAddress 0xQuoteAddress
```
Argument Details
ChainID
This argument represents the Chain ID that the bot will be running on. For example, if you want to run the bot on the Ethereum mainnet, you would specify 1 as the Chain ID. For the Optimism network, you would specify 10.

Pair(s)
This argument represents the trading pairs that the bot will be trading. A pair is denoted by the asset and quote currencies separated by




