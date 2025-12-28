import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../Utils/api';

export interface TestCollection {
  _id: string;
  name: string;
  description: string;
  project_id: string;
  test_cases: string[];
  uid: string;
  created_at: string;
  updated_at: string;
}

export interface TestCase {
  _id: string;
  collection_id: string;
  interface_id: string;
  name: string;
  description: string;
  request: {
    method: string;
    path: string;
    query: any;
    body: any;
    headers: any;
    path_params: any;
  };
  assertion_script: string;
  order: number;
  enabled: boolean;
  uid: string;
  created_at: string;
  updated_at: string;
}

export interface TestResult {
  _id: string;
  collection_id: string;
  status: 'success' | 'failed' | 'running';
  results: any[];
  duration: number;
  created_at: string;
}

interface TestState {
  collections: TestCollection[];
  currentCollection: TestCollection | null;
  testCases: TestCase[];
  testResults: TestResult[];
  loading: boolean;
  error: string | null;
}

const initialState: TestState = {
  collections: [],
  currentCollection: null,
  testCases: [],
  testResults: [],
  loading: false,
  error: null,
};

export const fetchTestCollections = createAsyncThunk(
  'test/fetchCollections',
  async (projectId?: string) => {
    const params = projectId ? { project_id: projectId } : {};
    const response = await api.get('/test/collection/list', { params });
    return response.data;
  }
);

export const fetchTestCollection = createAsyncThunk(
  'test/fetchCollection',
  async (id: string) => {
    const response = await api.get(`/test/collection/${id}`);
    return response.data;
  }
);

export const createTestCollection = createAsyncThunk(
  'test/createCollection',
  async (data: { name: string; description?: string; project_id: string }) => {
    const response = await api.post('/test/collection/add', data);
    return response.data;
  }
);

export const updateTestCollection = createAsyncThunk(
  'test/updateCollection',
  async ({ id, data }: { id: string; data: Partial<TestCollection> }) => {
    const response = await api.put(`/test/collection/${id}`, data);
    return response.data;
  }
);

export const deleteTestCollection = createAsyncThunk('test/deleteCollection', async (id: string) => {
  await api.delete(`/test/collection/${id}`);
  return id;
});

export const createTestCase = createAsyncThunk(
  'test/createTestCase',
  async (data: Partial<TestCase>) => {
    const response = await api.post('/test/case/add', data);
    return response.data;
  }
);

export const updateTestCase = createAsyncThunk(
  'test/updateTestCase',
  async ({ id, data }: { id: string; data: Partial<TestCase> }) => {
    const response = await api.put(`/test/case/${id}`, data);
    return response.data;
  }
);

export const deleteTestCase = createAsyncThunk('test/deleteTestCase', async (id: string) => {
  await api.delete(`/test/case/${id}`);
  return id;
});

export const runTest = createAsyncThunk(
  'test/runTest',
  async (collectionId: string) => {
    const response = await api.post('/test/run', { collection_id: collectionId });
    return response.data;
  }
);

export const fetchTestHistory = createAsyncThunk(
  'test/fetchHistory',
  async (collectionId: string) => {
    const response = await api.get('/test/history', { params: { collection_id: collectionId } });
    return response.data;
  }
);

const testSlice = createSlice({
  name: 'test',
  initialState,
  reducers: {
    setCurrentCollection: (state, action) => {
      state.currentCollection = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTestCollections.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTestCollections.fulfilled, (state, action) => {
        state.loading = false;
        state.collections = action.payload;
      })
      .addCase(fetchTestCollections.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取测试集合列表失败';
      })
      .addCase(fetchTestCollection.fulfilled, (state, action) => {
        state.currentCollection = action.payload;
        state.testCases = action.payload.testCases || [];
      })
      .addCase(createTestCollection.fulfilled, (state, action) => {
        state.collections.push(action.payload);
      })
      .addCase(updateTestCollection.fulfilled, (state, action) => {
        const index = state.collections.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) {
          state.collections[index] = action.payload;
        }
        if (state.currentCollection?._id === action.payload._id) {
          state.currentCollection = action.payload;
        }
      })
      .addCase(deleteTestCollection.fulfilled, (state, action) => {
        state.collections = state.collections.filter((c) => c._id !== action.payload);
        if (state.currentCollection?._id === action.payload) {
          state.currentCollection = null;
          state.testCases = [];
        }
      })
      .addCase(createTestCase.fulfilled, (state, action) => {
        state.testCases.push(action.payload);
      })
      .addCase(updateTestCase.fulfilled, (state, action) => {
        const index = state.testCases.findIndex((tc) => tc._id === action.payload._id);
        if (index !== -1) {
          state.testCases[index] = action.payload;
        }
      })
      .addCase(deleteTestCase.fulfilled, (state, action) => {
        state.testCases = state.testCases.filter((tc) => tc._id !== action.payload);
      })
      .addCase(fetchTestHistory.fulfilled, (state, action) => {
        state.testResults = action.payload;
      });
  },
});

export const { setCurrentCollection } = testSlice.actions;
export default testSlice.reducer;

