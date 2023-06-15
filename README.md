# rubi-bots
Open-source bots for traders and activists in the [Rubicon](https://docs.rubicon.finance/docs/protocol) ecosystem

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/RubiconDeFi/rubi-bots/blob/main/LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/RubiconDeFi/rubi-bots.svg)](https://github.com/RubiconDeFi/rubi-bots/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/RubiconDeFi/rubi-bots.svg)](https://github.com/RubiconDeFi/rubi-bots/issues)
[![GitHub Forks](https://img.shields.io/github/forks/RubiconDeFi/rubi-bots.svg)](https://github.com/RubiconDeFi/rubi-bots/network)

## Risk Disclaimer

**Experimental and in Development - Use at your own risk**

## Description

Welcome to `rubi-bots`! This repository hosts open-source market-making, liquidator, and arbitrage bots in the Rubicon ecosystem. With a focus on improving performance and growing the Rubicon ecosystem together, `rubi-bots` serves as a one-stop shop for potential profit opportunities, learning resources, and avenues for technical improvement.

This repository has two main commands for users 
1. `guidedStart` - the quickest way to get started with Rubicon and deploy a bot
2. `aid` - this command allows you to manage your Market Aid, should you choose to use it (deposits, withdrawls, etc) 

For advanced users who want to get started with a bot, we currently have 2 market making bots available
1. [Generic MarketMaking Bot](https://github.com/RubiconDeFi/rubi-bots/blob/master/executionClients/marketMaking/README.md#running-the-generic-market-making-bot)
2. [Batch Strategy MarketMaking Bot](https://github.com/RubiconDeFi/rubi-bots/blob/master/executionClients/marketMaking/README.md#starting-a-batch-executing-bot)

## Get started

To get started with `rubi-bots`, follow these steps:

1. Clone this repository to your machine:
    ```shell
        gh repo clone RubiconDeFi/rubi-bots
2. Navigate to the cloned repository:
    ```shell
        cd rubi-bots
3. Download the project dependencies:
    ```shell
        npm install
    ```
## Run the Guided Start (optional)
1. Run the command 
    ```shell
        npm run guidedStart
2. Choose between the following 3 bots 
- ✅ Market-Making Bot
- ❌ Trading Bot [WIP]
- ❌ Liquidator Bot [WIP]
3. Choose between the following 2 strategies
- ✅ Risk Minimized Up Only
- ✅ Target Venue Out Bid
4. Choose between the following mainnet/testnet 
- ✅ Optimism Mainnet/Goerli
- ❌/✅ Arbitrum Mainnet/Goerli [WIP]
- ❌/✅ Polygon Mainnet/Mumbai
5. Based on your selection, you can select from available tokens for your strategy
- Enter the tokens you want and enter `done` when finished
6. If you have an existing `MarketAid` address, enter it here. Otherwise, enter `no` to start the creation process
- For a robust MarketAid toolset, see `npm run aid` below
7. Both options will open up an aid menu where you can manage your aid 
- View Market Aid Info
- Check if you are approved 
- View your balances for tokens
- Deposit to the aid
- Withdraw from the aid
- Pull all funds
8. After managing, a final prompt asks you to confirm before the strategy executes

## Run the Market Aid onboarding script (optional) 
1. Run the command 
    ```shell
        npm run aid
2. Choose between the following mainnet/testnets to generate your aid
- ❌/✅ Optimism Mainnet/Goerli [WIP]
- ❌ Arbitrum Mainnet/Goerli [WIP]
- ❌/✅ Polygon Mainnet/Mumbai
3. The `aid` menu will open allowing you to:
- Connect to an existing Market Aid contract
- View existing Market Aid contract
- Create a new Market Aid contract

## Target Bots and Strategies to Build/Release
-  Risk Minimized MM strategy
-  Target Venue Out Bid MM strategy
- [WIP] Two Venue Arbitrage - Rubi vs Selected Venue
- [WIP]v2 Liquidator Bot - Money Market Activist

## Contributing
Contributions to rubi-bots are welcome and encouraged! This is an open-source resource for the Rubicon ecosystem.

## License
This project is licensed under the MIT License.

## Further Reading
- Learn more about [MarketAids](https://docs.rubicon.finance/protocol/rubicon-market/market-aid)
- Learn more about the [Rubicon protocol](https://docs.rubicon.finance)
- View the rest of our [codebase](https://github.com/RubiconDeFi/rubi-protocol-v2)

### Rubi-Bots Disclaimer

This codebase is in Beta and is experimental and in development. It could contain bugs or change significantly between versions. Contributing through Issues or Pull Requests is welcome!

### Protocol Disclaimer

Please refer to [this](https://docs.rubicon.finance/docs/protocol/rubicon-pools/risks) for information on the risks associated with the Rubicon Protocol.
