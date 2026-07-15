import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import './index.css'
import App from './App.tsx'

const BRAND = '#e8651a'
const BRAND_DARK = '#c9530f'
const INK = '33, 29, 25'

// クレイモルフィズム調：上面ハイライト＋柔らかい落ち影で「ふっくら」した立体感を出す
const claySurface = `0 2px 4px rgba(${INK}, 0.04), 0 12px 28px rgba(${INK}, 0.07), inset 0 1.5px 0 rgba(255, 255, 255, 0.9)`
const clayBrand = '0 4px 12px rgba(232, 101, 26, 0.35), inset 0 1.5px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 0 rgba(0, 0, 0, 0.08)'

const theme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#f7f2ec',
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
    divider: `rgba(${INK}, 0.08)`,
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: '"M PLUS Rounded 1c", "Noto Sans JP", system-ui, "Segoe UI", Roboto, sans-serif',
    h5: { fontWeight: 800, letterSpacing: '-0.02em' },
    h6: { fontWeight: 800, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 700 },
    subtitle2: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'linear-gradient(180deg, #faf5ef 0%, #f3ebe1 100%)',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 999,
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        },
        contained: {
          '&.MuiButton-colorPrimary': {
            background: 'linear-gradient(180deg, #ff8a4d 0%, #e8651a 100%)',
            boxShadow: clayBrand,
            '&:hover': {
              background: 'linear-gradient(180deg, #ff9b66 0%, #ef6f22 100%)',
              boxShadow: '0 6px 16px rgba(232, 101, 26, 0.4), inset 0 1.5px 0 rgba(255, 255, 255, 0.4)',
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(1px)',
              boxShadow: '0 2px 6px rgba(232, 101, 26, 0.3), inset 0 2px 4px rgba(0, 0, 0, 0.15)',
            },
          },
        },
        outlined: {
          backgroundColor: '#ffffff',
          boxShadow: `0 2px 8px rgba(${INK}, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)`,
          '&:hover': { transform: 'translateY(-1px)' },
          '&:active': { transform: 'translateY(1px)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: '1px solid rgba(255, 255, 255, 0.8)',
          background: 'linear-gradient(180deg, #ffffff 0%, #fdfaf6 100%)',
          boxShadow: claySurface,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          '&.MuiChip-filled.MuiChip-colorDefault': {
            backgroundColor: '#ffffff',
            border: `1px solid rgba(${INK}, 0.08)`,
            boxShadow: `0 2px 6px rgba(${INK}, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.9)`,
          },
          '&.MuiChip-filled.MuiChip-colorPrimary': {
            background: 'linear-gradient(180deg, #ff8a4d 0%, #e8651a 100%)',
            boxShadow: '0 3px 8px rgba(232, 101, 26, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
          },
          '&.MuiChip-filled.MuiChip-colorSecondary': {
            background: 'linear-gradient(180deg, #f8bd74 0%, #f4a24a 100%)',
            boxShadow: '0 3px 8px rgba(244, 162, 74, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 700 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
          boxShadow: `0 24px 64px rgba(${INK}, 0.2), inset 0 1.5px 0 rgba(255, 255, 255, 0.9)`,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          boxShadow: `0 3px 8px rgba(${INK}, 0.15)`,
          border: '2px solid #ffffff',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: 'rgba(232, 101, 26, 0.10)',
            color: BRAND_DARK,
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
            '& .MuiListItemIcon-root': { color: BRAND_DARK },
            '&:hover': { backgroundColor: 'rgba(232, 101, 26, 0.16)' },
          },
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          margin: '6px 4px',
          transition: 'background-color 0.2s ease, color 0.2s ease',
          '&.Mui-selected': {
            color: BRAND_DARK,
            backgroundColor: 'rgba(232, 101, 26, 0.10)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: { fontWeight: 700 },
        primary: {
          background: 'linear-gradient(180deg, #ff8a4d 0%, #e8651a 100%)',
          boxShadow: '0 6px 16px rgba(232, 101, 26, 0.4), inset 0 1.5px 0 rgba(255, 255, 255, 0.4)',
        },
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
