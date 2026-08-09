import type {
  ContentStatus,
  MediaType,
} from './domain'

export type MediaCreateInput = {
  organization_id: string | null
  type: MediaType
  title: string
  description: string | null
  external_url: string | null
  status: ContentStatus
}

export type MediaUpdateInput =
  Partial<MediaCreateInput>
