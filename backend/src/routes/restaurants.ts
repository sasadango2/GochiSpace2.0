import { Hono } from 'hono'
import { sql } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const restaurants = new Hono()

restaurants.use('*', authMiddleware)

const PLACE_TYPE_TO_GENRE: Record<string, string> = {
  ramen_restaurant: 'ラーメン',
  italian_restaurant: 'イタリアン',
  chinese_restaurant: '中華',
  japanese_restaurant: '和食',
  sushi_restaurant: '寿司',
  pizza_restaurant: 'ピザ',
  steak_house: '焼肉',
  barbecue_restaurant: '焼肉',
  french_restaurant: 'フレンチ',
  indian_restaurant: 'インド料理',
  thai_restaurant: 'タイ料理',
  korean_restaurant: '韓国料理',
  cafe: 'カフェ',
  coffee_shop: 'カフェ',
  bar: 'バー',
  fast_food_restaurant: 'ファストフード',
  hamburger_restaurant: 'バーガー',
  seafood_restaurant: 'シーフード',
  noodle_restaurant: 'ラーメン',
  izakaya: '居酒屋',
}

function mapGenre(types: string[] | undefined): string | null {
  if (!types) return null
  for (const t of types) {
    if (PLACE_TYPE_TO_GENRE[t]) return PLACE_TYPE_TO_GENRE[t]
  }
  return null
}

restaurants.get('/search', async (c) => {
  const q = c.req.query('q')
  if (!q) return c.json({ error: { code: 'BAD_REQUEST', message: 'クエリが必要です' } }, 400)

  const apiKey = process.env.GOCHI_SPACE_API_KEY
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey as string,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.photos',
    },
    body: JSON.stringify({ textQuery: q, languageCode: 'ja' }),
  })

  const data = await res.json() as { places?: GooglePlace[] }
  const places = data.places ?? []

  if (places.length === 0) return c.json([])

  const values = places.map((p) => ({
    place_id: p.id,
    name: p.displayName.text,
    address: p.formattedAddress,
    lat: p.location.latitude,
    lng: p.location.longitude,
    genre: mapGenre(p.types),
    photo_url: p.photos?.[0]
      ? `https://places.googleapis.com/v1/${p.photos[0].name}/media?maxWidthPx=400&key=${apiKey}`
      : null,
  }))

  await sql`
    INSERT INTO restaurants ${sql(values, 'place_id', 'name', 'address', 'lat', 'lng', 'genre', 'photo_url')}
    ON CONFLICT (place_id) DO UPDATE SET
      name = EXCLUDED.name,
      address = EXCLUDED.address,
      lat = EXCLUDED.lat,
      lng = EXCLUDED.lng,
      genre = EXCLUDED.genre,
      photo_url = EXCLUDED.photo_url,
      cached_at = NOW()
  `

  const placeIds = places.map((p) => p.id)
  const rows = await sql`SELECT * FROM restaurants WHERE place_id = ANY(${placeIds})`
  return c.json(rows)
})

restaurants.get('/:id', async (c) => {
  const { id } = c.req.param()
  const [row] = await sql`SELECT * FROM restaurants WHERE id = ${id}`
  if (!row) return c.json({ error: { code: 'NOT_FOUND', message: '店舗が見つかりません' } }, 404)
  return c.json(row)
})

type GooglePlace = {
  id: string
  displayName: { text: string }
  formattedAddress: string
  location: { latitude: number; longitude: number }
  types?: string[]
  photos?: { name: string }[]
}

export { restaurants }
