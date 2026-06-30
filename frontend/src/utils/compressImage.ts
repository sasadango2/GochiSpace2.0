import imageCompression from 'browser-image-compression'

export async function compressImage(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 0.25,
    maxWidthOrHeight: 800,
    useWebWorker: true,
  })
}
