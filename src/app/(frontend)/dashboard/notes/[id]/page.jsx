'use client'

import React, { useRef, useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Play, Pause, Clock, HelpCircle, ArrowUpRight, MoreVertical, Share, FolderOpen, Sparkles, Bot, Pin } from 'lucide-react'
import { format } from 'date-fns'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import { jsPDF } from 'jspdf'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronsUpDown } from 'lucide-react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { NoteSharing } from '@/components/note-sharing'
import { NoteCategoryAssignment } from '@/components/note-category-assignment'
import { NoteAIChat } from '@/components/ui/note-ai-chat'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { LexicalEditor } from '@/components/ui/lexical-editor'

// Helper to format seconds as mm:ss
// function formatTime(seconds) {
//   if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '00:00'
//   const m = Math.floor(seconds / 60)
//   const s = Math.floor(seconds % 60)
//   return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
// }

// Helper: Recursively extract all text from Lexical rich text
function extractLexicalText(node) {
  if (!node) return ''
  if (typeof node.text === 'string') return node.text
  if (Array.isArray(node.children)) {
    return node.children.map(extractLexicalText).join(' ')
  }
  return ''
}

async function fetchCurrentUser() {
  const res = await fetch('/api/users/me', { credentials: 'include' })
  if (!res.ok) throw new Error('Not authenticated')
  const data = await res.json()
  return data.user
}

