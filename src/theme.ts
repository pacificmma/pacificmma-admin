// src/theme.ts

import { createTheme } from '@mui/material/styles';

const adminTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#004D61',
    },
    secondary: {
      main: '#00ACC1', // Cyan
    },
    background: {
      default: '#EDEAE0',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1A1A',
      secondary: '#555555',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

export default adminTheme;
