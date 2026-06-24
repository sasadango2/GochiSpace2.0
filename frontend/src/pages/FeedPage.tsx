import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Box, Typography, CircularProgress, Chip, Divider,
  Card, CardActionArea, CardContent, Drawer, IconButton,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { supabase } from '../supabase'
import { ROLES, SITUATIONS } from '../constants'

type Review = {
  id: string
  restaurant_id: string
  display_name: string
  restaurant_name: string
  genre: string | null
  rating: 'want_to_revisit' | 'average' | 'not_good'
  situation?: string
  comment?: string
  visited_at?: string
}

type RestaurantGroup = {
  restaurant_id: string
  restaurant_name: string
  genre: string | null
  reviews: Review[]
}

const RATING_LABEL: Record<Review['rating'], { text: string; color: 'success' | 'default' | 'error' }> = {
  want_to_revisit: { text: 'また行きたい', color: 'success' },
  average:         { text: '普通',         color: 'default' },
  not_good:        { text: '好みじゃなかった', color: 'error' },
}

const apiBase = import.meta.env.VITE_API_BASE_URL as string

export default function FeedPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const [situationFilter, setSituationFilter] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

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

  const restaurantGroups = useMemo<RestaurantGroup[]>(() => {
    const map = new Map<string, RestaurantGroup>()
    for (const r of reviews) {
      if (!map.has(r.restaurant_id)) {
        map.set(r.restaurant_id, {
          restaurant_id: r.restaurant_id,
          restaurant_name: r.restaurant_name,
          genre: r.genre ?? null,
          reviews: [],
        })
      }
      map.get(r.restaurant_id)!.reviews.push(r)
    }
    return Array.from(map.values())
  }, [reviews])

  const selectedGroup = restaurantGroups.find((g) => g.restaurant_id === selectedId) ?? null

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
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
        {!loading && restaurantGroups.length === 0 && (
          <Typography color="text.secondary">レビューがまだありません</Typography>
        )}

        {restaurantGroups.map((group) => (
          <Card key={group.restaurant_id} sx={{ mb: 1.5 }}>
            <CardActionArea onClick={() => setSelectedId(group.restaurant_id)}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} noWrap>
                      {group.restaurant_name}
                    </Typography>
                    {group.genre && (
                      <Typography variant="caption" color="text.secondary">{group.genre}</Typography>
                    )}
                  </Box>
                  <Chip label={`${group.reviews.length}件`} size="small" color="primary" variant="outlined" sx={{ flexShrink: 0 }} />
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                  {group.reviews.slice(0, 3).map((rv) => {
                    const info = RATING_LABEL[rv.rating]
                    return (
                      <Box key={rv.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">{rv.display_name}</Typography>
                        <Chip label={info.text} color={info.color} size="small" sx={{ height: 18, fontSize: 10 }} />
                      </Box>
                    )
                  })}
                  {group.reviews.length > 3 && (
                    <Typography variant="caption" color="text.secondary">他{group.reviews.length - 3}件...</Typography>
                  )}
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      {/* レビュー詳細ドロワー */}
      <Drawer
        anchor="bottom"
        open={!!selectedGroup}
        onClose={() => setSelectedId(null)}
        slotProps={{ paper: { sx: { borderRadius: '16px 16px 0 0', maxHeight: '80vh' } } }}
      >
        {selectedGroup && (
          <Box sx={{ overflow: 'auto', pb: 4 }}>
            <Box sx={{ px: 2, pt: 2, pb: 1.5, display: 'flex', alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {selectedGroup.restaurant_name}
                </Typography>
                {selectedGroup.genre && (
                  <Typography variant="caption" color="text.secondary">{selectedGroup.genre}</Typography>
                )}
              </Box>
              <IconButton size="small" onClick={() => setSelectedId(null)}><CloseIcon /></IconButton>
            </Box>
            <Divider />

            {selectedGroup.reviews.map((rv, i) => {
              const info = RATING_LABEL[rv.rating]
              return (
                <Box key={rv.id}>
                  {i > 0 && <Divider />}
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', flex: 1 }}>{rv.display_name}</Typography>
                      {rv.visited_at && (
                        <Typography variant="caption" color="text.secondary">
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
                  </Box>
                </Box>
              )
            })}
          </Box>
        )}
      </Drawer>
    </Box>
  )
}
