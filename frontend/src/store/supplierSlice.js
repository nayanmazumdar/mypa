import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supplierApi } from '../api/supplier.api';

export const fetchSuppliers = createAsyncThunk(
  'suppliers/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await supplierApi.getAll(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch suppliers');
    }
  }
);

export const createSupplier = createAsyncThunk(
  'suppliers/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await supplierApi.create(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create supplier');
    }
  }
);

const supplierSlice = createSlice({
  name: 'suppliers',
  initialState: {
    items: [],
    pagination: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSuppliers.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSuppliers.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchSuppliers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createSupplier.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      });
  },
});

export default supplierSlice.reducer;
