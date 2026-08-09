import { supabase } from '../lib/supabase'
import type {
  Announcement, AnnouncementRead, AttendanceCorrectionRequest, AttendanceRecord, Event, EventParticipant,
  MediaItem, Membership, Notification, Organization, Permission, PrayerRequest, Profile, PushDevice,
  Role, RoleAssignment, RolePermission, UserNotificationPreferences, VisibleProfile, WorshipService,
} from '../types/domain'

type TableName =
  | 'organizations' | 'organization_memberships' | 'roles' | 'permissions' | 'role_permissions' | 'role_assignments'
  | 'worship_services' | 'events' | 'event_participants' | 'attendance_records' | 'attendance_correction_requests'
  | 'announcements' | 'announcement_reads' | 'prayer_requests' | 'prayer_reactions' | 'media_items' | 'notifications' | 'notification_settings' | 'user_notification_preferences'
  | 'push_devices' | 'audit_logs'

async function select<T>(table: TableName, query?: (builder: any) => any): Promise<T[]> {
  let builder = supabase.from(table).select('*')
  if (query) builder = query(builder)
  const { data, error } = await builder
  if (error) throw error
  return (data ?? []) as T[]
}
async function insert<T>(table: TableName, payload: Record<string, unknown> | Record<string, unknown>[]): Promise<T[]> {
  const { data, error } = await supabase.from(table).insert(payload).select('*')
  if (error) throw error
  return (data ?? []) as T[]
}
async function insertNoSelect(table: TableName, payload: Record<string, unknown> | Record<string, unknown>[]): Promise<void> {
  const { error } = await supabase.from(table).insert(payload)
  if (error) throw error
}
async function update<T>(table: TableName, values: Record<string, unknown>, query: (builder: any) => any): Promise<T[]> {
  const { data, error } = await query(supabase.from(table).update(values)).select('*')
  if (error) throw error
  return (data ?? []) as T[]
}
async function remove(table: TableName, query: (builder: any) => any): Promise<void> {
  const { error } = await query(supabase.from(table).delete())
  if (error) throw error
}

