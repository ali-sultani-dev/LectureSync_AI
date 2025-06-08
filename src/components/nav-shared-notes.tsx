'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  IconShare,
  IconEye,
  IconEdit,
  IconChevronDown,
  IconChevronRight,
  IconUser,
} from '@tabler/icons-react'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'

async function fetchCurrentUser() {
  const res = await fetch('/api/users/me', { credentials: 'include' })
  if (!res.ok) throw new Error('Not authenticated')
  const data = await res.json()
  return data.user
}

async function fetchSharedNotes(userId: number) {
  // Get all notes and filter for ones shared with this user
  const res = await fetch('/api/notes?limit=100&depth=2', { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch notes')
  const data = await res.json()

  // Filter notes that are shared with the current user (not owned by them)
  const sharedNotes = data.docs.filter((note: any) => {
    // Skip notes owned by the user
    const ownerId = typeof note.owner === 'object' ? note.owner?.id : note.owner
    if (ownerId === userId) return false

    // Check if note is shared with this user
    if (note.sharedWith && Array.isArray(note.sharedWith)) {
      return note.sharedWith.some((share: any) => {
        const sharedUserId = typeof share.user === 'object' ? share.user.id : share.user
        return sharedUserId === userId
      })
    }
    return false
  })

  return sharedNotes
}

export function NavSharedNotes() {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: fetchCurrentUser,
  })

  const {
    data: sharedNotes,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['sharedNotes', currentUser?.id],
    queryFn: () => fetchSharedNotes(currentUser.id),
    enabled: !!currentUser?.id,
  })

  if (isLoading) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Shared with me</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <span className="px-3 py-2 text-sm text-muted-foreground">
                Loading shared notes...
              </span>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  if (error || !currentUser) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Shared with me</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <span className="px-3 py-2 text-sm text-destructive">Error loading shared notes</span>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  const notes = sharedNotes || []

  return (
    <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1 -mx-2">
            <div className="flex items-center gap-2">
              <IconShare className="h-4 w-4" />
              <span>Shared with me</span>
              {isCollapsed ? (
                <IconChevronRight className="h-4 w-4" />
              ) : (
                <IconChevronDown className="h-4 w-4" />
              )}
            </div>
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {notes.length === 0 && (
                <SidebarMenuItem>
                  <span className="px-3 py-2 text-sm text-muted-foreground">
                    No shared notes yet.
                  </span>
                </SidebarMenuItem>
              )}
              {notes.map((note: any) => {
                // Find the user's permission for this note
                const userShare = note.sharedWith?.find((share: any) => {
                  const sharedUserId = typeof share.user === 'object' ? share.user.id : share.user
                  return sharedUserId === currentUser.id
                })

                const permission = userShare?.permission || 'view'
                const owner = typeof note.owner === 'object' ? note.owner : null

                return (
                  <SidebarMenuItem key={note.id}>
                    <SidebarMenuButton asChild className="flex items-center justify-between">
                      <a
                        href={`/dashboard/notes/${note.id}`}
                        className="flex items-center justify-between w-full"
                        title={`${note.title} (shared by ${owner?.firstName} ${owner?.lastName})`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="truncate text-sm">{note.title}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {owner && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center">
                                    <IconUser className="h-3 w-3 text-muted-foreground" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-center">
                                    <p className="font-medium">
                                      {owner.firstName} {owner.lastName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{owner.email}</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <Badge variant="secondary" className="text-xs px-1 py-0 h-5">
                            {permission === 'edit' ? (
                              <IconEdit className="h-3 w-3" />
                            ) : (
                              <IconEye className="h-3 w-3" />
                            )}
                          </Badge>
                        </div>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}
