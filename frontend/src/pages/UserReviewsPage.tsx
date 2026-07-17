import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import {
  Box, Typography, CircularProgress, Chip, Card, CardContent,
  IconButton, Modal, Avatar,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { supabase } from '../supabase'
import { normalizeGenre } from '../constants'

type RatingCounts = { want_to_revisit: number; average: number; not_good: number }

type UserProfile = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  genres: { id: number; name: string }[]
  review_count: number
  rating_distribution?: RatingCounts
  genre_distribution?: { genre: string; count: number }[]
  situation_distribution?: { situation: string; count: number }[]
  last_reviewed_at?: string | null
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

const RATING_ORDER = ['want_to_revisit', 'average', 'not_good'] as const
const RATING_BAR_COLORS: Record<UserReview['rating'], string> = {
  want_to_revisit: 'success.main',
  average: 'grey.400',
  not_good: 'error.main',
}
// 件数が少ないうちの割合表示は統計として誤解を生むため、閾値未満は生件数で見せる
const MIN_METER_COUNT = 10

const apiBase = import.meta.env.VITE_API_BASE_URL as string

function formatRelativeTime(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return '今日'
  if (days === 1) return '昨日'
  if (days < 30) return `${days}日前`
  if (days < 365) return `${Math.floor(days / 30)}か月前`
  return `${Math.floor(days / 365)}年前`
}

// DBのジャンルは英語のPlacesタイプと日本語名が混在するため、日本語に寄せてから合算する
function mergeGenreCounts(rows: { genre: string; count: number }[]): { label: string; count: number }[] {
  const merged = new Map<string, number>()
  for (const row of rows) {
    const label = normalizeGenre(row.genre)
    if (!label) continue
    merged.set(label, (merged.get(label) ?? 0) + row.count)
  }
  return [...merged.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

function RatingDistribution({ counts }: { counts: RatingCounts }) {
  const total = RATING_ORDER.reduce((sum, key) => sum + counts[key], 0)
  if (total === 0) return null
  const entries = RATING_ORDER
    .map((key) => ({ key, text: RATING_LABEL[key].text, count: counts[key] }))
    .filter((e) => e.count > 0)
  const showMeter = total >= MIN_METER_COUNT
  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="caption" color="text.secondary">評価の傾向</Typography>
      {showMeter && (
        <Box sx={{
          display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', mt: 0.5,
          boxShadow: 'inset 0 1px 2px rgba(33, 29, 25, 0.15)',
        }}>
          {entries.map((e) => (
            <Box key={e.key} sx={{ width: `${(e.count / total) * 100}%`, bgcolor: RATING_BAR_COLORS[e.key] }} />
          ))}
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
        {entries.map((e) => (
          <Box key={e.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: RATING_BAR_COLORS[e.key], flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary">
              {e.text} {showMeter ? `${Math.round((e.count / total) * 100)}%` : `${e.count}件`}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

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

  const genreStats = profile?.genre_distribution ? mergeGenreCounts(profile.genre_distribution) : []
  const situationStats = (profile?.situation_distribution ?? []).slice(0, 3)

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
                    {profile.last_reviewed_at && ` ・ 最終レビュー ${formatRelativeTime(profile.last_reviewed_at)}`}
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
              {profile.rating_distribution && <RatingDistribution counts={profile.rating_distribution} />}
              {genreStats.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5, flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                    よく行くジャンル:
                  </Typography>
                  {genreStats.map((g) => (
                    <Chip key={g.label} label={`${g.label} ${g.count}`} size="small" variant="outlined" />
                  ))}
                </Box>
              )}
              {situationStats.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                    よくあるシーン:
                  </Typography>
                  {situationStats.map((s) => (
                    <Chip key={s.situation} label={`${s.situation} ${s.count}`} size="small" variant="outlined" />
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
