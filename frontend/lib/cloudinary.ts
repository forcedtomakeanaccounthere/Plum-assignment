export type UploadedFile = {
  url: string
  originalname: string
  publicId?: string
}

export function detectMediaFormat(file: File): 'image' | 'pdf' {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf'
  return 'image'
}

export async function uploadToCloudinary(file: File): Promise<UploadedFile> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in frontend/.env.local'
    )
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)
  formData.append('folder', 'plum_opd_claims')

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body: formData,
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error?.message || 'Cloudinary upload failed')
  }

  return {
    url: data.secure_url as string,
    originalname: file.name,
    publicId: data.public_id as string,
  }
}

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
  )
}
