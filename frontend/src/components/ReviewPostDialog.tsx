import { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, List, ListItemButton, ListItemText,
  ToggleButtonGroup, ToggleButton, Typography, Box, CircularProgress,
} from '@mui/material'
import { supabase } from '../supabase'
import { SITUATIONS } from '../constants'

const API_BASE = import.meta.env.VITE_API_BASE_URL as string

type Restaurant = {
  id: string
  name: string
  address: string
  genre: string
}

type RatingType = 'want_to_revisit' | 'average' | 'not_good'

type Props = {
  open: boolean
  onClose: () => void
  onSubmitted: () => void
}

const RATINGS: { value: RatingType; label: string }[] = [
  { value: 'want_to_revisit', label: 'また行きたい' },
  { value: 'average', label: '普通' },
  { value: 'not_good', label: '好みじゃなかった' },
]

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? ''
}

export default function ReviewPostDialog({ open, onClose, onSubmitted }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<Restaurant[]>([])
  const [selected, setSelected] = useState<Restaurant | null>(null)
  const [rating, setRating] = useState<RatingType | null>(null)
  const [situation, setSituation] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [visitedAt, setVisitedAt] = useState('')
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSearch = async () => {
    if (!keyword.trim()) return
    setSearching(true)
    const token = await getToken()
    const res = await fetch(
      `${API_BASE}/api/v1/restaurants/search?q=${encodeURIComponent(keyword)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    setResults((await res.json()) as Restaurant[])
    setSearching(false)
  }

  const handleSelect = (r: Restaurant) => {
    setSelected(r)
    setStep(2)
  }

  const handleSubmit = async () => {
    if (!selected || !rating) return
    setSubmitting(true)
    const token = await getToken()
    await fetch(`${API_BASE}/api/v1/reviews`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: selected.id,
        rating,
        situation: situation || undefined,
        comment: comment || undefined,
        visitedAt: visitedAt || undefined,
      }),
    })
    setSubmitting(false)
    resetAndClose()
    onSubmitted()
  }

  const resetAndClose = () => {
    setStep(1)
    setKeyword('')
    setResults([])
    setSelected(null)
    setRating(null)
    setSituation(null)
    setComment('')
    setVisitedAt('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={resetAndClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {step === 1 ? 'お店を選ぶ' : `「${selected?.name}」のレビュー`}
      </DialogTitle>

      <DialogContent>
        {step === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="店舗名・キーワード"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                fullWidth
                size="small"
              />
              <Button variant="contained" onClick={handleSearch} disabled={searching} sx={{ minWidth: 80 }}>
                {searching ? <CircularProgress size={20} color="inherit" /> : '検索'}
              </Button>
            </Box>
            <List dense disablePadding>
              {results.map((r) => (
                <ListItemButton key={r.id} onClick={() => handleSelect(r)} divider>
                  <ListItemText
                    primary={r.name}
                    secondary={`${r.genre}　${r.address}`}
                  />
                </ListItemButton>
              ))}
              {results.length === 0 && keyword && !searching && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                  検索結果がありません
                </Typography>
              )}
            </List>
          </Box>
        )}

        {step === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>評価 *</Typography>
              <ToggleButtonGroup
                value={rating}
                exclusive
                onChange={(_, v: RatingType | null) => v && setRating(v)}
                fullWidth
              >
                {RATINGS.map((r) => (
                  <ToggleButton key={r.value} value={r.value} size="small">
                    {r.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>シチュエーション（任意）</Typography>
              <ToggleButtonGroup
                value={situation}
                exclusive
                onChange={(_, v: string | null) => setSituation(v)}
                sx={{ flexWrap: 'wrap', gap: 0.5 }}
              >
                {SITUATIONS.map((s) => (
                  <ToggleButton key={s} value={s} size="small">{s}</ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
            <TextField
              label="コメント（任意）"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label="訪問日（任意）"
              type="date"
              value={visitedAt}
              onChange={(e) => setVisitedAt(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {step === 2 && <Button onClick={() => setStep(1)}>戻る</Button>}
        <Button onClick={resetAndClose}>キャンセル</Button>
        {step === 2 && (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!rating || submitting}
          >
            {submitting ? <CircularProgress size={20} color="inherit" /> : '投稿する'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
