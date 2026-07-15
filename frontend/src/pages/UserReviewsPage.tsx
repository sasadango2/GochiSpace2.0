import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import {
  Box, Typography, CircularProgress, Chip, Card, CardContent,
  IconButton, Modal, Avatar,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { supabase } from '../supabase'
import { normalizeGenre } from '../constants'

type UserProfile = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  genres: { id: number; name: string }[]
  review_count: number
}

type UserReview = {
  id: string
  restaurant_name: string
  genre: string | null
  rating: 'want_to_revisit' | 'average' | 'not_good'
  situation?: string
  comment?: string
  visited_at?: string
  photo_urls?: string[] | null
}

const RATING_LABEL: Record<UserReview['rating'], { text: string; color: 'success' | 'default' | 'error' }> = {
  want_to_revisit: { text: 'また行きたい', color: 'success' },
  average:         { text: '普通',         color: 'default' },
  not_good:        { text: '好みじゃなかった', color: 'error' },
}

const apiBase = import.meta.env.VITE_API_BASE_URL as string

export default function UserReviewsPage() {
  const { userId } = useParams<{ userId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const displayName = (location.state as { displayName?: string } | null)?.displayName ?? ''

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [reviews, setReviews] = useState<UserReview[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const headers = { Authorization: `Bearer ${session?.access_token}` }
      const [profileRes, reviewsRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/users/${userId}`, { headers }),
        fetch(`${apiBase}/api/v1/reviews/user/${userId}`, { headers }),
      ])
      if (reviewsRes.status === 403) {
        setForbidden(true)
      } else {
        if (profileRes.ok) setProfile(await profileRes.json())
        setReviews(await reviewsRes.json())
      }
      setLoading(false)
    }
    fetchUserData()
  }, [userId])

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <Box sx={{ maxWidth: 600, mx: 'auto', px: 2, pt: 2, pb: 10 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <IconButton size="small" onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6">
            {(profile?.display_name ?? displayName) ? `${profile?.display_name ?? displayName}さんのレビュー` : 'レビュー一覧'}
          </Typography>
        </Box>

        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>}

        {!loading && !forbidden && profile && (
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar src={profile.avatar_url ?? undefined} sx={{ width: 56, height: 56 }}>
                  {profile.display_name.charAt(0)}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} noWrap>
                    {profile.display_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    @{profile.username} ・ レビュー {profile.review_count}件
                  </Typography>
                </Box>
              </Box>
              {profile.genres.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5, flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                    好きなジャンル:
                  </Typography>
                  {profile.genres.map((g) => (
                    <Chip key={g.id} label={g.name} size="small" variant="outlined" color="primary" />
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        )}
        {!loading && forbidden && (
          <Typography color="text.secondary">相互フォローのユーザーのみ閲覧できます</Typography>
        )}
        {!loading && !forbidden && reviews.length === 0 && (
          <Typography color="text.secondary">レビューがまだありません</Typography>
        )}

        {reviews.map((rv) => {
          const info = RATING_LABEL[rv.rating]
          const genre = normalizeGenre(rv.genre)
          return (
            <Card key={rv.id} sx={{ mb: 1.5 }}>
              <CardContent sx={{ pb: '12px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} noWrap>
                      {rv.restaurant_name}
                    </Typography>
                    {genre && (
                      <Typography variant="caption" color="text.secondary">{genre}</Typography>
                    )}
                  </Box>
                  {rv.visited_at && (
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                      {rv.visited_at.slice(0, 10)}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, mb: 0.75, flexWrap: 'wrap' }}>
                  <Chip label={info.text} color={info.color} size="small" />
                  {rv.situation && <Chip label={rv.situation} size="small" variant="outlined" />}
                </Box>
                {rv.comment && (
                  <Typography variant="body2" color="text.secondary">{rv.comment}</Typography>
                )}
                {rv.photo_urls && rv.photo_urls.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1, overflowX: 'auto' }}>
                    {rv.photo_urls.map((src) => (
                      <Box
                        key={src}
                        component="img"
                        src={src}
                        onClick={() => setLightboxSrc(src)}
                        sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1, flexShrink: 0, cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          )
        })}
      </Box>

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
    </Box>
  )
}
