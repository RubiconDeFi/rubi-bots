import { TokenInfo, TokenList } from '@uniswap/token-lists';
import { BigNumber, Transaction, ethers } from 'ethers';
import { getAddress } from 'ethers/lib/utils';
import { GenericMarketMakingStrategy } from '../strategies/marketMaking/genericMarketMaking';
import { RiskMinimizedStrategy } from '../strategies/marketMaking/riskMinimizedUpOnly';
import { TargetVenueOutBidStrategy } from '../strategies/marketMaking/targetVenueOutBid';

export enum Network {
    MAINNET = 1,
    GOERLI = 5,
    OPTIMISM_KOVAN = 69,
    OPTIMISM_GOERLI = 420,
    OPTIMISM_MAINNET = 10,
    POLYGON_MAINNET = 137,
    POLYGON_MUMBAI = 80001,
    ARBITRUM_MAINNET = 42161,
    ARBITRUM_TESTNET = 421613,
    ERROR = 0,
};

// https://docs.rubicon.finance/docs/protocol/deployments
export const marketAddressesByNetwork: Record<number, string> = {
    [Network.OPTIMISM_GOERLI]: getAddress('0x6cD8666aBB003073e45D69E5b3aa0b0Fe9CDBF91'),
    [Network.OPTIMISM_MAINNET]: getAddress('0x7a512d3609211e719737E82c7bb7271eC05Da70d'),
    [Network.POLYGON_MUMBAI]: getAddress('0x10418D9e730fa659b0Baf0b640ee41FcF4EA2aaE'),
    [Network.ARBITRUM_TESTNET]: getAddress('0x506407f25B746C39807c03A96DD595a6BE223211'),
    [Network.ARBITRUM_MAINNET]: getAddress('0xC715a30FDe987637A082Cf5F19C74648b67f2db8'),
};

// https://docs.rubicon.finance/docs/protocol/deployments
export const marketAidFactoriesByNetwork: Record<number, string> = {
    [Network.OPTIMISM_GOERLI]: getAddress('0x2D77E00EfE8375903eaD1135BD1eb31cBcf1bA69'),
    [Network.OPTIMISM_MAINNET]: getAddress('0x267D94C6e67e4436EFfE092b08d040cFF36B2DA7'),
    [Network.POLYGON_MUMBAI]: getAddress('0x4841DcC66F6CfC600382ec98f34d43332c535B9B'),
    [Network.ARBITRUM_TESTNET]: getAddress('0x746750031Cc56Ccb386D9a6a0fcAb34C0A138BbD'),
    [Network.ARBITRUM_MAINNET]: getAddress('0x6CB24A263732579EfD56f3E071851e989d78cE75'),
};

