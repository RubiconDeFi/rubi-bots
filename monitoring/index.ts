import { fetchBalances, fetchAid, fetchTransactions, fetchTokenHistories, fetchTokenSnapshot } from './data';
import { getAssetPrice } from './utils/prices'
import { getBuiltGraphSDK } from './graphclient/.graphclient';
import store from './state/store'; 
import { updateCurrentBalance, updateAllBalances, updateCurrentPrice, updateGasSpend } from './state/reducer';
import { getTokenByAddress } from './utils/token';
import { tokenList } from '../configuration/config';
import { ethers } from 'ethers';
import { getTimePeriods } from './utils/types';

const aid = '0x32ada6fbaffdf9e8b85a489fadad6ad74d7b4e5d';
const periods = getTimePeriods();

let balances = fetchTokenSnapshot(aid, periods.SIX_HOURS, periods.TWELVE_HOURS, periods.ONE_DAY, periods.TWO_DAYS, 5000, getBuiltGraphSDK())
console.log('fetching token snapshot: ');
balances.then(async result => {

    let transactions = fetchTransactions('', aid, periods.TWO_DAYS, periods.NOW, 5000, 0, getBuiltGraphSDK());
    console.log('fetching transactions: ');
    transactions.then(result => {

        console.log('the total number of transactions is : ', result.transactions.length);

        let two_day_gas = 0;
        let one_day_gas = 0;
        let twelve_hour_gas = 0;
        let six_hour_gas = 0;

        result.transactions.forEach(transaction => {

            let gas = transaction.total_gas_fee_usd;
            let timestamp = transaction.timestamp;

            if (timestamp >= periods.TWO_DAYS) {
                two_day_gas += Number(gas);
            } 
            if (timestamp >= periods.ONE_DAY) {
                one_day_gas += Number(gas);
            } 
            if (timestamp >= periods.TWELVE_HOURS) {
                twelve_hour_gas += Number(gas);
            } 
            if (timestamp >= periods.SIX_HOURS) {
                six_hour_gas += Number(gas);
            }
        });

        store.dispatch(updateGasSpend({ address: aid, spend6Hour: six_hour_gas.toString(), spend12Hour: twelve_hour_gas.toString(), spend24Hour: one_day_gas.toString(), spend48Hour: two_day_gas.toString() }));

    }).catch(err => {
        console.log(err)
    });

    // Create an array to store all price fetching promises
    let pricePromises = result.aidTokens.map(token => {

        let tokenInfo = getTokenByAddress(tokenList, token.token.id);
        let tokenSymbol = tokenInfo?.symbol;
        let tokenBalance = ethers.utils.formatUnits(token.balance, tokenInfo?.decimals);
        let tokenSixHour = ethers.utils.formatUnits(token.six_hour[0].balance, tokenInfo?.decimals);
        let tokenTwelveHour = ethers.utils.formatUnits(token.twelve_hour[0].balance, tokenInfo?.decimals);
        let tokenOneDay = ethers.utils.formatUnits(token.one_day[0].balance, tokenInfo?.decimals);
        let tokenTwoDay = ethers.utils.formatUnits(token.two_day[0].balance, tokenInfo?.decimals);

        store.dispatch(updateAllBalances({ address: token.token.id, balanceCurrent: tokenBalance, balance6h: tokenSixHour, balance12h: tokenTwelveHour, balance24h: tokenOneDay, balance48h: tokenTwoDay }));

        // Return a promise for fetching price
        return getAssetPrice(token.token.id).then(price => {
            console.log(token.token.id , ' price is : ', price);
            store.dispatch(updateCurrentPrice({ address: token.token.id, price }));
        }).catch(err => {
            console.log(err);
        });
    });

    // Wait for all prices to be fetched before proceeding
    try {
        await Promise.all(pricePromises);
    } catch(err) {
        console.log(err);
    }

    let balanceState = store.getState().balance;
    let priceState = store.getState().price;
    let gasState = store.getState().gas;

    Object.entries(balanceState).forEach(([address, { currentBalance }]) => {
        console.log(`Address: ${address}, Current balance: ${currentBalance}, Six Hour Balance: ${balanceState[address].balance6HoursAgo}, Twelve Hour Balance: ${balanceState[address].balance12HoursAgo}, One Day Balance: ${balanceState[address].balance24HoursAgo}, Two Day Balance: ${balanceState[address].balance48HoursAgo}`);
        console.log('----------------------------------------')
    });

    Object.entries(priceState).forEach(([address, { currentPrice }]) => {
        console.log(`Address: ${address}, Current price: ${currentPrice}`);
        console.log('----------------------------------------')
    });

    Object.entries(gasState).forEach(([address, { spend6Hour, spend12Hour, spend24Hour, spend48Hour }]) => {
        console.log(`Address: ${address}, 6 Hour Gas: ${spend6Hour}, 12 Hour Gas: ${spend12Hour}, 24 Hour Gas: ${spend24Hour}, 48 Hour Gas: ${spend48Hour}`);
        console.log('----------------------------------------')
    });
}).catch(err => {
    console.log(err);
});