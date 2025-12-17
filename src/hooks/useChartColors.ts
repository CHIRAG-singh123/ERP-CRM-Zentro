import { useTheme } from '../context/ThemeContext';

export function useChartColors() {
  const { theme } = useTheme();

  const colors = {
    primary: theme === 'light' ? '#6425fe' : '#A8DADC',
    secondary: theme === 'light' ? '#B39CD0' : '#B39CD0',
    tertiary: theme === 'light' ? '#A8DADC' : '#6425fe',
    positive: '#77b900',
    negative: '#e8464c',
    
    // Grid and axes
    grid: theme === 'light' ? 'rgba(26, 26, 26, 0.08)' : 'rgba(255, 255, 255, 0.08)',
    axis: theme === 'light' ? 'rgba(26, 26, 26, 0.5)' : 'rgba(255, 255, 255, 0.4)',
    axisText: theme === 'light' ? 'rgba(26, 26, 26, 0.75)' : 'rgba(255, 255, 255, 0.7)',
    
    // Tooltip
    tooltipBg: theme === 'light' ? '#fafafa' : '#1F1F21',
    tooltipBorder: theme === 'light' ? 'rgba(26, 26, 26, 0.15)' : 'rgba(255, 255, 255, 0.2)',
    tooltipText: theme === 'light' ? '#1a1a1a' : '#ffffff',
    
    // Cursor
    cursor: theme === 'light' ? 'rgba(100, 37, 254, 0.1)' : 'rgba(168, 218, 220, 0.1)',
  };

  return colors;
}

