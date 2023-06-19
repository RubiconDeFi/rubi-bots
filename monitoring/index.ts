import { ethers } from 'ethers';
import store from './state/store'; 
import { getAssetPrice } from './utils/prices';
import { getTimePeriods } from './utils/types';
import { getTokenByAddress } from './utils/token';
import { tokenList } from '../configuration/config';
import { getBuiltGraphSDK } from './graphclient/.graphclient';
import { fetchTransactions, fetchTokenSnapshot } from './data';
import { updateAllBalances, updateCurrentPrice, updateGasSpend } from './state/reducer';

import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
dotenv.config();

let aid = process.env.MONITOR_AID_ADDRESS;
if (!aid) {
    console.log('no aid provided. expecting an aid address (MONITOR_AID_ADDRESS) in the .env file at the root of the project');
    process.exit(1);
}
aid = aid.toLowerCase();
const periods = getTimePeriods();

const balancePromise = fetchTokenSnapshot(aid, periods.SIX_HOURS, periods.TWELVE_HOURS, periods.ONE_DAY, periods.TWO_DAYS, 5000, getBuiltGraphSDK());

const transactionPromise = fetchTransactions('', aid, periods.TWO_DAYS, periods.NOW, 5000, 0, getBuiltGraphSDK())
    .then(result => {
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
    })
    .catch(err => console.log(err));

