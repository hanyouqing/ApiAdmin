import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../Utils/api';

export interface InterfaceCat {
  _id: string;
  project_id: string;
  name: string;
  desc: string;
  index: number;
  uid: string;
  created_at: string;
  updated_at: string;
}

interface InterfaceCatState {
  cats: InterfaceCat[];
  loading: boolean;
  error: string | null;
}

const initialState: InterfaceCatState = {
  cats: [],
  loading: false,
  error: null,
};

export const fetchInterfaceCats = createAsyncThunk(
  'interfaceCat/fetchList',
  async (projectId: string) => {
    const response = await api.get('/interface/cat/list', { params: { project_id: projectId } });
    return response.data;
  }
);

export const createInterfaceCat = createAsyncThunk(
  'interfaceCat/create',
  async (data: { project_id: string; name: string; desc?: string; index?: number }) => {
    const response = await api.post('/interface/cat/add', data);
    return response.data;
  }
);

export const updateInterfaceCat = createAsyncThunk(
  'interfaceCat/update',
  async ({ id, data }: { id: string; data: Partial<InterfaceCat> }) => {
    const response = await api.put('/interface/cat/up', { ...data, _id: id });
    return response.data;
  }
);

export const deleteInterfaceCat = createAsyncThunk('interfaceCat/delete', async (id: string) => {
  await api.delete('/interface/cat/del', { params: { _id: id } });
  return id;
});

const interfaceCatSlice = createSlice({
  name: 'interfaceCat',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInterfaceCats.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchInterfaceCats.fulfilled, (state, action) => {
        state.loading = false;
        state.cats = action.payload;
      })
      .addCase(fetchInterfaceCats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取分类列表失败';
      })
      .addCase(createInterfaceCat.fulfilled, (state, action) => {
        state.cats.push(action.payload);
      })
      .addCase(updateInterfaceCat.fulfilled, (state, action) => {
        const index = state.cats.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) {
          state.cats[index] = action.payload;
        }
      })
      .addCase(deleteInterfaceCat.fulfilled, (state, action) => {
        state.cats = state.cats.filter((c) => c._id !== action.payload);
      });
  },
});

export default interfaceCatSlice.reducer;

