import type { CollectionConfig } from 'payload'
import payload from 'payload'

export const Notes: CollectionConfig = {
  slug: 'notes',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'createdAt', 'owner', 'updatedAt'],
    // no access here admin UI control by top level access
  },
  access: {
    // Only admin or owner can read
    read: ({ req }) => {
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
    // Only admin or owner can update
    update: ({ req }) => {
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
      name: 'title',
      type: 'text',
      required: true,
      label: 'Title',
      admin: {
        description: 'main title for note',
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
  ],
  timestamps: true,
  hooks: {
    afterDelete: [
      async ({ doc, req }) => {
        if (doc.audioFile) {
          const mediaId = typeof doc.audioFile === 'object' ? doc.audioFile.id : doc.audioFile
          if (mediaId) {
            await req.payload.delete({
              collection: 'media',
              id: mediaId,
            })
          }
        }
      },
    ],
  },
}
