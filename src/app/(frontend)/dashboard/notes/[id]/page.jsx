'use client'

import React, { useRef, useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Play, Pause, Clock, HelpCircle, ArrowUpRight, MoreVertical, Sparkles } from 'lucide-react'
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
import { NoteAIChat } from '@/components/note-ai-chat'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

  // Cleanup function 
const forceCleanup = () => {
  document.body.style.pointerEvents = 'auto'
  document.body.style.overflow = 'auto'
  const overlays = document.querySelectorAll('[data-radix-portal]')
  overlays.forEach(overlay => {
    if (overlay.children.length === 0) {
      overlay.remove()
    }
  })
}

// Helper: Recursively extract all text from Lexical rich text
function extractLexicalText(node) {
  if (!node) return ''
  if (typeof node.text === 'string') return node.text
  if (Array.isArray(node.children)) {
    return node.children.map(extractLexicalText).join(' ')
  }
  return ''
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
  const [isAIChatDialogOpen, setIsAIChatDialogOpen] = useState(false)

  const { data: note, isLoading, isError } = useQuery({
    queryKey: ['note', id],
    queryFn: () =>
      fetch(`/api/notes/${id}?depth=1`, { credentials: 'include' }).then((r) => r.json()),
    enabled: !!id,
  })

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
      const res = await fetch(`/api/notes/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error(await res.text())
      queryClient.invalidateQueries(['notes'])
      router.push('/dashboard/notes/new')
    } catch (err) {
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
    <div className="flex min-h-screen flex-col items-center justify-center p-6 pt-10 pb-24">
      <div className="w-full max-w-4xl">
        <div className="mb-4 flex gap-2 justify-end items-center">
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
          <Button variant="outline" size="sm" onClick={downloadNoteFiles} disabled={isDownloading}>
            {isDownloading ? 'Downloading...' : 'Download'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 p-0 flex items-center justify-center align-middle"><MoreVertical /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditMode(true)}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={deleteNote} className="text-red-600">{isDeleting ? 'Deleting...' : 'Delete'}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mb-8 flex flex-col items-start">
          {editMode ? (
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
                    {editMode ? (
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
            {editMode ? (
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
       
        <div className="flex gap-2 justify-end mb-8" style={{ minHeight: 48 }}>
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => setEditMode(false)} disabled={isSaving}>Cancel</Button>
              <Button onClick={saveEdit} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
            </>
          ) : null}
        </div>
        {/* Quiz Card UI */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Take a Quiz on this Note"
          className="mb-8 outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer group"
          onClick={() => router.push(`/dashboard/notes/${id}/quiz`)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              router.push(`/dashboard/notes/${id}/quiz`)
            }
          }}
        >
          <Card className="mb-6 shadow-none border-2 border-muted transition-shadow group-hover:border-primary w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-primary" />
                Quiz Yourself
                <ArrowUpRight className="w-5 h-5 ml-auto text-primary opacity-80 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </CardTitle>
              <CardDescription>Test your understanding of this note with an AI-generated quiz.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  )
}
