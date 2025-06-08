'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { IconFolder, IconFolderPlus } from '@tabler/icons-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const categoryColors = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  indigo: 'bg-indigo-500',
  gray: 'bg-gray-500',
}

async function fetchCategories() {
  const res = await fetch('/api/categories', { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch categories')
  return res.json()
}

async function fetchPersonalNoteCategory(noteId: string, userId: number) {
  const res = await fetch(`/api/personal-note-categories?noteId=${noteId}&userId=${userId}`, {
    credentials: 'include',
  })
  if (!res.ok) {
    if (res.status === 404) return null // No personal category assigned
    throw new Error('Failed to fetch personal note category')
  }
  return res.json()
}

async function updateNoteCategory(noteId: string, categoryId: string | null) {
  // Convert categoryId to number if it's not null
  const categoryValue = categoryId === null ? null : parseInt(categoryId, 10)

  const response = await fetch(`/api/notes/${noteId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      category: categoryValue,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()

    try {
      const error = JSON.parse(errorText)
      throw new Error(error.message || `Failed to update note category: ${response.status}`)
    } catch (parseError) {
      throw new Error(`Failed to update note category: ${response.status} - ${errorText}`)
    }
  }

  return response.json()
}

async function updatePersonalNoteCategory(
  noteId: string,
  categoryId: string | null,
  userId: number,
) {
  const categoryValue = categoryId === null ? null : parseInt(categoryId, 10)

  const response = await fetch('/api/personal-note-categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      noteId: parseInt(noteId, 10),
      categoryId: categoryValue,
      userId: userId,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    try {
      const error = JSON.parse(errorText)
      throw new Error(
        error.message || `Failed to update personal note category: ${response.status}`,
      )
    } catch (parseError) {
      throw new Error(`Failed to update personal note category: ${response.status} - ${errorText}`)
    }
  }

  return response.json()
}

interface NoteCategoryAssignmentProps {
  note: any
  currentUser?: any
  isOwner?: boolean
  onClose?: () => void
}

export function NoteCategoryAssignment({
  note,
  currentUser,
  isOwner = true,
  onClose,
}: NoteCategoryAssignmentProps) {
  // For owners, use the note's category. For non-owners, start with 'none' and load personal category
  const [selectedCategory, setSelectedCategory] = useState<string>('none')
  const queryClient = useQueryClient()
  const router = useRouter()

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  // For non-owners, fetch their personal category assignment
  const { data: personalCategoryData, isLoading: personalCategoryLoading } = useQuery({
    queryKey: ['personal-note-category', note.id, currentUser?.id],
    queryFn: () => fetchPersonalNoteCategory(note.id.toString(), currentUser.id),
    enabled: !isOwner && !!currentUser?.id,
  })

  // Set initial selected category based on ownership
  useEffect(() => {
    if (isOwner) {
      const initialCategory =
        typeof note.category === 'object'
          ? note.category?.id?.toString() || 'none'
          : note.category?.toString() || 'none'
      setSelectedCategory(initialCategory)
    } else if (personalCategoryData?.category) {
      setSelectedCategory(personalCategoryData.category.id.toString())
    }
  }, [isOwner, note.category, personalCategoryData])

  const updateMutation = useMutation({
    mutationFn: (categoryId: string | null) => {
      if (isOwner) {
        return updateNoteCategory(note.id.toString(), categoryId)
      } else {
        return updatePersonalNoteCategory(note.id.toString(), categoryId, currentUser.id)
      }
    },
    onSuccess: (data) => {
      // Close dialog immediately
      onClose?.()

      // Show success message
      toast.success(
        isOwner ? 'Note category updated successfully' : 'Personal category updated successfully',
      )

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['note', note.id] })
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      queryClient.invalidateQueries({ queryKey: ['notes', 'category'] })
      if (!isOwner) {
        queryClient.invalidateQueries({
          queryKey: ['personal-note-category', note.id, currentUser?.id],
        })
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleSave = () => {
    const categoryId = selectedCategory === 'none' ? null : selectedCategory
    updateMutation.mutate(categoryId)
  }

  const handleCreateNewCategory = () => {
    router.push('/dashboard/categories/new')
  }

  if (categoriesLoading || (!isOwner && personalCategoryLoading)) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">Loading categories...</div>
      </div>
    )
  }

  const categories = categoriesData?.docs || []
  const currentCategory = categories.find((cat: any) => cat.id.toString() === selectedCategory)

  return (
    <div className="space-y-4">
      {!isOwner && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
          This will create a personal category assignment for you only. The original note's category
          won't be changed.
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Select a category">
              {currentCategory ? (
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      categoryColors[currentCategory.color as keyof typeof categoryColors] ||
                      categoryColors.blue
                    }`}
                  />
                  <IconFolder className="h-4 w-4" />
                  <span>{currentCategory.name}</span>
                </div>
              ) : selectedCategory === 'none' ? (
                'No category'
              ) : (
                'Select a category'
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3" /> {/* Spacer */}
                <span>No category</span>
              </div>
            </SelectItem>
            {categories.map((category: any) => {
              const colorClass =
                categoryColors[category.color as keyof typeof categoryColors] || categoryColors.blue
              return (
                <SelectItem key={category.id} value={category.id.toString()}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${colorClass}`} />
                    <IconFolder className="h-4 w-4" />
                    <span>{category.name}</span>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {categories.length === 0 && (
        <div className="text-sm text-muted-foreground">
          No categories available.{' '}
          <Button variant="link" className="p-0 h-auto text-sm" onClick={handleCreateNewCategory}>
            Create one now
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCreateNewCategory}
          className="flex items-center gap-2"
        >
          <IconFolderPlus className="h-4 w-4" />
          New Category
        </Button>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={updateMutation.isPending} className="flex-1">
          {updateMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
