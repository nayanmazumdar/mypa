import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { subscriptionApi } from '../api/subscription.api';

export const fetchPlans = createAsyncThunk(
  'subscription/fetchPlans',
  async (_, { rejectWithValue }) => {
    try {
      const response = await subscriptionApi.getPlans();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.structured?.message || 'Failed to fetch plans');
    }
  }
);

export const fetchCurrentSubscription = createAsyncThunk(
  'subscription/fetchCurrent',
  async (_, { rejectWithValue }) => {
    try {
      const response = await subscriptionApi.getCurrentSubscription();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.structured?.message || 'Failed to fetch subscription');
    }
  }
);

export const fetchLimits = createAsyncThunk(
  'subscription/fetchLimits',
  async (_, { rejectWithValue }) => {
    try {
      const response = await subscriptionApi.getLimits();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.structured?.message || 'Failed to fetch limits');
    }
  }
);

export const subscribeToPlan = createAsyncThunk(
  'subscription/subscribe',
  async (data, { rejectWithValue }) => {
    try {
      const response = await subscriptionApi.subscribe(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.structured?.message || 'Failed to subscribe');
    }
  }
);

export const cancelSubscription = createAsyncThunk(
  'subscription/cancel',
  async (_, { rejectWithValue }) => {
    try {
      const response = await subscriptionApi.cancel();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.structured?.message || 'Failed to cancel');
    }
  }
);

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState: {
    plans: [],
    currentSubscription: null,
    limits: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearSubscriptionError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch plans
      .addCase(fetchPlans.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchPlans.fulfilled, (state, action) => { state.loading = false; state.plans = action.payload; })
      .addCase(fetchPlans.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      // Fetch current
      .addCase(fetchCurrentSubscription.pending, (state) => { state.loading = true; })
      .addCase(fetchCurrentSubscription.fulfilled, (state, action) => { state.loading = false; state.currentSubscription = action.payload; })
      .addCase(fetchCurrentSubscription.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      // Fetch limits
      .addCase(fetchLimits.fulfilled, (state, action) => { state.limits = action.payload; })
      // Subscribe
      .addCase(subscribeToPlan.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(subscribeToPlan.fulfilled, (state, action) => { state.loading = false; state.currentSubscription = action.payload; })
      .addCase(subscribeToPlan.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      // Cancel
      .addCase(cancelSubscription.fulfilled, (state) => { state.currentSubscription = null; });
  },
});

export const { clearSubscriptionError } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;
