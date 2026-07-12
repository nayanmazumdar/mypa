import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { inventoryApi } from '../api/inventory.api';

export const fetchInventory = createAsyncThunk(
  'inventory/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await inventoryApi.getAll(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.structured || { message: 'Failed to fetch inventory' });
    }
  }
);

export const fetchLowStock = createAsyncThunk(
  'inventory/fetchLowStock',
  async (_, { rejectWithValue }) => {
    try {
      const response = await inventoryApi.getLowStock();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.structured || { message: 'Failed to fetch low stock' });
    }
  }
);

export const updateStock = createAsyncThunk(
  'inventory/updateStock',
  async (data, { rejectWithValue }) => {
    try {
      const response = await inventoryApi.addStock(data);
      return { product_id: data.product_id, quantity: data.quantity, type: data.type, newQuantity: response.data?.newQuantity };
    } catch (error) {
      return rejectWithValue(error.structured || { message: 'Failed to update stock' });
    }
  }
);

const inventorySlice = createSlice({
  name: 'inventory',
  initialState: {
    items: [],
    lowStock: [],
    pagination: null,
    loading: false,
    updating: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInventory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data || [];
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchLowStock.fulfilled, (state, action) => {
        state.lowStock = action.payload || [];
      })
      .addCase(updateStock.pending, (state) => {
        state.updating = true;
      })
      .addCase(updateStock.fulfilled, (state, action) => {
        state.updating = false;
        // Update the quantity inline so the table refreshes immediately
        const { product_id, newQuantity } = action.payload;
        if (newQuantity !== undefined) {
          const item = state.items.find(i => i.product_id === product_id);
          if (item) item.quantity = newQuantity;
        }
      })
      .addCase(updateStock.rejected, (state) => {
        state.updating = false;
      });
  },
});

export default inventorySlice.reducer;
