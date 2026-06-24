export const ROLES = ['家族', '友達', '知人', '上司', '先輩', '後輩', 'パートナー'] as const

export const SITUATIONS = ['デート', '家族の食事', '接待・仕事', '友人と', '一人飯', '記念日'] as const

export const GENRE_EN_TO_JA: Record<string, string> = {
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
  restaurant: 'レストラン',
}

export function normalizeGenre(genre: string | null | undefined): string | null {
  if (!genre) return null
  return GENRE_EN_TO_JA[genre] ?? genre
}

export const GENRES = [
  'ラーメン', 'イタリアン', '中華', '焼肉', '寿司',
  '和食', 'カフェ', 'バー', 'フレンチ', 'タイ料理',
  '韓国料理', 'インド料理', 'ピザ', 'バーガー', 'シーフード',
  'ファストフード', '居酒屋', 'その他',
] as const
