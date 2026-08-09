import { supabase, assertSupabaseConfigured } from '../lib/supabase'
import type {
  Announcement,
  AnnouncementRead,
  AttendanceCorrectionRequest,
  AttendanceRecord,
  Event,
  EventParticipant,
  MediaItem,
  Membership,
  Notification,
  Organization,
  Permission,
  PrayerRequest,
  Profile,
  PushDevice,
  Role,
  RoleAssignment,
  RolePermission,
  UserNotificationPreferences,
  VisibleProfile,
  WorshipService,
} from '../types/domain'
import type {
  MediaCreateInput,
  MediaUpdateInput,
} from '../types/media'

type TableName =
  | 'organizations'
  | 'organization_memberships'
  | 'roles'
  | 'permissions'
  | 'role_permissions'
  | 'role_assignments'
  | 'worship_services'
  | 'events'
  | 'event_participants'
  | 'attendance_records'
  | 'attendance_correction_requests'
  | 'announcements'
  | 'announcement_reads'
  | 'prayer_requests'
  | 'prayer_reactions'
  | 'media_items'
  | 'notifications'
  | 'notification_settings'
  | 'user_notification_preferences'
  | 'push_devices'
  | 'audit_logs'

function assertId(value: string, label = 'ID') {
  if (!value.trim()) throw new Error(`${label}가 없습니다.`)
  return value.trim()
}

async function select<T>(
  table: TableName,
  query?: (builder: any) => any,
): Promise<T[]> {
  assertSupabaseConfigured()
  let builder = supabase.from(table).select('*')
  if (query) builder = query(builder)

  const { data, error } = await builder
  if (error) throw error
  return (data ?? []) as T[]
}

async function insert<T>(
  table: TableName,
  payload: Record<string, unknown> | Record<string, unknown>[],
): Promise<T[]> {
  assertSupabaseConfigured()
  const rows = Array.isArray(payload) ? payload : [payload]
  if (!rows.length) throw new Error('저장할 데이터가 없습니다.')

  const { data, error } = await supabase
    .from(table)
    .insert(payload)
    .select('*')

  if (error) throw error
  const result = (data ?? []) as T[]
  if (!result.length) throw new Error('데이터 저장 결과를 확인할 수 없습니다.')
  return result
}

async function update<T>(
  table: TableName,
  values: Record<string, unknown>,
  query: (builder: any) => any,
): Promise<T[]> {
  assertSupabaseConfigured()
  if (!Object.keys(values).length) throw new Error('변경할 데이터가 없습니다.')

  const { data, error } = await query(
    supabase.from(table).update(values),
  ).select('*')

  if (error) throw error
  const result = (data ?? []) as T[]
  if (!result.length) {
    throw new Error('변경된 데이터가 없습니다. 권한이 없거나 대상이 이미 삭제되었을 수 있습니다.')
  }
  return result
}

async function remove(
  table: TableName,
  query: (builder: any) => any,
): Promise<void> {
  assertSupabaseConfigured()
  const { data, error } = await query(
    supabase.from(table).delete(),
  ).select('id')

  if (error) throw error
  if (!data?.length) {
    throw new Error('삭제된 데이터가 없습니다. 권한이 없거나 대상이 이미 삭제되었을 수 있습니다.')
  }
}

function sanitizeExtension(fileName: string, fallback: string) {
  const raw = fileName.includes('.') ? fileName.split('.').pop() : undefined
  const extension = raw?.toLowerCase().replace(/[^a-z0-9]/g, '')
  return extension && extension.length <= 10 ? extension : fallback
}

