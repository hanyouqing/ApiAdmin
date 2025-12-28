/**
 * 主题颜色配置
 * 基于 hanyouqing.com 的颜色方案
 */

// 主色调 - 绿色系（Primary）
export const primaryColors = {
  50: '#f0fdf4',
  100: '#dcfce7',
  200: '#bbf7d0',
  400: '#4ade80',
  500: '#22c55e',
  600: '#16a34a', // 主要颜色
  700: '#15803d',
};

// 深色系（Dark/Gray）
export const darkColors = {
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
};

// 科技蓝（Tech/Secondary）
export const techColors = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  400: '#60a5fa',
  500: '#3b82f6',
  600: '#2563eb',
};

// 警告色（Warning）
export const warningColors = {
  100: '#fef3c7',
  600: '#d97706',
};

// 主题色（Theme Color）- 使用 logo 的深蓝色
export const themeColor = '#1a365d';

// Logo 渐变颜色
export const logoColors = {
  start: '#1a365d', // 深蓝
  end: '#16a34a',   // 绿色
};

// Ant Design 主题配置
export const antdTheme = {
  token: {
    // 主色
    colorPrimary: primaryColors[600], // #16a34a
    colorSuccess: primaryColors[600],
    colorWarning: warningColors[600],
    colorError: '#ef4444',
    colorInfo: techColors[600],
    
    // 文本颜色
    colorText: darkColors[800],
    colorTextSecondary: darkColors[600],
    colorTextTertiary: darkColors[500],
    colorTextQuaternary: darkColors[400],
    // Primary 按钮文字颜色（白色）
    colorTextLightSolid: '#ffffff',
    
    // 背景色
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: darkColors[50],
    colorBgSpotlight: darkColors[100],
    
    // 边框颜色
    colorBorder: darkColors[200],
    colorBorderSecondary: darkColors[100],
    
    // 字体
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontFamilyCode: 'JetBrains Mono, "Fira Code", Consolas, "Courier New", monospace',
    
    // 圆角
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    
    // 阴影
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    boxShadowSecondary: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  },
  components: {
    Button: {
      primaryColor: primaryColors[600],
      borderRadius: 8,
      fontWeight: 500,
      colorTextLightSolid: '#ffffff',
      colorPrimary: primaryColors[600],
      colorPrimaryHover: primaryColors[700],
      colorPrimaryActive: primaryColors[700],
    },
    Modal: {
      titleColor: darkColors[800],
      contentBg: '#ffffff',
    },
    Card: {
      borderRadius: 12,
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    },
    Input: {
      borderRadius: 8,
      activeBorderColor: primaryColors[600],
      hoverBorderColor: primaryColors[500],
    },
    Menu: {
      itemSelectedBg: primaryColors[100],
      itemSelectedColor: primaryColors[700],
      itemHoverBg: darkColors[50],
      itemHoverColor: primaryColors[600],
      // 子菜单 Popover 样式（用于收起状态）
      subMenuItemBg: '#ffffff',
      popupBg: '#ffffff',
    },
    Layout: {
      bodyBg: darkColors[50],
      headerBg: '#ffffff',
      // 侧边栏使用 logo 的深蓝色，与 logo 渐变起始色保持一致
      siderBg: '#1a365d',
    },
  },
};

// CSS 变量（用于 SCSS/CSS）
export const cssVariables = {
  '--color-primary': primaryColors[600],
  '--color-primary-50': primaryColors[50],
  '--color-primary-100': primaryColors[100],
  '--color-primary-200': primaryColors[200],
  '--color-primary-500': primaryColors[500],
  '--color-primary-600': primaryColors[600],
  '--color-primary-700': primaryColors[700],
  
  '--color-dark-50': darkColors[50],
  '--color-dark-100': darkColors[100],
  '--color-dark-200': darkColors[200],
  '--color-dark-300': darkColors[300],
  '--color-dark-600': darkColors[600],
  '--color-dark-700': darkColors[700],
  '--color-dark-800': darkColors[800],
  '--color-dark-900': darkColors[900],
  
  '--color-tech-100': techColors[100],
  '--color-tech-400': techColors[400],
  '--color-tech-500': techColors[500],
  '--color-tech-600': techColors[600],
  
  '--color-warning-100': warningColors[100],
  '--color-warning-600': warningColors[600],
  
  '--color-theme': themeColor,
  '--color-logo-start': logoColors.start,
  '--color-logo-end': logoColors.end,
  
  '--font-family': 'Inter, system-ui, sans-serif',
  '--font-family-code': 'JetBrains Mono, "Fira Code", monospace',
  
  '--border-radius': '8px',
  '--border-radius-lg': '12px',
  '--border-radius-sm': '6px',
};