// Input tokens 
export const tokenList: TokenList = {
    name: 'Rubicon Token List',
    timestamp: new Date().toISOString(),
    version: {
        major: 1,
        minor: 0,
        patch: 0,
    },
    tokens: [
        // ** V1 MAINNET **
        // ** QUOTES **
        {
            name: 'USDC Stablecoin',
            symbol: 'USDC',
            chainId: Network.OPTIMISM_MAINNET,
            address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
            decimals: 6,
            extensions: {
                quote: true,
                underlyingAssetGeckoID: 'usd-coin',
            },
        },
        {
            name: 'DAI Stablecoin',
            symbol: 'DAI',
            chainId: Network.OPTIMISM_MAINNET,
            address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
            decimals: 18,
            extensions: {
                quote: true,
                underlyingAssetGeckoID: 'dai',
            },
        },
        {
            name: 'USDT Stablecoin',
            symbol: 'USDT',
            chainId: Network.OPTIMISM_MAINNET,
            address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
            decimals: 6,
            extensions: {
                quote: true,
                underlyingAssetGeckoID: 'tether',
            },
        },
        {
            symbol: 'WETH',
            name: 'Wrapped Ethereum',
            decimals: 18,
            address: '0x4200000000000000000000000000000000000006',
            chainId: Network.OPTIMISM_MAINNET,
            extensions: {
                underlyingAssetGeckoID: 'ethereum',
            },
        },
        {
            symbol: 'OP',
            name: 'Optimism',
            decimals: 18,
            address: '0x4200000000000000000000000000000000000042',
            chainId: Network.OPTIMISM_MAINNET,
            extensions: {
                unsupportedQuotes: {
                    USDT: true,
                    DAI: true,
                },
                underlyingAssetGeckoID: 'optimism',
            },
        },
        {
            symbol: 'WBTC',
            name: 'Wrapped Bitcoin',
            decimals: 8,
            address: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
            chainId: Network.OPTIMISM_MAINNET,
            extensions: {
                unsupportedQuotes: {
                    USDT: true,
                    DAI: true,
                },
                underlyingAssetGeckoID: 'wrapped-bitcoin',
            },
        },
        {
            symbol: 'SNX',
            name: 'Synthetix',
            decimals: 18,
            address: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4',
            chainId: Network.OPTIMISM_MAINNET,
            extensions: {
                unsupportedQuotes: {
                    USDT: true,
                    DAI: true,
                },
                underlyingAssetGeckoID: 'havven',
            },
        },

        //  ** V1 Mainnet Bath Tokens ***

        {
            symbol: 'bathDAI',
            name: 'bathDAI v1',
            decimals: 18,
            address: '0x60daEC2Fc9d2e0de0577A5C708BcaDBA1458A833',
            chainId: Network.OPTIMISM_MAINNET,
            extensions: {
                underlyingTicker: 'DAI',
                rewardsLive: true,
                underlyingAssetGeckoID: 'dai',
                bathBuddy: '0x5fafd12ead4234270db300352104632187ed763a',
            },
        },

        {
            name: 'bathUSDC v1',
            symbol: 'bathUSDC',
            chainId: Network.OPTIMISM_MAINNET,
            address: '0xe0e112e8f33d3f437D1F895cbb1A456836125952',
            decimals: 6,
            extensions: {
                underlyingTicker: 'USDC',
                rewardsLive: true,
                underlyingAssetGeckoID: 'usd-coin',
                bathBuddy: '0xfd6fd41bea9fd489ffdf05cd8118a69bf98caa5d',
            },
        },
        {
            symbol: 'bathUSDT',
            name: 'bathUSDT v1',
            decimals: 6,
            chainId: Network.OPTIMISM_MAINNET,
            address: '0xfFBD695bf246c514110f5DAe3Fa88B8c2f42c411',
            extensions: {
                underlyingTicker: 'USDT',
                rewardsLive: true,
                underlyingAssetGeckoID: 'tether',
                bathBuddy: '0xdffdbb54b9968fee543a8d2bd3ce7a80d66cd49f',
            },
        },

        // *** NOTE THIS IS FAKE AND CANT ACTUALLY WRAP CAUSING ISSUES ON WRAP/UNWRAP as it cannot wrap/unwrap... Simply mint via faucet()
        {
            symbol: 'WETH',
            name: 'Wrapped Ethereum',
            decimals: 18,
            address: '0x54e63385c13ECbE3B859991eEdad539d9fDa1167', // '0x4200000000000000000000000000000000000006'
            chainId: Network.OPTIMISM_GOERLI,
            extensions: {
                underlyingAssetGeckoID: 'ethereum',
                isNativeAssetWrapper: true,
            },
        },
        {
            name: 'Tether',
            symbol: 'USDT',
            chainId: Network.OPTIMISM_GOERLI,
            address: '0xD70734Ba8101Ec28b38AB15e30Dc9b60E3c6f433',
            decimals: 18,
            extensions: {
                quote: true,
                underlyingAssetGeckoID: 'usd-coin',
            },
        },

        {
            address: '0x45FA7d7b6C954d17141586e1BD63d2e35d3e26De',
            chainId: Network.OPTIMISM_GOERLI,
            symbol: 'F',
            extensions: {
                underlyingAssetGeckoID: 'optimism',
            },
            decimals: 18,
            name: 'Forrest Coin',
        },

        {
            address: '0xCeE7148028Ff1B08163343794E85883174a61393',
            chainId: Network.OPTIMISM_GOERLI,
            symbol: 'OP',
            extensions: {
                underlyingAssetGeckoID: 'optimism',
                rewardsLive: false,
            },
            decimals: 18,
            name: 'Optimism',
        },
        {
            name: 'USDC Stablecoin',
            symbol: 'USDC',
            chainId: Network.OPTIMISM_GOERLI,
            address: '0xe432f229521eE954f80C83257485405E3d848d17',
            decimals: 18,
            extensions: {
                quote: true,
                underlyingAssetGeckoID: 'usd-coin',
            },
        },
        // Mumbai testing
        {
            address: "0xcC5f8571D858DAD7fA2238FB9df4Ad384493013C",
            chainId: Network.POLYGON_MUMBAI,
            symbol: "USDC",
            decimals: 18,
            name: "USDC Stablecoin",
        },
        {
            address: "0x6aeda41c98ab5399044fc36162B57d39c13b658a",
            chainId: Network.POLYGON_MUMBAI,
            symbol: "TEST",
            decimals: 18,
            name: "Test Coin",
        },
        /// *** ARBITRUM MAINNET ***
        {
            name: 'Wrapped Ethereum',
            symbol: 'WETH',
            chainId: Network.ARBITRUM_MAINNET,
            address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
            decimals: 18,
            extensions: {
                underlyingAssetGeckoID: 'ethereum',
                isNativeAssetWrapper: true,
            },
        },
        {
            name: 'USDC Stablecoin',
            symbol: 'USDC',
            chainId: Network.ARBITRUM_MAINNET,
            address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
            decimals: 6,
            extensions: {
                quote: true,
            },
        },
        {
            name: 'Bridged USDC Stablecoin',
            symbol: 'USDC.e',
            chainId: Network.ARBITRUM_MAINNET,
            address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
            decimals: 6,
            extensions: {
                quote: true,
            },
        },
        {
            name: 'DAI Stablecoin',
            symbol: 'DAI',
            chainId: Network.ARBITRUM_MAINNET,
            address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
            decimals: 18,
            extensions: {
                quote: true,
            },
        },
        {
            name: 'Tether',
            symbol: 'USDT',
            chainId: Network.ARBITRUM_MAINNET,
            address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
            decimals: 6,
            extensions: {
                quote: true,
            },
        },
        {
            name: 'Wrapped BTC',
            symbol: 'WBTC',
            chainId: Network.ARBITRUM_MAINNET,
            address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
            decimals: 8,
        },
        {
            name: 'Arbitrum',
            symbol: 'ARB',
            chainId: Network.ARBITRUM_MAINNET,
            address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
            decimals: 18,
        },


        // ARBITRUM GOERLI 
        {
            address: "0x175A6D830579CAcf1086ECC718fAB2A86b12e0D3",
            chainId: Network.ARBITRUM_TESTNET,
            symbol: "WETH",
            decimals: 18,
            name: "Wrapped Ether",
        },
        {
            address: "0xb37b4399880AfEF7025755d65C193363966b8b89",
            chainId: Network.ARBITRUM_TESTNET,
            symbol: "DAI",
            decimals: 18,
            name: "Dai Stablecoin",
        },
        {
            address: "0x34cB584d2E4f3Cd37e93A46A4C754044085439b4",
            chainId: Network.ARBITRUM_TESTNET,
            symbol: "USDC",
            decimals: 18,
            name: "USDC Stablecoin",
        },
        {
            address: "0x6ABc1231d85D422c9Fe25b5974B4C0D4AB85d9b5",
            chainId: Network.ARBITRUM_TESTNET,
            symbol: "USDT",
            decimals: 18,
            name: "Tether",
        },
        {
            address: "0x710c1A969cbC8ab5644571697824c655ffBDE926",
            chainId: Network.ARBITRUM_TESTNET,
            symbol: "WBTC",
            decimals: 18,
            name: "Wrapped Bitcoin",
        },
        {
            address: "0x83250b2783554D4D401c45c39fF8A161dE44BC15",
            chainId: Network.ARBITRUM_TESTNET,
            symbol: "TEST",
            decimals: 18,
            name: "Test Coin",
        },
    ],
};

