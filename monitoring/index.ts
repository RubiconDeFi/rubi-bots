import { fetchBalances, fetchAid, fetchTransactions } from './data';
import { getBuiltGraphSDK } from './graphclient/.graphclient';
import store from './state/store'; 
import { updateCurrentBalance } from './state/reducer';
import { getTokenByAddress } from './utils/token';
import { tokenList } from '../configuration/config';
import { ethers } from 'ethers';

const aid = '0x32ada6fbaffdf9e8b85a489fadad6ad74d7b4e5d';
let balances = fetchBalances(aid, 10, getBuiltGraphSDK());

balances.then(result => {
    console.log('fetching current balances: ');

    result.aidTokens.forEach(token => {
        console.log(token.balance);
        console.log(token.token);

        let tokenInfo = getTokenByAddress(tokenList, token.token.id);
        let tokenSymbol = tokenInfo?.symbol;
        let tokenBalance = ethers.utils.formatUnits(token.balance, tokenInfo?.decimals);
        console.log(`Token symbol: ${tokenSymbol}, Token balance: ${tokenBalance}`);

        // Dispatch action to update the current balance in state
        store.dispatch(updateCurrentBalance({ address: token.token.id, balance: token.balance }));
    });

    // Retrieve and log the balances from state
    const balanceState = store.getState().balance;
    // console.log(balanceState)

    Object.entries(balanceState).forEach(([address, { currentBalance }]) => {
        console.log(`Address: ${address}, Current balance: ${currentBalance}`);
    });

}).catch(err => {
    console.log(err);
});

const txns = fetchTransactions("", aid, 0, 1684888203, 6000, 0, getBuiltGraphSDK());
console.log('fetching transactions: ');
txns.then(result => {
    // Create an empty Set to hold unique txn values
    const uniqueTxnSet = new Set();

    // flag to indicate if there are duplicates
    let hasDuplicates = false;

    result.transactions.forEach(transaction => {
        if (uniqueTxnSet.has(transaction.txn)) {
            hasDuplicates = true;
        } else {
            uniqueTxnSet.add(transaction.txn);
        }
    });

    if (hasDuplicates) {
        console.log("There are duplicate transaction ids.");
    } else {
        console.log("There are no duplicate transaction ids.");
    }

}).catch(err => {
    console.log(err);
});
