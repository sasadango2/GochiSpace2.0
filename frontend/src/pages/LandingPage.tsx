import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Typography, Paper, Chip, Avatar } from '@mui/material'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser'
import PeopleIcon from '@mui/icons-material/People'
import MapIcon from '@mui/icons-material/Map'
import PlaceIcon from '@mui/icons-material/Place'
import FavoriteIcon from '@mui/icons-material/Favorite'
import { supabase } from '../supabase'

const FEATURES = [
  {
    icon: <VerifiedUserIcon />,
    title: 'サクラゼロ',
    text: '広告もやらせもなし。信頼できる人のレビューだけが集まります',
  },
  {
    icon: <PeopleIcon />,
    title: 'クローズドな環境を提供',
    text: '承認し合った家族・友人とだけ。知らない人には見えません',
  },
  {
    icon: <MapIcon />,
    title: 'マップで発見',
    text: 'みんなの「また行きたい」、「気になる」を地図で眺めて、次のお店を選べます',
  },
]

const STEPS = [
  { num: '1', title: '登録する', text: 'メールアドレスだけで無料ではじめられます' },
  { num: '2', title: '友達とつながる', text: '家族や友人と相互フォローします' },
  { num: '3', title: 'シェアする', text: 'お気に入りのお店を記録して共有します' },
]

function MockReviewCard() {
  return (
    <Box sx={{ position: 'relative', my: 1 }}>
      {/* 背面のカード */}
      <Paper
        elevation={0}
        sx={{
          position: 'absolute',
          top: 18,
          left: 24,
          right: -8,
          bottom: -14,
          borderRadius: 4,
          bgcolor: 'rgba(255, 255, 255, 0.55)',
          border: '1px solid rgba(33, 29, 25, 0.06)',
          transform: 'rotate(2.5deg)',
        }}
      />
      {/* 前面のレビューカード */}
      <Paper
        elevation={0}
        sx={{
          position: 'relative',
          p: 2.5,
          borderRadius: 4,
          border: '1px solid rgba(33, 29, 25, 0.08)',
          boxShadow: '0 16px 40px rgba(232, 101, 26, 0.18)',
          animation: 'gentleFloat 4s ease-in-out infinite',
          '@keyframes gentleFloat': {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-6px)' },
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: '#ffb27d', fontSize: 15 }}>妹</Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>ゆい</Typography>
            <Typography variant="caption" color="text.secondary">家族 ・ 昨日</Typography>
          </Box>
          <Chip label="また行きたい" color="success" size="small" />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
          <PlaceIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>麺屋 こむぎ</Typography>
          <Typography variant="caption" color="text.secondary">ラーメン</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          味噌ラーメンが本当に絶品。お父さんの好きな煮干し系もあったよ。今度みんなで行こう！
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5 }}>
          <FavoriteIcon sx={{ fontSize: 15, color: '#e8651a' }} />
          <Typography variant="caption" color="text.secondary">お母さん・たろうが「行きたい」しています</Typography>
        </Box>
      </Paper>
    </Box>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/map')
    })
  }, [navigate])

  const goSignup = () => navigate('/login', { state: { tab: 1 } })
  const goLogin = () => navigate('/login', { state: { tab: 0 } })

  return (
    <Box
      sx={{
        height: '100%',
        overflowY: 'auto',
        boxSizing: 'border-box',
        background: 'linear-gradient(170deg, #fff7f0 0%, #ffe8d6 45%, #ffd9bd 100%)',
      }}
    >
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 3, pt: 3, pb: 6 }}>
        {/* ヘッダー */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 5 }}>
          <Box
            sx={{
              width: 34, height: 34, borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #ff8a4d 0%, #e8651a 100%)',
            }}
          >
            <RestaurantIcon sx={{ color: '#fff', fontSize: 20 }} />
          </Box>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 700, flex: 1 }}>
            GochiSpace
          </Typography>
          <Button size="small" onClick={goLogin}>ログイン</Button>
        </Box>

        {/* ヒーロー */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, lineHeight: 1.35, mb: 1.5, letterSpacing: '-0.01em' }}
          >
            知らない誰かより、
            <Box component="span" sx={{ color: 'primary.main' }}>
              身近な人の「美味しい」
            </Box>
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
            GochiSpace は、家族や友人とだけお店のレビューを共有するサービス。
            サクラや広告に惑わされず、好みを知っている人のおすすめから次の一軒を選べます。
          </Typography>
        </Box>

        {/* レビューカードのモック */}
        <Box sx={{ mb: 5 }}>
          <MockReviewCard />
        </Box>

        {/* CTA */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 6 }}>
          <Button
            variant="contained"
            size="large"
            onClick={goSignup}
            sx={{
              py: 1.5,
              fontSize: 16,
              fontWeight: 700,
              borderRadius: 3,
              boxShadow: '0 8px 24px rgba(232, 101, 26, 0.35)',
            }}
          >
            はじめる
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
            メールアドレスだけで登録できます
          </Typography>
        </Box>

        {/* 特徴 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 6 }}>
          {FEATURES.map((f) => (
            <Paper
              key={f.title}
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                border: '1px solid rgba(33, 29, 25, 0.08)',
                display: 'flex',
                gap: 1.75,
                alignItems: 'flex-start',
                bgcolor: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              <Box
                sx={{
                  width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: 'rgba(232, 101, 26, 0.12)', color: 'primary.main',
                }}
              >
                {f.icon}
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>{f.title}</Typography>
                <Typography variant="body2" color="text.secondary">{f.text}</Typography>
              </Box>
            </Paper>
          ))}
        </Box>

        {/* 使い方 */}
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, textAlign: 'center' }}>
          はじめかたはかんたん
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 6 }}>
          {STEPS.map((s) => (
            <Box key={s.num} sx={{ display: 'flex', gap: 1.75, alignItems: 'flex-start' }}>
              <Box
                sx={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, #ff8a4d 0%, #e8651a 100%)',
                  color: '#fff', fontWeight: 700, fontSize: 14,
                }}
              >
                {s.num}
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{s.title}</Typography>
                <Typography variant="body2" color="text.secondary">{s.text}</Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {/* 最終CTA */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 4,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #ff8a4d 0%, #e8651a 100%)',
            boxShadow: '0 12px 32px rgba(232, 101, 26, 0.35)',
          }}
        >
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 0.5 }}>
            次の「美味しい」を、大切な人と。
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mb: 2 }}>
            完全無料ではじめられます。
          </Typography>
          <Button
            fullWidth
            size="large"
            onClick={goSignup}
            sx={{
              bgcolor: '#fff',
              color: 'primary.main',
              fontWeight: 700,
              borderRadius: 3,
              py: 1.25,
              '&:hover': { bgcolor: '#fff7f0' },
            }}
          >
            はじめる
          </Button>
          <Button
            fullWidth
            onClick={goLogin}
            sx={{ color: 'rgba(255,255,255,0.9)', mt: 1 }}
          >
            アカウントをお持ちの方はログイン
          </Button>
        </Paper>
      </Box>
    </Box>
  )
}
