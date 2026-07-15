import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  BottomNavigation, BottomNavigationAction, Paper,
  Drawer, Box, List, ListItemButton, ListItemIcon, ListItemText,
  AppBar, Toolbar, Typography, useTheme, useMediaQuery,
  Fab, Badge, IconButton, Button, Divider,
} from '@mui/material'
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded'
import RestaurantMenuRoundedIcon from '@mui/icons-material/RestaurantMenuRounded'
import Diversity3RoundedIcon from '@mui/icons-material/Diversity3Rounded'
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded'
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded'
import BookmarkAddRoundedIcon from '@mui/icons-material/BookmarkAddRounded'
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded'
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded'

import { useState, useEffect } from 'react'
import AuthGuard from './components/AuthGuard'
import ReviewPostDialog from './components/ReviewPostDialog'
import WannaGoAddDialog from './components/WannaGoAddDialog'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import MapPage from './pages/MapPage'
import FeedPage from './pages/FeedPage'
import ProfilePage from './pages/ProfilePage'
import FollowPage from './pages/FollowPage'
import UserReviewsPage from './pages/UserReviewsPage'
import NotificationPage from './pages/NotificationPage'
import { supabase } from './supabase'

const DRAWER_WIDTH = 240
const API_BASE = import.meta.env.VITE_API_BASE_URL as string

function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: `${size * 0.3}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: 'linear-gradient(135deg, #ff8a4d 0%, #e8651a 100%)',
        boxShadow: '0 4px 10px rgba(232, 101, 26, 0.35), inset 0 1.5px 0 rgba(255, 255, 255, 0.4)',
      }}
    >
      <RestaurantRoundedIcon sx={{ color: '#fff', fontSize: size * 0.6 }} />
    </Box>
  )
}

const NAV_ITEMS = [
  { path: '/map', label: 'マップ', icon: <ExploreRoundedIcon /> },
  { path: '/feed', label: 'フィード', icon: <RestaurantMenuRoundedIcon /> },
  { path: '/follows', label: 'フォロー', icon: <Diversity3RoundedIcon /> },
  { path: '/profile', label: 'プロフィール', icon: <AccountCircleRoundedIcon /> },
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
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
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
              display: 'flex',
              flexDirection: 'column',
            },
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <BrandMark size={36} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" color="primary" sx={{ lineHeight: 1.2 }}>GochiSpace</Typography>
              {displayName && (
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{displayName}</Typography>
              )}
            </Box>
            <IconButton size="small" onClick={() => navigate('/notifications')}>
              <Badge badgeContent={unreadCount || null} color="error">
                <NotificationsRoundedIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Box>
          <List sx={{ pt: 1, flex: 1 }}>
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
          {location.pathname.startsWith('/map') && (
            <>
              <Divider />
              <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<RateReviewRoundedIcon />}
                  onClick={() => setReviewDialogOpen(true)}
                  fullWidth
                >
                  飲食店を記録
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<BookmarkAddRoundedIcon />}
                  onClick={() => setWannaGoDialogOpen(true)}
                  fullWidth
                >
                  行きたい店を追加
                </Button>
              </Box>
            </>
          )}
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
            <Toolbar variant="dense" sx={{ gap: 1.25 }}>
              <BrandMark size={30} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h6" color="primary" sx={{ lineHeight: 1.2 }}>GochiSpace</Typography>
                {displayName && (
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', lineHeight: 1 }}>{displayName}</Typography>
                )}
              </Box>
              <IconButton size="small" onClick={() => navigate('/notifications')}>
                <Badge badgeContent={unreadCount || null} color="error">
                  <NotificationsRoundedIcon />
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
            <Route path="/follows/:userId" element={<UserReviewsPage />} />
            <Route path="/notifications" element={<NotificationPage />} />
            <Route path="*" element={<Navigate to="/map" />} />
          </Routes>
        </Box>

        {/* スマホ: ボトムナビ */}
        {isMobile && (
          <Paper elevation={3} sx={{ flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <BottomNavigation value={currentNav === -1 ? 0 : currentNav} sx={{ '& .MuiBottomNavigationAction-label': { fontSize: '10px', whiteSpace: 'nowrap' } }}>
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

      {/* モバイル: テキスト付きFAB（マップ画面のみ） */}
      {isMobile && location.pathname.startsWith('/map') && !reviewDialogOpen && !wannaGoDialogOpen && (
        <Box sx={{ position: 'fixed', bottom: 'calc(72px + env(safe-area-inset-bottom))', right: 16, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end', zIndex: 1400 }}>
          <Fab variant="extended" size="medium" color="primary" onClick={() => setReviewDialogOpen(true)}
            sx={{ boxShadow: 3, width: 176 }}>
            <RateReviewRoundedIcon sx={{ mr: 1 }} />
            飲食店を記録
          </Fab>
          <Fab variant="extended" size="medium" onClick={() => setWannaGoDialogOpen(true)}
            sx={{ bgcolor: 'white', color: 'primary.main', boxShadow: 3, border: '1px solid', borderColor: 'primary.main', '&:hover': { bgcolor: 'primary.50' }, width: 176 }}>
            <BookmarkAddRoundedIcon sx={{ mr: 1 }} />
            行きたい店を追加
          </Fab>
        </Box>
      )}

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
        <Route path="/welcome" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/*" element={<AuthGuard><Layout /></AuthGuard>} />
      </Routes>
    </BrowserRouter>
  )
}
