import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Typography, CircularProgress, Chip, Divider, Avatar,
  Card, CardActionArea, CardContent, CardActions, Drawer, IconButton, Button,
  Tabs, Tab, Modal,
  Dialog, DialogContent, DialogContentText, DialogActions,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import TuneIcon from '@mui/icons-material/Tune'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import DirectionsIcon from '@mui/icons-material/Directions'
import SendIcon from '@mui/icons-material/Send'
import DeleteOutlineIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import { supabase } from '../supabase'
import { ROLES, SITUATIONS, normalizeGenre, genreToRawValues } from '../constants'
import WannaGoRequestDialog from '../components/WannaGoRequestDialog'
import ReviewEditDialog from '../components/ReviewEditDialog'
import type { EditableReview } from '../components/ReviewEditDialog'

type Review = {
  id: string
  user_id: string
  restaurant_id: string
  display_name: string
  avatar_url?: string | null
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
  lat: number | string | null
  lng: number | string | null
  photo_url?: string | null
  latest_review_at: string
  reviews: Review[]
}

type FeedResponse = {
  restaurants: RestaurantGroup[]
  hasMore: boolean
  genres: string[] | null
}

type WannaGoItem = {
  restaurant_id: string
  restaurant_name: string
  genre: string | null
  lat: number | null
  lng: number | null
  address: string | null
  photo_url?: string | null
  created_at: string
}

// 惹きの強い順に、最新レビューの写真 → 店舗写真（Google Places）で選ぶ
function pickGroupPhoto(group: RestaurantGroup): string | null {
  return group.reviews.flatMap((rv) => rv.photo_urls ?? [])[0] ?? group.photo_url ?? null
}

const RATING_LABEL: Record<Review['rating'], { text: string; color: 'success' | 'default' | 'error' }> = {
  want_to_revisit: { text: 'また行きたい', color: 'success' },
  average:         { text: '普通',         color: 'default' },
  not_good:        { text: '好みじゃなかった', color: 'error' },
}

const apiBase = import.meta.env.VITE_API_BASE_URL as string

function normalizeGroups(restaurants: RestaurantGroup[] | undefined): RestaurantGroup[] {
  if (!Array.isArray(restaurants)) return []
  return restaurants.map((g) => ({ ...g, genre: normalizeGenre(g.genre) }))
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? ''
}

