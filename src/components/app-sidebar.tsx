'use client'

import * as React from 'react'
import { IconDashboard, IconDatabase, IconFileWord, IconReport } from '@tabler/icons-react'
import { useInfiniteQuery } from '@tanstack/react-query'

import { NavMain } from '@/components/nav-main'
import NavUser from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

function NavUserNotes() {
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
      <SidebarMenu className="mb-4">
        <SidebarMenuItem>
          <span className="text-xs font-semibold text-muted-foreground px-3 py-2 block">
            My Notes
          </span>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <span className="px-3 py-2 text-sm text-muted-foreground">Loading notes...</span>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  if (error)
    return (
      <SidebarMenu className="mb-4">
        <SidebarMenuItem>
          <span className="text-xs font-semibold text-muted-foreground px-3 py-2 block">
            My Notes
          </span>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <span className="px-3 py-2 text-sm text-destructive">Error loading notes</span>
        </SidebarMenuItem>
      </SidebarMenu>
    )

  const notes = data?.pages.flatMap((page) => page.docs) ?? []

  return (
    <SidebarMenu className="mb-4 border-muted-foreground/10 pb-2">
      <SidebarMenuItem>
        <span className="text-xs font-semibold text-muted-foreground px-3 py-2 block tracking-wide uppercase">
          My Notes
        </span>
      </SidebarMenuItem>
      {notes.length === 0 && (
        <SidebarMenuItem>
          <span className="px-3 py-2 text-sm text-muted-foreground">No notes yet.</span>
        </SidebarMenuItem>
      )}
      {notes.map((note) => (
        <SidebarMenuItem key={note.id}>
          <SidebarMenuButton
            asChild
            className="px-3 py-2 rounded-md transition-colors hover:bg-muted-foreground/5 focus:bg-muted-foreground/10"
          >
            <a
              href={`/dashboard/notes/${note.id}`}
              className="block text-sm text-foreground"
              title={note.title}
            >
              <span className="truncate block w-full max-w-full">{note.title}</span>
            </a>
          </SidebarMenuButton>
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
        <div className="flex-1 overflow-y-auto">
          <NavUserNotes />
        </div>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
