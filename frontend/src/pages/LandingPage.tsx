import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Typography, Paper } from '@mui/material'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser'
import PeopleIcon from '@mui/icons-material/People'
import MapIcon from '@mui/icons-material/Map'
import { supabase } from '../supabase'

const FEATURES = [
  { icon: <VerifiedUserIcon color="primary" />, title: 'サクラのいないレビュー', text: '知らない誰かではなく、信頼できる人のレビューだけが集まります' },
  { icon: <PeopleIcon color="primary" />, title: '相互フォローで共有', text: 'お互いに承認し合った相手とだけレビューを共有するクローズドな設計です' },
  { icon: <MapIcon color="primary" />, title: 'マップで発見', text: 'みんなのおすすめを地図上で見ながら、次に行くお店を選べます' },
]

export default function LandingPage() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/map')
    })
  }, [navigate])

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
      <Box sx={{ width: '100%', maxWidth: 440, m: 'auto' }}>
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
          <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
            GochiSpace
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            美味しい発見を、信頼できる人とシェア
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 4,
            border: '1px solid rgba(33, 29, 25, 0.08)',
            boxShadow: '0 4px 24px rgba(33, 29, 25, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {FEATURES.map((f) => (
            <Box key={f.title} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              {f.icon}
              <Box>
                <Typography variant="subtitle2">{f.title}</Typography>
                <Typography variant="body2" color="text.secondary">{f.text}</Typography>
              </Box>
            </Box>
          ))}
        </Paper>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={() => navigate('/login', { state: { tab: 1 } })}
          >
            無料ではじめる
          </Button>
          <Button
            size="large"
            fullWidth
            onClick={() => navigate('/login', { state: { tab: 0 } })}
          >
            アカウントをお持ちの方はログイン
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
