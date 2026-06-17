import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { BottomNavigation, BottomNavigationAction, Paper, Fab } from '@mui/material'
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

function Layout() {
  const [nav, setNav] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Routes>
        <Route path="/map" element={<MapPage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/follows" element={<FollowPage />} />
        <Route path="*" element={<Navigate to="/map" />} />
      </Routes>
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 72, right: 16 }}
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
      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
        <BottomNavigation value={nav} onChange={(_, v) => setNav(v)}>
          <BottomNavigationAction label="マップ" icon={<MapIcon />} component={Link} to="/map" />
          <BottomNavigationAction label="フィード" icon={<ListIcon />} component={Link} to="/feed" />
          <BottomNavigationAction label="フォロー" icon={<PeopleIcon />} component={Link} to="/follows" />
          <BottomNavigationAction label="プロフィール" icon={<PersonIcon />} component={Link} to="/profile" />
        </BottomNavigation>
      </Paper>
    </>
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
