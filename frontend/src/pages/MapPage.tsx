import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import {
  Box, Typography, Chip, Divider, Drawer, IconButton, Badge, Paper, Avatar,
  FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
  Button, Modal,
} from '@mui/material'
import TuneIcon from '@mui/icons-material/Tune'
import CloseIcon from '@mui/icons-material/Close'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { supabase } from '../supabase'
import { ROLES, SITUATIONS, normalizeGenre } from '../constants'
import WannaGoRequestDialog from '../components/WannaGoRequestDialog'

// ── 型定義 ──────────────────────────────────────
type ReviewSummary = {
  id: string
  user_id: string
  rating: string
  situation: string | null
  comment: string | null
  display_name: string
  avatar_url?: string | null
  visited_at: string | null
  photo_urls: string[] | null
}

type MapRestaurant = {
  restaurant_id: string
  restaurant_name: string
  lat: number | string
  lng: number | string
  genre: string | null
  reviews: ReviewSummary[]
}

type WannaGoUser = { user_id: string; display_name: string }

type WannaGoRestaurant = {
  restaurant_id: string
  restaurant_name: string
  lat: number | string
  lng: number | string
  genre: string | null
  users: WannaGoUser[]
}

type MutualFollow = { id: string; display_name: string; username: string }

// ── 定数 ────────────────────────────────────────
const PRIMARY = '#e8651a'
const WANNA_COLOR = '#3b82f6'
const TOKYO: [number, number] = [35.6812, 139.7671]

const DISTANCE_OPTIONS: { label: string; value: number | null }[] = [
  { label: '指定なし', value: null },
  { label: '500m', value: 0.5 },
  { label: '1km', value: 1 },
  { label: '3km', value: 3 },
  { label: '5km', value: 5 },
]

const RATING_LABEL: Record<string, { text: string; color: string }> = {
  want_to_revisit: { text: 'また行きたい', color: '#16a34a' },
  average:         { text: '普通',         color: '#ca8a04' },
  not_good:        { text: '好みじゃなかった', color: '#dc2626' },
}

// ── ユーティリティ ───────────────────────────────
function calcDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── カスタムアイコン ─────────────────────────────
function createPinIcon(count: number) {
  const label = count > 9 ? '9+' : String(count)
  const fontSize = count > 9 ? 9 : 12
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:36px;height:44px;filter:drop-shadow(0 2px 4px rgba(232,101,26,0.4))">
        <svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 0C8.06 0 0 8.06 0 18c0 12.15 18 26 18 26s18-13.85 18-26C36 8.06 27.94 0 18 0z" fill="${PRIMARY}"/>
          <circle cx="18" cy="18" r="11" fill="white"/>
        </svg>
        <span style="position:absolute;top:7px;left:0;width:36px;text-align:center;font-size:${fontSize}px;font-weight:700;color:${PRIMARY};line-height:22px;font-family:sans-serif;">${label}</span>
      </div>`,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -46],
  })
}

function createWannaPinIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:36px;height:44px;filter:drop-shadow(0 2px 4px rgba(59,130,246,0.4))">
        <svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 0C8.06 0 0 8.06 0 18c0 12.15 18 26 18 26s18-13.85 18-26C36 8.06 27.94 0 18 0z" fill="${WANNA_COLOR}"/>
          <circle cx="18" cy="18" r="11" fill="white"/>
        </svg>
        <span style="position:absolute;top:7px;left:0;width:36px;text-align:center;font-size:14px;line-height:22px;">★</span>
      </div>`,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -46],
  })
}

const wannaPinIcon = createWannaPinIcon()

const userLocationIcon = L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.2)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

// ── Leaflet ヘルパー ─────────────────────────────
function FlyToLocation({ position }: { position: [number, number] }) {
  const map = useMap()
  useEffect(() => { map.flyTo(position, 14, { duration: 1.5 }) }, [map, position])
  return null
}

// ── ポップアップアクションボタン（インラインstyle） ─────
const popupBtnStyle = (active: boolean): React.CSSProperties => ({
  background: active ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
  border: '1px solid rgba(255,255,255,0.5)',
  borderRadius: 4,
  color: 'white',
  fontSize: 11,
  cursor: 'pointer',
  padding: '2px 8px',
  whiteSpace: 'nowrap' as const,
})

// ── レビューありマーカー ─────────────────────────
type RestaurantMarkerProps = {
  rs: MapRestaurant
  onInvite: (restaurantId: string, restaurantName: string) => void
  onImageClick: (src: string) => void
}

