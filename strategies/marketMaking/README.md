# README

## Rubi-Bots: Market Making Strategies

In the `rubi-bots` repository, "strategies" are modules that monitor one or more Liquidity Venues in real-time and update their own `targetBook`. An Execution Client can then use this `targetBook` to attempt market making on Rubicon. Strategies are a crucial component of a functional market-making system through `rubi-bots`.

There are two market making strategies available in this repository:

1. RiskMinimized Strategy
2. TargetVenue Outbid Strategy

### 1. RiskMinimized Strategy

The RiskMinimized Strategy is designed to watch a target liquidity venue and quote prices outside of the venue's perceived liquidity curve. This means that anyone trading against the RiskMinimized Strategy will receive a worse price than the referenceLiquidityVenue of the Strategy. However, this approach allows the market-maker to dump any fills they receive on their orders, optionally, on the referenceLiquidityVenue for near risk-free profit, assuming they pay the gas to keep their on-chain ERC20 book updated.

### 2. TargetVenue Outbid Strategy

The TargetVenue Outbid Strategy takes the opposite approach of the RiskMinimized Strategy. It selects a referenceLiquidityVenue and places offers on Rubicon that are better than those of the reference venue. It's important to note that the arbitrage opportunity available in the RiskMinimized Strategy is not present in this case, as the fill would result in a loss. This strategy is closer to pure, unbounded market-making, and should be used with caution.

In this strategy, profit is earned by receiving balanced fills on either side of a managed pair. When fills are balanced, the market-maker earns approximately the spread they charge multiplied by the volume of balanced fills they can handle. There are additional considerations and risks that should be priced in as well.

The TargetVenue Outbid Strategy uses an `inventoryManagementModel` to enable the strategy to work purely on Rubicon, without dependence on an external venue, aside from having a referenceLiquidityVenue to outbid.

## Usage

To utilize these strategies in your market making bot, instantiate the desired strategy with the appropriate parameters and provide it to the bot's configuration.

Example:

```javascript
var referenceLiquidityVenue = new UniswapLiquidityVenue(
    {
        asset: config.targetTokens[0],
        quote: config.targetTokens[1]
    },
    config.connections.jsonRpcProvider
);

// Instantiate RiskMinimized Strategy
var strat = new RiskMinimizedStrategy(referenceLiquidityVenue, 0.01);

// Or instantiate TargetVenue Outbid Strategy
var strat = new TargetVenueOutbidStrategy(referenceLiquidityVenue, inventoryManagementModel);
