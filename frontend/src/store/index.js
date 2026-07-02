import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import productReducer from './productSlice';
import salesReducer from './salesSlice';
import purchaseReducer from './purchaseSlice';
import inventoryReducer from './inventorySlice';
import customerReducer from './customerSlice';
import supplierReducer from './supplierSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    products: productReducer,
    sales: salesReducer,
    purchases: purchaseReducer,
    inventory: inventoryReducer,
    customers: customerReducer,
    suppliers: supplierReducer,
  },
});
