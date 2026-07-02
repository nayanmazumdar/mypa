import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { purchaseApi } from '../api/purchase.api';

export const fetchPurchases = createAsyncThunk(
  'purchases/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await purchaseApi.getAll(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch purchases');
    }
  }
);

export const createPurchase = createAsyncThunk(
  'purchases/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await purchaseApi.create(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create purchase');
    }
  }
);

const purchaseSlice = createSlice({
  name: 'purchases',
  initialState: {
    items: [],
    pagination: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPurchases.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPurchases.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPurchases.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createPurchase.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      });
  },
});

export default purchaseSlice.reducer;
