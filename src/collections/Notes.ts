import type { CollectionConfig } from 'payload'

export const Notes: CollectionConfig = {
  slug: 'notes',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'createdAt', 'owner', 'updatedAt'],
    // no access here admin UI control by top level access
  },
  access: {
    // admin read all user only own
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
    // update if admin or owner
    update: (args: any) => {
      const { req, doc } = args
      if (req.user && (req.user as any).role === 'admin') return true
      if (
        req.user &&
        doc &&
        doc.owner &&
        req.user.id === (typeof doc.owner === 'object' ? doc.owner.id : doc.owner)
      )
        return true
      return false
    },
    // delete if admin or owner
    delete: (args: any) => {
      const { req, doc } = args
      if (req.user && (req.user as any).role === 'admin') return true
      if (
        req.user &&
        doc &&
        doc.owner &&
        req.user.id === (typeof doc.owner === 'object' ? doc.owner.id : doc.owner)
      )
        return true
      return false
    },
    // create only if login owner is you
    create: (args: any) => {
      const { req } = args
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
}
