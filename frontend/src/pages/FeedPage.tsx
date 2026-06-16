import { useEffect, useState } from 'react'
import { Box, Typography, CircularProgress } from '@mui/material'
import { supabase } from '../supabase'
import ReviewCard from '../components/ReviewCard'

type Review = {
  id: string
  display_name: string
  restaurant_name: string
  genre: string
  rating: 'want_to_revisit' | 'average' | 'not_good'
  comment?: string
  visited_at?: string
}

const apiBase = import.meta.env.VITE_API_BASE_URL as string

export default function FeedPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReviews = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${apiBase}/api/v1/reviews`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      setReviews(data)
      setLoading(false)
    }
    fetchReviews()
  }, [])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', px: 2, pt: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>フィード</Typography>
      {reviews.length === 0 && <Typography color="text.secondary">レビューがまだありません</Typography>}
      {reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
    </Box>
  )
}
