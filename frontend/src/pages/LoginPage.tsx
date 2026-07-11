import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Box, Button, TextField, Typography, Tabs, Tab, Alert, Paper } from '@mui/material'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import { supabase } from '../supabase'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const initialTab = (location.state as { tab?: number } | null)?.tab ?? 0
  const [tab, setTab] = useState(initialTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async () => {
    setError('')
    setMessage('')

    if (tab === 0) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return setError(error.message)
      navigate('/map')
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) return setError(error.message)
      setMessage('確認メールを送信しました。メールを確認してください。')
    }
  }

  return (
    <Box
      sx={{
        height: '100%',
        overflowY: 'auto',
        display: 'flex',
        px: 2,
        py: 4,
        boxSizing: 'border-box',
        background: 'linear-gradient(160deg, #fff7f0 0%, #ffe8d6 50%, #ffd9bd 100%)',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 400, m: 'auto' }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              mx: 'auto',
              mb: 1.5,
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #ff8a4d 0%, #e8651a 100%)',
              boxShadow: '0 8px 24px rgba(232, 101, 26, 0.35)',
            }}
          >
            <RestaurantIcon sx={{ color: '#fff', fontSize: 32 }} />
          </Box>
          <Typography variant="h5" color="primary">
            GochiSpace
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            美味しい発見を、信頼できる人とシェア
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 4,
            border: '1px solid rgba(33, 29, 25, 0.08)',
            boxShadow: '0 4px 24px rgba(33, 29, 25, 0.08)',
          }}
        >
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ mb: 3 }}>
            <Tab label="ログイン" />
            <Tab label="新規登録" />
          </Tabs>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
          <TextField
            label="メールアドレス"
            type="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="パスワード"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 3 }}
          />
          <Button variant="contained" size="large" fullWidth onClick={handleSubmit}>
            {tab === 0 ? 'ログイン' : '登録'}
          </Button>
        </Paper>
      </Box>
    </Box>
  )
}
