'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { IconSearch, IconX, IconFileText, IconUser, IconFolder } from '@tabler/icons-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface SearchResult {
  id: number
  title: string
  category?: {
    id: number
    name: string
    color: string
  }
  owner?: {
    id: number
    firstName: string
    lastName: string
    email: string
  }
  sharedWith?: Array<{
    user: {
      id: number
      firstName: string
      lastName: string
    }
    permission: 'view' | 'edit'
  }>
  createdAt: string
  updatedAt: string
  searchScore?: number
  matchReason?: string
}

async function searchNotes(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []

  try {
    // Common words to exclude from individual word searches
    const stopWords = new Set([
      'the',
      'and',
      'for',
      'are',
      'but',
      'not',
      'you',
      'all',
      'can',
      'had',
      'her',
      'was',
      'one',
      'our',
      'out',
      'day',
      'get',
      'has',
      'him',
      'his',
      'how',
      'its',
      'may',
      'new',
      'now',
      'old',
      'see',
      'two',
      'who',
      'boy',
      'did',
      'man',
      'way',
      'she',
      'use',
      'her',
      'now',
      'oil',
      'sit',
      'set',
    ])

    // Split query into words for better matching
    const queryWords = query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length >= 3 && !stopWords.has(word))

    // For very short queries or no valid words, search for exact phrase only
    if (queryWords.length === 0 || query.trim().length < 3) {
      if (query.trim().length < 3) return []

      // Only search for exact phrase
      const searchParams = new URLSearchParams({
        where: JSON.stringify({
          title: {
            contains: query,
          },
        }),
        depth: '2',
        limit: '20',
      })

      const res = await fetch(`/api/notes?${searchParams}`, {
        credentials: 'include',
      })

      if (!res.ok) throw new Error('Failed to search notes')
      const data = await res.json()

      return (data.docs || []).map((note: any) => ({
        ...note,
        searchScore: 100,
        matchReason: `exact phrase "${query}" in title`,
      }))
    }

    // For multi-word queries, get all notes and filter client-side for precision
    const searchParams = new URLSearchParams({
      depth: '2',
      limit: '100', // Get more notes to filter client-side
    })

    const res = await fetch(`/api/notes?${searchParams}`, {
      credentials: 'include',
    })

    if (!res.ok) {
      // console.error('Search failed:', res.status, res.statusText)
      throw new Error('Failed to search notes')
    }

    const data = await res.json()

    // Filter and score results on the client side for better relevance
    const results = (data.docs || [])
      .map((note: any) => {
        const title = note.title?.toLowerCase() || ''
        let score = 0
        let matchReason: string[] = []
        let matchedWords = 0

        // Check for exact phrase match first
        if (title.includes(query.toLowerCase())) {
          score += 100
          matchReason.push(`exact phrase "${query}" in title`)
          return {
            ...note,
            searchScore: score,
            matchReason: matchReason.join(', '),
          }
        }

        // For multi-word queries, require ALL words to match (not just any)
        queryWords.forEach((word) => {
          const wordRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
          if (wordRegex.test(title)) {
            matchedWords++
            matchReason.push(`word "${word}"`)
          }
        })

        // Only include if ALL query words are found
        if (matchedWords === queryWords.length) {
          score = 50 + matchedWords * 10 // Base score + bonus for each word
          matchReason = [`all ${matchedWords} words found: ${matchReason.join(', ')}`]
        } else if (matchedWords > 0) {
          // Partial matches get lower score but are still included for now
          score = matchedWords * 5
          matchReason = [
            `partial match: ${matchedWords}/${queryWords.length} words found: ${matchReason.join(', ')}`,
          ]
        }

        return {
          ...note,
          searchScore: score,
          matchReason: matchReason.join(', '),
          matchedWords,
          totalWords: queryWords.length,
        }
      })
      .filter((note: any) => {
        // Only include notes where ALL words match OR exact phrase match
        return note.searchScore >= 50 || note.matchedWords === note.totalWords
      })
      .sort((a: any, b: any) => b.searchScore - a.searchScore) // Sort by relevance

    // console.log('Filtered results:', results.length)
    // console.log(
    //   'Results with scores:',
    //   results.map((r: any) => ({ title: r.title, score: r.searchScore, reason: r.matchReason })),
    // )

    return results
  } catch (error) {
    // console.error('Search error:', error)
    return []
  }
}

