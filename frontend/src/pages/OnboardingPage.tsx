import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Button, Container, TextField, Typography, Alert, Chip,
  Stepper, Step, StepLabel, List, ListItem, ListItemText,
} from '@mui/material'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import Diversity3Icon from '@mui/icons-material/Diversity3'
import MapIcon from '@mui/icons-material/Map'
import InsightsIcon from '@mui/icons-material/Insights'
import { supabase } from '../supabase'

const API_BASE = import.meta.env.VITE_API_BASE_URL as string
const STEPS = ['プロフィール', '好み', '友達']

const SLIDES = [
  {
    icon: <RestaurantMenuIcon sx={{ fontSize: 48 }} />,
    title: 'GochiSpaceへようこそ',
    body: '信頼できる人のレビューだけが集まる、飲食店レビューサービスです。匿名の口コミもサクラもありません。',
  },
  {
    icon: <Diversity3Icon sx={{ fontSize: 48 }} />,
    title: '相互フォローでつながる',
    body: 'レビューを見られるのは、お互いにフォローし合った相手だけ。家族や友人との小さな輪の中で共有します。',
  },
  {
    icon: <MapIcon sx={{ fontSize: 48 }} />,
    title: 'マップで見つける',
    body: '友達のレビューや行きたい店が地図に集まります。次のお店選びは、信頼できるおすすめから。',
  },
  {
    icon: <InsightsIcon sx={{ fontSize: 48 }} />,
    title: '好みがわかるから、選べる',
    body: '評価の傾向やよく行くジャンルがプロフィールに表示されるので、その人の「また行きたい」がどれだけ当てになるかが分かります。',
  },
]

function WalkthroughStep({ onNext }: { onNext: () => void }) {
  const [index, setIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  const scrollToSlide = (i: number) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ left: el.clientWidth * i, behavior: 'smooth' })
  }

  const isLast = index === SLIDES.length - 1

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 4 }}>
      <Box
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {SLIDES.map((slide) => (
          <Box
            key={slide.title}
            sx={{ flex: '0 0 100%', scrollSnapAlign: 'start', textAlign: 'center', px: 2, py: 3 }}
          >
            <Box
              sx={{
                width: 104, height: 104, mx: 'auto', mb: 3, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'primary.main',
                background: 'linear-gradient(180deg, #ffffff 0%, #fdf1e7 100%)',
                boxShadow: '0 12px 28px rgba(33, 29, 25, 0.09), inset 0 1.5px 0 rgba(255, 255, 255, 0.9)',
              }}
            >
              {slide.icon}
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5 }}>{slide.title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320, mx: 'auto' }}>
              {slide.body}
            </Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
        {SLIDES.map((slide, i) => (
          <Box
            key={slide.title}
            onClick={() => scrollToSlide(i)}
            sx={{
              width: i === index ? 22 : 8, height: 8, borderRadius: 999,
              bgcolor: i === index ? 'primary.main' : 'grey.300',
              transition: 'all 0.2s ease', cursor: 'pointer',
            }}
          />
        ))}
      </Box>
      <Button
        variant="contained"
        size="large"
        onClick={() => (isLast ? onNext() : scrollToSlide(index + 1))}
      >
        {isLast ? 'はじめる' : '次へ'}
      </Button>
      {!isLast && <Button color="inherit" onClick={onNext}>スキップ</Button>}
    </Box>
  )
}

type Genre = { id: number; name: string }
type SearchUser = { id: string; username: string; display_name: string }

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? ''
}

function ProfileStep({ onNext }: { onNext: () => void }) {
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
    const token = await getToken()
    const res = await fetch(`${API_BASE}/api/v1/users/me`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), display_name: displayName.trim() }),
    })
    if (!res.ok) {
      const body = await res.json() as { error: { message: string } }
      setError(body.error?.message ?? 'エラーが発生しました')
      setLoading(false)
      return
    }
    onNext()
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>プロフィール設定</Typography>
      <Typography variant="body2" color="text.secondary">
        ユーザー名は友達があなたを検索するときに使われます。
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
      <Button variant="contained" size="large" onClick={handleSubmit} disabled={loading}>
        次へ
      </Button>
    </Box>
  )
}

