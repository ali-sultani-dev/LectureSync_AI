import type { CollectionConfig } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'color', 'owner', 'createdAt'],
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
      name: 'name',
      type: 'text',
      required: true,
      label: 'Category Name',
      admin: {
        description: 'Name of the category',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      admin: {
        description: 'Optional description for the category',
      },
    },
    {
      name: 'color',
      type: 'select',
      label: 'Color',
      options: [
        { label: 'Blue', value: 'blue' },
        { label: 'Green', value: 'green' },
        { label: 'Red', value: 'red' },
        { label: 'Yellow', value: 'yellow' },
        { label: 'Purple', value: 'purple' },
        { label: 'Pink', value: 'pink' },
        { label: 'Indigo', value: 'indigo' },
        { label: 'Gray', value: 'gray' },
      ],
      defaultValue: 'blue',
      admin: {
        description: 'Color theme for the category',
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
