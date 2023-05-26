import { fetchBalances, fetchAid, fetchTransactions, fetchTokenHistories, fetchTokenSnapshot } from './data';
import { getBuiltGraphSDK } from './graphclient/.graphclient';
import store from './state/store'; 
import { updateCurrentBalance } from './state/reducer';
import { getTokenByAddress } from './utils/token';
import { tokenList } from '../configuration/config';
import { ethers } from 'ethers';
import { getTimePeriods } from './utils/types';

const aid = '0x32ada6fbaffdf9e8b85a489fadad6ad74d7b4e5d';
// let balances = fetchBalances(aid, 10, getBuiltGraphSDK());
const periods = getTimePeriods();

let balances = fetchTokenSnapshot(aid, periods.SIX_HOURS, periods.TWELVE_HOURS, periods.ONE_DAY, periods.TWO_DAYS, 5000, getBuiltGraphSDK())
console.log('fetching token snapshot: ');
balances.then(result => {

    // console.log(result);
    result.aidTokens.forEach(token => {

        let tokenInfo = getTokenByAddress(tokenList, token.token.id);
        let tokenSymbol = tokenInfo?.symbol;
        let tokenBalance = ethers.utils.formatUnits(token.balance, tokenInfo?.decimals);
        let tokenSixHour = ethers.utils.formatUnits(token.six_hour[0].balance, tokenInfo?.decimals);
        let tokenTwelveHour = ethers.utils.formatUnits(token.twelve_hour[0].balance, tokenInfo?.decimals);
        let tokenOneDay = ethers.utils.formatUnits(token.one_day[0].balance, tokenInfo?.decimals);
        let tokenTwoDay = ethers.utils.formatUnits(token.two_day[0].balance, tokenInfo?.decimals);

        console.log(`Current Balance: Token symbol: ${tokenSymbol}, Token balance: ${tokenBalance}`);
        console.log(`Six Hours Ago: Token symbol: ${tokenSymbol}, Token balance: ${tokenSixHour}`);
        console.log(`Twelve Hours Ago: Token symbol: ${tokenSymbol}, Token balance: ${tokenTwelveHour}`);
        console.log(`One Day Ago: Token symbol: ${tokenSymbol}, Token balance: ${tokenOneDay}`);
        console.log(`Two Day Ago: Token symbol: ${tokenSymbol}, Token balance: ${tokenTwoDay}`);
        console.log('----------------------------------------')

        /**
        console.log(token.balance);
        console.log(token.token);
        console.log(token.balance);
        console.log(token.six_hour)
        console.log(token.twelve_hour)
        console.log(token.one_day)
        console.log(token.two_day)
        */
    });
}).catch(err => {
    console.log(err);
});
