import type {
  GalleryImage,
  GalleryImageListParams,
  GalleryImageListResult,
  GalleryImageMetadataPatch,
  LinkImagesToProductInput,
  SetPrimaryProductImageInput,
  UnlinkImageFromProductInput,
} from '../types/imageGallery'

export const imageGalleryChannels = {
  pickFiles: 'imageGallery:pickFiles',
  pickFolder: 'imageGallery:pickFolder',
  importFiles: 'imageGallery:importFiles',
  importFolder: 'imageGallery:importFolder',
  list: 'imageGallery:list',
  updateMetadata: 'imageGallery:updateMetadata',
  deleteBatch: 'imageGallery:deleteBatch',
  linkToProduct: 'imageGallery:linkToProduct',
  unlinkFromProduct: 'imageGallery:unlinkFromProduct',
  setPrimaryForProduct: 'imageGallery:setPrimaryForProduct',
} as const

export interface ImageGalleryApi {
  pickFiles: () => Promise<string[]>
  pickFolder: () => Promise<string | null>
  importFiles: (filePaths: string[]) => Promise<GalleryImage[]>
  importFolder: (folderPath: string) => Promise<GalleryImage[]>
  list: (params: GalleryImageListParams) => Promise<GalleryImageListResult>
  updateMetadata: (id: number, patch: GalleryImageMetadataPatch) => Promise<GalleryImage | null>
  deleteBatch: (ids: number[]) => Promise<{ deleted: number }>
  linkToProduct: (payload: LinkImagesToProductInput) => Promise<{ success: true }>
  unlinkFromProduct: (payload: UnlinkImageFromProductInput) => Promise<{ success: true }>
  setPrimaryForProduct: (payload: SetPrimaryProductImageInput) => Promise<{ success: true }>
}

