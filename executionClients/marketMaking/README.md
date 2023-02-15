Note that via `yarn run startMarketMakingBot -- PARAMS` where params are the custom configuration for the bot you want to run. This avoids the need to use the guidedStart and allows for bot processes to be quickly spun up in the cloud for operators.

The API for the `MarketMakingBot` command-line parameters is as follows:
API with the following hierarchy of arguments:

`ChainID (e.g. 10 for OP) Pair(s) (e.g. WETH-USDC) Strategy (e.g. TARGETOUTBID)`
Each argument should be separated by a space to delineate between them.

Argument Details
ChainID
This argument represents the Chain ID that the bot will be running on. For example, if you want to run the bot on the Ethereum mainnet, you would specify 1 as the Chain ID. For the Optimism network, you would specify 10.

Pair(s)
This argument represents the trading pairs that the bot will be trading. A pair is denoted by the asset and quote currencies separated by




