import { useEffect, useState, useCallback } from 'react'
import { Box, Typography, CircularProgress, Chip, Divider } from '@mui/material'
import { supabase } from '../supabase'
import ReviewCard from '../components/ReviewCard'
import { ROLES, SITUATIONS } from '../constants'

type Review = {
  id: string
  display_name: string
  restaurant_name: string
  genre: string
  rating: 'want_to_revisit' | 'average' | 'not_good'
  situation?: string
  comment?: string
  visited_at?: string
}

const apiBase = import.meta.env.VITE_API_BASE_URL as string

export default function FeedPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const [situationFilter, setSituationFilter] = useState<string | null>(null)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const params = new URLSearchParams()
    if (roleFilter) params.set('role', roleFilter)
    if (situationFilter) params.set('situation', situationFilter)
    const res = await fetch(`${apiBase}/api/v1/reviews?${params}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    setReviews(await res.json())
    setLoading(false)
  }, [roleFilter, situationFilter])

  useEffect(() => {
    fetchReviews()
    window.addEventListener('review-posted', fetchReviews)
    return () => window.removeEventListener('review-posted', fetchReviews)
  }, [fetchReviews])

  const toggleFilter = (value: string, current: string | null, setter: (v: string | null) => void) =>
    setter(current === value ? null : value)

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', px: 2, pt: 2, pb: 10 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>フィード</Typography>

      <Typography variant="caption" color="text.secondary">ロールで絞り込み</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1, mt: 0.5 }}>
        {ROLES.map((r) => (
          <Chip key={r} label={r} size="small"
            color={roleFilter === r ? 'primary' : 'default'}
            onClick={() => toggleFilter(r, roleFilter, setRoleFilter)}
          />
        ))}
      </Box>

      <Typography variant="caption" color="text.secondary">シチュエーションで絞り込み</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2, mt: 0.5 }}>
        {SITUATIONS.map((s) => (
          <Chip key={s} label={s} size="small"
            color={situationFilter === s ? 'secondary' : 'default'}
            onClick={() => toggleFilter(s, situationFilter, setSituationFilter)}
          />
        ))}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>}
      {!loading && reviews.length === 0 && <Typography color="text.secondary">レビューがまだありません</Typography>}
      {reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
    </Box>
  )
}
