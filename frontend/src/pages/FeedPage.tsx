import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Box, Typography, CircularProgress, Chip, Divider,
  Card, CardActionArea, CardContent, CardActions, Drawer, IconButton, Button,
  Tabs, Tab, Modal,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DirectionsIcon from '@mui/icons-material/Directions'
import SendIcon from '@mui/icons-material/Send'
import DeleteOutlineIcon from '@mui/icons-material/Delete'
import { supabase } from '../supabase'
import { ROLES, SITUATIONS, normalizeGenre } from '../constants'
import WannaGoRequestDialog from '../components/WannaGoRequestDialog'

type Review = {
  id: string
  user_id: string
  restaurant_id: string
  display_name: string
  restaurant_name: string
  genre: string | null
  lat: number | string | null
  lng: number | string | null
  rating: 'want_to_revisit' | 'average' | 'not_good'
  situation?: string
  comment?: string
  visited_at?: string
  photo_urls?: string[] | null
}

type RestaurantGroup = {
  restaurant_id: string
  restaurant_name: string
  genre: string | null
  lat: number | null
  lng: number | null
  reviews: Review[]
}

type WannaGoItem = {
  restaurant_id: string
  restaurant_name: string
  genre: string | null
  lat: number | null
  lng: number | null
  address: string | null
  created_at: string
}

const RATING_LABEL: Record<Review['rating'], { text: string; color: 'success' | 'default' | 'error' }> = {
  want_to_revisit: { text: 'また行きたい', color: 'success' },
  average:         { text: '普通',         color: 'default' },
  not_good:        { text: '好みじゃなかった', color: 'error' },
}

