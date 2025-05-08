import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    create: () => true, // Allow public signup
    read: ({ req, id }) => {
      // If admin, allow all
      if (req.user && (req.user as any).role === 'admin') return true
      // If user, allow reading their own document
      if (req.user && id && req.user.id === id) return true
      return false
    },
    update: ({ req }) => !!(req.user && (req.user as any).role === 'admin'),
    delete: ({ req }) => !!(req.user && (req.user as any).role === 'admin'),
  },
  fields: [
    {
      name: 'firstName',
      type: 'text',
      required: true,
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'User', value: 'user' },
        { label: 'Admin', value: 'admin' },
      ],
      defaultValue: 'user',
      required: true,
      admin: {
        condition: ({ user }) => user && (user as any).role === 'admin', // Only show to admins
      },
      hooks: {
        beforeChange: [
          async ({ value, req, operation }) => {
            // Only run on create
            if (operation === 'create') {
              // Check if there are any users in the database
              const userCount = await req.payload.count({ collection: 'users' })
              if (userCount.totalDocs === 0) {
                // First user ever: make them admin
                return 'admin'
              }
              // if first user: only allow admin to set role, otherwise force role to user
              if (!req.user || (req.user as any).role !== 'admin') {
                return 'user'
              }
            }
            // On update only allow admin to change role
            if (operation === 'update') {
              if (!req.user || (req.user as any).role !== 'admin') {
                // Don't allow non admins to change role
                return undefined
              }
            }
            return value
          },
        ],
      },
    },
  ],
}
