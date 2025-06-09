'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { IconFolder, IconArrowLeft } from '@tabler/icons-react'
import { toast } from 'sonner'

const categoryColors = [
  { label: 'Blue', value: 'blue', class: 'bg-blue-500' },
  { label: 'Green', value: 'green', class: 'bg-green-500' },
  { label: 'Red', value: 'red', class: 'bg-red-500' },
  { label: 'Yellow', value: 'yellow', class: 'bg-yellow-500' },
  { label: 'Purple', value: 'purple', class: 'bg-purple-500' },
  { label: 'Pink', value: 'pink', class: 'bg-pink-500' },
  { label: 'Indigo', value: 'indigo', class: 'bg-indigo-500' },
  { label: 'Gray', value: 'gray', class: 'bg-gray-500' },
]

interface CreateCategoryData {
  name: string
  description?: string
  color: string
}

async function createCategory(data: CreateCategoryData) {
  const response = await fetch('/api/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create category')
  }

  return response.json()
}

export default function NewCategoryPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('blue')
  const router = useRouter()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      toast.success('Category created successfully')
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      // Stay on page, do not navigate.
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Please enter a category name')
      return
    }
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
    })
  }

  const selectedColorClass = categoryColors.find((c) => c.value === color)?.class || 'bg-blue-500'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 pt-10 pb-24">
      <div className="w-full max-w-6xl">
        <Button variant="outline" size="sm" className="mb-4" onClick={() => router.back()}>
          ← Back to Note
        </Button>
        <div className="mb-6 flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Create New Category</h1>
            <p className="text-sm text-muted-foreground mt-1 text-left">
              Organize your notes with custom categories
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconFolder className="h-5 w-5" />
              Category Details
            </CardTitle>
            <CardDescription>Create a new category to organize your notes</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g., Lectures, Research, Personal"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Optional description for this category"
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setDescription(e.target.value)
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color Theme</Label>
                <Select value={color} onValueChange={setColor}>
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${selectedColorClass}`} />
                        {categoryColors.find((c) => c.value === color)?.label}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categoryColors.map((colorOption) => (
                      <SelectItem key={colorOption.value} value={colorOption.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full ${colorOption.class}`} />
                          {colorOption.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${selectedColorClass}`} />
                    <IconFolder className="h-4 w-4" />
                    <span className="font-medium">{name || 'Category Name'}</span>
                  </div>
                  {description && (
                    <p className="text-sm text-muted-foreground mt-1 ml-5">{description}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className="flex-1">
                  {createMutation.isPending ? 'Creating...' : 'Create Category'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
