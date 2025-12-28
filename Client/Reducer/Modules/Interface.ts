import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../Utils/api';

export interface Interface {
  _id: string;
  project_id: string;
  catid: string;
  title: string;
  path: string;
  method: string;
  req_query: any[];
  req_headers: any[];
  req_body_type: string;
  req_body_form: any[];
  req_body_other: string;
  req_body: string;
  res_body: string;
  res_body_type: string;
  status: string;
  tag: string[];
  desc: string;
  markdown: string;
  uid: string;
  created_at: string;
  updated_at: string;
}

interface InterfaceState {
  interfaces: Interface[];
  currentInterface: Interface | null;
  loading: boolean;
  error: string | null;
}

const initialState: InterfaceState = {
  interfaces: [],
  currentInterface: null,
  loading: false,
  error: null,
};

export const fetchInterfaces = createAsyncThunk(
  'interface/fetchList',
  async (projectId: string) => {
    const response = await api.get('/interface/list', { params: { project_id: projectId } });
    return response.data.data || response.data;
  }
);

export const createInterface = createAsyncThunk(
  'interface/create',
  async (data: Partial<Interface>) => {
    const response = await api.post('/interface/add', data);
    return response.data.data || response.data;
  }
);

export const updateInterface = createAsyncThunk(
  'interface/update',
  async ({ id, data }: { id: string; data: Partial<Interface> }) => {
    const response = await api.put('/interface/up', { ...data, _id: id });
    return response.data.data || response.data;
  }
);

export const deleteInterface = createAsyncThunk('interface/delete', async (id: string) => {
  await api.delete('/interface/del', { params: { _id: id } });
  return id;
});

export const fetchInterfaceDetail = createAsyncThunk(
  'interface/fetchDetail',
  async (id: string) => {
    const response = await api.get('/interface/get', { params: { _id: id } });
    return response.data.data || response.data;
  }
);

export const runInterface = createAsyncThunk(
  'interface/run',
  async (data: { _id: string; env?: string; params?: any }) => {
    const response = await api.post('/interface/run', data);
    return response.data;
  }
);

const interfaceSlice = createSlice({
  name: 'interface',
  initialState,
  reducers: {
    setCurrentInterface: (state, action) => {
      state.currentInterface = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInterfaces.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchInterfaces.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        // 替换接口列表（而不是合并），因为每次查询都是针对特定项目的
        state.interfaces = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchInterfaces.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取接口列表失败';
      })
      .addCase(fetchInterfaceDetail.fulfilled, (state, action) => {
        state.currentInterface = action.payload;
      })
      .addCase(createInterface.fulfilled, (state, action) => {
        state.interfaces.push(action.payload);
      })
      .addCase(updateInterface.fulfilled, (state, action) => {
        const index = state.interfaces.findIndex((i) => i._id === action.payload._id);
        if (index !== -1) {
          state.interfaces[index] = action.payload;
        }
        if (state.currentInterface?._id === action.payload._id) {
          state.currentInterface = action.payload;
        }
      })
      .addCase(deleteInterface.fulfilled, (state, action) => {
        state.interfaces = state.interfaces.filter((i) => i._id !== action.payload);
      });
  },
});

export const { setCurrentInterface } = interfaceSlice.actions;
export default interfaceSlice.reducer;

