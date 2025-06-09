'use client'

import * as React from 'react'
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import { Pin } from 'lucide-react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import { NavMain } from '@/components/nav-main'
import { NavCategories } from '@/components/nav-categories'
import { NavSharedNotes } from '@/components/nav-shared-notes'
import NavUser from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

function NavUserNotes() {
  const [isCollapsed, setIsCollapsed] = React.useState(false)

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const res = await fetch('/api/users/me', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch current user')
      return res.json()
    },
  })

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } =
    useInfiniteQuery({
      queryKey: ['notes'],
      queryFn: async ({ pageParam = 1 }) => {
        const res = await fetch(`/api/notes?limit=10&page=${pageParam}`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Failed to fetch notes')
        return res.json()
      },
      getNextPageParam: (lastPage) => {
        if (lastPage.page < lastPage.totalPages) {
          return lastPage.page + 1
        }
        return undefined
      },
      initialPageParam: 1,
    })

  if (isLoading)
    return (
      <SidebarGroup>
        <SidebarGroupLabel>All Notes</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <span className="px-3 py-2 text-sm text-muted-foreground">Loading notes...</span>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  if (error)
    return (
      <SidebarGroup>
        <SidebarGroupLabel>All Notes</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <span className="px-3 py-2 text-sm text-destructive">Error loading notes</span>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )

  const notes = data?.pages.flatMap((page) => page.docs) ?? []

  // Helper function to check if current user has pinned a note
  const isNotePinnedByUser = (note: any) => {
    if (!currentUser || !note.pinnedBy) return false
    return note.pinnedBy.some((pin: any) => {
      const userId = typeof pin.user === 'object' ? pin.user.id : pin.user
      return userId === currentUser.id
    })
  }

  return (
    <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1 -mx-2">
            <div className="flex items-center gap-2">
              <span>All Notes</span>
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
                  <span className="px-3 py-2 text-sm text-muted-foreground">No notes yet.</span>
                </SidebarMenuItem>
              )}
              {notes
                .slice() // avoid mutating array
                .sort((a, b) => Number(isNotePinnedByUser(b)) - Number(isNotePinnedByUser(a))) // user-pinned notes first
                .map((note) => (
                  <SidebarMenuItem key={note.id} className="flex items-center justify-between">
                    <SidebarMenuButton
                      asChild
                      className="flex-1 px-3 py-2 rounded-md transition-colors hover:bg-muted-foreground/5 focus:bg-muted-foreground/10"
                    >
                      <a
                        href={`/dashboard/notes/${note.id}`}
                        className="block text-sm text-foreground"
                        title={note.title}
                      >
                        <span className="truncate block w-full max-w-full">{note.title}</span>
                      </a>
                    </SidebarMenuButton>
                    {/* Only show small pin icon if current user has pinned it */}
                    {isNotePinnedByUser(note) && (
                      <Pin
                        className="h-3 w-3 text-yellow-500 ml-2 flex-shrink-0"
                        aria-label="Pinned"
                      />
                    )}
                  </SidebarMenuItem>
                ))}
              {hasNextPage && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="justify-center px-3 py-2 mt-1 text-xs font-medium text-muted-foreground border border-muted-foreground/10 rounded-md bg-background hover:bg-muted-foreground/5 transition-colors"
                  >
                    {isFetchingNextPage ? 'Loading...' : 'Load more'}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <a href="#">
                <span className="text-base font-semibold">LectureSync AI.</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="overflow-hidden">
        <NavMain />
        <div className="flex-1 overflow-y-auto space-y-4">
          <NavCategories />
          <NavSharedNotes />
          <NavUserNotes />
        </div>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
