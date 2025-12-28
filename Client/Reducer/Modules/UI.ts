import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  locale: 'zh-CN' | 'en-US';
}

const savedLocale = (localStorage.getItem('locale') || 'en-US') as 'zh-CN' | 'en-US';

const initialState: UIState = {
  sidebarCollapsed: false,
  theme: 'light',
  locale: savedLocale,
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
  },
});

export const { toggleSidebar, setTheme, setLocale } = uiSlice.actions;
export default uiSlice.reducer;