export interface StrategistTrade {
    askId: BigNumber;
    askPayAmt: BigNumber;
    askAsset: string;
    bidId: BigNumber;
    bidPayAmt: BigNumber;
    bidAsset: string;
    strategist: string;
    timestamp: number;
};

export enum BotType {
    MarketMaking = 1,
    Trading = 2,
    Liquidator = 3,
    ErrorOrNone = 0
}

export enum MarketMakingStrategy {
    RiskMinimizedUpOnly = 1,
    TargetVenueOutBid = 2,
    ErrorOrNone = 0
}

export const ETH_ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export type BotConfiguration = {
    botType: BotType;
    strategy?: any; //scalability
    network: Network;
    targetTokens?: TokenInfo[];
    connections: { jsonRpcProvider: ethers.providers.JsonRpcProvider, signer: ethers.Signer, websocketProvider?: ethers.providers.WebSocketProvider }
};

export type SimpleBook = {
    bids: GenericOrder[];
    asks: GenericOrder[];
};

export type GenericOrder = {
    price: number;
    size: number;
}


// https://docs.ethers.io/v5/api/providers/types/#providers-TransactionResponse
export interface TransactionResponse extends Transaction {
    wait(confirms?: number): Promise<TransactionReceipt>;
    blockNumber: number;
    blockHash: string;
    timestamp: number;
    confirmations: number;
}

// https://docs.ethers.io/v5/api/providers/types/#providers-TransactionReceipt
export interface TransactionReceipt extends Transaction {
    confirmations: number;
    blockNumber: number;
    transactionIndex: number;
    effectiveGasPrice: BigNumber;
    status: boolean;
    logs: any[];
    gasUsed: BigNumber;
}

// Note this is a shared type and may not always be adhered to given any type
export type OnChainBookWithData = OnChainBookOrderWithData[] | any[];

// Returns infor for a single strat trade id, could be one order
// SIZES IMPLICITLY IN THE CLASSIC ASSET amount??
export type OnChainBookOrderWithData = { askPrice: number, askSize: number, bidPrice: number, bidSize: number, stratTradeID: BigNumber }


// *** TODO: DYNAMICALLY GRAB THIS FROM THE CHAIN INSTEAD
// Mapping used in min order sizes
export const MIN_ORDER_SIZES: Record<string, number> = {
    WETH: 0.0022,
    DAI: 5,
    USDC: 5,
    USDT: 5,
    WBTC: 0.00015,
    ARB: 4,
    OP: 3,
};