export default function FeedPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<0 | 1>(0)
  const [groups, setGroups] = useState<RestaurantGroup[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [rawGenres, setRawGenres] = useState<string[]>([])
  const [wannaGoList, setWannaGoList] = useState<WannaGoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const [situationFilter, setSituationFilter] = useState<string | null>(null)
  const [genreFilter, setGenreFilter] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [inviteTarget, setInviteTarget] = useState<{ restaurantId: string; restaurantName: string } | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [editTarget, setEditTarget] = useState<EditableReview | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const fetchFeedPage = useCallback(async (cursor: string | null): Promise<FeedResponse> => {
    const token = await getToken()
    const params = new URLSearchParams()
    if (roleFilter) params.set('role', roleFilter)
    if (situationFilter) params.set('situation', situationFilter)
    if (genreFilter) params.set('genres', genreToRawValues(genreFilter).join(','))
    if (cursor) params.set('cursor', cursor)
    const res = await fetch(`${apiBase}/api/v1/reviews/feed?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.json()
  }, [roleFilter, situationFilter, genreFilter])

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    const data = await fetchFeedPage(null)
    setGroups(normalizeGroups(data.restaurants))
    setHasMore(data.hasMore ?? false)
    if (data.genres) setRawGenres(data.genres)
    setLoading(false)
  }, [fetchFeedPage])

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading || groups.length === 0) return
    setLoadingMore(true)
    const cursor = groups[groups.length - 1].latest_review_at
    const data = await fetchFeedPage(cursor)
    setGroups((prev) => [...prev, ...normalizeGroups(data.restaurants)])
    setHasMore(data.hasMore ?? false)
    setLoadingMore(false)
  }, [hasMore, loadingMore, loading, groups, fetchFeedPage])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore, activeTab, hasMore])

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

  const hasActiveFilter = Boolean(roleFilter || situationFilter || genreFilter)
  const clearFilters = () => {
    setRoleFilter(null)
    setSituationFilter(null)
    setGenreFilter(null)
  }

  const availableGenres = useMemo(() => {
    const g = new Set(rawGenres.map((raw) => normalizeGenre(raw)).filter((g): g is string => Boolean(g)))
    return Array.from(g).sort()
  }, [rawGenres])

  const selectedGroup = groups.find((g) => g.restaurant_id === selectedId) ?? null
  const selectedReviewCountsByUser = (selectedGroup?.reviews ?? []).reduce((map, rv) => {
    map.set(rv.user_id, (map.get(rv.user_id) ?? 0) + 1)
    return map
  }, new Map<string, number>())

  const removeWannaGo = async (restaurantId: string) => {
    const token = await getToken()
    await fetch(`${apiBase}/api/v1/wanna-go/${restaurantId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    fetchWannaGo()
  }

  const deleteReview = async (reviewId: string) => {
    const token = await getToken()
    await fetch(`${apiBase}/api/v1/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    // 再取得せずローカルで反映する。グループが空になればドロワーは自動で閉じる
    setGroups((prev) =>
      prev
        .map((g) => ({ ...g, reviews: g.reviews.filter((r) => r.id !== reviewId) }))
        .filter((g) => g.reviews.length > 0),
    )
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 2, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                startIcon={<TuneIcon sx={{ fontSize: '16px !important' }} />}
                onClick={() => setFilterOpen(true)}
              >
                絞り込み
              </Button>
              {roleFilter && (
                <Chip label={roleFilter} size="small" color="primary" onDelete={() => setRoleFilter(null)} />
              )}
              {situationFilter && (
                <Chip label={situationFilter} size="small" color="secondary" onDelete={() => setSituationFilter(null)} />
              )}
              {genreFilter && (
                <Chip label={genreFilter} size="small" color="primary" onDelete={() => setGenreFilter(null)} />
              )}
            </Box>

            {loading && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>}
            {!loading && groups.length === 0 && (
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <RestaurantMenuIcon sx={{ fontSize: 44, color: 'primary.main', mb: 1 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    {hasActiveFilter ? '条件に合うレビューがありません' : 'まだレビューがありません'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {hasActiveFilter
                      ? '絞り込み条件を変えてみてください'
                      : 'GochiSpaceは友達とつながるほど楽しくなります。まずは友達を探すか、お気に入りの店をレビューしてみましょう'}
                  </Typography>
                  {hasActiveFilter ? (
                    <Button variant="outlined" onClick={clearFilters}>絞り込みをクリア</Button>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <Button variant="contained" onClick={() => navigate('/follows')}>友達を探す</Button>
                      <Button variant="outlined" onClick={() => window.dispatchEvent(new CustomEvent('open-review-dialog'))}>
                        レビューを書く
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            {!loading && groups.map((group) => {
              const myReview = group.reviews.find((rv) => rv.user_id === currentUserId)
              const myRating = myReview ? RATING_LABEL[myReview.rating] : null
              const photo = pickGroupPhoto(group)
              return (
              <Card key={group.restaurant_id} sx={{ mb: 1.5 }}>
                <CardActionArea onClick={() => setSelectedId(group.restaurant_id)}>
                  <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      {photo && (
                        <Box
                          component="img"
                          src={photo}
                          alt=""
                          sx={{ width: 72, height: 72, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }}
                        />
                      )}
                      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} noWrap>
                            {group.restaurant_name}
                          </Typography>
                          {group.genre && (
                            <Typography variant="caption" color="text.secondary">{group.genre}</Typography>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {myRating && (
                            <Chip label={`あなた: ${myRating.text}`} size="small" color={myRating.color} />
                          )}
                          <Chip label={`${group.reviews.length}件`} size="small" color="primary" variant="outlined" />
                        </Box>
                      </Box>
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
              )
            })}

            {/* 無限スクロール用の監視要素 */}
            {!loading && hasMore && <Box ref={sentinelRef} sx={{ height: 4 }} />}
            {loadingMore && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}
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
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    {wg.photo_url && (
                      <Box
                        component="img"
                        src={wg.photo_url}
                        alt=""
                        sx={{ width: 72, height: 72, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }}
                      />
                    )}
                    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
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

      {/* 絞り込みドロワー */}
      <Drawer
        anchor="bottom"
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        slotProps={{ paper: { sx: { borderRadius: '16px 16px 0 0', maxHeight: '70vh' } } }}
      >
        <Box sx={{ px: 2, pt: 2, pb: 3, overflow: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle1" sx={{ flex: 1 }}>絞り込み</Typography>
            <IconButton size="small" onClick={() => setFilterOpen(false)}><CloseIcon /></IconButton>
          </Box>

          <Typography variant="caption" color="text.secondary">ロール</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2, mt: 0.5 }}>
            {ROLES.map((r) => (
              <Chip key={r} label={r} size="small"
                color={roleFilter === r ? 'primary' : 'default'}
                onClick={() => toggleFilter(r, roleFilter, setRoleFilter)}
              />
            ))}
          </Box>

          <Typography variant="caption" color="text.secondary">シチュエーション</Typography>
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
              <Typography variant="caption" color="text.secondary">ジャンル</Typography>
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

          <Button variant="contained" fullWidth onClick={() => setFilterOpen(false)}>
            この条件で表示
          </Button>
          {hasActiveFilter && (
            <Button color="inherit" fullWidth onClick={clearFilters} sx={{ mt: 1 }}>
              クリア
            </Button>
          )}
        </Box>
      </Drawer>

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
                      <Avatar
                        src={rv.avatar_url ?? undefined}
                        onClick={() => { if (rv.user_id) navigate(`/follows/${rv.user_id}`, { state: { displayName: rv.display_name } }) }}
                        sx={{ width: 26, height: 26, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}
                      >
                        {rv.display_name.charAt(0)}
                      </Avatar>
                      <Typography
                        variant="body2"
                        onClick={() => { if (rv.user_id) navigate(`/follows/${rv.user_id}`, { state: { displayName: rv.display_name } }) }}
                        sx={{
                          fontWeight: 'bold', flex: 1, cursor: 'pointer',
                          textDecoration: 'underline', textUnderlineOffset: 3, textDecorationColor: 'rgba(0,0,0,0.25)',
                        }}
                      >
                        {rv.display_name}
                      </Typography>
                      {(selectedReviewCountsByUser.get(rv.user_id) ?? 0) >= 2 && (
                        <Chip label="再訪" size="small" variant="outlined" color="secondary" sx={{ flexShrink: 0 }} />
                      )}
                      {rv.visited_at && (
                        <Typography variant="caption" color="text.secondary">
                          {rv.visited_at.slice(0, 10)}
                        </Typography>
                      )}
                      {rv.user_id === currentUserId && (
                        <>
                          <IconButton
                            size="small"
                            onClick={() => setEditTarget({ ...rv, restaurant_name: selectedGroup.restaurant_name })}
                            sx={{ color: 'text.secondary' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => setConfirmDialog({
                              message: '投稿したレビューを削除しますか？',
                              onConfirm: () => deleteReview(rv.id),
                            })}
                            sx={{ color: 'text.secondary' }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </>
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

      {/* レビュー編集ダイアログ */}
      {editTarget && (
        <ReviewEditDialog
          open={!!editTarget}
          review={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null)
            fetchReviews()
          }}
        />
      )}

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
