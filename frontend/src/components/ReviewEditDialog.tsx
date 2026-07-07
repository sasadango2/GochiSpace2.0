import { useEffect, useRef, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, ToggleButtonGroup, ToggleButton,
  Typography, Box, CircularProgress, IconButton,
  useTheme, useMediaQuery,
} from '@mui/material'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import CloseIcon from '@mui/icons-material/Close'
import { supabase } from '../supabase'
import { uploadImages } from '../utils/uploadImages'
import { SITUATIONS } from '../constants'

const API_BASE = import.meta.env.VITE_API_BASE_URL as string
const MAX_IMAGES = 3

type RatingType = 'want_to_revisit' | 'average' | 'not_good'

export type EditableReview = {
  id: string
  restaurant_name: string
  rating: RatingType
  situation?: string
  comment?: string
  visited_at?: string
  photo_urls?: string[] | null
}

type Props = {
  open: boolean
  review: EditableReview
  onClose: () => void
  onSaved: () => void
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

export default function ReviewEditDialog({ open, review, onClose, onSaved }: Props) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [rating, setRating] = useState<RatingType>(review.rating)
  const [situation, setSituation] = useState<string | null>(review.situation ?? null)
  const [comment, setComment] = useState(review.comment ?? '')
  const [visitedAt, setVisitedAt] = useState(review.visited_at?.slice(0, 10) ?? '')
  const [existingUrls, setExistingUrls] = useState<string[]>(review.photo_urls ?? [])
  const [newImages, setNewImages] = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setRating(review.rating)
    setSituation(review.situation ?? null)
    setComment(review.comment ?? '')
    setVisitedAt(review.visited_at?.slice(0, 10) ?? '')
    setExistingUrls(review.photo_urls ?? [])
    setNewImages([])
    setNewPreviews([])
  }, [open, review])

  const totalImages = existingUrls.length + newImages.length

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const added = files.slice(0, MAX_IMAGES - totalImages)
    setNewImages((prev) => [...prev, ...added])
    setNewPreviews((prev) => [...prev, ...added.map((f) => URL.createObjectURL(f))])
    e.target.value = ''
  }

  const removeNewImage = (index: number) => {
    URL.revokeObjectURL(newPreviews[index])
    setNewImages((prev) => prev.filter((_, i) => i !== index))
    setNewPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const canSubmit = !!(rating && situation && visitedAt)

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    const uploaded = user && newImages.length > 0
      ? await uploadImages(user.id, newImages)
      : []

    const token = await getToken()
    await fetch(`${API_BASE}/api/v1/reviews/${review.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating,
        situation,
        comment,
        visitedAt,
        photoUrls: [...existingUrls, ...uploaded],
      }),
    })
    setSubmitting(false)
    handleClose()
    onSaved()
  }

  const handleClose = () => {
    newPreviews.forEach((url) => URL.revokeObjectURL(url))
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
      <DialogTitle>{`「${review.restaurant_name}」のレビューを編集`}</DialogTitle>

      <DialogContent>
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

          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              写真（任意・最大{MAX_IMAGES}枚）
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {existingUrls.map((src, i) => (
                <Box key={src} sx={{ position: 'relative', width: 80, height: 80 }}>
                  <Box
                    component="img"
                    src={src}
                    sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1 }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => setExistingUrls((prev) => prev.filter((_, pi) => pi !== i))}
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
              {newPreviews.map((src, i) => (
                <Box key={src} sx={{ position: 'relative', width: 80, height: 80 }}>
                  <Box
                    component="img"
                    src={src}
                    sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1 }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => removeNewImage(i)}
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
              {totalImages < MAX_IMAGES && (
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
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>キャンセル</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? <CircularProgress size={20} color="inherit" /> : '保存する'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
