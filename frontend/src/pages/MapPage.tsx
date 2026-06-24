import { useEffect, useState, useCallback, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import {
  Box, Typography, Chip, Divider, Drawer, IconButton, Badge, Paper,
  FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
  Button,
} from '@mui/material'
import TuneIcon from '@mui/icons-material/Tune'
import CloseIcon from '@mui/icons-material/Close'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { supabase } from '../supabase'
import { ROLES, SITUATIONS, normalizeGenre } from '../constants'

// ── 型定義 ──────────────────────────────────────
type ReviewSummary = {
  id: string
  rating: string
  situation: string | null
  comment: string | null
  display_name: string
  visited_at: string | null
}

type MapRestaurant = {
  restaurant_id: string
  restaurant_name: string
  lat: number | string
  lng: number | string
  genre: string | null
  reviews: ReviewSummary[]
}

type MutualFollow = { id: string; display_name: string; username: string }

// ── 定数 ────────────────────────────────────────
const PRIMARY = '#e8651a'
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

// ── マーカーコンポーネント ───────────────────────
function RestaurantMarker({ rs }: { rs: MapRestaurant }) {
  const icon = useMemo(() => createPinIcon(rs.reviews.length), [rs.reviews.length])
  const visible = rs.reviews.slice(0, 3)
  const hidden = rs.reviews.length - visible.length

  return (
    <Marker position={[Number(rs.lat), Number(rs.lng)]} icon={icon}>
      <Popup minWidth={240} maxWidth={300}>
        {/* ヘッダー */}
        <Box sx={{ bgcolor: PRIMARY, mx: -1.5, mt: -1.5, mb: 1, px: 1.5, py: 1, borderRadius: '8px 8px 0 0' }}>
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
        </Box>

        {/* レビュー一覧 */}
        {visible.map((rv, i) => {
          const info = RATING_LABEL[rv.rating]
          const sub = [rv.situation, rv.comment].filter(Boolean).join(' · ')
          return (
            <Box key={rv.id}>
              {i > 0 && <Divider sx={{ my: 0.5 }} />}
              {/* 1行目: アバター + 名前 + 評価 */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{
                  width: 22, height: 22, borderRadius: '50%',
                  bgcolor: `${PRIMARY}22`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 'bold', color: PRIMARY, lineHeight: 1 }}>
                    {rv.display_name.charAt(0)}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 'bold', flex: 1 }} noWrap>
                  {rv.display_name}
                </Typography>
                {info && (
                  <Typography variant="caption" sx={{ color: info.color, fontWeight: 'bold', flexShrink: 0 }}>
                    {info.text}
                  </Typography>
                )}
              </Box>
              {/* 2行目: シチュエーション + コメント（1行で省略） */}
              {sub && (
                <Typography variant="caption" color="text.secondary" sx={{
                  display: 'block', pl: '30px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {sub}
                </Typography>
              )}
            </Box>
          )
        })}

        {hidden > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, textAlign: 'center' }}>
            他{hidden}件のレビュー
          </Typography>
        )}
      </Popup>
    </Marker>
  )
}

// ── メインページ ─────────────────────────────────
const apiBase = import.meta.env.VITE_API_BASE_URL as string

export default function MapPage() {
  const [restaurants, setRestaurants] = useState<MapRestaurant[]>([])
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [follows, setFollows] = useState<MutualFollow[]>([])
  const [filterOpen, setFilterOpen] = useState(false)

  // フィルター状態
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const [situationFilter, setSituationFilter] = useState<string | null>(null)
  const [genreFilter, setGenreFilter] = useState<string | null>(null)
  const [onlyMine, setOnlyMine] = useState(false)
  const [targetUserId, setTargetUserId] = useState<string | null>(null)
  const [distanceKm, setDistanceKm] = useState<number | null>(null)

  // 位置情報取得
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    )
  }, [])

  // 相互フォローユーザー取得
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

  // マップデータ取得
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

  useEffect(() => {
    fetchReviews()
    window.addEventListener('review-posted', fetchReviews)
    return () => window.removeEventListener('review-posted', fetchReviews)
  }, [fetchReviews])

  // クライアントサイドフィルター（距離・ジャンル）
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
        {filteredRestaurants.map((rs) => (
          <RestaurantMarker key={rs.restaurant_id} rs={rs} />
        ))}
      </MapContainer>

      {/* フィルタードロワー */}
      <Drawer
        anchor="bottom"
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        slotProps={{ paper: { sx: { borderRadius: '16px 16px 0 0', maxHeight: '78vh' } } }}
      >
        <Box sx={{ p: 2, overflow: 'auto', pb: 3 }}>
          {/* ヘッダー */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', flex: 1 }}>絞り込み</Typography>
            <IconButton size="small" onClick={() => setFilterOpen(false)}><CloseIcon /></IconButton>
          </Box>

          {/* 表示ユーザー */}
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

          {/* 距離 */}
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

          {/* ジャンル */}
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

          {/* シチュエーション */}
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

          {/* ロール */}
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

          {/* アクション */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={resetFilters} sx={{ flex: 1 }}>リセット</Button>
            <Button variant="contained" onClick={() => setFilterOpen(false)} sx={{ flex: 1 }}>閉じる</Button>
          </Box>
        </Box>
      </Drawer>
    </Box>
  )
}
