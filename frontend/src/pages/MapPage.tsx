import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Box, Typography, Chip } from '@mui/material'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { supabase } from '../supabase'
import { ROLES, SITUATIONS } from '../constants'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

type MapReview = {
  id: string
  rating: string
  display_name: string
  restaurant_id: string
  restaurant_name: string
  lat: number | string
  lng: number | string
}

const RATING_LABEL: Record<string, string> = {
  want_to_revisit: 'また行きたい',
  average: '普通',
  not_good: '好みじゃなかった',
}

const apiBase = import.meta.env.VITE_API_BASE_URL as string

export default function MapPage() {
  const [reviews, setReviews] = useState<MapReview[]>([])
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
    setReviews(Array.isArray(data) ? data : [])
  }, [roleFilter, situationFilter])

  useEffect(() => {
    fetchReviews()
    window.addEventListener('review-posted', fetchReviews)
    return () => window.removeEventListener('review-posted', fetchReviews)
  }, [fetchReviews])

  const toggleFilter = (value: string, current: string | null, setter: (v: string | null) => void) =>
    setter(current === value ? null : value)

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', position: 'relative' }}>
      <Box sx={{
        position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000, bgcolor: 'background.paper', borderRadius: 2, p: 1,
        display: 'flex', flexDirection: 'column', gap: 0.5, maxWidth: '90vw',
        boxShadow: 2,
      }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {ROLES.map((r) => (
            <Chip key={r} label={r} size="small"
              color={roleFilter === r ? 'primary' : 'default'}
              onClick={() => toggleFilter(r, roleFilter, setRoleFilter)}
            />
          ))}
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {SITUATIONS.map((s) => (
            <Chip key={s} label={s} size="small"
              color={situationFilter === s ? 'secondary' : 'default'}
              onClick={() => toggleFilter(s, situationFilter, setSituationFilter)}
            />
          ))}
        </Box>
      </Box>
      <MapContainer center={[35.6812, 139.7671]} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {reviews.map((r) => (
          <Marker key={r.id} position={[Number(r.lat), Number(r.lng)]}>
            <Popup>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{r.restaurant_name}</Typography>
              <Typography variant="body2">{r.display_name}</Typography>
              <Typography variant="body2">{RATING_LABEL[r.rating] ?? r.rating}</Typography>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </Box>
  )
}
