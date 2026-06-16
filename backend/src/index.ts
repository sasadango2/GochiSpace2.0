import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { genres } from './routes/genres.js'
import { users } from './routes/users.js'
import { follows } from './routes/follows.js'
import { restaurants } from './routes/restaurants.js'
import { reviews } from './routes/reviews.js'

const app = new Hono()

app.get('/health', (c) => c.json({ status: 'ok' }))

app.route('/api/v1/genres', genres)
app.route('/api/v1/users', users)
app.route('/api/v1/follows', follows)
app.route('/api/v1/restaurants', restaurants)
app.route('/api/v1/reviews', reviews)

serve({ fetch: app.fetch, port: 3000 })
