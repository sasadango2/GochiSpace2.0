import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Box, Typography } from '@mui/material'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { supabase } from '../supabase'

// Leafletのデフォルトアイコン修正
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

type MapReview = {
  id: string
  rating: string
  display_name: string
  restaurant_id: string
  restaurant_name: string
  lat: number
  lng: number
}

const apiBase = import.meta.env.VITE_API_BASE_URL as string

export default function MapPage() {
  const [reviews, setReviews] = useState<MapReview[]>([])

  useEffect(() => {
    const fetchReviews = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${apiBase}/api/v1/reviews/map`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      setReviews(Array.isArray(data) ? data : [])
    }
    fetchReviews()
  }, [])

  return (
    <Box sx={{ height: 'calc(100vh - 56px)' }}>
      <MapContainer center={[35.6812, 139.7671]} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {reviews.map((r) => (
          <Marker key={r.id} position={[r.lat, r.lng]}>
            <Popup>
              <Typography variant="subtitle2">{r.restaurant_name}</Typography>
              <Typography variant="body2">{r.display_name}</Typography>
              <Typography variant="body2">{r.rating}</Typography>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </Box>
  )
}
