# Configuring Your Bot to Run Properly

This README file will help you set up your bot with the necessary environment variables and provide information on how to interact with the Market-Aid contract.

## Environment Variables

Set up the environment variables in your `.env` file with the appropriate values:

```
JSON_RPC_URL_10 = **insert your optimism mainnet node http endpoint here**
WEBSOCKET_URL_10 = **insert your optimism mainnet node websocket endpoint here**

JSON_RPC_URL_420 = **insert your optimism goerli node http endpoint here**
WEBSOCKET_URL_420 = **insert your optimism goerli node websocket endpoint here**

JSON_RPC_URL_42161 = **insert your arbitrum one node http endpoint here**
WEBSOCKET_URL_42161 = **insert your arbitrum one node websocket endpoint here**

JSON_RPC_URL_421613 = **insert your arbitrum goerli node http endpoint here**
WEBSOCKET_URL_421613 = **insert your arbitrum goerli node websocket endpoint here**

JSON_RPC_URL_137 = **insert your polygon mainnet node http endpoint here**
WEBSOCKET_URL_137 = **insert your polygon mainnet node websocket endpoint here**

JSON_RPC_URL_80001 = **insert your polygon mumbai node http endpoint here**
WEBSOCKET_URL_80001 = **insert your polygon mumbai node websocket endpoint here**

JSON_RPC_URL_8453 = **insert your base node http endpoint here**
WEBSOCKET_URL_8453 = **insert your base node websocket endpoint here**

JSON_RPC_URL_84531 = **insert your base goerli node http endpoint here**
WEBSOCKET_URL_84531 = **insert your base goerli node websocket endpoint here**

DEV_EOA = **insert your developer EOA address here**
EOA_PRIVATE_KEY = **insert your developer EOA private key here**

MY_LIVE_BOT_EOA_ADDRESS_OR_REF = **insert the EOA that manages the bot**
MY_TEST_BOT_EOA_ADDRESS = **insert the testing EOA that manages the bot**
```

*make sure to remove the #comments from your .env file*

# Chain ID reference table
| Chain            | Chain ID |
| ---------------- | -------- |
| Optimism Mainnet | 10       |
| Optimism Goerli  | 420      |
| Arbitrum One     | 42161    |
| Arbitrum Goerli  | 421613   |
| Polygon Mainnet  | 137      |
| Polygon Mumbai   | 80001    |
| Base             | 8453     |
| Base Goerli      | 84531    |

## market-aid setup

the user has two options when it comes to interacting with their market-aid contract: 1) limited access when running `npm run guidedStart` #TODO: update guided start to work 2) full access when running `npm run aidStartup`

### npm run aid

this script provides the following functionality: 

    - [x] allow the user to connect to the market aid factory of the network 
        - [x] allow the user to view their market aids on the network 
        - [x] allow the user to connect to an existing market aid 
        - [x] allow the user to make a new market aid 
    - [x] allow the user to connect to a market aid and see
        - [x] check the market address 
        - [x] check the admin address
            - [x] check if the admin address is the same as the connected EOA
        - [x] check which strategists are approved 
        - [x] check the balance of the market aid contract 
            - [] check the outstanding offers and get their totals
        - [] check who the kill switch operator is 
        - [] check if the aid is shut down 
    - [x] allow the user to connect to the market aid and do
        - [x] deposit to the aid 
        - [x] withdraw from the aid 
        - [x] pull all funds 
        - [x] approve a target venue 
        - [x] approve a strategist 
        - [x] remove a strategist 
    - [x] allow the user to connect to an erc20 and see
        - [] their balance 
        - [x] the market aid balance 
    - [x] allow the user to connect to an erc20 and do
        - [x] approve the market aid 
        - [x] approve the market 