export const api = {
  async getContext(userId: string) {
    const [{ data: profile, error: profileError }, organizations, memberships, assignments, roles, permissions, rolePermissions] = await Promise.all([
      supabase.rpc('get_my_profile').maybeSingle(),
      select<Organization>('organizations', (q) => q.order('name')),
      select<Membership>('organization_memberships', (q) => q.eq('user_id', userId).order('joined_at')),
      select<RoleAssignment>('role_assignments', (q) => q.eq('user_id', userId)),
      select<Role>('roles', (q) => q.order('name')),
      select<Permission>('permissions', (q) => q.order('key')),
      select<RolePermission>('role_permissions'),
    ])
    if (profileError) throw profileError
    return {
      profile: (profile ?? null) as Profile | null,
      organizations, memberships, assignments, roles, permissions, rolePermissions,
    }
  },

  organizations: {
    list: () => select<Organization>('organizations', (q) => q.eq('status', 'active').order('type').order('name')),
    create: (values: Pick<Organization, 'type'|'name'|'description'|'parent_organization_id'>) => insert<Organization>('organizations', values),
    update: (id: string, values: Partial<Pick<Organization, 'name'|'description'|'status'>>) =>
      update<Organization>('organizations', values, (q) => q.eq('id', id)),
    archive: (id: string) => update<Organization>('organizations', { status: 'archived' }, (q) => q.eq('id', id)),
  },

  memberships: {
    list: (organizationId: string) => select<Membership>('organization_memberships', (q) => q.eq('organization_id', organizationId).order('joined_at')),
    mine: () => select<Membership>('organization_memberships', (q) => q.order('joined_at')),
    add: (organizationId: string, userId: string, status: 'active'|'pending' = 'active') =>
      insert<Membership>('organization_memberships', { organization_id: organizationId, user_id: userId, status }),
    update: (id: string, values: Partial<Pick<Membership, 'status'|'left_at'>>) =>
      update<Membership>('organization_memberships', values, (q) => q.eq('id', id)),
    remove: (id: string) => api.memberships.update(id, { status: 'removed', left_at: new Date().toISOString() }),
  },

  profiles: {
    visible: async (organizationId: string) => {
      const { data, error } = await supabase.rpc('get_visible_profiles', { p_organization_id: organizationId })
      if (error) throw error
      return (data ?? []) as VisibleProfile[]
    },
    updateSelf: async (values: Partial<Pick<Profile, 'display_name'|'birth_date'|'phone'|'profile_image_path'>>) => {
      const { error } = await supabase.from('profiles').update(values).eq('id', (await supabase.auth.getUser()).data.user?.id)
      if (error) throw error
      return values
    },
  },

  roles: {
    assignments: () => select<RoleAssignment>('role_assignments', (q) => q.order('created_at', { ascending: false })),
    assign: (values: Pick<RoleAssignment, 'user_id'|'role_id'|'organization_id'>) => insert<RoleAssignment>('role_assignments', values),
    remove: (id: string) => remove('role_assignments', (q) => q.eq('id', id)),
  },

  announcements: {
    list: (organizationId?: string) => select<Announcement>('announcements', (q) => {
      let x = q.order('is_pinned', { ascending: false }).order('created_at', { ascending: false })
      return organizationId ? x.or(`organization_id.eq.${organizationId},organization_id.is.null`) : x
    }),
    create: (values: Partial<Announcement>) => insert<Announcement>('announcements', values),
    update: (id: string, values: Partial<Announcement>) => update<Announcement>('announcements', values, (q) => q.eq('id', id)),
    delete: (id: string) => remove('announcements', (q) => q.eq('id', id)),
    markRead: async (announcementId: string, userId: string) => {
      const { error } = await supabase.from('announcement_reads').upsert({ announcement_id: announcementId, user_id: userId })
      if (error) throw error
    },
    reads: () => select<AnnouncementRead>('announcement_reads'),
  },

  events: {
    list: (organizationId?: string) => select<Event>('events', (q) => {
      let x = q.order('starts_at', { ascending: true })
      return organizationId ? x.or(`organization_id.eq.${organizationId},organization_id.is.null`) : x
    }),
    create: (values: Partial<Event>) => insert<Event>('events', values),
    update: (id: string, values: Partial<Event>) => update<Event>('events', values, (q) => q.eq('id', id)),
    delete: (id: string) => remove('events', (q) => q.eq('id', id)),
    participants: (eventId: string) => select<EventParticipant>('event_participants', (q) => q.eq('event_id', eventId)),
    register: async (eventId: string) => {
      const { data, error } = await supabase.rpc('register_for_event', { p_event_id: eventId })
      if (error) throw error
      return data as EventParticipant
    },
    cancel: async (eventId: string) => {
      const { data, error } = await supabase.rpc('cancel_event_registration', { p_event_id: eventId })
      if (error) throw error
      return data as EventParticipant
    },
  },

  worship: {
    list: () => select<WorshipService>('worship_services', (q) => q.order('starts_at', { ascending: false })),
    create: (values: Partial<WorshipService>) => insert<WorshipService>('worship_services', values),
    update: (id: string, values: Partial<WorshipService>) => update<WorshipService>('worship_services', values, (q) => q.eq('id', id)),
    delete: (id: string) => remove('worship_services', (q) => q.eq('id', id)),
  },

  attendance: {
    list: () => select<AttendanceRecord>('attendance_records', (q) => q.order('created_at', { ascending: false })),
    requests: () => select<AttendanceCorrectionRequest>('attendance_correction_requests', (q) => q.order('created_at', { ascending: false })),
    set: async (values: { userId: string; status: string; eventId?: string; worshipServiceId?: string; note?: string }) => {
      const { data, error } = await supabase.rpc('set_attendance', {
        p_user_id: values.userId, p_status: values.status, p_event_id: values.eventId ?? null,
        p_worship_service_id: values.worshipServiceId ?? null, p_note: values.note ?? null,
      })
      if (error) throw error
      return data as AttendanceRecord
    },
    requestCorrection: async (recordId: string, requestedStatus: string, reason: string) => {
      const { data, error } = await supabase.rpc('request_attendance_correction', {
        p_attendance_record_id: recordId, p_requested_status: requestedStatus, p_reason: reason,
      })
      if (error) throw error
      return data as AttendanceCorrectionRequest
    },
    reviewCorrection: async (requestId: string, decision: string, reviewerNote?: string) => {
      const { data, error } = await supabase.rpc('review_attendance_correction', {
        p_request_id: requestId, p_decision: decision, p_reviewer_note: reviewerNote ?? null,
      })
      if (error) throw error
      return data as AttendanceCorrectionRequest
    },
  },

  prayers: {
    list: (organizationId: string) => supabase.rpc('get_prayer_requests', { p_organization_id: organizationId }).then(({ data, error }) => {
      if (error) throw error
      return (data ?? []) as PrayerRequest[]
    }),
    create: async (values: Partial<PrayerRequest> & { author_id: string }) => { await insertNoSelect('prayer_requests', values); },
    delete: (id: string) => remove('prayer_requests', (q) => q.eq('id', id)),
    react: async (prayerRequestId: string, userId: string, active: boolean) => {
      if (active) return remove('prayer_reactions', (q) => q.eq('prayer_request_id', prayerRequestId).eq('user_id', userId))
      await insert('prayer_reactions', { prayer_request_id: prayerRequestId, user_id: userId })
    },
  },

  media: {
    list: (organizationId?: string) => select<MediaItem>('media_items', (q) => {
      let x = q.order('created_at', { ascending: false })
      return organizationId ? x.or(`organization_id.eq.${organizationId},organization_id.is.null`) : x
    }),
    create: (values: Partial<MediaItem>) => insert<MediaItem>('media_items', values),
    update: (id: string, values: Partial<MediaItem>) => update<MediaItem>('media_items', values, (q) => q.eq('id', id)),
    delete: (id: string) => remove('media_items', (q) => q.eq('id', id)),
  },

  notificationSettings: {
    list: () => select<{ key:string; enabled:boolean; updated_by:string|null; updated_at:string }>('notification_settings', (q) => q.order('key')),
    save: (key:string, enabled:boolean) => update<{ key:string; enabled:boolean; updated_by:string|null; updated_at:string }>('notification_settings', { enabled }, (q) => q.eq('key', key)),
  },

  notifications: {
    list: () => select<Notification>('notifications', (q) => q.order('created_at', { ascending: false })),
    markRead: (id: string) => update<Notification>('notifications', { read_at: new Date().toISOString(), delivery_status: 'read' }, (q) => q.eq('id', id)),
    preferences: async (userId: string) => {
      const { data, error } = await supabase.from('user_notification_preferences').select('*').eq('user_id', userId).maybeSingle()
      if (error) throw error
      return data as UserNotificationPreferences | null
    },
    savePreferences: async (userId: string, enabled: boolean) => {
      const { data, error } = await supabase.from('user_notification_preferences').upsert({ user_id: userId, enabled }).select('*').single()
      if (error) throw error
      return data as UserNotificationPreferences
    },
    devices: (userId: string) => select<PushDevice>('push_devices', (q) => q.eq('user_id', userId)),
    removeDevice: (id: string) => remove('push_devices', (q) => q.eq('id', id)),
  },

  storage: {
    uploadProfileImage: async (userId: string, file: File) => {
      const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : 'jpg'
      const path = `profiles/${userId}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('sdm-profile-images').upload(path, file, { upsert: false, contentType: file.type || undefined })
      if (error) throw error
      try {
        await api.profiles.updateSelf({ profile_image_path: path })
        return path
      } catch (cause) {
        await supabase.storage.from('sdm-profile-images').remove([path]).catch(() => undefined)
        throw cause
      }
    },
    uploadMedia: async (organizationId: string, file: File) => {
      const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : 'bin'
      const path = `media/${organizationId}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('sdm-media').upload(path, file, { upsert: false, contentType: file.type || undefined })
      if (error) throw error
      return { path, bucket: 'sdm-media', mime_type: file.type || null, file_size_bytes: file.size }
    },
    signedUrl: async (bucket: string, path: string, expiresIn = 3600) => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
      if (error) throw error
      return data.signedUrl
    },
    delete: async (bucket: string, path: string) => {
      const { error } = await supabase.storage.from(bucket).remove([path])
      if (error) throw error
    },
  },

  audit: {
    list: () => select<any>('audit_logs', (q) => q.order('created_at', { ascending: false }).limit(200)),
  },
}
