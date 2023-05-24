import { configureStore } from '@reduxjs/toolkit';
import reducer from './reducer';

// Store
const store = configureStore({
    reducer: {
      balance: reducer,
    },
});
  
export default store;