import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../Utils/api';

export interface MockExpectation {
  _id: string;
  interface_id: string;
  project_id: string;
  name: string;
  ip_filter: string;
  query_filter: any;
  body_filter: any;
  response: {
    status_code: number;
    delay: number;
    headers: any;
    body: string;
  };
  enabled: boolean;
  priority: number;
  uid: string;
  created_at: string;
  updated_at: string;
}

interface MockExpectationState {
  expectations: MockExpectation[];
  loading: boolean;
  error: string | null;
}

const initialState: MockExpectationState = {
  expectations: [],
  loading: false,
  error: null,
};

export const fetchMockExpectations = createAsyncThunk(
  'mockExpectation/fetchList',
  async (interfaceId: string) => {
    const response = await api.get('/mock/expectation/list', { params: { interface_id: interfaceId } });
    return response.data;
  }
);

export const createMockExpectation = createAsyncThunk(
  'mockExpectation/create',
  async (data: Partial<MockExpectation>) => {
    const response = await api.post('/mock/expectation/add', data);
    return response.data;
  }
);

export const updateMockExpectation = createAsyncThunk(
  'mockExpectation/update',
  async ({ id, data }: { id: string; data: Partial<MockExpectation> }) => {
    const response = await api.put('/mock/expectation/up', { ...data, _id: id });
    return response.data;
  }
);

export const deleteMockExpectation = createAsyncThunk('mockExpectation/delete', async (id: string) => {
  await api.delete('/mock/expectation/del', { params: { _id: id } });
  return id;
});

const mockExpectationSlice = createSlice({
  name: 'mockExpectation',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMockExpectations.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMockExpectations.fulfilled, (state, action) => {
        state.loading = false;
        state.expectations = action.payload;
      })
      .addCase(fetchMockExpectations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取Mock期望列表失败';
      })
      .addCase(createMockExpectation.fulfilled, (state, action) => {
        state.expectations.push(action.payload);
      })
      .addCase(updateMockExpectation.fulfilled, (state, action) => {
        const index = state.expectations.findIndex((e) => e._id === action.payload._id);
        if (index !== -1) {
          state.expectations[index] = action.payload;
        }
      })
      .addCase(deleteMockExpectation.fulfilled, (state, action) => {
        state.expectations = state.expectations.filter((e) => e._id !== action.payload);
      });
  },
});

export default mockExpectationSlice.reducer;


