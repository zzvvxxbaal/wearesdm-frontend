export type ProfileStatus = 'active' | 'inactive' | 'suspended' | 'withdrawn'
export type OrganizationType = 'team' | 'small_group' | 'club' | 'volunteer_team'
export type OrganizationStatus = 'active' | 'inactive' | 'archived'
export type MembershipStatus = 'active' | 'pending' | 'left' | 'removed'
export type RoleScopeType = 'global' | 'organization'
export type EventType = 'worship' | 'church_event' | 'retreat' | 'small_group' | 'club' | 'volunteer' | 'other'
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed'
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused' | 'pending'
export type AttendanceRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type ContentStatus = 'draft' | 'published' | 'archived'
export type MediaType = 'video' | 'photo' | 'audio' | 'document'
export type PrayerVisibility = 'public' | 'private'

export interface Profile {
  id: string
  display_name: string
  profile_image_path: string | null
  birth_date: string | null
  phone: string | null
  email: string | null
  status: ProfileStatus
  created_at: string
  updated_at: string
}
export interface Organization {
  id: string
  type: OrganizationType
  parent_organization_id: string | null
  name: string
  description: string | null
  status: OrganizationStatus
  created_at: string
  updated_at: string
}
export interface Membership {
  id: string
  organization_id: string
  user_id: string
  status: MembershipStatus
  joined_at: string
  left_at: string | null
  created_at: string
  updated_at: string
}
export interface Role { id: string; key: string; name: string; description: string | null; scope_type: RoleScopeType; is_system: boolean; created_at: string }
export interface Permission { id: string; key: string; name: string; description: string | null; created_at: string }
export interface RoleAssignment {
  id: string
  user_id: string
  role_id: string
  organization_id: string | null
  assigned_by: string | null
  created_at: string
}
export interface WorshipService {
  id: string; organization_id: string | null; title: string; starts_at: string; ends_at: string | null; location: string | null
  preacher_name: string | null; sermon_title: string | null; bible_reference: string | null; praise_info: string | null
  description: string | null; is_published: boolean; created_by: string | null; created_at: string; updated_at: string
}
export interface Event {
  id: string; organization_id: string | null; type: EventType; title: string; description: string | null
  starts_at: string; ends_at: string | null; location: string | null; capacity: number | null
  registration_open_at: string | null; registration_close_at: string | null; status: EventStatus
  created_by: string | null; created_at: string; updated_at: string
}
export interface EventParticipant { event_id: string; user_id: string; registered_at: string; cancelled_at: string | null }
export interface AttendanceRecord {
  id: string; event_id: string | null; worship_service_id: string | null; user_id: string; status: AttendanceStatus
  processed_by: string | null; processed_at: string | null; note: string | null; created_at: string; updated_at: string
}
export interface AttendanceCorrectionRequest {
  id: string; attendance_record_id: string; requester_id: string; original_status: AttendanceStatus
  requested_status: AttendanceStatus; reason: string; status: AttendanceRequestStatus; reviewed_by: string | null
  reviewed_at: string | null; reviewer_note: string | null; created_at: string; updated_at: string
}
export interface Announcement {
  id: string; organization_id: string | null; title: string; body: string; is_pinned: boolean
  status: ContentStatus; publish_at: string | null; expire_at: string | null; created_by: string | null; created_at: string; updated_at: string
}
export interface AnnouncementRead { announcement_id: string; user_id: string; read_at: string }
export interface PrayerRequest {
  id: string; organization_id: string; title: string | null; body: string; visibility: PrayerVisibility
  is_anonymous: boolean; status: ContentStatus; created_at: string; updated_at: string
  visible_author_id: string | null; visible_author_name: string | null; reaction_count: number; reacted_by_me: boolean
}
export interface MediaItem {
  id: string; organization_id: string | null; type: MediaType; title: string; description: string | null
  storage_bucket: string | null; storage_path: string | null; external_url: string | null; mime_type: string | null
  file_size_bytes: number | null; duration_seconds: number | null; thumbnail_path: string | null; status: ContentStatus
  uploaded_by: string | null; created_at: string; updated_at: string
}
export interface Notification {
  id: string; user_id: string; type: string; title: string; body: string; data: Record<string, unknown>
  delivery_status: string; sent_at: string | null; read_at: string | null; created_at: string
}
export interface UserNotificationPreferences { user_id: string; enabled: boolean; updated_at: string }
export interface PushDevice { id: string; user_id: string; platform: 'ios' | 'android' | 'web'; device_token: string; app_bundle_id: string | null; is_active: boolean; last_seen_at: string; created_at: string }
export interface AuditLog {
  id: number; actor_user_id: string | null; action: string; entity_type: string; entity_id: string | null
  organization_id: string | null; metadata: Record<string, unknown>; created_at: string
}
export interface VisibleProfile { id: string; display_name: string; profile_image_path: string | null; status: ProfileStatus }
export interface RolePermission { role_id: string; permission_id: string }
export interface AppContextData {
  profile: Profile | null
  organizations: Organization[]
  memberships: Membership[]
  assignments: RoleAssignment[]
  roles: Role[]
  permissions: Permission[]
  rolePermissions: RolePermission[]
}
