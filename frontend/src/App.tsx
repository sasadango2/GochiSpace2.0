import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  BottomNavigation, BottomNavigationAction, Paper,
  Drawer, Box, List, ListItemButton, ListItemIcon, ListItemText,
  AppBar, Toolbar, Typography, useTheme, useMediaQuery,
  SpeedDial, SpeedDialAction, SpeedDialIcon, Badge, IconButton,
} from '@mui/material'
import MapIcon from '@mui/icons-material/Map'
import ListIcon from '@mui/icons-material/List'
import PersonIcon from '@mui/icons-material/Person'
import PeopleIcon from '@mui/icons-material/People'
import RateReviewIcon from '@mui/icons-material/RateReview'
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd'
import NotificationsIcon from '@mui/icons-material/Notifications'
import { useState, useEffect } from 'react'
import AuthGuard from './components/AuthGuard'
import ReviewPostDialog from './components/ReviewPostDialog'
import WannaGoAddDialog from './components/WannaGoAddDialog'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import MapPage from './pages/MapPage'
import FeedPage from './pages/FeedPage'
import ProfilePage from './pages/ProfilePage'
import FollowPage from './pages/FollowPage'
import NotificationPage from './pages/NotificationPage'
import { supabase } from './supabase'

const DRAWER_WIDTH = 240
const API_BASE = import.meta.env.VITE_API_BASE_URL as string

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
  const navigate = useNavigate()
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [wannaGoDialogOpen, setWannaGoDialogOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [displayName, setDisplayName] = useState('')

  const currentNav = NAV_ITEMS.findIndex((n) => location.pathname.startsWith(n.path))

  const fetchUnreadCount = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      const res = await fetch(`${API_BASE}/api/v1/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      setUnreadCount(data.count || 0)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      try {
        const res = await fetch(`${API_BASE}/api/v1/users/me`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const data = await res.json()
        setDisplayName(data.display_name || '')
      } catch {
        // ignore
      }
    }
    fetchProfile()
  }, [])

  useEffect(() => {
    fetchUnreadCount()
    window.addEventListener('notifications-updated', fetchUnreadCount)
    return () => window.removeEventListener('notifications-updated', fetchUnreadCount)
  }, [location.pathname])

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
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>GochiSpace</Typography>
              {displayName && (
                <Typography variant="caption" color="text.secondary">{displayName}</Typography>
              )}
            </Box>
            <IconButton size="small" onClick={() => navigate('/notifications')}>
              <Badge badgeContent={unreadCount || null} color="error">
                <NotificationsIcon fontSize="small" />
              </Badge>
            </IconButton>
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
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>GochiSpace</Typography>
                {displayName && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>{displayName}</Typography>
                )}
              </Box>
              <IconButton size="small" onClick={() => navigate('/notifications')}>
                <Badge badgeContent={unreadCount || null} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
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
            <Route path="/notifications" element={<NotificationPage />} />
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

      {/* SpeedDial FAB */}
      <SpeedDial
        ariaLabel="メニュー"
        sx={{ position: 'fixed', bottom: isMobile ? 72 : 24, right: 24 }}
        icon={<SpeedDialIcon />}
      >
        <SpeedDialAction
          icon={<RateReviewIcon />}
          onClick={() => setReviewDialogOpen(true)}
        />
        <SpeedDialAction
          icon={<BookmarkAddIcon />}
          onClick={() => setWannaGoDialogOpen(true)}
        />
      </SpeedDial>

      <ReviewPostDialog
        open={reviewDialogOpen}
        onClose={() => setReviewDialogOpen(false)}
        onSubmitted={() => {
          setReviewDialogOpen(false)
          window.dispatchEvent(new CustomEvent('review-posted'))
        }}
      />

      <WannaGoAddDialog
        open={wannaGoDialogOpen}
        onClose={() => setWannaGoDialogOpen(false)}
        onAdded={() => {
          window.dispatchEvent(new CustomEvent('wanna-go-updated'))
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
