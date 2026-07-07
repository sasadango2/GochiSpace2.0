import { supabase } from '../supabase'
import { compressImage } from './compressImage'

export async function uploadImages(userId: string, files: File[]): Promise<string[]> {
  const urls: string[] = []
  for (let i = 0; i < files.length; i++) {
    const compressed = await compressImage(files[i])
    const ext = files[i].name.split('.').pop() ?? 'jpg'
    const path = `${userId}/${Date.now()}-${i}.${ext}`
    const { error } = await supabase.storage.from('review-photos').upload(path, compressed)
    if (!error) {
      const { data } = supabase.storage.from('review-photos').getPublicUrl(path)
      urls.push(data.publicUrl)
    }
  }
  return urls
}
