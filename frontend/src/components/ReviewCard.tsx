import { Card, CardContent, Typography, Chip } from '@mui/material'

type Review = {
  id: string
  display_name: string
  restaurant_name: string
  genre: string
  rating: 'want_to_revisit' | 'average' | 'not_good'
  comment?: string
  visited_at?: string
}

const ratingLabel: Record<Review['rating'], { label: string; color: 'success' | 'default' | 'error' }> = {
  want_to_revisit: { label: 'また行きたい', color: 'success' },
  average: { label: 'ふつう', color: 'default' },
  not_good: { label: 'イマイチ', color: 'error' },
}

export default function ReviewCard({ review }: { review: Review }) {
  const { label, color } = ratingLabel[review.rating]

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary">
          {review.display_name}
        </Typography>
        <Typography variant="h6">{review.restaurant_name}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {review.genre}
        </Typography>
        <Chip label={label} color={color} size="small" sx={{ mb: 1 }} />
        {review.comment && <Typography variant="body2">{review.comment}</Typography>}
        {review.visited_at && (
          <Typography variant="caption" color="text.secondary">
            {review.visited_at}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}
