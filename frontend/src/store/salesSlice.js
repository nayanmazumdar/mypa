import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { salesApi } from '../api/sales.api';

export const fetchSales = createAsyncThunk(
  'sales/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await salesApi.getAll(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch sales');
    }
  }
);

export const createSale = createAsyncThunk(
  'sales/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await salesApi.create(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create sale');
    }
  }
);

const salesSlice = createSlice({
  name: 'sales',
  initialState: {
    items: [],
    pagination: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSales.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSales.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchSales.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createSale.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      });
  },
});

export default salesSlice.reducer;
