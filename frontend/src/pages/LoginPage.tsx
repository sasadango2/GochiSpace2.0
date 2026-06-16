import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, TextField, Typography, Tabs, Tab, Alert } from '@mui/material'
import { supabase } from '../supabase'

export default function LoginPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
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
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 8, px: 2 }}>
      <Typography variant="h5" sx={{ mb: 3, textAlign: 'center' }}>
        GochiSpace
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
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
      <Button variant="contained" fullWidth onClick={handleSubmit}>
        {tab === 0 ? 'ログイン' : '登録'}
      </Button>
    </Box>
  )
}
