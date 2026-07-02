import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { inventoryApi } from '../api/inventory.api';

export const fetchInventory = createAsyncThunk(
  'inventory/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await inventoryApi.getAll(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch inventory');
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
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch low stock');
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
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInventory.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchLowStock.fulfilled, (state, action) => {
        state.lowStock = action.payload;
      });
  },
});

export default inventorySlice.reducer;
