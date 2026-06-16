import { useEffect, useState } from 'react'
import { Box, Typography, TextField, Button, List, ListItem, ListItemText, Chip, Divider } from '@mui/material'
import { supabase } from '../supabase'

type User = { id: string; username: string; display_name: string }
type Request = { id: string; username: string; display_name: string; status: string }

const apiBase = import.meta.env.VITE_API_BASE_URL as string

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? ''
}

export default function FollowPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [followers, setFollowers] = useState<User[]>([])
  const [received, setReceived] = useState<Request[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const token = await getToken()
      const headers = { Authorization: `Bearer ${token}` }

      const [followersRes, receivedRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/follows`, { headers }),
        fetch(`${apiBase}/api/v1/follows/requests/received`, { headers }),
      ])
      setFollowers(await followersRes.json())
      setReceived(await receivedRes.json())
    }
    fetchData()
  }, [])

  const handleSearch = async () => {
    const token = await getToken()
    const res = await fetch(`${apiBase}/api/v1/users/search?q=${encodeURIComponent(searchQuery)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    setSearchResults(await res.json())
  }

  const sendRequest = async (toUserId: string) => {
    const token = await getToken()
    await fetch(`${apiBase}/api/v1/follows/requests`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId }),
    })
  }

  const respondRequest = async (id: string, status: 'accepted' | 'rejected') => {
    const token = await getToken()
    await fetch(`${apiBase}/api/v1/follows/requests/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setReceived((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', px: 2, pt: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>フォロー管理</Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <TextField
          label="ユーザー名で検索"
          fullWidth
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button variant="contained" onClick={handleSearch}>検索</Button>
      </Box>

      {searchResults.length > 0 && (
        <List sx={{ mb: 3 }}>
          {searchResults.map((u) => (
            <ListItem key={u.id} secondaryAction={
              <Button size="small" onClick={() => sendRequest(u.id)}>申請</Button>
            }>
              <ListItemText primary={u.display_name} secondary={`@${u.username}`} />
            </ListItem>
          ))}
        </List>
      )}

      <Divider sx={{ mb: 2 }} />
      <Typography variant="subtitle1" sx={{ mb: 1 }}>受信した申請</Typography>
      {received.length === 0 && <Typography color="text.secondary" sx={{ mb: 2 }}>申請はありません</Typography>}
      <List sx={{ mb: 3 }}>
        {received.map((r) => (
          <ListItem key={r.id} secondaryAction={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" color="success" onClick={() => respondRequest(r.id, 'accepted')}>承認</Button>
              <Button size="small" color="error" onClick={() => respondRequest(r.id, 'rejected')}>拒否</Button>
            </Box>
          }>
            <ListItemText primary={r.display_name} secondary={`@${r.username}`} />
          </ListItem>
        ))}
      </List>

      <Divider sx={{ mb: 2 }} />
      <Typography variant="subtitle1" sx={{ mb: 1 }}>相互フォロワー</Typography>
      {followers.length === 0 && <Typography color="text.secondary">フォロワーはいません</Typography>}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {followers.map((f) => <Chip key={f.id} label={f.display_name} />)}
      </Box>
    </Box>
  )
}
