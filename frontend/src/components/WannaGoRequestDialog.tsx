import { useState, useEffect } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, CircularProgress,
  Radio, RadioGroup, FormControlLabel,
  useTheme, useMediaQuery,
} from '@mui/material'
import { supabase } from '../supabase'

const API_BASE = import.meta.env.VITE_API_BASE_URL as string

type MutualFollow = { id: string; display_name: string; username: string }

type Props = {
  open: boolean
  restaurantId: string
  restaurantName: string
  onClose: () => void
  onSent: () => void
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? ''
}

export default function WannaGoRequestDialog({ open, restaurantId, restaurantName, onClose, onSent }: Props) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [follows, setFollows] = useState<MutualFollow[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) return
    const fetchFollows = async () => {
      const token = await getToken()
      const res = await fetch(`${API_BASE}/api/v1/follows`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setFollows(await res.json())
    }
    fetchFollows()
  }, [open])

  const handleSend = async () => {
    if (!selectedUserId) return
    setSending(true)
    const token = await getToken()
    await fetch(`${API_BASE}/api/v1/wanna-go/requests`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toUserId: selectedUserId,
        restaurantId,
        message: message || undefined,
      }),
    })
    setSending(false)
    resetAndClose()
    onSent()
  }

  const resetAndClose = () => {
    setSelectedUserId(null)
    setMessage('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={resetAndClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
      <DialogTitle>「{restaurantName}」に誘う</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Typography variant="body2" color="text.secondary">誘う相手を選んでください</Typography>
          {follows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              相互フォロー中のユーザーがいません
            </Typography>
          ) : (
            <RadioGroup value={selectedUserId ?? ''} onChange={(e) => setSelectedUserId(e.target.value)}>
              {follows.map((f) => (
                <FormControlLabel
                  key={f.id}
                  value={f.id}
                  control={<Radio size="small" />}
                  label={f.display_name}
                />
              ))}
            </RadioGroup>
          )}
          <TextField
            label="メッセージ（任意）"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            multiline
            rows={2}
            fullWidth
            placeholder="一緒に行きませんか？"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={resetAndClose}>キャンセル</Button>
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={!selectedUserId || sending}
        >
          {sending ? <CircularProgress size={20} color="inherit" /> : '送る'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
