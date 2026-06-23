import { useEffect, useState } from 'react'
import { Box, Typography, TextField, Button, Chip, CircularProgress, Alert, Divider } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

type Genre = { id: number; name: string }
type Profile = { username: string; display_name: string }

const apiBase = import.meta.env.VITE_API_BASE_URL as string

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? ''
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile>({ username: '', display_name: '' })
  const [genres, setGenres] = useState<Genre[]>([])
  const [selectedGenres, setSelectedGenres] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const token = await getToken()
      const headers = { Authorization: `Bearer ${token}` }

      const [profileRes, genresRes, myGenresRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/users/me`, { headers }),
        fetch(`${apiBase}/api/v1/genres`, { headers }),
        fetch(`${apiBase}/api/v1/users/me/genres`, { headers }),
      ])

      setProfile(await profileRes.json())
      setGenres(await genresRes.json())
      const myGenres: Genre[] = await myGenresRes.json()
      setSelectedGenres(myGenres.map((g) => g.id))
      setLoading(false)
    }
    fetchData()
  }, [])

  const toggleGenre = (id: number) => {
    setSelectedGenres((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : prev.length < 3 ? [...prev, id] : prev
    )
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleSave = async () => {
    const token = await getToken()
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    await fetch(`${apiBase}/api/v1/users/me`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ username: profile.username, display_name: profile.display_name }),
    })
    await fetch(`${apiBase}/api/v1/users/me/genres`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ genreIds: selectedGenres }),
    })
    setMessage('保存しました')
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
    <Box sx={{ maxWidth: 600, mx: 'auto', px: 2, pt: 2, pb: 6 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>プロフィール</Typography>
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      <TextField
        label="ユーザー名"
        fullWidth
        value={profile.username}
        onChange={(e) => setProfile({ ...profile, username: e.target.value })}
        sx={{ mb: 2 }}
      />
      <TextField
        label="表示名"
        fullWidth
        value={profile.display_name}
        onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
        sx={{ mb: 3 }}
      />
      <Typography variant="subtitle1" sx={{ mb: 1 }}>好きなジャンル（最大3つ）</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
        {genres.map((g) => (
          <Chip
            key={g.id}
            label={g.name}
            onClick={() => toggleGenre(g.id)}
            color={selectedGenres.includes(g.id) ? 'primary' : 'default'}
          />
        ))}
      </Box>
      <Button variant="contained" fullWidth onClick={handleSave}>保存</Button>
      <Divider sx={{ my: 3 }} />
      <Button variant="outlined" color="error" fullWidth onClick={handleLogout}>ログアウト</Button>
    </Box>
    </Box>
  )
}
