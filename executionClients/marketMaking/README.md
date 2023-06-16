# README

## Running the Generic Market Making Bot

To start the Market Making Bot, use the following command:
```
yarn run startGenericMarketMakingBot startGenericMarketMakingBot <ChainID> <MarketAidContractAddress> <Strategy> <Asset> <Quote> <Premium>
```

Note that you can use `yarn run startGenericMarketMakingBot -- PARAMS` to start the bot with custom configurations. Replace `PARAMS` with the specific parameters you need for the bot you want to run. This approach avoids the need for guidedStart and allows bot processes to be quickly spun up in the cloud for operators.

### Parameters
- `<executionClient>`: Notify type of execution client first
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
yarn run startGenericMarketMakingBot startGenericMarketMakingBot <ChainID (ex. 80001)> 0xMarketAidAddress riskminimized/targetvenueoutbid 0xAssetAddress 0xQuoteAddress <Premium (ex. 0.01)>
```

## Starting a Batch Executing Bot
The batch executing bot is designed to execute multiple market making strategies concurrently, optimizing gas usage by batching transactions. This guide will explain how to start a batch executing bot, how strategies are passed through, and how liquidity allocation works.

### Starting the Batch Executing Bot
To start a batch executing bot, run the following command:

```
yarn run startBatchExecutorBot "startBatchExecutorBot" <network_id> <executor_address> <strategies>
```
Where:

<network_id> is the Ethereum network ID (e.g., 80001 for Matic Mumbai testnet).

<executor_address> is the address of the batch executor contract.

<strategies> is a string containing the market making strategies you want the bot to execute, separated by an underscore (_). Each strategy is formatted as follows:

```
<strategy_name>-<asset_address>-<quote_address>-<liquidity_allocation>$<strategy_argument>
```

For example, to start a batch executing bot with two strategies (riskminimized and targetvenueoutbid) on the Matic Mumbai testnet:

```
yarn run startBatchExecutorBot "startBatchExecutorBot" 80001 0x7C2f53B7e9E085b43b8Fe327B29f0011Fd0dF681 'riskminimized-0x6aeda41c98ab5399044fc36162B57d39c13b658a-0xcC5f8571D858DAD7fA2238FB9df4Ad384493013C-500,500$0.01_targetvenueoutbid-0x6aeda41c98ab5399044fc36162B57d39c13b658a-0xcC5f8571D858DAD7fA2238FB9df4Ad384493013C-500,500$0.01'
```

Strategy Parameters
When starting the batch executing bot, you pass the strategies as a string. Each strategy has the following parameters:

- strategy_name: The name of the market making strategy (e.g., riskminimized, targetvenueoutbid).
- asset_address: The address of the asset token.
- quote_address: The address of the quote token.
- liquidity_allocation: The liquidity allocation for the strategy, formatted as two comma-separated values (e.g., 500,500), representing the allocation for asset and quote respectively, out of an arbitrary total of 1000.
- strategy_argument: Additional argument specific to the strategy (e.g., premium for riskminimized, improvement for targetvenueoutbid).
These parameters are then parsed and passed to the corresponding market making bot instances.

Liquidity Allocation
The liquidity_allocation parameter is an arbitrary value out of 1000 for each asset and quote, which determines the proportion of total liquidity the strategy will use. This allows you to allocate different amounts of liquidity to different strategies, enabling the bot to manage multiple strategies with different risk profiles concurrently.

When specifying the liquidity_allocation, you provide two comma-separated values representing the allocation for the asset and quote tokens respectively. For example, "500,500" represents an equal allocation of liquidity for both asset and quote tokens.

The liquidity allocation enables you to manage different strategies and tokens in parallel, sharing liquidity between them. By adjusting the allocation values, you can balance the available liquidity across multiple strategies, ensuring optimal performance and risk management for your market making activities.