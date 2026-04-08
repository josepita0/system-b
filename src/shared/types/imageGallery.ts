export interface GalleryImage {
  id: number
  originalName: string
  storedRelPath: string
  mime: string
  sizeBytes: number
  width: number | null
  height: number | null
  sha256: string | null
  name: string | null
  description: string | null
  category: string | null
  createdAt: string
  updatedAt: string
}

export interface GalleryImageListParams {
  q?: string
  category?: string | null
  page?: number
  pageSize?: number
}

export interface GalleryImageListResult {
  items: GalleryImage[]
  total: number
  page: number
  pageSize: number
}

export interface GalleryImageMetadataPatch {
  name?: string | null
  description?: string | null
  category?: string | null
}

export interface LinkImagesToProductInput {
  productId: number
  imageIds: number[]
  setPrimaryImageId?: number | null
}

export interface UnlinkImageFromProductInput {
  productId: number
  imageId: number
}

export interface SetPrimaryProductImageInput {
  productId: number
  imageId: number
}
