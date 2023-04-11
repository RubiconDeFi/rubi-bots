# README

## Running the Market Making Bot

To start the Market Making Bot, use the following command:
```
yarn run startGenericMarketMakingBot -- <ChainID> <MarketAidContractAddress> <Strategy> <Asset> <Quote>
```

Note that you can use `yarn run startGenericMarketMakingBot -- PARAMS` to start the bot with custom configurations. Replace `PARAMS` with the specific parameters you need for the bot you want to run. This approach avoids the need for guidedStart and allows bot processes to be quickly spun up in the cloud for operators.


The API for the `MarketMakingBot` command-line parameters is as follows:
API with the following hierarchy of arguments:

```
yarn run startMarketMakingBot -- <chainId> <marketAidContractAddress> <asset> <quote> <premium>
```

### Parameters

- `<chainId>`: The Chain ID of the network you want to run the bot on (e.g., `1` for Ethereum mainnet, `3` for Ropsten).
- `<marketAidContractAddress>`: The address of the MarketAid contract.
- `<strategy>`: The string identifier of the strategy.
- `<asset>`: The address of the asset token.
- `<quote>`: The address of the quote token.
- `<premium>`: The premium or discount to apply when using RiskMinimized or TargetVenueOutBid strategies

### Available Market-Making strategies:
- `riskminimized`: Use the RiskMinimized strategy.
- `targetvenueoutbid`: Use the TargetVenueOutBid strategy.


### Example
```
yarn run startMarketMakingBot -- 1 0xMarketAidAddress 0xAssetAddress 0xQuoteAddress
```





