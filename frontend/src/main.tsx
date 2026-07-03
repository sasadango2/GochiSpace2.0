import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import './index.css'
import App from './App.tsx'

const BRAND = '#e8651a'
const BRAND_DARK = '#c9530f'

const theme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#f7f5f2',
      paper: '#ffffff',
    },
    text: {
      primary: '#211d19',
      secondary: '#6b645c',
    },
    primary: {
      main: BRAND,
      dark: BRAND_DARK,
      light: '#ff8a4d',
    },
    secondary: {
      main: '#f4a24a',
    },
    divider: 'rgba(33, 29, 25, 0.08)',
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Noto Sans JP", system-ui, "Segoe UI", Roboto, sans-serif',
    h5: { fontWeight: 700, letterSpacing: '-0.02em' },
    h6: { fontWeight: 700, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 999 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid rgba(33, 29, 25, 0.08)',
          boxShadow: '0 1px 2px rgba(33, 29, 25, 0.04), 0 4px 12px rgba(33, 29, 25, 0.04)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 20 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: 'rgba(232, 101, 26, 0.10)',
            color: BRAND_DARK,
            '& .MuiListItemIcon-root': { color: BRAND_DARK },
            '&:hover': { backgroundColor: 'rgba(232, 101, 26, 0.16)' },
          },
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          '&.Mui-selected': { color: BRAND },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
