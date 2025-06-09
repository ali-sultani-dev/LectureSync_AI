import type { CollectionConfig } from 'payload'

export const Notes: CollectionConfig = {
  slug: 'notes',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'createdAt', 'owner', 'updatedAt'],
    // no access here admin UI control by top level access
  },
  access: {
    // Custom read access to include shared notes
    read: async ({ req }) => {
      if (req.user && (req.user as any).role === 'admin') return true
      if (!req.user) return false

      // Get all notes where user is owner or has shared access
      const userNotes = await req.payload.find({
        collection: 'notes',
        where: {
          or: [
            {
              owner: {
                equals: req.user.id,
              },
            },
          ],
        },
        limit: 0, // Get all
      })

      // Also get notes shared with this user
      const allNotes = await req.payload.find({
        collection: 'notes',
        limit: 0,
      })

      const accessibleNoteIds = new Set<number>()

      // Add owned notes
      userNotes.docs.forEach((note) => accessibleNoteIds.add(note.id))

      // Add shared notes
      allNotes.docs.forEach((note) => {
        if (note.sharedWith && Array.isArray(note.sharedWith)) {
          const hasAccess = note.sharedWith.some((share: any) => {
            const userId = typeof share.user === 'object' ? share.user.id : share.user
            return userId === req.user!.id
          })
          if (hasAccess) {
            accessibleNoteIds.add(note.id)
          }
        }
      })

      return {
        id: {
          in: Array.from(accessibleNoteIds),
        },
      }
    },
    // Custom update access
    update: async ({ req, id }) => {
      if (req.user && (req.user as any).role === 'admin') return true
      if (!req.user || !id) return false

      try {
        const note = await req.payload.findByID({
          collection: 'notes',
          id,
        })

        // Check if user is owner
        const ownerId = typeof note.owner === 'object' ? note.owner?.id : note.owner
        if (ownerId === req.user.id) {
          return true
        }

        // Check if user has edit permission
        if (note.sharedWith && Array.isArray(note.sharedWith)) {
          const hasEditPermission = note.sharedWith.some((share: any) => {
            const userId = typeof share.user === 'object' ? share.user.id : share.user
            return userId === req.user!.id && share.permission === 'edit'
          })
          return hasEditPermission
        }

        return false
      } catch {
        return false
      }
    },
    // Only admin or owner can delete
    delete: ({ req }) => {
      if (req.user && (req.user as any).role === 'admin') return true
      if (req.user) {
        return {
          owner: {
            equals: req.user.id,
          },
        }
      }
      return false
    },
    // Only logged-in users can create
    create: ({ req }) => {
      return !!req.user
    },
  },
  fields: [
    {
      name: 'pinnedBy',
      type: 'array',
      label: 'Pinned By',
      admin: {
        position: 'sidebar',
        description: 'Users who have pinned this note to show at the top of their list.',
      },
      fields: [
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'users',
          required: true,
          label: 'User',
        },
      ],
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Title',
      admin: {
        description: 'main title for note',
      },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: false,
      label: 'Category',
      admin: {
        description: 'Organize your note by category',
        position: 'sidebar',
      },
      filterOptions: ({ user }) => {
        if (user) {
          return {
            owner: {
              equals: user.id,
            },
          }
        }
        return false
      },
    },
    {
      name: 'audioFile',
      type: 'upload',
      relationTo: 'media',
      required: false,
      label: 'Audio File',
      filterOptions: {
        mimeType: { contains: 'audio' },
      },
      admin: {
        description: 'upload audio file if want',
      },
    },
    {
      name: 'transcript',
      label: 'Audio Transcript',
      type: 'richText',
      admin: {
        description: 'full transcript content',
      },
    },
    {
      name: 'summary',
      type: 'richText',
      label: 'Summary Content',
      admin: {
        description: 'AI make summary or you write',
      },
    },
    {
      name: 'sharedWith',
      type: 'array',
      label: 'Shared With',
      admin: {
        description: 'Users who have access to this note',
        position: 'sidebar',
      },
      fields: [
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'users',
          required: true,
          label: 'User',
        },
        {
          name: 'permission',
          type: 'select',
          required: true,
          label: 'Permission',
          options: [
            {
              label: 'View Only',
              value: 'view',
            },
            {
              label: 'Edit',
              value: 'edit',
            },
          ],
          defaultValue: 'view',
        },
      ],
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      required: true,
      defaultValue: ({ user }) => user?.id,
      admin: {
        position: 'sidebar',
        readOnly: true,
        condition: (data) => Boolean(data?.owner),
      },
    },
    {
      name: 'userNotes',
      type: 'array',
      label: 'User Notes',
      fields: [
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'users',
          required: true,
          index: true,
        },
        {
          name: 'content',
          type: 'richText',
          required: false,
        },
      ],
      admin: {
        description: 'Personal notes for each user on this note',
      },
    },
  ],
  timestamps: true,
  hooks: {
    afterDelete: [
      async ({ doc, req }) => {
        if (doc.audioFile) {
          const mediaId = typeof doc.audioFile === 'object' ? doc.audioFile.id : doc.audioFile
          if (mediaId) {
            try {
              // Delete media file asynchronously without blocking the main transaction
              setImmediate(async () => {
                try {
                  await req.payload.delete({
                    collection: 'media',
                    id: mediaId,
                  })
                } catch (error) {
                  console.error('Failed to delete associated media file:', error)
                }
              })
            } catch (error) {
              console.error('Error scheduling media deletion:', error)
            }
          }
        }
      },
    ],
  },
}