function RestaurantMarker({ rs, onInvite, onImageClick }: RestaurantMarkerProps) {
  const navigate = useNavigate()
  const icon = useMemo(() => createPinIcon(rs.reviews.length), [rs.reviews.length])

  return (
    <Marker position={[Number(rs.lat), Number(rs.lng)]} icon={icon}>
      <Popup minWidth={240} maxWidth={300}>
        <Box sx={{ display: 'flex', flexDirection: 'column', maxHeight: 280, mx: -1.5, mt: -1.5, mb: -1 }}>
          {/* 固定ヘッダー */}
          <Box sx={{ bgcolor: PRIMARY, px: 1.5, pt: 1, pb: 0.75, borderRadius: '8px 8px 0 0', flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'white' }} noWrap>
                  {rs.restaurant_name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  {rs.reviews.length}件{rs.genre ? ` · ${rs.genre}` : ''}
                </Typography>
              </Box>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${rs.lat},${rs.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'white', fontSize: 11, whiteSpace: 'nowrap', textDecoration: 'underline', flexShrink: 0 }}
              >
                ルート
              </a>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
              <button style={popupBtnStyle(false)} onClick={() => onInvite(rs.restaurant_id, rs.restaurant_name)}>
                ✉ 誘う
              </button>
            </Box>
          </Box>

          {/* スクロール可能なレビュー一覧 */}
          <Box sx={{ overflowY: 'auto', px: 1.5, py: 0.5 }}>
            {rs.reviews.map((rv, i) => {
              const info = RATING_LABEL[rv.rating]
              const date = rv.visited_at ? rv.visited_at.slice(0, 10) : null
              return (
                <Box key={rv.id}>
                  {i > 0 && <Divider sx={{ my: 0.5 }} />}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.25 }}>
                    <Avatar
                      src={rv.avatar_url ?? undefined}
                      onClick={() => { if (rv.user_id) navigate(`/follows/${rv.user_id}`, { state: { displayName: rv.display_name } }) }}
                      sx={{ width: 20, height: 20, fontSize: 10, cursor: 'pointer', flexShrink: 0 }}
                    >
                      {rv.display_name.charAt(0)}
                    </Avatar>
                    <Typography
                      variant="caption"
                      onClick={() => { if (rv.user_id) navigate(`/follows/${rv.user_id}`, { state: { displayName: rv.display_name } }) }}
                      sx={{
                        fontWeight: 'bold', flex: 1, cursor: 'pointer',
                        textDecoration: 'underline', textUnderlineOffset: 3, textDecorationColor: 'rgba(0,0,0,0.25)',
                      }}
                      noWrap
                    >
                      {rv.display_name}
                    </Typography>
                    {info && (
                      <Typography variant="caption" sx={{ color: info.color, fontWeight: 'bold', flexShrink: 0 }}>
                        {info.text}
                      </Typography>
                    )}
                  </Box>
                  {(date || rv.situation) && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {[date, rv.situation].filter(Boolean).join(' · ')}
                    </Typography>
                  )}
                  {rv.comment && (
                    <Typography variant="caption" color="text.secondary" sx={{
                      display: 'block',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {rv.comment}
                    </Typography>
                  )}
                  {rv.photo_urls && rv.photo_urls.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, overflowX: 'auto' }}>
                      {rv.photo_urls.map((src, pi) => (
                        <Box
                          key={pi}
                          component="img"
                          src={src}
                          onClick={() => onImageClick(src)}
                          sx={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 0.5, flexShrink: 0, cursor: 'pointer' }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              )
            })}
          </Box>
        </Box>
      </Popup>
    </Marker>
  )
}

// ── 行きたいマーカー（青ピン） ───────────────────
type WannaGoMarkerProps = {
  rs: WannaGoRestaurant
  onInvite: (restaurantId: string, restaurantName: string) => void
}

function WannaGoMarker({ rs, onInvite }: WannaGoMarkerProps) {
  const userNames = rs.users.map((u) => u.display_name).join('、')
  return (
    <Marker position={[Number(rs.lat), Number(rs.lng)]} icon={wannaPinIcon}>
      <Popup minWidth={220} maxWidth={280}>
        <Box sx={{ mx: -1.5, mt: -1.5, mb: -1 }}>
          <Box sx={{ bgcolor: WANNA_COLOR, px: 1.5, pt: 1, pb: 0.75, borderRadius: '8px 8px 0 0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'white' }} noWrap>
                  {rs.restaurant_name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  {rs.genre ? `${rs.genre} · ` : ''}行きたい：{userNames}
                </Typography>
              </Box>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${rs.lat},${rs.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'white', fontSize: 11, whiteSpace: 'nowrap', textDecoration: 'underline', flexShrink: 0 }}
              >
                ルート
              </a>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <button style={popupBtnStyle(false)} onClick={() => onInvite(rs.restaurant_id, rs.restaurant_name)}>
                ✉ 誘う
              </button>
            </Box>
          </Box>
        </Box>
      </Popup>
    </Marker>
  )
}

// ── メインページ ─────────────────────────────────
const apiBase = import.meta.env.VITE_API_BASE_URL as string

export default function MapPage() {
  const [restaurants, setRestaurants] = useState<MapRestaurant[]>([])
  const [wannaGoRestaurants, setWannaGoRestaurants] = useState<WannaGoRestaurant[]>([])
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [follows, setFollows] = useState<MutualFollow[]>([])
  const [filterOpen, setFilterOpen] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [inviteTarget, setInviteTarget] = useState<{ restaurantId: string; restaurantName: string } | null>(null)

  // フィルター状態
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const [situationFilter, setSituationFilter] = useState<string | null>(null)
  const [genreFilter, setGenreFilter] = useState<string | null>(null)
  const [onlyMine, setOnlyMine] = useState(false)
  const [targetUserId, setTargetUserId] = useState<string | null>(null)
  const [distanceKm, setDistanceKm] = useState<number | null>(null)

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    )
  }, [])

  useEffect(() => {
    const fetchFollows = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${apiBase}/api/v1/follows`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      setFollows(Array.isArray(data) ? data : [])
    }
    fetchFollows()
  }, [])

  const fetchReviews = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const params = new URLSearchParams()
    if (roleFilter) params.set('role', roleFilter)
    if (situationFilter) params.set('situation', situationFilter)
    if (onlyMine) params.set('onlyMine', 'true')
    if (targetUserId) params.set('targetUserId', targetUserId)
    const res = await fetch(`${apiBase}/api/v1/reviews/map?${params}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    const data: MapRestaurant[] = await res.json()
    setRestaurants(
      Array.isArray(data)
        ? data.map((rs) => ({ ...rs, genre: normalizeGenre(rs.genre) }))
        : []
    )
  }, [roleFilter, situationFilter, onlyMine, targetUserId])

  const fetchWannaGo = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${apiBase}/api/v1/wanna-go/map`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    const data = await res.json()
    if (!Array.isArray(data)) { setWannaGoRestaurants([]); return }

    // レストランごとにユーザーを集約
    type RawRow = { restaurant_id: string; restaurant_name: string; genre: string | null; lat: number; lng: number; user_id: string; display_name: string }
    const map = new Map<string, WannaGoRestaurant>()
    for (const row of data as RawRow[]) {
      if (!map.has(row.restaurant_id)) {
        map.set(row.restaurant_id, {
          restaurant_id: row.restaurant_id,
          restaurant_name: row.restaurant_name,
          genre: normalizeGenre(row.genre),
          lat: row.lat,
          lng: row.lng,
          users: [],
        })
      }
      map.get(row.restaurant_id)!.users.push({ user_id: row.user_id, display_name: row.display_name })
    }
    setWannaGoRestaurants(Array.from(map.values()))
  }, [])

  useEffect(() => {
    fetchReviews()
    fetchWannaGo()
    window.addEventListener('review-posted', fetchReviews)
    window.addEventListener('wanna-go-updated', fetchWannaGo)
    return () => {
      window.removeEventListener('review-posted', fetchReviews)
      window.removeEventListener('wanna-go-updated', fetchWannaGo)
    }
  }, [fetchReviews, fetchWannaGo])

  // クライアントサイドフィルター
  const availableGenres = useMemo(() => {
    const g = new Set(restaurants.map((rs) => rs.genre).filter((g): g is string => Boolean(g)))
    return Array.from(g).sort()
  }, [restaurants])

  const filteredRestaurants = useMemo(() => {
    let result = restaurants
    if (distanceKm !== null && userLocation) {
      result = result.filter(
        (rs) => calcDistanceKm(userLocation[0], userLocation[1], Number(rs.lat), Number(rs.lng)) <= distanceKm
      )
    }
    if (genreFilter) {
      result = result.filter((rs) => rs.genre === genreFilter)
    }
    return result
  }, [restaurants, distanceKm, userLocation, genreFilter])

  // レビューある店のIDセット（青ピン除外用）
  const reviewedIds = useMemo(
    () => new Set(filteredRestaurants.map((rs) => rs.restaurant_id)),
    [filteredRestaurants]
  )

  // 青ピン: 行きたいリストのうちレビューのない店のみ
  const wannaGoOnlyRestaurants = useMemo(
    () => wannaGoRestaurants.filter((wg) => !reviewedIds.has(wg.restaurant_id)),
    [wannaGoRestaurants, reviewedIds]
  )

  const activeCount = [roleFilter, situationFilter, genreFilter, onlyMine || !!targetUserId, distanceKm !== null].filter(Boolean).length

  const resetFilters = () => {
    setRoleFilter(null)
    setSituationFilter(null)
    setGenreFilter(null)
    setOnlyMine(false)
    setTargetUserId(null)
    setDistanceKm(null)
  }

  const toggleChip = <T,>(value: T, current: T | null, setter: (v: T | null) => void) =>
    setter(current === value ? null : value)

  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      {/* フィルターボタン */}
      <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 1000 }}>
        <Badge badgeContent={activeCount || null} color="primary">
          <Paper elevation={2} sx={{ borderRadius: 2 }}>
            <IconButton onClick={() => setFilterOpen(true)} size="medium">
              <TuneIcon />
            </IconButton>
          </Paper>
        </Badge>
      </Box>

      {/* マップ */}
      <MapContainer center={TOKYO} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {userLocation && <FlyToLocation position={userLocation} />}
        {userLocation && <Marker position={userLocation} icon={userLocationIcon} />}

        {/* オレンジピン: レビューあり */}
        {filteredRestaurants.map((rs) => (
          <RestaurantMarker
            key={rs.restaurant_id}
            rs={rs}
            onInvite={(id, name) => setInviteTarget({ restaurantId: id, restaurantName: name })}
            onImageClick={(src) => setLightboxSrc(src)}
          />
        ))}

        {/* 青ピン: 行きたいリストのみ */}
        {wannaGoOnlyRestaurants.map((wg) => (
          <WannaGoMarker
            key={wg.restaurant_id}
            rs={wg}
            onInvite={(id, name) => setInviteTarget({ restaurantId: id, restaurantName: name })}
          />
        ))}
      </MapContainer>

      {/* フィルタードロワー */}
      <Drawer
        anchor="bottom"
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        sx={{ zIndex: 1450 }}
        slotProps={{ paper: { sx: { borderRadius: '16px 16px 0 0', maxHeight: '78vh' } } }}
      >
        <Box sx={{ p: 2, overflow: 'auto', pb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', flex: 1 }}>絞り込み</Typography>
            <IconButton size="small" onClick={() => setFilterOpen(false)}><CloseIcon /></IconButton>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>
            表示するユーザー
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 150 }} disabled={onlyMine}>
              <InputLabel>ユーザー</InputLabel>
              <Select
                value={targetUserId ?? ''}
                label="ユーザー"
                onChange={(e) => setTargetUserId(e.target.value || null)}
                MenuProps={{ sx: { zIndex: 1600 } }}
              >
                <MenuItem value="">全員</MenuItem>
                {follows.map((f) => (
                  <MenuItem key={f.id} value={f.id}>{f.display_name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={onlyMine}
                  size="small"
                  onChange={(e) => { setOnlyMine(e.target.checked); if (e.target.checked) setTargetUserId(null) }}
                />
              }
              label={<Typography variant="body2">自分のみ</Typography>}
            />
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>
            距離{!userLocation && <span style={{ fontWeight: 'normal' }}> ─ 位置情報を許可すると使えます</span>}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2.5 }}>
            {DISTANCE_OPTIONS.map((o) => (
              <Chip
                key={String(o.value)}
                label={o.label}
                size="small"
                color={distanceKm === o.value ? 'primary' : 'default'}
                onClick={() => setDistanceKm(o.value)}
                disabled={o.value !== null && !userLocation}
              />
            ))}
          </Box>

          {availableGenres.length > 0 && (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>ジャンル</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2.5 }}>
                {availableGenres.map((g) => (
                  <Chip
                    key={g}
                    label={g}
                    size="small"
                    color={genreFilter === g ? 'primary' : 'default'}
                    onClick={() => toggleChip(g, genreFilter, setGenreFilter)}
                  />
                ))}
              </Box>
            </>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>シチュエーション</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2.5 }}>
            {SITUATIONS.map((s) => (
              <Chip
                key={s}
                label={s}
                size="small"
                color={situationFilter === s ? 'secondary' : 'default'}
                onClick={() => toggleChip(s, situationFilter, setSituationFilter)}
              />
            ))}
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>ロール</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 3 }}>
            {ROLES.map((r) => (
              <Chip
                key={r}
                label={r}
                size="small"
                color={roleFilter === r ? 'primary' : 'default'}
                onClick={() => toggleChip(r, roleFilter, setRoleFilter)}
              />
            ))}
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={resetFilters} sx={{ flex: 1 }}>リセット</Button>
            <Button variant="contained" onClick={() => setFilterOpen(false)} sx={{ flex: 1 }}>閉じる</Button>
          </Box>
        </Box>
      </Drawer>

      {/* 画像ライトボックス */}
      <Modal open={!!lightboxSrc} onClose={() => setLightboxSrc(null)} sx={{ zIndex: 1500 }}>
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
