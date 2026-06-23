import { useEffect, useState, useCallback, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Box, Typography, Chip, Divider } from '@mui/material'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { supabase } from '../supabase'
import { ROLES, SITUATIONS } from '../constants'

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
  reviews: ReviewSummary[]
}

const RATING_LABEL: Record<string, { text: string; color: string }> = {
  want_to_revisit: { text: 'また行きたい', color: '#16a34a' },
  average:         { text: '普通',         color: '#ca8a04' },
  not_good:        { text: '好みじゃなかった', color: '#dc2626' },
}

const PRIMARY = '#7c3aed'

function createPinIcon(count: number) {
  const label = count > 9 ? '9+' : String(count)
  const fontSize = count > 9 ? 9 : 12
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:36px;height:44px;filter:drop-shadow(0 2px 4px rgba(124,58,237,0.4))">
        <svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 0C8.06 0 0 8.06 0 18c0 12.15 18 26 18 26s18-13.85 18-26C36 8.06 27.94 0 18 0z" fill="${PRIMARY}"/>
          <circle cx="18" cy="18" r="11" fill="white"/>
        </svg>
        <span style="
          position:absolute;top:7px;left:0;width:36px;
          text-align:center;font-size:${fontSize}px;font-weight:700;
          color:${PRIMARY};line-height:22px;font-family:sans-serif;
        ">${label}</span>
      </div>`,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -46],
  })
}

const apiBase = import.meta.env.VITE_API_BASE_URL as string

export default function MapPage() {
  const [restaurants, setRestaurants] = useState<MapRestaurant[]>([])
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const [situationFilter, setSituationFilter] = useState<string | null>(null)

  const fetchReviews = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const params = new URLSearchParams()
    if (roleFilter) params.set('role', roleFilter)
    if (situationFilter) params.set('situation', situationFilter)
    const res = await fetch(`${apiBase}/api/v1/reviews/map?${params}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    const data = await res.json()
    setRestaurants(Array.isArray(data) ? data : [])
  }, [roleFilter, situationFilter])

  useEffect(() => {
    fetchReviews()
    window.addEventListener('review-posted', fetchReviews)
    return () => window.removeEventListener('review-posted', fetchReviews)
  }, [fetchReviews])

  const toggleFilter = (value: string, current: string | null, setter: (v: string | null) => void) =>
    setter(current === value ? null : value)

  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      {/* フィルターバー */}
      <Box sx={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000, bgcolor: 'background.paper', borderRadius: 3, px: 1.5, py: 1,
        display: 'flex', flexDirection: 'column', gap: 0.75, maxWidth: '92vw',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {ROLES.map((r) => (
            <Chip key={r} label={r} size="small"
              color={roleFilter === r ? 'primary' : 'default'}
              onClick={() => toggleFilter(r, roleFilter, setRoleFilter)}
              sx={{ borderRadius: 2 }}
            />
          ))}
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {SITUATIONS.map((s) => (
            <Chip key={s} label={s} size="small"
              color={situationFilter === s ? 'secondary' : 'default'}
              onClick={() => toggleFilter(s, situationFilter, setSituationFilter)}
              sx={{ borderRadius: 2 }}
            />
          ))}
        </Box>
      </Box>

      <MapContainer center={[35.6812, 139.7671]} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {restaurants.map((rs) => (
          <RestaurantMarker key={rs.restaurant_id} rs={rs} />
        ))}
      </MapContainer>
    </Box>
  )
}

function RestaurantMarker({ rs }: { rs: MapRestaurant }) {
  const icon = useMemo(() => createPinIcon(rs.reviews.length), [rs.reviews.length])

  return (
    <Marker position={[Number(rs.lat), Number(rs.lng)]} icon={icon}>
      <Popup minWidth={220} maxWidth={280}>
        {/* 店舗名ヘッダー */}
        <Box sx={{
          bgcolor: PRIMARY, color: 'white', mx: -1.5, mt: -1.5, mb: 1,
          px: 1.5, py: 1, borderRadius: '8px 8px 0 0',
        }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'white' }}>
            {rs.restaurant_name}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
            {rs.reviews.length}件のレビュー
          </Typography>
        </Box>

        {/* レビュー一覧 */}
        {rs.reviews.map((rv, i) => {
          const ratingInfo = RATING_LABEL[rv.rating]
          return (
            <Box key={rv.id}>
              {i > 0 && <Divider sx={{ my: 0.75 }} />}
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.25 }}>{rv.display_name}</Typography>
              {ratingInfo && (
                <Typography variant="caption" sx={{ color: ratingInfo.color, fontWeight: 'bold' }}>
                  {ratingInfo.text}
                </Typography>
              )}
              {rv.situation && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {rv.situation}
                </Typography>
              )}
              {rv.comment && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                  {rv.comment}
                </Typography>
              )}
            </Box>
          )
        })}
      </Popup>
    </Marker>
  )
}