export default function NotePage() {
  const { id } = useParams()
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const queryClient = useQueryClient()
  const [editMode, setEditMode] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editSummary, setEditSummary] = useState('')
  const [editTranscript, setEditTranscript] = useState('')
  const summaryTextareaRef = useRef(null)
  const transcriptTextareaRef = useRef(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [isAIChatDialogOpen, setIsAIChatDialogOpen] = useState(false)
  const [userNoteContent, setUserNoteContent] = useState(null)
  const [isSavingUserNote, setIsSavingUserNote] = useState(false)

  // Global cleanup function to ensure page remains interactive
  const forceCleanup = () => {
    document.body.style.pointerEvents = 'auto'
    document.body.style.overflow = 'auto'
    // Remove any potential overlay elements
    const overlays = document.querySelectorAll('[data-radix-portal]')
    overlays.forEach(overlay => {
      if (overlay.children.length === 0) {
        overlay.remove()
      }
    })
  }

  const { data: note, isLoading, isError } = useQuery({
    queryKey: ['note', id],
    queryFn: () =>
      fetch(`/api/notes/${id}?depth=2`, { credentials: 'include' }).then((r) => r.json()),
    enabled: !!id,
  })

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: fetchCurrentUser,
  })

  // Check user permissions for this note
  const getUserPermissions = () => {
    if (!note || !currentUser) return { canEdit: false, canDelete: false, isOwner: false, hasAccess: false }
    
    // Check if user is the owner
    const ownerId = typeof note.owner === 'object' ? note.owner?.id : note.owner
    const isOwner = ownerId === currentUser.id
    
    if (isOwner) {
      return { canEdit: true, canDelete: true, isOwner: true, hasAccess: true }
    }
    
        // Check if note is shared with this user and their permission level
    if (note.sharedWith && Array.isArray(note.sharedWith)) {
      const userShare = note.sharedWith.find((share) => {
        const sharedUserId = typeof share.user === 'object' ? share.user.id : share.user
        return sharedUserId === currentUser.id
      })
      
      if (userShare) {
        const canEdit = userShare.permission === 'edit'
        const hasAccess = true // User has either view or edit access
        return { canEdit, canDelete: false, isOwner: false, hasAccess } // Shared users can never delete
      }
    }

    return { canEdit: false, canDelete: false, isOwner: false, hasAccess: false }
  }

  const { canEdit, canDelete, isOwner, hasAccess } = getUserPermissions()

  // Check if current user has pinned this note
  const isUserPinned = () => {
    if (!note || !currentUser || !note.pinnedBy) return false
    return note.pinnedBy.some((pin) => {
      const userId = typeof pin.user === 'object' ? pin.user.id : pin.user
      return userId === currentUser.id
    })
  }

  const userHasPinned = isUserPinned()

  useEffect(() => {
    if (note && editMode) {
      setEditTitle(note.title || '')
      setEditSummary(extractLexicalText(note.summary?.root))
      setEditTranscript(extractLexicalText(note.transcript?.root))
    }
  }, [note, editMode])

  useEffect(() => {
    if (editMode && summaryTextareaRef.current) {
      summaryTextareaRef.current.style.height = 'auto'
      summaryTextareaRef.current.style.height = summaryTextareaRef.current.scrollHeight + 'px'
    }
  }, [editSummary, editMode])
  useEffect(() => {
    if (editMode && transcriptTextareaRef.current) {
      transcriptTextareaRef.current.style.height = 'auto'
      transcriptTextareaRef.current.style.height = transcriptTextareaRef.current.scrollHeight + 'px'
    }
  }, [editTranscript, editMode])

  useEffect(() => {
    const src = note?.audioFile?.url
    if (!src) return
    const audio = audioRef.current
    if (!audio) return

    const onMeta = () => {
      if (audio.duration === Infinity) {
        // Workaround for blob duration
        const fixDuration = () => {
          audio.currentTime = 1e101
        }
        audio.addEventListener('timeupdate', function handler() {
          audio.removeEventListener('timeupdate', handler)
          audio.currentTime = 0
          setDuration(audio.duration)
        })
        fixDuration()
      } else {
        setDuration(audio.duration)
      }
    }
    const onTime = () => setCurrentTime(audio.currentTime)

    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('timeupdate', onTime)

    return () => {
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('timeupdate', onTime)
    }
  }, [note?.audioFile?.url])

  const togglePlayback = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      audio.play()
      setIsPlaying(true)
    } else {
      audio.pause()
      setIsPlaying(false)
    }
  }

  const downloadNoteFiles = async () => {
    if (!note) return
    setIsDownloading(true)
    try {
      // Generate PDF
      let pdfBlob, pdfFileName
      try {
        const doc = new jsPDF()
        doc.setFontSize(18)
        doc.text(note.title || 'Untitled Note', 10, 20)
        doc.setFontSize(12)
        doc.text(`Date: ${note.createdAt ? format(new Date(note.createdAt), 'yyyy-MM-dd HH:mm') : ''}`, 10, 30)
        if (note.summary) {
          doc.setFontSize(14)
          doc.text('Summary:', 10, 45)
          doc.setFontSize(12)
          const summaryText = extractLexicalText(note.summary?.root) || ''
          doc.text(doc.splitTextToSize(summaryText, 180), 10, 55)
        }
        pdfBlob = doc.output('blob')
        pdfFileName = `${note.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'note'}.pdf`
      } catch (err) {
        alert('Failed to generate PDF.')
        setIsDownloading(false)
        return
      }

      // Prepare audio
      let audioBlob = null
      let audioFileName = ''
      if (note.audioFile?.url) {
        let origBlob
        let audioExt
        try {
          const audioResp = await fetch(note.audioFile.url)
          origBlob = await audioResp.blob()
          audioExt = note.audioFile.filename?.split('.').pop()?.toLowerCase() || 'wav'
        } catch (err) {
          alert('Failed to fetch audio file.')
          setIsDownloading(false)
          return
        }
        audioBlob = origBlob
        audioFileName = `${note.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'note'}_audio.${audioExt}`
      }

      // Zip PDF and audio
      try {
        const zip = new JSZip()
        zip.file(pdfFileName, pdfBlob)
        if (audioBlob) zip.file(audioFileName, audioBlob)
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        saveAs(zipBlob, `${note.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'note'}.zip`)
      } catch (err) {
        alert('Failed to generate ZIP.')
      }
    } catch (err) {
      alert('Failed to download files.')
    } finally {
      setIsDownloading(false)
    }
  }

  const deleteNote = async () => {
    if (!id) return
    if (!window.confirm('Are you sure you want to delete this note? This action cannot be undone.')) return
    setIsDeleting(true)
    try {
      console.log('Attempting to delete note with ID:', id)
      console.log('Current user:', currentUser)
      console.log('Note owner:', note?.owner)
      console.log('Can delete:', canDelete)
      
      const res = await fetch(`/api/notes/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      
      console.log('Delete response status:', res.status)
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error('Delete error response:', errorText)
        throw new Error(errorText)
      }
      
      queryClient.invalidateQueries(['notes'])
      router.push('/dashboard/notes/new')
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete note. ' + (err instanceof Error ? err.message : ''))
      setIsDeleting(false)
    }
  }

  const saveEdit = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          summary: { root: { type: 'root', version: 1, children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: editSummary, format: 0, detail: 0, style: '', mode: 'normal' }], direction: 'ltr', format: '', indent: 0 }], direction: 'ltr', format: '', indent: 0 } },
          transcript: { root: { type: 'root', version: 1, children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: editTranscript, format: 0, detail: 0, style: '', mode: 'normal' }], direction: 'ltr', format: '', indent: 0 }], direction: 'ltr', format: '', indent: 0 } },
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      // Update the query cache with the new values
      queryClient.setQueryData(['note', id], old => ({
        ...old,
        title: editTitle,
        summary: { root: { type: 'root', version: 1, children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: editSummary, format: 0, detail: 0, style: '', mode: 'normal' }], direction: 'ltr', format: '', indent: 0 }], direction: 'ltr', format: '', indent: 0 } },
        transcript: { root: { type: 'root', version: 1, children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: editTranscript, format: 0, detail: 0, style: '', mode: 'normal' }], direction: 'ltr', format: '', indent: 0 }], direction: 'ltr', format: '', indent: 0 } },
      }))
      setEditMode(false)
    } catch (err) {
      alert('Failed to save changes.')
    } finally {
      setIsSaving(false)
    }
  }

  // Find the current user's note in the userNotes array
  useEffect(() => {
    if (note && currentUser) {
      const entry = Array.isArray(note.userNotes)
        ? note.userNotes.find((n) => {
            const userId = typeof n.user === 'object' ? n.user.id : n.user
            return userId === currentUser.id
          })
        : null
      setUserNoteContent(entry?.content || null)
    }
  }, [note, currentUser])

  // Save user note (debounced)
  const debouncedSave = useRef(null)
  const handleUserNoteChange = (editorState) => {
    if (debouncedSave.current) clearTimeout(debouncedSave.current)
    debouncedSave.current = setTimeout(() => {
      editorState.read(() => {
        const content = JSON.stringify(editorState.toJSON())
        setIsSavingUserNote(true)
        // Prepare new userNotes array
        let newUserNotes = Array.isArray(note.userNotes) ? [...note.userNotes] : []
        const idx = newUserNotes.findIndex((n) => {
          const userId = typeof n.user === 'object' ? n.user.id : n.user
          return userId === currentUser.id
        })
        if (idx !== -1) {
          newUserNotes[idx] = { ...newUserNotes[idx], content }
        } else {
          newUserNotes.push({ user: currentUser.id, content })
        }
        fetch(`/api/notes/${id}`,
          {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userNotes: newUserNotes }),
          }
        ).then(() => {
          setIsSavingUserNote(false)
        })
      })
    }, 1000)
  }

  // Cleanup effect to ensure page remains interactive
  useEffect(() => {
    const handleGlobalClick = (e) => {
      // If clicking outside dialogs and they're not open, force cleanup
      if (!isShareDialogOpen && !isCategoryDialogOpen && !isAIChatDialogOpen) {
        forceCleanup()
      }
    }

    document.addEventListener('click', handleGlobalClick)
    
    // Cleanup on unmount
    return () => {
      document.removeEventListener('click', handleGlobalClick)
      forceCleanup()
    }
  }, [isShareDialogOpen, isCategoryDialogOpen, isAIChatDialogOpen])

  if (isLoading) return <div>Loading…</div>
  if (isError || !note || !note.id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-3xl mb-2">🗒️❌</div>
        <div className="text-lg font-semibold mb-2">Note not found</div>
      </div>
    )
  }

  return (
    <>
      {!isOwner && (
        <div className="w-full -mt -px bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-l-4 border-blue-500">
          <div className="max-w-6xl mx-auto px-6 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Share className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Shared with you
                  </span>
                </div>
                <div className="hidden sm:block w-px h-4 bg-blue-300 dark:bg-blue-700" />
                <span className="hidden sm:inline text-xs text-blue-700 dark:text-blue-300">
                  {canEdit ? 'You can edit this note' : 'View-only access'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${canEdit ? 'bg-green-500' : 'bg-amber-500'}`} />
                <span className="text-xs font-medium text-blue-800 dark:text-blue-200 uppercase tracking-wide">
                  {canEdit ? 'Edit' : 'View'}
                </span>
              </div>
            </div>
            <div className="sm:hidden mt-1">
              <span className="text-xs text-blue-700 dark:text-blue-300">
                {canEdit ? 'You can edit this note' : 'View-only access'}
              </span>
            </div>
          </div>
        </div>
      )}
      
 <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="w-full max-w-6xl px-4 sm:px-6 md:px-8 pt-16 pb-24">
          <div
            className="mb-8 flex gap-2 items-center overflow-x-auto overflow-hidden scrollbar-hide whitespace-nowrap max-w-full pl-6 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent justify-start md:justify-end"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <Dialog open={isAIChatDialogOpen} onOpenChange={(open) => {
              setIsAIChatDialogOpen(open)
              if (!open) setTimeout(forceCleanup, 50)
            }}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm" className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md">
                  <Sparkles className="h-4 w-4" />
                  Ask AI
                </Button>
              </DialogTrigger>
              <DialogContent className="!max-w-[90vw] !w-[90vw] sm:!max-w-[90vw] md:!max-w-[90vw] lg:!max-w-[90vw] !h-[80vh] p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b">
                  <DialogTitle className="text-xl font-semibold">
                    AI Chat
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Ask questions about "{note?.title}"
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-hidden h-full">
                  <NoteAIChat noteId={parseInt(id)} noteTitle={note?.title || 'Untitled Note'} />
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="default"
              size="sm"
              className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
              onClick={() => router.push(`/dashboard/notes/${id}/quiz`)}
            >
              <HelpCircle className="h-4 w-4" />
              Quiz
            </Button>
            {isOwner && (
              <Dialog open={isShareDialogOpen} onOpenChange={(open) => {
                setIsShareDialogOpen(open)
                if (!open) setTimeout(forceCleanup, 50)
              }}>
                <DialogTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
                  >
                    <Share className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Share Note</DialogTitle>
                    <DialogDescription>
                      Manage who can access this note and their permissions.
                    </DialogDescription>
                  </DialogHeader>
                  <NoteSharing note={note} currentUser={currentUser} />
                </DialogContent>
              </Dialog>
            )}
            <Button variant="outline" size="sm" onClick={downloadNoteFiles} disabled={isDownloading}>
              {isDownloading ? 'Downloading...' : 'Download'}
            </Button>
            {hasAccess && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 p-0 flex items-center justify-center align-middle">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {/* Pin/Unpin menu item (all users with access) */}
                  {hasAccess && (
                    <DropdownMenuItem
                      onClick={async () => {
                        // Pin or unpin logic for current user
                        try {
                          let updatedPinnedBy = [...(note.pinnedBy || [])]
                          
                          if (userHasPinned) {
                            // Remove current user from pinnedBy array
                            updatedPinnedBy = updatedPinnedBy.filter((pin) => {
                              const userId = typeof pin.user === 'object' ? pin.user.id : pin.user
                              return userId !== currentUser.id
                            })
                          } else {
                            // Add current user to pinnedBy array
                            updatedPinnedBy.push({ user: currentUser.id })
                          }
                          
                          await fetch(`/api/notes/${note.id}`, {
                            method: 'PATCH',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ pinnedBy: updatedPinnedBy })
                          })
                          queryClient.invalidateQueries(['note', note.id])
                          queryClient.invalidateQueries(['notes'])
                        } catch {
                          alert('Failed to update pin status')
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <Pin className="h-4 w-4" />
                      {userHasPinned ? 'Unpin from top' : 'Pin to top'}
                    </DropdownMenuItem>
                  )}
                  {canEdit && (
                    <DropdownMenuItem onClick={() => setEditMode(true)} className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </DropdownMenuItem>
                  )}
                  {/* Category assignment (owners only) */}
                  {isOwner && (
                    <DropdownMenuItem onClick={() => setIsCategoryDialogOpen(true)} className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      Assign Category
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem onClick={deleteNote} className="flex items-center gap-2 text-red-600 focus:text-red-600">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="h-4" />
          <div className="mb-10 flex flex-col items-start">
            {editMode && canEdit ? (
              <div className="w-full border-2 border-primary rounded mb-2">
                <Input
                  className="text-xl md:text-2xl font-bold break-words w-full text-left bg-transparent box-border transition-all leading-tight p-0 m-0 border-0 focus:ring-0 focus:outline-none shadow-none"
                  style={{ minHeight: 'unset', height: 'auto', marginBottom: 0 }}
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                />
              </div>
            ) : (
              <h1 className="text-xl md:text-2xl font-bold break-words w-full text-left m-0">
                {note.title}
              </h1>
            )}
            <p className="text-sm text-muted-foreground mt-1 text-left">
              {note?.createdAt && !isNaN(new Date(note.createdAt))
                ? format(new Date(note.createdAt), 'EEEE, MMMM d, yyyy')
                : 'Unknown date'}
            </p>
            {note.category && (
              <div className="flex items-center gap-2 mt-2">
                <div className={`w-3 h-3 rounded-full ${
                  note.category.color === 'blue' ? 'bg-blue-500' :
                  note.category.color === 'green' ? 'bg-green-500' :
                  note.category.color === 'red' ? 'bg-red-500' :
                  note.category.color === 'yellow' ? 'bg-yellow-500' :
                  note.category.color === 'purple' ? 'bg-purple-500' :
                  note.category.color === 'pink' ? 'bg-pink-500' :
                  note.category.color === 'indigo' ? 'bg-indigo-500' :
                  note.category.color === 'gray' ? 'bg-gray-500' : 'bg-blue-500'
                }`} />
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{note.category.name}</span>
              </div>
            )}
          </div>
        
          <Card className={`mb-6 shadow-none border-2 ${editMode ? 'border-primary' : 'border-muted'}`}>
            <CardContent>
              <audio
                ref={audioRef}
                src={note.audioFile?.url || undefined}
                preload="metadata"
                disabled={!note.audioFile?.url}
                key={note.audioFile?.url || 'no-audio'}
              />
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={togglePlayback}
                  disabled={!note.audioFile?.url}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <div className="flex-1">
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: duration
                          ? `${(currentTime / duration) * 100}%`
                          : '0%',
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    {Math.floor(currentTime / 60)}:
                    {String(Math.floor(currentTime % 60)).padStart(2, '0')} /{' '}
                    {Math.floor(duration / 60)}:
                    {String(Math.floor(duration % 60)).padStart(2, '0')}
                  </span>
                </div>
              </div>
              {!note.audioFile?.url && (
                <div className="text-muted-foreground text-center mt-2 text-sm">No audio to play for this note.</div>
              )}
            </CardContent>
            <CardFooter className="px-2 -mb-3.5">
              <Collapsible
                open={isOpen}
                onOpenChange={setIsOpen}
                className="w-full space-y-2"
              >
                <div className="flex items-center space-x-4 px-4">
                  <h4 className="text-sm font-semibold">Transcript</h4>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <ChevronsUpDown className="h-4 w-4" />
                      <span className="sr-only">Toggle</span>
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <Card className={`shadow-none${editMode ? ' border-2 border-primary' : ''}`}>
                    <CardHeader>
                      <CardTitle>Transcript</CardTitle>
                      <CardDescription>
                        Full lecture transcript
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {editMode && canEdit ? (
                        <textarea
                          ref={transcriptTextareaRef}
                          value={editTranscript}
                          onChange={e => setEditTranscript(e.target.value)}
                          className="w-full text-sm md:text-base font-normal leading-tight bg-transparent box-border transition-all p-0 m-0 min-h-0 resize-none"
                          style={{ minHeight: 0, outline: 'none', overflow: 'hidden' }}
                          rows={1}
                          spellCheck={true}
                        />
                      ) : note.transcript ? (
                        <RichText data={note.transcript} />
                      ) : (
                        <div className="text-muted-foreground">No transcript available for this note.</div>
                      )}
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            </CardFooter>
          </Card>
          <Card className={`mb-6 shadow-none border-2 ${editMode ? 'border-primary' : 'border-muted'}`}>
            <CardHeader className="pb-3">
              <CardTitle>Summary</CardTitle>
              <CardDescription>AI-generated summary</CardDescription>
            </CardHeader>
            <CardContent>
              {editMode && canEdit ? (
                <textarea
                  ref={summaryTextareaRef}
                  value={editSummary}
                  onChange={e => setEditSummary(e.target.value)}
                  className="w-full text-sm md:text-base font-normal leading-tight bg-transparent box-border transition-all p-0 m-0 min-h-0 resize-none"
                  style={{ minHeight: 0, outline: 'none', overflow: 'hidden' }}
                  rows={1}
                  spellCheck={true}
                />
              ) : (
                <RichText data={note.summary} />
              )}
            </CardContent>
          </Card>

          {/* Personal Notes Section */}
          <Card className={`mb-6 shadow-none border-2 ${editMode ? 'border-black' : 'border-muted'}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                My Notes
              </CardTitle>
              <CardDescription>
                Add your own notes, thoughts, and insights about this content
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentUser ? (
                <div className="relative">
                  {!editMode && (
                    userNoteContent ? (
                      <RichText data={typeof userNoteContent === 'string' ? JSON.parse(userNoteContent) : userNoteContent} />
                    ) : (
                      <div className="text-muted-foreground">No personal notes yet.</div>
                    )
                  )}
                  {editMode && (
                    <LexicalEditor
                      placeholder="Write your personal notes here... Use the toolbar for formatting options."
                      onChange={handleUserNoteChange}
                      initialValue={userNoteContent ? (typeof userNoteContent === 'string' ? JSON.parse(userNoteContent) : userNoteContent) : null}
                      className="border-0 rounded-none"
                    />
                  )}
                  {editMode && isSavingUserNote && (
                    <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-background px-2 py-1 rounded shadow-sm border">
                      Saving...
                    </div>
                  )}
                </div>
              ) : (
                <div className="min-h-[200px] flex items-center justify-center text-muted-foreground">
                  Loading your notes...
                </div>
              )}
            </CardContent>
          </Card>
         
          <div className="flex gap-2 justify-end mb-8" style={{ minHeight: 48 }}>
            {editMode && canEdit ? (
              <>
                <Button variant="outline" onClick={() => setEditMode(false)} disabled={isSaving}>Cancel</Button>
                <Button onClick={saveEdit} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
              </>
            ) : null}
          </div>
          {/* Quiz Card UI */}
          {/* (Delete the block that starts with: <div role="button" ...> ... </div> for the quiz card) */}

          {/* Category Assignment Dialog */}
          <Dialog 
            open={isCategoryDialogOpen} 
            onOpenChange={(open) => {
              setIsCategoryDialogOpen(open)
              // Force cleanup when dialog closes
              if (!open) {
                setTimeout(forceCleanup, 50)
              }
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {isOwner ? 'Assign Category' : 'Add to My Categories'}
                </DialogTitle>
                <DialogDescription>
                  {isOwner 
                    ? 'Organize this note by assigning it to a category.'
                    : 'Add this shared note to one of your personal categories for better organization.'
                  }
                </DialogDescription>
              </DialogHeader>
              <NoteCategoryAssignment 
                note={note} 
                currentUser={currentUser}
                isOwner={isOwner}
                onClose={() => {
                  setIsCategoryDialogOpen(false)
                  // Force cleanup
                  setTimeout(forceCleanup, 50)
                }} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  )
}