Promise.all([balancePromise, transactionPromise])
    .then(([balanceResult, transactionResult]) => {
        const pricePromises = balanceResult.aidTokens.map(token => {
            let tokenInfo = getTokenByAddress(tokenList, token.token.id);
            let tokenSymbol = tokenInfo?.symbol;
            let tokenBalance = ethers.utils.formatUnits(token.balance, tokenInfo?.decimals);
            let tokenSixHour = ethers.utils.formatUnits(token.six_hour[0].balance, tokenInfo?.decimals);
            let tokenTwelveHour = ethers.utils.formatUnits(token.twelve_hour[0].balance, tokenInfo?.decimals);
            let tokenOneDay = ethers.utils.formatUnits(token.one_day[0].balance, tokenInfo?.decimals);
            let tokenTwoDay = ethers.utils.formatUnits(token.two_day[0].balance, tokenInfo?.decimals);

            store.dispatch(updateAllBalances({ address: token.token.id, balanceCurrent: tokenBalance, balance6h: tokenSixHour, balance12h: tokenTwelveHour, balance24h: tokenOneDay, balance48h: tokenTwoDay }));

            return getAssetPrice(token.token.id)
                .then(price => store.dispatch(updateCurrentPrice({ address: token.token.id, price })))
                .catch(err => console.log(err));
        });

        return Promise.all(pricePromises);
    })
    .then(() => {
        let balanceState = store.getState().balance;
        let priceState = store.getState().price;
        let gasState = store.getState().gas;
    
        // set the constant values that we will want to evaluate 
        let currentPortfolioValue = 0;
        let sixHourPortfolioValue = 0;
        let twelveHourPortfolioValue = 0;
        let oneDayPortfolioValue = 0;
        let twoDayPortfolioValue = 0;

        let currentPortfolioQuoteValue = 0;
        let sixHourPortfolioQuoteValue = 0;
        let twelveHourPortfolioQuoteValue = 0;
        let oneDayPortfolioQuoteValue = 0;
        let twoDayPortfolioQuoteValue = 0;
    
        // TODO: update this so that the it is not aid agnostic 
        Object.entries(balanceState).forEach(([address, balances]) => {
    
            let tokenInfo = getTokenByAddress(tokenList, address);
            let tokenSymbol = tokenInfo?.symbol;
            let tokenPrice = priceState[address].currentPrice;
    
            let currentTokenValue = Number(balanceState[address].currentBalance) * Number(priceState[address].currentPrice);
            let sixHourTokenValue = Number(balanceState[address].balance6HoursAgo) * Number(priceState[address].currentPrice);
            let twelveHourTokenValue = Number(balanceState[address].balance12HoursAgo) * Number(priceState[address].currentPrice);
            let oneDayTokenValue = Number(balanceState[address].balance24HoursAgo) * Number(priceState[address].currentPrice);
            let twoDayTokenValue = Number(balanceState[address].balance48HoursAgo) * Number(priceState[address].currentPrice);
    
            currentPortfolioValue += currentTokenValue;
            sixHourPortfolioValue += sixHourTokenValue;
            twelveHourPortfolioValue += twelveHourTokenValue;
            oneDayPortfolioValue += oneDayTokenValue;
            twoDayPortfolioValue += twoDayTokenValue;

            if (tokenInfo.extensions.quote) {
                currentPortfolioQuoteValue += currentTokenValue;
                sixHourPortfolioQuoteValue += sixHourTokenValue;
                twelveHourPortfolioQuoteValue += twelveHourTokenValue;
                oneDayPortfolioQuoteValue += oneDayTokenValue;
                twoDayPortfolioQuoteValue += twoDayTokenValue;
            }
    
            const { currentBalance, balance6HoursAgo, balance12HoursAgo, balance24HoursAgo, balance48HoursAgo } = balances;
    
            const balanceChange = {
                asset: tokenSymbol,
                price: tokenPrice,
                currentBalance: currentBalance,
                netChange6Hours: Number(currentBalance) - Number(balance6HoursAgo),
                netChange12Hours: Number(currentBalance) - Number(balance12HoursAgo),
                netChange24Hours: Number(currentBalance) - Number(balance24HoursAgo),
                netChange48Hours: Number(currentBalance) - Number(balance48HoursAgo),
            };
        
            console.table(balanceChange);
            console.log('----------------------------------------')
        });

        let combinedData = {
            'Current': {
            value: currentPortfolioValue,
            quotePercent: currentPortfolioQuoteValue / currentPortfolioValue,
            netBalanceChange: 0,
            gasSpend: 0,
            periodPnl: 0
            },
            '6 Hours': {
            value: sixHourPortfolioValue,
            quotePercent: sixHourPortfolioQuoteValue / sixHourPortfolioValue,
            netBalanceChange: currentPortfolioValue - sixHourPortfolioValue,
            gasSpend: gasState[aid]?.spend6Hour || 0,
            periodPnl: (currentPortfolioValue - sixHourPortfolioValue) - (Number(gasState[aid]?.spend6Hour) || 0)
            },
            '12 Hours': {
            value: twelveHourPortfolioValue,
            quotePercent: twelveHourPortfolioQuoteValue / twelveHourPortfolioValue,
            netBalanceChange: currentPortfolioValue - twelveHourPortfolioValue,
            gasSpend: gasState[aid]?.spend12Hour || 0,
            periodPnl: (currentPortfolioValue - twelveHourPortfolioValue) - (Number(gasState[aid]?.spend12Hour) || 0)
            },
            '24 Hours': {
            value: oneDayPortfolioValue,
            quotePercent: oneDayPortfolioQuoteValue / oneDayPortfolioValue,
            netBalanceChange: currentPortfolioValue - oneDayPortfolioValue,
            gasSpend: gasState[aid]?.spend24Hour || 0,
            periodPnl: (currentPortfolioValue - oneDayPortfolioValue) - (Number(gasState[aid]?.spend24Hour) || 0)
            },
            '48 Hours': {
            value: twoDayPortfolioValue,
            quotePercent: twoDayPortfolioQuoteValue / twoDayPortfolioValue,
            netBalanceChange: currentPortfolioValue - twoDayPortfolioValue,
            gasSpend: gasState[aid]?.spend48Hour || 0,
            periodPnl: (currentPortfolioValue - twoDayPortfolioValue) - (Number(gasState[aid]?.spend48Hour) || 0)
            }
        };
        
        console.table(combinedData);
    })
    .catch(err => console.log(err));