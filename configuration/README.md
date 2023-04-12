# configuring your bot to run properly 

## env 

# Optimism Mainnet
JSON_RPC_URL_10 = <insert your optimism mainnet node http endpoint here>
WEBSOCKET_URL_10 = <insert your optimism mainnet node websocket endpoint here>

# Optimism Goerli
JSON_RPC_URL_420 = <insert your optimism goerli node http endpoint here>
WEBSOCKET_URL_420 = <insert your optimism goerli node websocket endpoint here>

# Arbitrum One
JSON_RPC_URL_42161 = <insert your arbitrum one node http endpoint here>
WEBSOCKET_URL_42161 = <insert your arbitrum one node websocket endpoint here>

# Arbitrum Goerli
JSON_RPC_URL_421613 = <insert your arbitrum goerli node http endpoint here>
WEBSOCKET_URL_421613 = <insert your arbitrum goerli node websocket endpoint here>

# Polygon Mainnet
JSON_RPC_URL_137 = <insert your polygon mainnet node http endpoint here>
WEBSOCKET_URL_137 = <insert your polygon mainnet node websocket endpoint here>

# Polygon Mumbai
JSON_RPC_URL_80001 = <insert your polygon mumbai node http endpoint here>
WEBSOCKET_URL_80001 = <insert your polygon mumbai node websocket endpoint here>

# Base
JSON_RPC_URL_8453 = <insert your base node http endpoint here>
WEBSOCKET_URL_8453 = <insert your base node websocket endpoint here>

# Base Goerli
JSON_RPC_URL_84531 = <insert your base goerli node http endpoint here>
WEBSOCKET_URL_84531 = <insert your base goerli node websocket endpoint here>

# Developer account
DEV_EOA = <insert your developer EOA address here>
EOA_PRIVATE_KEY = <insert your developer EOA private key here>

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

### npm run aidStartup

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
    - [] allow the user to connect to the market aid and do
        - [] deposit to the aid 
        - [] withdraw from the aid 
        - [] pull all funds 
        - [] approve a target venue 
        - [] approve a strategist 
        - [] remove a strategist 
    - [] allow the user to connect to an erc20 and see
        - [] their balance 
        - [] the market aid balance 
    - [] allow the user to connect to an erc20 and do
        - [] approve the market aid 
        - [] approve the market 

