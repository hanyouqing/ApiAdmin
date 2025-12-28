import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../Utils/api';

export interface Project {
  _id: string;
  project_name: string;
  project_desc: string;
  group_id: string;
  uid: string;
  icon: string;
  color: string;
  basepath: string;
  member: string[];
  env: any[];
  tag: any[];
  mock_strict?: boolean;
  enable_json5?: boolean;
  token?: string;
  mock_script?: string;
  created_at: string;
  updated_at: string;
}

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProjectState = {
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
};

export const fetchProjects = createAsyncThunk(
  'project/fetchList',
  async (groupId?: string) => {
    const params = groupId ? { group_id: groupId } : {};
    const response = await api.get('/project/list', { params });
    return response.data.data || response.data;
  }
);

export const createProject = createAsyncThunk(
  'project/create',
  async (data: Partial<Project>) => {
    const response = await api.post('/project/add', data);
    return response.data.data || response.data;
  }
);

export const updateProject = createAsyncThunk(
  'project/update',
  async ({ id, data }: { id: string; data: Partial<Project> }) => {
    const response = await api.put('/project/up', { ...data, _id: id });
    return response.data.data || response.data;
  }
);

export const deleteProject = createAsyncThunk('project/delete', async (id: string) => {
  await api.delete('/project/del', { params: { _id: id } });
  return id;
});

export const fetchProjectDetail = createAsyncThunk(
  'project/fetchDetail',
  async (id: string) => {
    const response = await api.get('/project/get', { params: { _id: id } });
    return response.data.data || response.data;
  }
);

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setCurrentProject: (state, action) => {
      state.currentProject = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.projects = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取项目列表失败';
        // 保持现有项目列表，不重置为空
      })
      .addCase(fetchProjectDetail.fulfilled, (state, action) => {
        state.currentProject = action.payload;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.projects.push(action.payload);
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        const index = state.projects.findIndex((p) => p._id === action.payload._id);
        if (index !== -1) {
          state.projects[index] = action.payload;
        }
        if (state.currentProject?._id === action.payload._id) {
          state.currentProject = action.payload;
        }
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.projects = state.projects.filter((p) => p._id !== action.payload);
      });
  },
});

export const { setCurrentProject } = projectSlice.actions;
export default projectSlice.reducer;

