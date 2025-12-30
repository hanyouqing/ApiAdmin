import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  locale: 'zh-CN' | 'en-US';
  testPipelineRunning: boolean;
}

const savedLocale = (localStorage.getItem('locale') || 'en-US') as 'zh-CN' | 'en-US';

const initialState: UIState = {
  sidebarCollapsed: false,
  theme: 'light',
  locale: savedLocale,
  testPipelineRunning: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    setLocale: (state, action: PayloadAction<'zh-CN' | 'en-US'>) => {
      state.locale = action.payload;
    },
    setTestPipelineRunning: (state, action: PayloadAction<boolean>) => {
      state.testPipelineRunning = action.payload;
    },
  },
});

export const { toggleSidebar, setTheme, setLocale, setTestPipelineRunning } = uiSlice.actions;
export default uiSlice.reducer;

