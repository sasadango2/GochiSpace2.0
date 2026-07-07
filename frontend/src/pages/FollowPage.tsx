import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Typography, TextField, Button, List, ListItem, ListItemText,
  ListItemButton, Divider, Select, MenuItem, FormControl, IconButton,
  Dialog, DialogContent, DialogContentText, DialogActions,
} from '@mui/material'
import PersonRemoveIcon from '@mui/icons-material/PersonRemove'
import { supabase } from '../supabase'
import { ROLES } from '../constants'

type Follow = { id: string; username: string; display_name: string; follow_id: string; role: string | null }
type Request = { id: string; username: string; display_name: string; status: string }

const apiBase = import.meta.env.VITE_API_BASE_URL as string

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? ''
}

export default function FollowPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Follow[]>([])
  const [followers, setFollowers] = useState<Follow[]>([])
  const [received, setReceived] = useState<Request[]>([])
  const [sent, setSent] = useState<Request[]>([])
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const token = await getToken()
      const headers = { Authorization: `Bearer ${token}` }
      const [followersRes, receivedRes, sentRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/follows`, { headers }),
        fetch(`${apiBase}/api/v1/follows/requests/received`, { headers }),
        fetch(`${apiBase}/api/v1/follows/requests/sent`, { headers }),
      ])
      setFollowers(await followersRes.json())
      setReceived(await receivedRes.json())
      const sentRows = await sentRes.json() as Request[]
      setSent(sentRows.filter((r) => r.status === 'pending'))
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

  const sendRequest = async (user: Follow) => {
    const token = await getToken()
    const res = await fetch(`${apiBase}/api/v1/follows/requests`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId: user.id }),
    })
    const created = await res.json().catch(() => null) as { id: string } | null
    if (created?.id) {
      setSent((prev) => [...prev, { id: created.id, username: user.username, display_name: user.display_name, status: 'pending' }])
    }
    setSearchResults([])
    setSearchQuery('')
  }

  const cancelRequest = async (id: string) => {
    const token = await getToken()
    await fetch(`${apiBase}/api/v1/follows/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setSent((prev) => prev.filter((r) => r.id !== id))
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

  const updateRole = async (followId: string, role: string | null) => {
    const token = await getToken()
    await fetch(`${apiBase}/api/v1/follows/${followId}/role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    setFollowers((prev) => prev.map((f) => f.follow_id === followId ? { ...f, role } : f))
  }

  const removeFollow = async (followId: string) => {
    const token = await getToken()
    await fetch(`${apiBase}/api/v1/follows/${followId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setFollowers((prev) => prev.filter((f) => f.follow_id !== followId))
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
    <Box sx={{ maxWidth: 600, mx: 'auto', px: 2, pt: 2, pb: 10 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>フォロー管理</Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <TextField
          label="ユーザー名で検索"
          fullWidth
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button variant="contained" onClick={handleSearch}>検索</Button>
      </Box>

      {searchResults.length > 0 && (
        <List sx={{ mb: 3 }}>
          {searchResults.map((u) => (
            <ListItem key={u.id} secondaryAction={
              <Button size="small" variant="outlined" onClick={() => sendRequest(u)}>申請</Button>
            }>
              <ListItemText primary={u.display_name} secondary={`@${u.username}`} />
            </ListItem>
          ))}
        </List>
      )}

      {received.length > 0 && (
        <>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle1" sx={{ mb: 1 }}>受信した申請（{received.length}件）</Typography>
          <List sx={{ mb: 3 }}>
            {received.map((r) => (
              <ListItem key={r.id} secondaryAction={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" color="success" variant="contained" onClick={() => respondRequest(r.id, 'accepted')}>承認</Button>
                  <Button size="small" color="error" onClick={() => respondRequest(r.id, 'rejected')}>拒否</Button>
                </Box>
              }>
                <ListItemText primary={r.display_name} secondary={`@${r.username}`} />
              </ListItem>
            ))}
          </List>
        </>
      )}

      {sent.length > 0 && (
        <>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle1" sx={{ mb: 1 }}>送信した申請（{sent.length}件）</Typography>
          <List sx={{ mb: 3 }}>
            {sent.map((r) => (
              <ListItem key={r.id} secondaryAction={
                <Button
                  size="small"
                  color="error"
                  onClick={() => setConfirmDialog({
                    message: `${r.display_name}さんへのフォロー申請を取り消しますか？`,
                    onConfirm: () => cancelRequest(r.id),
                  })}
                >
                  取消
                </Button>
              }>
                <ListItemText primary={r.display_name} secondary={`@${r.username} ・ 承認待ち`} />
              </ListItem>
            ))}
          </List>
        </>
      )}

      <Divider sx={{ mb: 2 }} />
      <Typography variant="subtitle1" sx={{ mb: 1 }}>相互フォロー中</Typography>
      {followers.length === 0 && <Typography color="text.secondary">フォロワーはいません</Typography>}
      <List>
        {followers.map((f) => (
          <ListItem key={f.id} disablePadding secondaryAction={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <FormControl size="small" sx={{ minWidth: 110 }}>
                <Select
                  value={f.role ?? ''}
                  displayEmpty
                  onChange={(e) => updateRole(f.follow_id, e.target.value || null)}
                >
                  <MenuItem value=""><em>ロールなし</em></MenuItem>
                  {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </Select>
              </FormControl>
              <IconButton
                size="small"
                color="error"
                aria-label="フォロー解除"
                onClick={() => setConfirmDialog({
                  message: `${f.display_name}さんとの相互フォローを解除しますか？`,
                  onConfirm: () => removeFollow(f.follow_id),
                })}
              >
                <PersonRemoveIcon fontSize="small" />
              </IconButton>
            </Box>
          }>
            <ListItemButton
              onClick={() => navigate(`/follows/${f.id}`, { state: { displayName: f.display_name } })}
              sx={{ pr: '170px' }}
            >
              <ListItemText primary={f.display_name} secondary={`@${f.username}`} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Dialog open={!!confirmDialog} onClose={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogContentText>{confirmDialog?.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(null)}>いいえ</Button>
          <Button
            color="error"
            onClick={() => {
              confirmDialog?.onConfirm()
              setConfirmDialog(null)
            }}
          >
            はい
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </Box>
  )
}
