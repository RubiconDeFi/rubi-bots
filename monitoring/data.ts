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
    lastID: string = "",
    aidID: string,
    startTime: number,
    endTime: number,
    first: number = 6000,
    skip: number = 0,
    sdk: Sdk,
): Promise<TransactionsQuery> => {
    const params = {
        lastID,
        aidID,
        startTime,
        endTime,
        first,
        skip,
    };

    const transactionsQuery: TransactionsQuery = await sdk.Transactions(params);
    
    if (transactionsQuery.transactions.length < first) {
        return transactionsQuery;
    } else {
        const newLastID = transactionsQuery.transactions[transactionsQuery.transactions.length - 1].txn;
        const newStartTime = transactionsQuery.transactions[transactionsQuery.transactions.length - 1].timestamp;

        await new Promise(resolve => setTimeout(resolve, 333));

        const nextTransactions = await fetchTransactions(newLastID, aidID, newStartTime, endTime, first, skip, sdk);
        return {
            transactions: transactionsQuery.transactions.concat(nextTransactions.transactions)
        };
    }
};