import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../Utils/api';

export interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  user: null,
  isAuthenticated: false,
  token: localStorage.getItem('token'),
  loading: false,
  error: null,
};

export const login = createAsyncThunk(
  'user/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/user/login', credentials);
      const data = response.data.data || response.data;
      
      // 确保 token 存在并正确存储
      if (data?.token) {
        localStorage.setItem('token', data.token);
      } else {
        // 如果没有 token，记录错误
        console.error('Login response missing token:', response.data);
        return rejectWithValue('登录响应缺少 token');
      }
      
      return data;
    } catch (error: any) {
      // 登录失败时清除可能存在的旧 token
      localStorage.removeItem('token');
      return rejectWithValue(error.message || '登录失败');
    }
  }
);

export const register = createAsyncThunk(
  'user/register',
  async (data: { email: string; password: string; username: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/user/register', data);
      return response.data.data || response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '注册失败');
    }
  }
);

export const getUserInfo = createAsyncThunk('user/getInfo', async (_, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return rejectWithValue('未找到认证令牌');
    }
    
    const response = await api.get('/user/info');
    const data = response.data.data || response.data;
    
    // 确保返回的数据包含用户信息
    if (!data) {
      return rejectWithValue('获取用户信息失败：响应数据为空');
    }
    
    return data;
  } catch (error: any) {
    // 如果是 401 错误，清除 token
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
    }
    return rejectWithValue(error.message || '获取用户信息失败');
  }
});

export const updateUserInfo = createAsyncThunk(
  'user/updateInfo',
  async (data: Partial<User>, { rejectWithValue }) => {
    try {
      const response = await api.put('/user/info', data);
      return response.data.data || response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '更新用户信息失败');
    }
  }
);

export const logout = createAsyncThunk('user/logout', async (_, { rejectWithValue }) => {
  try {
    await api.post('/user/logout');
    localStorage.removeItem('token');
  } catch (error: any) {
  localStorage.removeItem('token');
    return rejectWithValue(error.message || '退出失败');
  }
});

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        // 确保 token 和 user 都存在
        if (action.payload?.token) {
          state.token = action.payload.token;
          state.isAuthenticated = true;
          // 确保 token 已存储到 localStorage（双重保险）
          if (localStorage.getItem('token') !== action.payload.token) {
            localStorage.setItem('token', action.payload.token);
          }
        }
        if (action.payload?.user) {
          state.user = action.payload.user;
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '登录失败';
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '注册失败';
      })
      .addCase(getUserInfo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserInfo.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.user = action.payload;
          state.isAuthenticated = true;
          // 确保 token 存在
          if (!state.token) {
            const storedToken = localStorage.getItem('token');
            if (storedToken) {
              state.token = storedToken;
            }
          }
        }
      })
      .addCase(getUserInfo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取用户信息失败';
        // 如果获取用户信息失败，清除认证状态
        state.isAuthenticated = false;
        state.user = null;
        // 如果 token 无效，也清除 token
        if (action.error.message?.includes('认证') || action.error.message?.includes('令牌')) {
          state.token = null;
          localStorage.removeItem('token');
        }
      })
      .addCase(updateUserInfo.fulfilled, (state, action) => {
        if (state.user) {
          state.user = { ...state.user, ...action.payload };
        }
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.token = null;
      });
  },
});

export const { clearError } = userSlice.actions;
export default userSlice.reducer;

