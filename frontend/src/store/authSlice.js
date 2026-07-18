import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '../api/auth.api';

// Decode JWT payload and check expiry
function isTokenValid(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // exp is in seconds, Date.now() in ms
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials);
      const { token, refresh_token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(user));
      return { token, user };
    } catch (error) {
      return rejectWithValue(
        error.structured?.message || error.response?.data?.message || 'Login failed'
      );
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authApi.register(userData);
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      return { token, user };
    } catch (error) {
      return rejectWithValue(
        error.structured?.message || error.response?.data?.message || 'Registration failed'
      );
    }
  }
);

export const fetchProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.getProfile();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch profile');
    }
  }
);

// Hydrate auth state synchronously from localStorage (avoids flash-redirect on refresh)
function getInitialAuthState() {
  try {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr && isTokenValid(token)) {
      return {
        user: JSON.parse(userStr),
        token,
        isAuthenticated: true,
        loading: false,
        error: null,
      };
    }
  } catch { /* corrupted localStorage — fall through */ }
  return {
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  };
}

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialAuthState(),
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    },
    switchShop(state) {
      // Keep user logged in but clear shop context
      if (state.user) {
        state.user = { ...state.user, shop_id: null, shop_name: null };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    setActiveShop(state, action) {
      const { shop_id, shop_name, role, default_module, log_id, rbac_roles, rbac_perms } = action.payload;
      if (state.user) {
        state.user = {
          ...state.user,
          shop_id,
          shop_name,
          role,
          ...(default_module !== undefined && { default_module }),
          ...(log_id         !== undefined && { log_id }),
          rbac_roles: rbac_roles || [],
          rbac_perms: rbac_perms || {},
        };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    setRole(state, action) {
      // Called after the user picks their role on first login
      if (state.user) {
        state.user = { ...state.user, role: action.payload };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    setDefaultModule(state, action) {
      // Persist the module the user chose on role-selection screen
      if (state.user) {
        state.user = { ...state.user, default_module: action.payload };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    setRoleAndModule(state, action) {
      // Called after chooseRole API — sets both role and default_module atomically
      const { role, default_module } = action.payload;
      if (state.user) {
        state.user = { ...state.user, role, default_module };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    updateUser(state, action) {
      // Merge partial user fields (name, phone, avatar, etc.) into state
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    updateShopStatus(state, action) {
      // Update is_open on the matching shop in the user.shops array
      // payload: { shop_id: number, is_open: boolean }
      const { shop_id, is_open } = action.payload;
      if (state.user?.shops) {
        state.user = {
          ...state.user,
          shops: state.user.shops.map((s) =>
            s.id === shop_id ? { ...s, is_open: is_open ? 1 : 0 } : s
          ),
        };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    loadUser(state) {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      if (token && user && isTokenValid(token)) {
        state.token = token;
        state.user = JSON.parse(user);
        state.isAuthenticated = true;
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
      }
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch profile
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { logout, switchShop, setActiveShop, setRole, setDefaultModule, setRoleAndModule, updateUser, updateShopStatus, loadUser, clearError } = authSlice.actions;
export default authSlice.reducer;
