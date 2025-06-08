'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IconFolder, IconFolderPlus, IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
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

async function fetchNotesByCategory(categoryId: number) {
  const res = await fetch(`/api/notes?where[category][equals]=${categoryId}`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to fetch notes')
  return res.json()
}

export function NavCategories() {
  const [isMainCollapsed, setIsMainCollapsed] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null)
  const router = useRouter()

  const {
    data: categoriesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  const toggleCategory = (categoryId: number) => {
    // Only allow one category to be expanded at a time
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId)
  }

  if (isLoading) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Categories</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <span className="px-3 py-2 text-sm text-muted-foreground">Loading categories...</span>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  if (error) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Categories</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <span className="px-3 py-2 text-sm text-destructive">Error loading categories</span>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  const categories = categoriesData?.docs || []

  return (
    <Collapsible
      open={!isMainCollapsed}
      onOpenChange={(open) => {
        setIsMainCollapsed(!open)
        if (open) {
          // If collapsing main section, also close any expanded category
          setExpandedCategory(null)
        }
      }}
    >
      <SidebarGroup>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1 -mx-2 select-none">
              <span>Categories</span>
              {isMainCollapsed ? (
                <IconChevronRight className="h-4 w-4" />
              ) : (
                <IconChevronDown className="h-4 w-4" />
              )}
            </SidebarGroupLabel>
          </CollapsibleTrigger>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 ml-1"
            onClick={(e) => {
              e.stopPropagation()
              router.push('/dashboard/categories/new')
            }}
            title="Create new category"
          >
            <IconFolderPlus className="h-4 w-4" />
          </Button>
        </div>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {categories.length === 0 && (
                <SidebarMenuItem>
                  <span className="px-3 py-2 text-sm text-muted-foreground">
                    No categories yet.
                  </span>
                </SidebarMenuItem>
              )}
              {categories.map((category: any) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  isExpanded={expandedCategory === category.id}
                  onToggle={() => toggleCategory(category.id)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}

function CategoryItem({
  category,
  isExpanded,
  onToggle,
}: {
  category: any
  isExpanded: boolean
  onToggle: () => void
}) {
  const { data: notesData } = useQuery({
    queryKey: ['notes', 'category', category.id],
    queryFn: () => fetchNotesByCategory(category.id),
    enabled: isExpanded,
  })

  const notes = notesData?.docs || []
  const colorClass =
    categoryColors[category.color as keyof typeof categoryColors] || categoryColors.blue

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="w-full justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${colorClass}`} />
              <IconFolder className="h-4 w-4" />
              <span className="truncate">{category.name}</span>
            </div>
            {isExpanded ? (
              <IconChevronDown className="h-4 w-4" />
            ) : (
              <IconChevronRight className="h-4 w-4" />
            )}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenu className="ml-4 border-l border-muted-foreground/20 pl-2">
            {notes.length === 0 && (
              <SidebarMenuItem>
                <span className="px-3 py-1 text-xs text-muted-foreground">
                  No notes in this category
                </span>
              </SidebarMenuItem>
            )}
            {notes.map((note: any) => (
              <SidebarMenuItem key={note.id}>
                <SidebarMenuButton asChild size="sm">
                  <a href={`/dashboard/notes/${note.id}`} className="text-sm" title={note.title}>
                    <span className="truncate">{note.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}
