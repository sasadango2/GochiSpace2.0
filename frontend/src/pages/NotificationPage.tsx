import { useEffect, useState, useCallback } from 'react'
import {
  Box, Typography, Chip, Button, CircularProgress, Card, CardContent,
} from '@mui/material'
import { supabase } from '../supabase'

const API_BASE = import.meta.env.VITE_API_BASE_URL as string

type Notification = {
  type: 'follow_request' | 'wanna_go_request'
  id: string
  status: string
  created_at: string
  from_display_name: string
  restaurant_name: string | null
  message: string | null
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? ''
}

export default function NotificationPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    const token = await getToken()
    const res = await fetch(`${API_BASE}/api/v1/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    setNotifications(await res.json())
    setLoading(false)
    window.dispatchEvent(new CustomEvent('notifications-updated'))
  }, [])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const respondFollow = async (id: string, status: 'accepted' | 'rejected') => {
    setResponding(id)
    const token = await getToken()
    await fetch(`${API_BASE}/api/v1/follows/requests/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setResponding(null)
    fetchNotifications()
  }

  const respondWannaGo = async (id: string, status: 'accepted' | 'declined') => {
    setResponding(id)
    const token = await getToken()
    await fetch(`${API_BASE}/api/v1/wanna-go/requests/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setResponding(null)
    fetchNotifications()
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <Box sx={{ maxWidth: 600, mx: 'auto', px: 2, pt: 2, pb: 10 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>通知</Typography>

        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>}
        {!loading && notifications.length === 0 && (
          <Typography color="text.secondary">通知はありません</Typography>
        )}

        {notifications.map((n) => (
          <Card key={`${n.type}-${n.id}`} sx={{ mb: 1.5 }}>
            <CardContent sx={{ pb: '12px !important' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Chip
                    label={n.type === 'follow_request' ? 'フォロー申請' : '行きたいリクエスト'}
                    size="small"
                    color={n.type === 'follow_request' ? 'primary' : 'secondary'}
                    sx={{ mb: 0.5 }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {n.type === 'wanna_go_request'
                      ? `${n.from_display_name} から「${n.restaurant_name}」に誘われました`
                      : `${n.from_display_name} からフォロー申請が届いています`
                    }
                  </Typography>
                  {n.message && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                      {n.message}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {n.created_at.slice(0, 10)}
                  </Typography>
                </Box>
                {n.status !== 'pending' && (
                  <Chip
                    label={n.status === 'accepted' ? '承認済み' : '辞退済み'}
                    size="small"
                    variant="outlined"
                    color={n.status === 'accepted' ? 'success' : 'default'}
                  />
                )}
              </Box>

              {n.status === 'pending' && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={responding === n.id}
                    onClick={() =>
                      n.type === 'follow_request'
                        ? respondFollow(n.id, 'accepted')
                        : respondWannaGo(n.id, 'accepted')
                    }
                  >
                    {responding === n.id ? <CircularProgress size={16} color="inherit" /> : '承認'}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={responding === n.id}
                    onClick={() =>
                      n.type === 'follow_request'
                        ? respondFollow(n.id, 'rejected')
                        : respondWannaGo(n.id, 'declined')
                    }
                  >
                    辞退
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  )
}