function GenresStep({ onNext }: { onNext: () => void }) {
  const [genres, setGenres] = useState<Genre[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchGenres = async () => {
      const token = await getToken()
      const res = await fetch(`${API_BASE}/api/v1/genres`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setGenres(await res.json())
    }
    fetchGenres()
  }, [])

  const toggleGenre = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : prev.length < 3 ? [...prev, id] : prev
    )
  }

  const handleSave = async () => {
    setSaving(true)
    const token = await getToken()
    await fetch(`${API_BASE}/api/v1/users/me/genres`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ genreIds: selected }),
    })
    onNext()
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>好きなジャンルを教えてください</Typography>
      <Typography variant="body2" color="text.secondary">
        最大3つまで選べます。あなたの好みが友達に伝わりやすくなります。あとからプロフィール画面で変更できます。
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {genres.map((g) => (
          <Chip
            key={g.id}
            label={g.name}
            onClick={() => toggleGenre(g.id)}
            color={selected.includes(g.id) ? 'primary' : 'default'}
          />
        ))}
      </Box>
      <Button
        variant="contained"
        size="large"
        onClick={handleSave}
        disabled={selected.length === 0 || saving}
        sx={{ mt: 1 }}
      >
        次へ
      </Button>
      <Button color="inherit" onClick={onNext}>スキップ</Button>
    </Box>
  )
}

function FollowStep({ onFinish }: { onFinish: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchUser[]>([])
  const [sentIds, setSentIds] = useState<string[]>([])
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    const token = await getToken()
    const res = await fetch(`${API_BASE}/api/v1/users/search?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    setResults(await res.json())
    setSearched(true)
  }

  const sendRequest = async (toUserId: string) => {
    const token = await getToken()
    await fetch(`${API_BASE}/api/v1/follows/requests`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId }),
    })
    setSentIds((prev) => [...prev, toUserId])
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>友達を探しましょう</Typography>
      <Typography variant="body2" color="text.secondary">
        レビューは相互フォローが成立した相手とだけ共有されます。すでに使っている友達がいれば、ユーザー名で検索してフォロー申請を送りましょう。
      </Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          label="ユーザー名で検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          fullWidth
          size="small"
        />
        <Button variant="contained" onClick={handleSearch}>検索</Button>
      </Box>
      <List dense disablePadding>
        {results.map((u) => (
          <ListItem key={u.id} divider secondaryAction={
            sentIds.includes(u.id)
              ? <Chip label="申請済み" size="small" color="success" />
              : <Button size="small" variant="outlined" onClick={() => sendRequest(u.id)}>申請</Button>
          }>
            <ListItemText primary={u.display_name} secondary={`@${u.username}`} />
          </ListItem>
        ))}
        {searched && results.length === 0 && (
          <Typography variant="body2" color="text.secondary">見つかりませんでした</Typography>
        )}
      </List>
      <Button variant="contained" size="large" onClick={onFinish} sx={{ mt: 1 }}>
        はじめる
      </Button>
      {sentIds.length === 0 && (
        <Button color="inherit" onClick={onFinish}>あとで探す</Button>
      )}
    </Box>
  )
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  // 0 = ウォークスルー（サービス紹介）、1〜3 = 設定ステップ
  const [activeStep, setActiveStep] = useState(0)

  const goNext = () => setActiveStep((prev) => prev + 1)
  const finish = () => navigate('/map')

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, mb: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {activeStep > 0 && (
          <Stepper activeStep={activeStep - 1} alternativeLabel>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}
        {activeStep === 0 && <WalkthroughStep onNext={goNext} />}
        {activeStep === 1 && <ProfileStep onNext={goNext} />}
        {activeStep === 2 && <GenresStep onNext={goNext} />}
        {activeStep === 3 && <FollowStep onFinish={finish} />}
      </Box>
    </Container>
  )
}
