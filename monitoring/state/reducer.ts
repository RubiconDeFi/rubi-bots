import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// TODO: clean up the state types here

// TODO: probably convert these to an ethers BigNumber type instead of string
// although it may be better to keep them as strings in store and only convert when we need to do mathz
interface BalanceState {
    currentBalance?: string;
    balance6HoursAgo?: string;
    balance12HoursAgo?: string;
    balance24HoursAgo?: string;
    balance48HoursAgo?: string;
}

interface PriceState {
    currentPrice?: string;
}

interface GasState {
    spend6Hour?: string;
    spend12Hour?: string;
    spend24Hour?: string;
    spend48Hour?: string;
}

// TODO: we will most likely want to update this so that we are tracking by both the asset and the aid so that this can scale to 
// support multiple market aid instances if that need arises
interface BalanceStates {
    [address: string]: BalanceState;
}

interface PriceStates {
    [address: string]: PriceState;
}

interface GasStates {
    [address: string]: GasState;
}

// Initial state
const initialGasState: GasStates = {};
const initialPriceState: PriceStates = {};
const initialBalanceState: BalanceStates = {};



const gasSlice = createSlice({
    name: 'gas',
    initialState: initialGasState,
    reducers: {
        updateGasSpend: (state, action: PayloadAction<{ address: string; spend6Hour: string; spend12Hour: string; spend24Hour: string; spend48Hour: string; }>) => {
            const { address, spend6Hour, spend12Hour, spend24Hour, spend48Hour } = action.payload;
            if (!state[address]) {
                state[address] = { spend6Hour: '', spend12Hour: '', spend24Hour: '', spend48Hour: '' };
            }
            state[address].spend6Hour = spend6Hour;
            state[address].spend12Hour = spend12Hour;
            state[address].spend24Hour = spend24Hour;
            state[address].spend48Hour = spend48Hour;
        }
    }
});

const priceSlice = createSlice({
    name: 'price',
    initialState: initialPriceState,
    reducers : {
        updateCurrentPrice: (state, action: PayloadAction<{ address: string; price: string; }>) => {
            const { address, price } = action.payload;
            if (!state[address]) {
                state[address] = { currentPrice: '' };
            }
            state[address].currentPrice = price;
        }
    }
});

const balanceSlice = createSlice({
    name: 'balance',
    initialState: initialBalanceState,
    reducers: {
        updateCurrentBalance: (state, action: PayloadAction<{ address: string; balance: string; }>) => {
            const { address, balance } = action.payload;
            if (!state[address]) {
                state[address] = { currentBalance: '', balance6HoursAgo: '', balance12HoursAgo: '', balance24HoursAgo: '', balance48HoursAgo: '' };
            }
            state[address].currentBalance = balance;
        },
        updatedBalance6hAgo: (state, action: PayloadAction<{ address: string; balance: string; }>) => {
            const { address, balance } = action.payload;
            if (!state[address]) {
                state[address] = { currentBalance: '', balance6HoursAgo: '', balance12HoursAgo: '', balance24HoursAgo: '', balance48HoursAgo: '' };
            }
            state[address].balance6HoursAgo = balance;
        },
        updatedBalance12hAgo: (state, action: PayloadAction<{ address: string; balance: string; }>) => {
            const { address, balance } = action.payload;
            if (!state[address]) {
                state[address] = { currentBalance: '', balance6HoursAgo: '', balance12HoursAgo: '', balance24HoursAgo: '', balance48HoursAgo: '' };
            }
            state[address].balance12HoursAgo = balance;
        },
        updateBalance24hAgo: (state, action: PayloadAction<{ address: string; balance: string; }>) => {
            const { address, balance } = action.payload;
            if (!state[address]) {
                state[address] = { currentBalance: '', balance6HoursAgo: '', balance12HoursAgo: '', balance24HoursAgo: '', balance48HoursAgo: '' };
            }
            state[address].balance24HoursAgo = balance;
        },
        updatedBalance48hAgo: (state, action: PayloadAction<{ address: string; balance: string; }>) => {
            const { address, balance } = action.payload;
            if (!state[address]) {
                state[address] = { currentBalance: '', balance6HoursAgo: '', balance12HoursAgo: '', balance24HoursAgo: '', balance48HoursAgo: '' };
            }
            state[address].balance48HoursAgo = balance;
        },
        updateAllBalances: (state, action: PayloadAction<{ address: string; balanceCurrent: string; balance6h: string; balance12h: string; balance24h: string; balance48h: string;}>) => {
            const { address, balanceCurrent, balance6h, balance12h, balance24h, balance48h } = action.payload;
            if (!state[address]) {
                state[address] = { currentBalance: '', balance6HoursAgo: '', balance12HoursAgo: '', balance24HoursAgo: '', balance48HoursAgo: '' };
            }
            state[address].currentBalance = balanceCurrent;
            state[address].balance6HoursAgo = balance6h;
            state[address].balance12HoursAgo = balance12h;
            state[address].balance24HoursAgo = balance24h;
            state[address].balance48HoursAgo = balance48h;
        },
    },
});

export const { updateCurrentBalance, updateBalance24hAgo, updateAllBalances } = balanceSlice.actions;
export const { updateCurrentPrice } = priceSlice.actions;
export const { updateGasSpend } = gasSlice.actions;

export const balanceReducer = balanceSlice.reducer;
export const priceReducer = priceSlice.reducer;
export const gasReducer = gasSlice.reducer;
