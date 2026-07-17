import { useEffect, useState, type ChangeEvent } from 'react'
import {
  Box, Typography, TextField, Button, Chip, CircularProgress, Alert, Divider,
  Avatar, Badge, IconButton,
} from '@mui/material'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { uploadAvatar } from '../utils/uploadAvatar'

type Genre = { id: number; name: string }
type Profile = { username: string; display_name: string; avatar_url: string | null; bio: string | null }
type Message = { text: string; severity: 'success' | 'error' }

const apiBase = import.meta.env.VITE_API_BASE_URL as string

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? ''
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile>({ username: '', display_name: '', avatar_url: null, bio: null })
  const [genres, setGenres] = useState<Genre[]>([])
  const [selectedGenres, setSelectedGenres] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)

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

  const handleSelectAvatar = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user.id
    const url = userId ? await uploadAvatar(userId, file) : null
    if (url) {
      await fetch(`${apiBase}/api/v1/users/me`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: url }),
      })
      setProfile((prev) => ({ ...prev, avatar_url: url }))
      setMessage({ text: 'プロフィール画像を更新しました', severity: 'success' })
    } else {
      setMessage({ text: '画像のアップロードに失敗しました', severity: 'error' })
    }
    setUploading(false)
  }

  const handleSave = async () => {
    const token = await getToken()
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    await fetch(`${apiBase}/api/v1/users/me`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ username: profile.username, display_name: profile.display_name, bio: profile.bio ?? '' }),
    })
    await fetch(`${apiBase}/api/v1/users/me/genres`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ genreIds: selectedGenres }),
    })
    setMessage({ text: '保存しました', severity: 'success' })
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
    <Box sx={{ maxWidth: 600, mx: 'auto', px: 2, pt: 2, pb: 6 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>プロフィール</Typography>
      {message && <Alert severity={message.severity} sx={{ mb: 2 }}>{message.text}</Alert>}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          badgeContent={
            <IconButton
              component="label"
              size="small"
              disabled={uploading}
              sx={{
                bgcolor: 'background.paper',
                boxShadow: '0 2px 8px rgba(33, 29, 25, 0.2)',
                '&:hover': { bgcolor: 'background.paper' },
              }}
            >
              {uploading ? <CircularProgress size={18} /> : <PhotoCameraIcon fontSize="small" />}
              <input hidden type="file" accept="image/*" onChange={handleSelectAvatar} />
            </IconButton>
          }
        >
          <Avatar src={profile.avatar_url ?? undefined} sx={{ width: 96, height: 96, fontSize: 36 }}>
            {profile.display_name.charAt(0)}
          </Avatar>
        </Badge>
      </Box>
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
        sx={{ mb: 2 }}
      />
      <TextField
        label="自己紹介"
        placeholder="例：パクチー苦手。コスパ重視で居酒屋多め"
        fullWidth
        multiline
        minRows={2}
        value={profile.bio ?? ''}
        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
        slotProps={{ htmlInput: { maxLength: 200 } }}
        helperText={`${(profile.bio ?? '').length}/200`}
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
