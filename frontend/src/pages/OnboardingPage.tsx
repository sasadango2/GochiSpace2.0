import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Container, TextField, Typography, Alert } from '@mui/material'
import { supabase } from '../supabase'

const API_BASE = import.meta.env.VITE_API_BASE_URL as string

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!username.trim() || !displayName.trim()) {
      setError('すべての項目を入力してください')
      return
    }
    setLoading(true)
    setError('')
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    const res = await fetch(`${API_BASE}/api/v1/users/me`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: username.trim(), display_name: displayName.trim() }),
    })
    if (!res.ok) {
      const body = await res.json() as { error: { message: string } }
      setError(body.error?.message ?? 'エラーが発生しました')
      setLoading(false)
      return
    }
    navigate('/map')
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>プロフィール設定</Typography>
        <Typography variant="body2" color="text.secondary">
          GochiSpace へようこそ！はじめにプロフィールを設定してください。
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="ユーザー名（英数字）"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="例: taro_yamada"
          fullWidth
        />
        <TextField
          label="表示名"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="例: 山田太郎"
          fullWidth
        />
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          size="large"
        >
          はじめる
        </Button>
      </Box>
    </Container>
  )
}