export function SearchNotes() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['searchNotes', query],
    queryFn: () => searchNotes(query),
    enabled: query.length >= 3,
    staleTime: 1000 * 30, // 30 seconds
  })

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (results[selectedIndex]) {
            handleSelectNote(results[selectedIndex])
          }
          break
        case 'Escape':
          setIsOpen(false)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex])

  const handleSelectNote = (note: SearchResult) => {
    setIsOpen(false)
    setQuery('')
    router.push(`/dashboard/notes/${note.id}`)
  }

  const clearSearch = () => {
    setQuery('')
    setSelectedIndex(0)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" data-search-trigger>
          <IconSearch className="h-4 w-4" />
          <span className="hidden sm:inline">Search notes...</span>
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="sr-only">Search Notes</DialogTitle>
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search notes by title, content, or transcript..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10 h-12 text-base"
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-2 top-2 h-6 w-6 p-0"
              >
                <IconX className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto px-6 pb-6">
          {query.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              <IconSearch className="mx-auto h-8 w-8 mb-2" />
              <p>Start typing to search your notes...</p>
              <p className="text-sm mt-1">Search by title, content, or transcript</p>
            </div>
          )}

          {query.length > 0 && query.length < 3 && (
            <div className="py-8 text-center text-muted-foreground">
              <IconSearch className="mx-auto h-8 w-8 mb-2" />
              <p>Type at least 3 characters to search</p>
            </div>
          )}

          {query.length >= 3 && isLoading && (
            <div className="py-8 text-center text-muted-foreground">
              <div className="animate-spin mx-auto h-6 w-6 border-2 border-current border-t-transparent rounded-full mb-2" />
              <p>Searching...</p>
            </div>
          )}

          {query.length >= 3 && !isLoading && results.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              <IconFileText className="mx-auto h-8 w-8 mb-2" />
              <p>No notes found for "{query}"</p>
              <p className="text-sm mt-1">Try different keywords or check your spelling</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-1 mt-4">
              <div className="text-sm text-muted-foreground mb-2">
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </div>
              {results.map((note, index) => {
                const isOwned = note.owner
                const isShared = note.sharedWith && note.sharedWith.length > 0

                return (
                  <div
                    key={note.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      index === selectedIndex
                        ? 'bg-accent border-accent-foreground/20'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleSelectNote(note)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <IconFileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <h3 className="font-medium truncate">{note.title}</h3>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {note.category && (
                            <div className="flex items-center gap-1">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  note.category.color === 'blue'
                                    ? 'bg-blue-500'
                                    : note.category.color === 'green'
                                      ? 'bg-green-500'
                                      : note.category.color === 'red'
                                        ? 'bg-red-500'
                                        : note.category.color === 'yellow'
                                          ? 'bg-yellow-500'
                                          : note.category.color === 'purple'
                                            ? 'bg-purple-500'
                                            : note.category.color === 'pink'
                                              ? 'bg-pink-500'
                                              : note.category.color === 'indigo'
                                                ? 'bg-indigo-500'
                                                : note.category.color === 'gray'
                                                  ? 'bg-gray-500'
                                                  : 'bg-blue-500'
                                }`}
                              />
                              <IconFolder className="h-3 w-3" />
                              <span>{note.category.name}</span>
                            </div>
                          )}

                          {note.category && (isOwned || isShared) && (
                            <Separator orientation="vertical" className="h-3" />
                          )}

                          {isOwned && note.owner && (
                            <div className="flex items-center gap-1">
                              <IconUser className="h-3 w-3" />
                              <span>
                                {note.owner.firstName} {note.owner.lastName}
                              </span>
                            </div>
                          )}

                          {isShared && (
                            <Badge variant="secondary" className="text-xs">
                              Shared
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div className="border-t px-6 py-3 text-xs text-muted-foreground">
            Use ↑↓ to navigate, Enter to select, Esc to close
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Global keyboard shortcut hook
export function useSearchShortcut(onOpen: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpen()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onOpen])
}
