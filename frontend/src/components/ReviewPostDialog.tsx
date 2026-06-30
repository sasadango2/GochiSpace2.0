import { useRef, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, List, ListItemButton, ListItemText,
  ToggleButtonGroup, ToggleButton, Typography, Box, CircularProgress,
  IconButton, useTheme, useMediaQuery,
} from '@mui/material'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import CloseIcon from '@mui/icons-material/Close'
import { supabase } from '../supabase'
import { compressImage } from '../utils/compressImage'
import { SITUATIONS, GENRES } from '../constants'

const API_BASE = import.meta.env.VITE_API_BASE_URL as string
const MAX_IMAGES = 3

type Restaurant = {
  id: string
  name: string
  address: string
  genre: string | null
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

async function uploadImages(userId: string, files: File[]): Promise<string[]> {
  const urls: string[] = []
  for (let i = 0; i < files.length; i++) {
    const compressed = await compressImage(files[i])
    const ext = files[i].name.split('.').pop() ?? 'jpg'
    const path = `${userId}/${Date.now()}-${i}.${ext}`
    const { error } = await supabase.storage.from('review-photos').upload(path, compressed)
    if (!error) {
      const { data } = supabase.storage.from('review-photos').getPublicUrl(path)
      urls.push(data.publicUrl)
    }
  }
  return urls
}

export default function ReviewPostDialog({ open, onClose, onSubmitted }: Props) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<1 | 2>(1)
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<Restaurant[]>([])
  const [selected, setSelected] = useState<Restaurant | null>(null)
  const [rating, setRating] = useState<RatingType | null>(null)
  const [situation, setSituation] = useState<string | null>(null)
  const [genre, setGenre] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [visitedAt, setVisitedAt] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
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
    setGenre(r.genre ?? null)
    setStep(2)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const remaining = MAX_IMAGES - images.length
    const added = files.slice(0, remaining)
    setImages((prev) => [...prev, ...added])
    setPreviews((prev) => [...prev, ...added.map((f) => URL.createObjectURL(f))])
    e.target.value = ''
  }

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index])
    setImages((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const canSubmit = !!(rating && genre && situation && visitedAt)

  const handleSubmit = async () => {
    if (!selected || !canSubmit) return
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    const photoUrls = user && images.length > 0
      ? await uploadImages(user.id, images)
      : []

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
        genre: genre || undefined,
        photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
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
    setGenre(null)
    setComment('')
    setVisitedAt('')
    previews.forEach((url) => URL.revokeObjectURL(url))
    setImages([])
    setPreviews([])
    onClose()
  }

  return (
    <Dialog open={open} onClose={resetAndClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
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
              <Typography variant="body2" sx={{ mb: 1 }}>ジャンル *</Typography>
              <ToggleButtonGroup
                value={genre}
                exclusive
                onChange={(_, v: string | null) => setGenre(v)}
                sx={{ flexWrap: 'wrap', gap: 0.5 }}
              >
                {GENRES.map((g) => (
                  <ToggleButton key={g} value={g} size="small">{g}</ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>シチュエーション *</Typography>
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
              label="訪問日 *"
              type="date"
              value={visitedAt}
              onChange={(e) => setVisitedAt(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />

            {/* 画像アップロード */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                写真（任意・最大{MAX_IMAGES}枚）
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {previews.map((src, i) => (
                  <Box key={i} sx={{ position: 'relative', width: 80, height: 80 }}>
                    <Box
                      component="img"
                      src={src}
                      sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1 }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => removeImage(i)}
                      sx={{
                        position: 'absolute', top: -8, right: -8,
                        bgcolor: 'background.paper', p: 0.25,
                        border: '1px solid', borderColor: 'divider',
                      }}
                    >
                      <CloseIcon fontSize="inherit" />
                    </IconButton>
                  </Box>
                ))}
                {images.length < MAX_IMAGES && (
                  <Box
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      width: 80, height: 80, border: '1px dashed',
                      borderColor: 'divider', borderRadius: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: 'text.secondary',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <AddPhotoAlternateIcon />
                  </Box>
                )}
              </Box>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleImageChange}
              />
            </Box>
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
            disabled={!canSubmit || submitting}
          >
            {submitting ? <CircularProgress size={20} color="inherit" /> : '投稿する'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
