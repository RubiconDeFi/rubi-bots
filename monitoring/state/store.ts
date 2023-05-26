import { configureStore } from '@reduxjs/toolkit';
import { balanceReducer, priceReducer, gasReducer } from './reducer';

// Store
const store = configureStore({
    reducer: {
      balance: balanceReducer,
      price: priceReducer,
      gas: gasReducer,
    },
});
  
export default store;