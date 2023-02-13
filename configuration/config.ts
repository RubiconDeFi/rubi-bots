import { TokenInfo, TokenList } from '@uniswap/token-lists';
import { BigNumber, ethers } from 'ethers';
import { getAddress } from 'ethers/lib/utils';

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
};

// https://docs.rubicon.finance/docs/protocol/deployments
export const marketAidFactoriesByNetwork: Record<number, string> = {
    [Network.OPTIMISM_GOERLI]: getAddress('0x528E6d1636bb8578074cc888BD85d561f7847066'),
    // [Network.OPTIMISM_MAINNET]: getAddress(''),
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
                //NEEDED FOR ANY INTERACTION THAT IS WRAPPER FOR NATIVE ASSET
                isNativeAssetWrapper: true,
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
            address: '0x54e63385c13ECbE3B859991eEdad539d9fDa1167', // '0x4200000000000000000000000000000000000006', //   0x54e63385c13ECbE3B859991eEdad539d9fDa1167
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
                rewardsLive: false,
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
    strategy: number;
    network: Network;
    targetTokens: TokenInfo[];
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


// Note this is a shared type and may not always be adhered to given any type
export type OnChainBookWithData = OnChainBookOrderWithData[] | any[];

// Returns infor for a single strat trade id, could be one order
// SIZES IMPLICITLY IN THE CLASSIC ASSET amount??
export type OnChainBookOrderWithData = { askPrice: number, askSize: number, bidPrice: number, bidSize: number, stratTradeID: BigNumber }