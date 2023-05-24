import { 
    Sdk,  
    AidsQuery,
    TokenBalancesQuery,
    TransactionsQuery
} from './graphclient/.graphclient';

export const fetchBalances = async (
    aid: string, 
    amount: number, 
    sdk: Sdk,
): Promise<TokenBalancesQuery> => {
    const params = {
        aid, 
        amount,
    };
    const balances = await sdk.TokenBalances(params);
    return balances;
};

export const fetchAid = async (
    aidID: string, 
    sdk: Sdk,
): Promise<AidsQuery> => {
    const params = {
        aidID,
    };

    const aidsQuery: AidsQuery = await sdk.Aids(params);
    return aidsQuery;
};

export const fetchTransactions = async (
    aidID: string,
    startTime: number,
    endTime: number,
    first: number,
    skip: number,
    sdk: Sdk,
): Promise<TransactionsQuery> => {
    const params = {
        aidID,
        startTime,
        endTime,
        first,
        skip,
    };

    const transactionsQuery: TransactionsQuery = await sdk.Transactions(params);
    return transactionsQuery;
};