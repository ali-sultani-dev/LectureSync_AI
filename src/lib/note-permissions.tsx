import type { Note, User } from '@/payload-types'

export type NotePermission = 'view' | 'edit' | 'owner' | 'none'

/**
 * Check what permission a user has for a specific note
 */
export function getUserNotePermission(note: Note, user: User | null): NotePermission {
  if (!user) return 'none'

  // Check if user is the owner
  const ownerId = typeof note.owner === 'object' ? note.owner?.id : note.owner
  if (ownerId === user.id) return 'owner'

  // Check shared permissions
  if (note.sharedWith && Array.isArray(note.sharedWith)) {
    const sharedPermission = note.sharedWith.find((share) => {
      const userId = typeof share.user === 'object' ? share.user.id : share.user
      return userId === user.id
    })

    if (sharedPermission) {
      return sharedPermission.permission as 'view' | 'edit'
    }
  }

  return 'none'
}

/**
 * Check if user can read a note
 */
export function canReadNote(note: Note, user: User | null): boolean {
  const permission = getUserNotePermission(note, user)
  return permission !== 'none'
}

/**
 * Check if user can edit a note
 */
export function canEditNote(note: Note, user: User | null): boolean {
  const permission = getUserNotePermission(note, user)
  return permission === 'owner' || permission === 'edit'
}

/**
 * Check if user can delete a note
 */
export function canDeleteNote(note: Note, user: User | null): boolean {
  const permission = getUserNotePermission(note, user)
  return permission === 'owner'
}

/**
 * Check if user can share a note
 */
export function canShareNote(note: Note, user: User | null): boolean {
  const permission = getUserNotePermission(note, user)
  return permission === 'owner'
}

/**
 * Get display text for permission level
 */
export function getPermissionDisplayText(permission: NotePermission): string {
  switch (permission) {
    case 'owner':
      return 'Owner'
    case 'edit':
      return 'Can Edit'
    case 'view':
      return 'Can View'
    case 'none':
      return 'No Access'
    default:
      return 'Unknown'
  }
}
