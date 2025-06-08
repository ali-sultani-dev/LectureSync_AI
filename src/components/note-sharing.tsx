'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { IconShare, IconTrash, IconUserPlus } from '@tabler/icons-react'
import { toast } from 'sonner'
import type { Note, User } from '@/payload-types'
import { canShareNote, getPermissionDisplayText } from '@/lib/note-permissions'

interface NoteSharingProps {
  note: Note
  currentUser: User | null
}

interface ShareNoteData {
  userEmail: string
  permission: 'view' | 'edit'
}

interface RemoveShareData {
  userEmail: string
}

async function findUserByEmail(email: string) {
  const response = await fetch(`/api/users?where[email][equals]=${encodeURIComponent(email)}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to find user')
  }

  const data = await response.json()
  return data.docs[0] || null
}

async function updateNoteSharing(noteId: number, sharedWith: any[]) {
  const response = await fetch(`/api/notes/${noteId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      sharedWith,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to update note sharing')
  }

  return response.json()
}

export function NoteSharing({ note, currentUser }: NoteSharingProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [permission, setPermission] = useState<'view' | 'edit'>('view')
  const queryClient = useQueryClient()

  const canShare = canShareNote(note, currentUser)

  const shareMutation = useMutation({
    mutationFn: async (data: ShareNoteData) => {
      // Find the user by email
      const targetUser = await findUserByEmail(data.userEmail)
      if (!targetUser) {
        throw new Error('User not found')
      }

      // Don't allow sharing with self
      if (currentUser && targetUser.id === currentUser.id) {
        throw new Error('Cannot share note with yourself')
      }

      // Get current shared users
      const currentSharedWith = note.sharedWith || []

      // Check if user is already shared with
      const existingShareIndex = currentSharedWith.findIndex((share: any) => {
        const userId = typeof share.user === 'object' ? share.user.id : share.user
        return userId === targetUser.id
      })

      let updatedSharedWith
      if (existingShareIndex >= 0) {
        // Update existing permission
        updatedSharedWith = [...currentSharedWith]
        updatedSharedWith[existingShareIndex] = {
          ...updatedSharedWith[existingShareIndex],
          permission: data.permission,
        }
      } else {
        // Add new share
        updatedSharedWith = [
          ...currentSharedWith,
          {
            user: targetUser.id,
            permission: data.permission,
          },
        ]
      }

      return updateNoteSharing(note.id, updatedSharedWith)
    },
    onSuccess: () => {
      toast.success('Note shared successfully')
      setUserEmail('')
      setPermission('view')
      setIsDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['note', note.id] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (data: RemoveShareData) => {
      // Find the user by email
      const targetUser = await findUserByEmail(data.userEmail)
      if (!targetUser) {
        throw new Error('User not found')
      }

      // Get current shared users and remove the target user
      const currentSharedWith = note.sharedWith || []
      const updatedSharedWith = currentSharedWith.filter((share: any) => {
        const userId = typeof share.user === 'object' ? share.user.id : share.user
        return userId !== targetUser.id
      })

      return updateNoteSharing(note.id, updatedSharedWith)
    },
    onSuccess: () => {
      toast.success('Sharing removed successfully')
      queryClient.invalidateQueries({ queryKey: ['note', note.id] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleShare = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userEmail.trim()) {
      toast.error('Please enter a user email')
      return
    }
    shareMutation.mutate({ userEmail: userEmail.trim(), permission })
  }

  const handleRemoveShare = (userEmail: string) => {
    removeMutation.mutate({ userEmail })
  }

  if (!canShare) {
    return null
  }

  const sharedUsers = note.sharedWith || []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconShare className="h-5 w-5" />
          Sharing
        </CardTitle>
        <CardDescription>Manage who can access this note and their permissions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sharedUsers.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Shared with:</Label>
            {sharedUsers.map((share, index) => {
              const user = share.user as User
              const userEmail = typeof user === 'object' ? user.email : 'Unknown user'
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{userEmail}</span>
                    <Badge variant="secondary">
                      {getPermissionDisplayText(share.permission as any)}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveShare(userEmail)}
                    disabled={removeMutation.isPending}
                  >
                    <IconTrash className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <IconUserPlus className="h-4 w-4 mr-2" />
              Share with someone
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share Note</DialogTitle>
              <DialogDescription>
                Enter the email address of the person you want to share this note with.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleShare} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userEmail">User Email</Label>
                <Input
                  id="userEmail"
                  type="email"
                  placeholder="user@example.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="permission">Permission</Label>
                <Select
                  value={permission}
                  onValueChange={(value: 'view' | 'edit') => setPermission(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View Only</SelectItem>
                    <SelectItem value="edit">Can Edit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={shareMutation.isPending} className="flex-1">
                  {shareMutation.isPending ? 'Sharing...' : 'Share'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