export const api = {
  async getContext(userId: string) {
    assertSupabaseConfigured()
    const id = assertId(userId, '사용자 ID')
    const [
      { data: profile, error: profileError },
      organizations,
      memberships,
      assignments,
      roles,
      permissions,
      rolePermissions,
    ] = await Promise.all([
      supabase
        .rpc('get_my_profile')
        .maybeSingle(),

      select<Organization>(
        'organizations',
        (query) =>
          query.order('name'),
      ),

      select<Membership>(
        'organization_memberships',
        (query) =>
          query
            .eq('user_id', userId)
            .order('joined_at'),
      ),

      select<RoleAssignment>(
        'role_assignments',
        (query) =>
          query.eq(
            'user_id',
            id,
          ),
      ),

      select<Role>(
        'roles',
        (query) =>
          query.order('name'),
      ),

      select<Permission>(
        'permissions',
        (query) =>
          query.order('key'),
      ),

      select<RolePermission>(
        'role_permissions',
      ),
    ])

    if (profileError) {
      throw profileError
    }

    return {
      profile:
        (profile ??
          null) as Profile | null,
      organizations,
      memberships,
      assignments,
      roles,
      permissions,
      rolePermissions,
    }
  },

  organizations: {
    list: () =>
      select<Organization>(
        'organizations',
        (query) =>
          query
            .eq(
              'status',
              'active',
            )
            .order('type')
            .order('name'),
      ),

    create: (
      values: Pick<
        Organization,
        | 'type'
        | 'name'
        | 'description'
        | 'parent_organization_id'
      >,
    ) =>
      insert<Organization>(
        'organizations',
        values,
      ),

    update: (
      id: string,
      values: Partial<
        Pick<
          Organization,
          | 'name'
          | 'description'
          | 'status'
        >
      >,
    ) =>
      update<Organization>(
        'organizations',
        values,
        (query) =>
          query.eq('id', id),
      ),

    delete: (id: string) =>
      remove(
        'organizations',
        (query) =>
          query.eq('id', id),
      ),
  },

  profiles: {
    visible: (
      organizationId: string,
    ) => {
      void organizationId
      return select<VisibleProfile>(
        'profiles',
        (query) =>
          query
            .eq(
              'status',
              'active',
            )
            .order(
              'display_name',
            ),
      )
    },

    updateSelf: async (
      values: Partial<
        Pick<
          Profile,
          | 'display_name'
          | 'profile_image_path'
          | 'birth_date'
          | 'phone'
        >
      >,
    ) => {
      assertSupabaseConfigured()
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error
      const userId = data.user?.id
      if (!userId) throw new Error('로그인 정보를 확인할 수 없습니다.')
      return update<Profile>(
        'profiles',
        values,
        (query) => query.eq('id', userId),
      )
    },
  },

  memberships: {
    list: (
      organizationId: string,
    ) =>
      select<Membership>(
        'organization_memberships',
        (query) =>
          query
            .eq(
              'organization_id',
              organizationId,
            )
            .order(
              'created_at',
              {
                ascending: true,
              },
            ),
      ),

    add: (
      organizationId: string,
      userId: string,
      status:
        | 'active'
        | 'pending' = 'active',
    ) =>
      insert<Membership>(
        'organization_memberships',
        {
          organization_id:
            organizationId,
          user_id: userId,
          status,
        },
      ),

    update: (
      id: string,
      values: Partial<
        Pick<
          Membership,
          'status' | 'left_at'
        >
      >,
    ) =>
      update<Membership>(
        'organization_memberships',
        values,
        (query) =>
          query.eq(
            'id',
            id,
          ),
      ),
  },

  roles: {
    list: () =>
      select<Role>(
        'roles',
        (query) =>
          query.order('name'),
      ),
  },

  permissions: {
    list: () =>
      select<Permission>(
        'permissions',
        (query) =>
          query.order('key'),
      ),
  },

  roleAssignments: {
    list: () =>
      select<RoleAssignment>(
        'role_assignments',
        (query) =>
          query.order(
            'created_at',
            {
              ascending: false,
            },
          ),
      ),

    create: (
      values: Pick<
        RoleAssignment,
        | 'user_id'
        | 'role_id'
        | 'organization_id'
        | 'assigned_by'
      >,
    ) =>
      insert<RoleAssignment>(
        'role_assignments',
        values,
      ),

    delete: (id: string) =>
      remove(
        'role_assignments',
        (query) =>
          query.eq(
            'id',
            id,
          ),
      ),
  },

  rolePermissions: {
    list: () =>
      select<RolePermission>(
        'role_permissions',
      ),
  },

  worshipServices: {
    list: (
      organizationId?: string,
    ) =>
      select<WorshipService>(
        'worship_services',
        (query) => {
          const ordered =
            query.order(
              'starts_at',
              {
                ascending: true,
              },
            )

          return organizationId
            ? ordered.eq(
                'organization_id',
                organizationId,
              )
            : ordered
        },
      ),

    create: (
      values: Omit<
        WorshipService,
        | 'id'
        | 'created_at'
        | 'updated_at'
      >,
    ) =>
      insert<WorshipService>(
        'worship_services',
        values,
      ),

    update: (
      id: string,
      values: Partial<
        Omit<
          WorshipService,
          | 'id'
          | 'created_at'
          | 'updated_at'
        >
      >,
    ) =>
      update<WorshipService>(
        'worship_services',
        values,
        (query) =>
          query.eq(
            'id',
            id,
          ),
      ),

    delete: (id: string) =>
      remove(
        'worship_services',
        (query) =>
          query.eq(
            'id',
            id,
          ),
      ),
  },

  events: {
    list: (
      organizationId?: string,
    ) =>
      select<Event>(
        'events',
        (query) => {
          const ordered =
            query.order(
              'starts_at',
              {
                ascending: true,
              },
            )

          return organizationId
            ? ordered.eq(
                'organization_id',
                organizationId,
              )
            : ordered
        },
      ),

    create: (
      values: Omit<
        Event,
        | 'id'
        | 'created_at'
        | 'updated_at'
      >,
    ) =>
      insert<Event>(
        'events',
        values,
      ),

    update: (
      id: string,
      values: Partial<
        Omit<
          Event,
          | 'id'
          | 'created_at'
          | 'updated_at'
        >
      >,
    ) =>
      update<Event>(
        'events',
        values,
        (query) =>
          query.eq(
            'id',
            id,
          ),
      ),

    delete: (id: string) =>
      remove(
        'events',
        (query) =>
          query.eq(
            'id',
            id,
          ),
      ),
  },

  participants: {
    list: (
      eventId: string,
    ) =>
      select<EventParticipant>(
        'event_participants',
        (query) =>
          query
            .eq(
              'event_id',
              eventId,
            )
            .order(
              'registered_at',
            ),
      ),

    add: (
      eventId: string,
      userId: string,
    ) =>
      insert<EventParticipant>(
        'event_participants',
        {
          event_id: eventId,
          user_id: userId,
        },
      ),

    remove: (
      eventId: string,
      userId: string,
    ) =>
      remove(
        'event_participants',
        (query) =>
          query
            .eq(
              'event_id',
              eventId,
            )
            .eq(
              'user_id',
              userId,
            ),
      ),
  },

  attendance: {
    list: (
      eventId?: string,
      worshipServiceId?: string,
    ) =>
      select<AttendanceRecord>(
        'attendance_records',
        (query) => {
          let next =
            query.order(
              'created_at',
              {
                ascending: false,
              },
            )

          if (eventId) {
            next = next.eq(
              'event_id',
              eventId,
            )
          }

          if (worshipServiceId) {
            next =
              next.eq(
                'worship_service_id',
                worshipServiceId,
              )
          }

          return next
        },
      ),

    create: (
      values: Omit<
        AttendanceRecord,
        | 'id'
        | 'created_at'
        | 'updated_at'
      >,
    ) =>
      insert<AttendanceRecord>(
        'attendance_records',
        values,
      ),

    update: (
      id: string,
      values: Partial<
        Pick<
          AttendanceRecord,
          | 'status'
          | 'note'
          | 'processed_by'
          | 'processed_at'
        >
      >,
    ) =>
      update<AttendanceRecord>(
        'attendance_records',
        values,
        (query) =>
          query.eq(
            'id',
            id,
          ),
      ),
  },

  attendanceCorrections: {
    list: () =>
      select<AttendanceCorrectionRequest>(
        'attendance_correction_requests',
        (query) =>
          query.order(
            'created_at',
            {
              ascending: false,
            },
          ),
      ),

    create: (
      values: Pick<
        AttendanceCorrectionRequest,
        | 'attendance_record_id'
        | 'requester_id'
        | 'original_status'
        | 'requested_status'
        | 'reason'
      >,
    ) =>
      insert<AttendanceCorrectionRequest>(
        'attendance_correction_requests',
        values,
      ),

    update: (
      id: string,
      values: Partial<
        Pick<
          AttendanceCorrectionRequest,
          | 'status'
          | 'reviewed_by'
          | 'reviewed_at'
          | 'reviewer_note'
        >
      >,
    ) =>
      update<AttendanceCorrectionRequest>(
        'attendance_correction_requests',
        values,
        (query) =>
          query.eq(
            'id',
            id,
          ),
      ),
  },

  announcements: {
    list: (
      organizationId?: string,
    ) =>
      select<Announcement>(
        'announcements',
        (query) => {
          const ordered =
            query
              .order(
                'is_pinned',
                {
                  ascending: false,
                },
              )
              .order(
                'created_at',
                {
                  ascending: false,
                },
              )

          return organizationId
            ? ordered.eq(
                'organization_id',
                organizationId,
              )
            : ordered
        },
      ),

    create: (
      values: Omit<
        Announcement,
        | 'id'
        | 'created_at'
        | 'updated_at'
      >,
    ) =>
      insert<Announcement>(
        'announcements',
        values,
      ),

    update: (
      id: string,
      values: Partial<
        Omit<
          Announcement,
          | 'id'
          | 'created_at'
          | 'updated_at'
        >
      >,
    ) =>
      update<Announcement>(
        'announcements',
        values,
        (query) =>
          query.eq(
            'id',
            id,
          ),
      ),

    delete: (id: string) =>
      remove(
        'announcements',
        (query) =>
          query.eq(
            'id',
            id,
          ),
      ),
  },

  prayers: {
    list: async (
      organizationId: string,
    ) => {
      const result =
        await select<PrayerRequest>(
          'prayer_requests',
          (query) =>
            query
              .eq(
                'organization_id',
                organizationId,
              )
              .eq(
                'status',
                'published',
              )
              .order(
                'created_at',
                {
                  ascending: false,
                },
              ),
        )

      return result
    },

    create: (
      values: Pick<
        PrayerRequest,
        | 'organization_id'
        | 'title'
        | 'body'
        | 'visibility'
        | 'is_anonymous'
        | 'status'
      > & {
        author_id: string
      },
    ) =>
      insert<PrayerRequest>(
        'prayer_requests',
        values,
      ),

    react: async (
      prayerRequestId: string,
      userId: string,
      active: boolean,
    ) => {
      if (active) {
        return remove(
          'prayer_reactions',
          (query) =>
            query
              .eq(
                'prayer_request_id',
                prayerRequestId,
              )
              .eq(
                'user_id',
                userId,
              ),
        )
      }

      await insert(
        'prayer_reactions',
        {
          prayer_request_id:
            prayerRequestId,
          user_id: userId,
        },
      )
    },
  },

  media: {
    list: (
      organizationId?: string,
    ) =>
      select<MediaItem>(
        'media_items',
        (query) => {
          const ordered =
            query.order(
              'created_at',
              {
                ascending: false,
              },
            )

          return organizationId
            ? ordered.or(
                `organization_id.eq.${organizationId},organization_id.is.null`,
              )
            : ordered
        },
      ),

    create: (
      values: MediaCreateInput,
    ) =>
      insert<MediaItem>(
        'media_items',
        values,
      ),

    update: (
      id: string,
      values: MediaUpdateInput,
    ) =>
      update<MediaItem>(
        'media_items',
        values,
        (query) =>
          query.eq(
            'id',
            id,
          ),
      ),

    delete: (id: string) =>
      remove(
        'media_items',
        (query) =>
          query.eq(
            'id',
            id,
          ),
      ),
  },

  notificationSettings: {
    list: () =>
      select<{
        key: string
        enabled: boolean
        updated_by: string | null
        updated_at: string
      }>(
        'notification_settings',
        (query) =>
          query.order('key'),
      ),

    save: (
      key: string,
      enabled: boolean,
    ) =>
      update<{
        key: string
        enabled: boolean
        updated_by: string | null
        updated_at: string
      }>(
        'notification_settings',
        { enabled },
        (query) =>
          query.eq(
            'key',
            key,
          ),
      ),
  },

  notifications: {
    list: () =>
      select<Notification>(
        'notifications',
        (query) =>
          query.order(
            'created_at',
            {
              ascending: false,
            },
          ),
      ),

    markRead: (id: string) =>
      update<Notification>(
        'notifications',
        {
          read_at:
            new Date().toISOString(),
          delivery_status:
            'read',
        },
        (query) =>
          query.eq(
            'id',
            id,
          ),
      ),

    preferences: async (
      userId: string,
    ) => {
      const { data, error } =
        await supabase
          .from(
            'user_notification_preferences',
          )
          .select('*')
          .eq(
            'user_id',
            userId,
          )
          .maybeSingle()

      if (error) {
        throw error
      }

      return data as UserNotificationPreferences | null
    },

    savePreferences: async (
      userId: string,
      enabled: boolean,
    ) => {
      const { data, error } =
        await supabase
          .from(
            'user_notification_preferences',
          )
          .upsert({
            user_id: userId,
            enabled,
          })
          .select('*')
          .single()

      if (error) {
        throw error
      }

      return data as UserNotificationPreferences
    },

    devices: (
      userId: string,
    ) =>
      select<PushDevice>(
        'push_devices',
        (query) =>
          query.eq(
            'user_id',
            userId,
          ),
      ),

    removeDevice: (
      id: string,
    ) =>
      remove(
        'push_devices',
        (query) =>
          query.eq(
            'id',
            id,
          ),
      ),
  },

  storage: {
    uploadProfileImage: async (
      userId: string,
      file: File,
    ) => {
      assertSupabaseConfigured()
      const id = assertId(userId, '사용자 ID')
      const ext = sanitizeExtension(file.name, 'jpg')
      const path = `profiles/${id}/${crypto.randomUUID()}.${ext}`

      const { error } =
        await supabase.storage
          .from(
            'sdm-profile-images',
          )
          .upload(
            path,
            file,
            {
              upsert: false,
              contentType:
                file.type ||
                undefined,
            },
          )

      if (error) {
        throw error
      }

      try {
        await api.profiles.updateSelf({
          profile_image_path:
            path,
        })

        return path
      } catch (cause) {
        await supabase.storage
          .from(
            'sdm-profile-images',
          )
          .remove([path])
          .catch(
            () => undefined,
          )

        throw cause
      }
    },

    uploadMedia: async (
      organizationId: string,
      file: File,
    ) => {
      assertSupabaseConfigured()
      const id = assertId(organizationId, '조직 ID')
      const ext = sanitizeExtension(file.name, 'bin')
      const path = `media/${id}/${crypto.randomUUID()}.${ext}`

      const { error } =
        await supabase.storage
          .from('sdm-media')
          .upload(
            path,
            file,
            {
              upsert: false,
              contentType:
                file.type ||
                undefined,
            },
          )

      if (error) {
        throw error
      }

      return {
        path,
        bucket: 'sdm-media',
        mime_type:
          file.type || null,
        file_size_bytes:
          file.size,
      }
    },

    signedUrl: async (
      bucket: string,
      path: string,
      expiresIn = 3600,
    ) => {
      assertSupabaseConfigured()
      if (!bucket.trim() || !path.trim()) throw new Error('파일 경로가 없습니다.')
      const safeExpiresIn = Math.min(Math.max(Math.floor(expiresIn), 60), 86_400)
      const { data, error } =
        await supabase.storage
          .from(bucket)
          .createSignedUrl(
            path,
            safeExpiresIn,
          )

      if (error) {
        throw error
      }

      return data.signedUrl
    },

    delete: async (
      bucket: string,
      path: string,
    ) => {
      const { error } =
        await supabase.storage
          .from(bucket)
          .remove([path])

      if (error) {
        throw error
      }
    },
  },

  audit: {
    list: () =>
      select<any>(
        'audit_logs',
        (query) =>
          query
            .order(
              'created_at',
              {
                ascending: false,
              },
            )
            .limit(200),
      ),
  },
}