import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { genres } from './routes/genres.js'
import { users } from './routes/users.js'
import { follows } from './routes/follows.js'
import { restaurants } from './routes/restaurants.js'
import { reviews } from './routes/reviews.js'

const app = new Hono()

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173']

app.use('*', cors({ origin: allowedOrigins, allowHeaders: ['Authorization', 'Content-Type'] }))

app.get('/health', (c) => c.json({ status: 'ok' }))

app.route('/api/v1/genres', genres)
app.route('/api/v1/users', users)
app.route('/api/v1/follows', follows)
app.route('/api/v1/restaurants', restaurants)
app.route('/api/v1/reviews', reviews)

const port = Number(process.env.PORT) || 3000
serve({ fetch: app.fetch, port })
