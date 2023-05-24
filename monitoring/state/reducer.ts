import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// TODO: probably convert these to an ethers BigNumber type instead of string
// although it may be better to keep them as strings in store and only convert when we need to do mathz
interface BalanceState {
    currentBalance?: string;
    balance24HoursAgo?: string;
}

interface BalanceStates {
    [address: string]: BalanceState;
}

// Initial state
const initialState: BalanceStates = {};

const balanceSlice = createSlice({
    name: 'balance',
    initialState,
    reducers: {
        updateCurrentBalance: (state, action: PayloadAction<{ address: string; balance: string; }>) => {
            const { address, balance } = action.payload;
            if (!state[address]) {
                state[address] = { currentBalance: '', balance24HoursAgo: '' };
            }
            state[address].currentBalance = balance;
        },
        updateBalance24hAgo: (state, action: PayloadAction<{ address: string; balance: string; }>) => {
            const { address, balance } = action.payload;
            if (!state[address]) {
                state[address] = { currentBalance: '', balance24HoursAgo: '' };
            }
            state[address].balance24HoursAgo = balance;
        },
    },
});

export const { updateCurrentBalance, updateBalance24hAgo } = balanceSlice.actions;

export default balanceSlice.reducer;