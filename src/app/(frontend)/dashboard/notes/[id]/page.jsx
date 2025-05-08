'use client'

import React, { useRef, useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Play, Pause, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import { jsPDF } from 'jspdf'

// Helper to format seconds as mm:ss
function formatTime(seconds) {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
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

  const { data: note, isLoading, isError } = useQuery({
    queryKey: ['note', id],
    queryFn: () =>
      fetch(`/api/notes/${id}?depth=1`, { credentials: 'include' }).then((r) => r.json()),
    enabled: !!id,
  })

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
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-4 flex gap-2 justify-end items-center">
          <Button variant="outline" size="sm" onClick={downloadNoteFiles} disabled={isDownloading}>
            {isDownloading ? 'Downloading...' : 'Download'}
          </Button>
        </div>
        <h1 className="text-2xl font-bold mb-2">{note.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {note?.createdAt && !isNaN(new Date(note.createdAt))
            ? format(new Date(note.createdAt), 'EEEE, MMMM d, yyyy')
            : 'Unknown date'}
        </p>
        {note.audioFile?.url && (
          <div className="mb-8">
            <audio ref={audioRef} src={note.audioFile.url} preload="metadata" />
            <div className="flex items-center gap-4 mt-2">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={togglePlayback}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <div className="flex-1">
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
