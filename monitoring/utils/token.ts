import { TokenInfo, TokenList } from '@uniswap/token-lists';
import { tokenList } from '../../configuration/config';

export const getTokenByAddress = (tokenList: TokenList, address: string): TokenInfo | null => { 

    const token = tokenList.tokens.find((token) => {
        return token.address.toLowerCase() === address.toLowerCase();
    });

    return token || null;

}
