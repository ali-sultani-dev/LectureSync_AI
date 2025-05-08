import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    // Only admins or owner can read
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
    // Only allow updating if admin or owner
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
    // Only allow deleting if admin or owner
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
    // Only allow creating if logged in (and set owner to self)
    create: ({ req }) => !!req.user,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
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
  upload: true,
}
