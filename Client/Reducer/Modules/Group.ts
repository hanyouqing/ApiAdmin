import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../Utils/api';

export interface Group {
  _id: string;
  group_name: string;
  group_desc: string;
  uid: string;
  member: string[];
  created_at: string;
  updated_at: string;
}

interface GroupState {
  groups: Group[];
  currentGroup: Group | null;
  loading: boolean;
  error: string | null;
}

const initialState: GroupState = {
  groups: [],
  currentGroup: null,
  loading: false,
  error: null,
};

export const fetchGroups = createAsyncThunk('group/fetchList', async () => {
  const response = await api.get('/group/list');
  return response.data.data || response.data;
});

export const createGroup = createAsyncThunk(
  'group/create',
  async (data: { group_name: string; group_desc?: string }) => {
    const response = await api.post('/group/add', data);
    return response.data.data || response.data;
  }
);

export const updateGroup = createAsyncThunk(
  'group/update',
  async ({ id, data }: { id: string; data: Partial<Group> }) => {
    const response = await api.put(`/group/up`, { ...data, _id: id });
    return response.data.data || response.data;
  }
);

export const deleteGroup = createAsyncThunk('group/delete', async (id: string) => {
  await api.delete(`/group/del`, { params: { _id: id } });
  return id;
});

const groupSlice = createSlice({
  name: 'group',
  initialState,
  reducers: {
    setCurrentGroup: (state, action) => {
      state.currentGroup = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGroups.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.groups = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取分组列表失败';
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.groups.push(action.payload);
      })
      .addCase(updateGroup.fulfilled, (state, action) => {
        const index = state.groups.findIndex((g) => g._id === action.payload._id);
        if (index !== -1) {
          state.groups[index] = action.payload;
        }
      })
      .addCase(deleteGroup.fulfilled, (state, action) => {
        state.groups = state.groups.filter((g) => g._id !== action.payload);
      });
  },
});

export const { setCurrentGroup } = groupSlice.actions;
export default groupSlice.reducer;

