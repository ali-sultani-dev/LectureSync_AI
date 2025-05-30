import type { CollectionConfig } from 'payload'

export const Chats: CollectionConfig = {
  slug: 'chats',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'noteId', 'owner', 'createdAt', 'updatedAt'],
  },
  access: {
    // Only authenticated users can access chats
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
    create: ({ req }) => !!req.user,
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
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Chat Title',
      admin: {
        description: 'Title of the chat conversation',
      },
    },
    {
      name: 'noteId',
      type: 'relationship',
      relationTo: 'notes',
      hasMany: false,
      required: true,
      label: 'Related Note',
      admin: {
        description: 'The note this chat is about',
        position: 'sidebar',
      },
    },
    {
      name: 'messages',
      type: 'array',
      label: 'Messages',
      admin: {
        description: 'Chat messages in this conversation',
      },
      fields: [
        {
          name: 'role',
          type: 'select',
          required: true,
          options: [
            {
              label: 'User',
              value: 'user',
            },
            {
              label: 'Assistant',
              value: 'assistant',
            },
            {
              label: 'System',
              value: 'system',
            },
          ],
          defaultValue: 'user',
        },
        {
          name: 'content',
          type: 'textarea',
          required: true,
          label: 'Message Content',
        },
        {
          name: 'timestamp',
          type: 'date',
          required: true,
          defaultValue: () => new Date(),
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
        {
          name: 'relatedNotes',
          type: 'relationship',
          relationTo: 'notes',
          hasMany: true,
          label: 'Related Notes',
          admin: {
            description: 'Notes that were referenced in this message',
          },
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
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'Active Chat',
      admin: {
        description: 'Whether this chat is currently active',
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}
