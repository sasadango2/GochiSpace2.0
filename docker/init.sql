CREATE TYPE follow_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE rating_type AS ENUM ('want_to_revisit', 'average', 'not_good');

CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE genres (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL
);

CREATE TABLE user_genre_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  genre_id INT NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, genre_id)
);

CREATE TABLE follow_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status follow_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)
);

CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  address TEXT,
  lat DECIMAL(9,6),
  lng DECIMAL(9,6),
  genre VARCHAR(100),
  photo_url TEXT,
  cached_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  rating rating_type NOT NULL,
  comment TEXT,
  situation VARCHAR(50),
  photo_urls TEXT[],
  visited_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_follow_requests_from ON follow_requests(from_user_id, status);
CREATE INDEX idx_follow_requests_to   ON follow_requests(to_user_id, status);
CREATE INDEX idx_restaurants_location ON restaurants(lat, lng);
CREATE INDEX idx_reviews_user         ON reviews(user_id, created_at DESC);

INSERT INTO genres (name) VALUES
  ('和食'), ('洋食'), ('中華'), ('イタリアン'), ('フレンチ'),
  ('焼肉'), ('寿司'), ('ラーメン'), ('カフェ'), ('居酒屋');
