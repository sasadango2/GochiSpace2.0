import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import {
  BottomNavigation, BottomNavigationAction, Paper, Fab,
  Drawer, Box, List, ListItemButton, ListItemIcon, ListItemText,
  AppBar, Toolbar, Typography, useTheme, useMediaQuery,
} from '@mui/material'
import MapIcon from '@mui/icons-material/Map'
import ListIcon from '@mui/icons-material/List'
import PersonIcon from '@mui/icons-material/Person'
import PeopleIcon from '@mui/icons-material/People'
import AddIcon from '@mui/icons-material/Add'
import { useState } from 'react'
import AuthGuard from './components/AuthGuard'
import ReviewPostDialog from './components/ReviewPostDialog'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import MapPage from './pages/MapPage'
import FeedPage from './pages/FeedPage'
import ProfilePage from './pages/ProfilePage'
import FollowPage from './pages/FollowPage'

const DRAWER_WIDTH = 240

const NAV_ITEMS = [
  { path: '/map', label: 'マップ', icon: <MapIcon /> },
  { path: '/feed', label: 'フィード', icon: <ListIcon /> },
  { path: '/follows', label: 'フォロー', icon: <PeopleIcon /> },
  { path: '/profile', label: 'プロフィール', icon: <PersonIcon /> },
]

function Layout() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const location = useLocation()
  const [dialogOpen, setDialogOpen] = useState(false)

  const currentNav = NAV_ITEMS.findIndex((n) => location.pathname.startsWith(n.path))

  return (
    <Box sx={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
      {/* PC: サイドバー */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              borderRight: 1,
              borderColor: 'divider',
            },
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>GochiSpace</Typography>
          </Box>
          <List sx={{ pt: 1 }}>
            {NAV_ITEMS.map((item) => (
              <ListItemButton
                key={item.path}
                component={Link}
                to={item.path}
                selected={location.pathname.startsWith(item.path)}
                sx={{ borderRadius: 1, mx: 1, mb: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Drawer>
      )}

      {/* コンテンツエリア */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* スマホ: 上部 AppBar */}
        {isMobile && (
          <AppBar
            position="static"
            elevation={0}
            sx={{ bgcolor: 'background.paper', color: 'text.primary', borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}
          >
            <Toolbar variant="dense">
              <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>GochiSpace</Typography>
            </Toolbar>
          </AppBar>
        )}

        {/* ページ内容 */}
        <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <Routes>
            <Route path="/map" element={<MapPage />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/follows" element={<FollowPage />} />
            <Route path="*" element={<Navigate to="/map" />} />
          </Routes>
        </Box>

        {/* スマホ: ボトムナビ */}
        {isMobile && (
          <Paper elevation={3} sx={{ flexShrink: 0 }}>
            <BottomNavigation value={currentNav === -1 ? 0 : currentNav}>
              {NAV_ITEMS.map((item) => (
                <BottomNavigationAction
                  key={item.path}
                  label={item.label}
                  icon={item.icon}
                  component={Link}
                  to={item.path}
                />
              ))}
            </BottomNavigation>
          </Paper>
        )}
      </Box>

      {/* レビュー投稿 FAB */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: isMobile ? 72 : 24, right: 24 }}
        onClick={() => setDialogOpen(true)}
      >
        <AddIcon />
      </Fab>

      <ReviewPostDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmitted={() => {
          setDialogOpen(false)
          window.dispatchEvent(new CustomEvent('review-posted'))
        }}
      />
    </Box>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/*" element={<AuthGuard><Layout /></AuthGuard>} />
      </Routes>
    </BrowserRouter>
  )
}
