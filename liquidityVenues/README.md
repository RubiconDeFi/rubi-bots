# Liquidity Venues

Liquidity venues are places where cryptocurrencies are traded, such as centralized exchanges (CEX) or decentralized exchanges (DEX). This module provides integrations with various trading venues, allowing you to track their order books and prices in real-time.

## Integration

To integrate a new liquidity venue, follow the example provided in the `generic.ts` file. The main objective is to monitor the order book and price of the given venue. For liquidity venues that use mathematical hacks to simulate an order book, like an Automated Market Maker (AMM), the liquidity venue object should parse out the order book from their math curve. This ensures that the object always provides a real-time feed of the venue's perceived `SimpleBook` (an important type in the repo).

Liquidity venues should watch a trading venue in real-time and output the perceived order book or `SimpleBook` when functioning correctly for that pair. The venue can be either a CEX or a DEX; any place crypto is traded, really.

## Current Integrations

Currently, the following liquidity venues are integrated:

- Rubicon Market Aid User 
- (Generic liquidity venue for Rubicon Market coming soon!)
- Uniswap