const apiBase = import.meta.env.VITE_API_BASE_URL as string

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? ''
}

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState<0 | 1>(0)
  const [reviews, setReviews] = useState<Review[]>([])
  const [wannaGoList, setWannaGoList] = useState<WannaGoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const [situationFilter, setSituationFilter] = useState<string | null>(null)
  const [genreFilter, setGenreFilter] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [inviteTarget, setInviteTarget] = useState<{ restaurantId: string; restaurantName: string } | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null)

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

  const fetchWannaGo = useCallback(async () => {
    const token = await getToken()
    const res = await fetch(`${apiBase}/api/v1/wanna-go`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    setWannaGoList(
      Array.isArray(data)
        ? data.map((wg: WannaGoItem) => ({ ...wg, genre: normalizeGenre(wg.genre) }))
        : []
    )
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
    fetchReviews()
    fetchWannaGo()
    window.addEventListener('review-posted', fetchReviews)
    window.addEventListener('wanna-go-updated', fetchWannaGo)
    return () => {
      window.removeEventListener('review-posted', fetchReviews)
      window.removeEventListener('wanna-go-updated', fetchWannaGo)
    }
  }, [fetchReviews, fetchWannaGo])

  const toggleFilter = (value: string, current: string | null, setter: (v: string | null) => void) =>
    setter(current === value ? null : value)

  const restaurantGroups = useMemo<RestaurantGroup[]>(() => {
    const map = new Map<string, RestaurantGroup>()
    for (const r of reviews) {
      if (!map.has(r.restaurant_id)) {
        map.set(r.restaurant_id, {
          restaurant_id: r.restaurant_id,
          restaurant_name: r.restaurant_name,
          genre: normalizeGenre(r.genre),
          lat: r.lat != null ? Number(r.lat) : null,
          lng: r.lng != null ? Number(r.lng) : null,
          reviews: [],
        })
      }
      map.get(r.restaurant_id)!.reviews.push(r)
    }
    return Array.from(map.values())
  }, [reviews])

  const availableGenres = useMemo(() => {
    const g = new Set(restaurantGroups.map((rg) => rg.genre).filter((g): g is string => Boolean(g)))
    return Array.from(g).sort()
  }, [restaurantGroups])

  const filteredGroups = useMemo(
    () => genreFilter ? restaurantGroups.filter((rg) => rg.genre === genreFilter) : restaurantGroups,
    [restaurantGroups, genreFilter],
  )

  const selectedGroup = restaurantGroups.find((g) => g.restaurant_id === selectedId) ?? null

  const removeWannaGo = async (restaurantId: string) => {
    const token = await getToken()
    await fetch(`${apiBase}/api/v1/wanna-go/${restaurantId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    fetchWannaGo()
  }

  const deleteReview = async (reviewId: string, restaurantId: string) => {
    const token = await getToken()
    await fetch(`${apiBase}/api/v1/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    await fetchReviews()
    const remainingForRestaurant = reviews.filter(
      (r) => r.restaurant_id === restaurantId && r.id !== reviewId,
    )
    if (remainingForRestaurant.length === 0) setSelectedId(null)
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <Box sx={{ maxWidth: 600, mx: 'auto', px: 2, pt: 2, pb: 10 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>フィード</Typography>

        {/* タブ */}
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 1.5 }}>
          <Tab label="レビュー" />
          <Tab label={`行きたい（${wannaGoList.length}）`} />
        </Tabs>

        {/* ── レビュータブ ── */}
        {activeTab === 0 && (
          <>
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

            {availableGenres.length > 0 && (
              <>
                <Typography variant="caption" color="text.secondary">ジャンルで絞り込み</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2, mt: 0.5 }}>
                  {availableGenres.map((g) => (
                    <Chip key={g} label={g} size="small"
                      color={genreFilter === g ? 'primary' : 'default'}
                      onClick={() => toggleFilter(g, genreFilter, setGenreFilter)}
                    />
                  ))}
                </Box>
              </>
            )}

            <Divider sx={{ mb: 2 }} />

            {loading && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>}
            {!loading && filteredGroups.length === 0 && (
              <Typography color="text.secondary">レビューがまだありません</Typography>
            )}

            {filteredGroups.map((group) => (
              <Card key={group.restaurant_id} sx={{ mb: 1.5 }}>
                <CardActionArea onClick={() => setSelectedId(group.restaurant_id)}>
                  <CardContent sx={{ pb: 1 }}>
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

                  </CardContent>
                </CardActionArea>
                <CardActions sx={{ pt: 0, px: 1.5, pb: 1, gap: 0.5 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={<SendIcon sx={{ fontSize: '14px !important' }} />}
                    sx={{ fontSize: 11, minWidth: 0 }}
                    onClick={() => setInviteTarget({ restaurantId: group.restaurant_id, restaurantName: group.restaurant_name })}
                  >
                    誘う
                  </Button>
                </CardActions>
              </Card>
            ))}
          </>
        )}

        {/* ── 行きたいタブ ── */}
        {activeTab === 1 && (
          <>
            {wannaGoList.length === 0 && (
              <Typography color="text.secondary">行きたい店がまだありません。＋ボタンから追加できます。</Typography>
            )}

            {wannaGoList.map((wg) => (
              <Card key={wg.restaurant_id} sx={{ mb: 1.5 }}>
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} noWrap>
                        {wg.restaurant_name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
                        {wg.genre && (
                          <Typography variant="caption" color="text.secondary">{wg.genre}</Typography>
                        )}
                        {wg.address && (
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1 }}>
                            {wg.address}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Chip label="行きたい" size="small" color="primary" sx={{ flexShrink: 0 }} />
                  </Box>
                </CardContent>
                <CardActions sx={{ pt: 0, px: 1.5, pb: 1, gap: 0.5 }}>
                  {wg.lat != null && wg.lng != null && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<DirectionsIcon sx={{ fontSize: '14px !important' }} />}
                      sx={{ fontSize: 11, minWidth: 0 }}
                      href={`https://www.google.com/maps/dir/?api=1&destination=${wg.lat},${wg.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ルート
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={<SendIcon sx={{ fontSize: '14px !important' }} />}
                    sx={{ fontSize: 11, minWidth: 0 }}
                    onClick={() => setInviteTarget({ restaurantId: wg.restaurant_id, restaurantName: wg.restaurant_name })}
                  >
                    誘う
                  </Button>
                  <Box sx={{ flex: 1 }} />
                  <IconButton
                    size="small"
                    color="default"
                    onClick={() => setConfirmDialog({
                      message: '行きたいリストから削除しますか？',
                      onConfirm: () => removeWannaGo(wg.restaurant_id),
                    })}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            ))}
          </>
        )}
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {selectedGroup.lat != null && selectedGroup.lng != null && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<DirectionsIcon />}
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedGroup.lat},${selectedGroup.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ルート
                  </Button>
                )}
                <IconButton size="small" onClick={() => setSelectedId(null)}><CloseIcon /></IconButton>
              </Box>
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
                      {rv.user_id === currentUserId && (
                        <IconButton
                          size="small"
                          onClick={() => setConfirmDialog({
                            message: '投稿したレビューを削除しますか？',
                            onConfirm: () => deleteReview(rv.id, rv.restaurant_id),
                          })}
                          sx={{ color: 'text.secondary' }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
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
                        {rv.photo_urls.map((src, pi) => (
                          <Box
                            key={pi}
                            component="img"
                            src={src}
                            onClick={() => setLightboxSrc(src)}
                            sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1, flexShrink: 0, cursor: 'pointer' }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              )
            })}
          </Box>
        )}
      </Drawer>

      {/* 画像ライトボックス */}
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

      {/* 削除確認ダイアログ */}
      <Dialog open={!!confirmDialog} onClose={() => setConfirmDialog(null)}>
        <DialogTitle>確認</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmDialog?.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(null)}>いいえ</Button>
          <Button
            color="error"
            onClick={() => {
              confirmDialog?.onConfirm()
              setConfirmDialog(null)
            }}
          >
            はい
          </Button>
        </DialogActions>
      </Dialog>

      {/* 誘うダイアログ */}
      {inviteTarget && (
        <WannaGoRequestDialog
          open={!!inviteTarget}
          restaurantId={inviteTarget.restaurantId}
          restaurantName={inviteTarget.restaurantName}
          onClose={() => setInviteTarget(null)}
          onSent={() => setInviteTarget(null)}
        />
      )}
    </Box>
  )
}
