import { useState } from 'react'
import { Card, CardContent, Typography, Chip, Box, Modal } from '@mui/material'

type Review = {
  id: string
  display_name: string
  restaurant_name: string
  genre: string
  rating: 'want_to_revisit' | 'average' | 'not_good'
  comment?: string
  visited_at?: string
  photo_urls?: string[] | null
}

const ratingLabel: Record<Review['rating'], { label: string; color: 'success' | 'default' | 'error' }> = {
  want_to_revisit: { label: 'また行きたい', color: 'success' },
  average: { label: 'ふつう', color: 'default' },
  not_good: { label: 'イマイチ', color: 'error' },
}

export default function ReviewCard({ review }: { review: Review }) {
  const { label, color } = ratingLabel[review.rating]
  const photos = review.photo_urls ?? []
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  return (
    <>
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

          {photos.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5, overflowX: 'auto' }}>
              {photos.map((src, i) => (
                <Box
                  key={i}
                  component="img"
                  src={src}
                  onClick={() => setLightboxSrc(src)}
                  sx={{
                    width: 80, height: 80, objectFit: 'cover',
                    borderRadius: 1, flexShrink: 0, cursor: 'pointer',
                  }}
                />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      <Modal open={!!lightboxSrc} onClose={() => setLightboxSrc(null)}>
        <Box
          onClick={() => setLightboxSrc(null)}
          sx={{
            position: 'fixed', inset: 0,
            bgcolor: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {lightboxSrc && (
            <Box
              component="img"
              src={lightboxSrc}
              sx={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 1 }}
            />
          )}
        </Box>
      </Modal>
    </>
  )
}
