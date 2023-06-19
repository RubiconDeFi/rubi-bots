const axios = require('axios');

type AssetSymbols = 'ETH' | 'OP' | 'USDT' | 'DAI' | 'USDC';
type AssetAddress = string; // replace with actual type of address

const assetMap: Record<AssetAddress, AssetSymbols> = {
    '0x4200000000000000000000000000000000000006': 'ETH', // replace with actual addresses
    '0x4200000000000000000000000000000000000042': 'OP',
    '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58': 'USDT',
    '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1': 'DAI',
    '0x7f5c764cbc14f9669b88837ca1490cca17c31607': 'USDC',
    // add more mappings as needed
};

export const getAssetPrice = async (address: AssetAddress) => {
    const asset = assetMap[address];

    // if asset not found in map, throw error
    if (!asset) {
        throw new Error('Asset not supported');
    }

    if (asset === 'USDC') {
        return 1;
    }

    try {
        const response = await axios.get(`https://api.coinbase.com/v2/prices/${asset}-USD/spot`);
        return response.data.data.amount;
    } catch (error) {
        console.error(error);
    }
}
