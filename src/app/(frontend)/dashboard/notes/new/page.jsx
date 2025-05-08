'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mic, Upload as UploadIcon, Square, Loader2 } from 'lucide-react'
import { CreateNewNote } from '@/actions/CreateNewNote'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'

function NewNotePage() {
  const [mode, setMode] = useState(null) // 'record' | 'preview'
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [isWorking, setIsWorking] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const inputRef = useRef(null)
  const router = useRouter()
  const queryClient = useQueryClient()

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioBlob(blob)
        setAudioUrl(url)
        setMode('preview')
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
      setMode('record')
    } catch (err) {
      console.error('Microphone access error:', err)
      alert('Unable to access microphone. Please check permissions.')
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
      setIsRecording(false)
    }
  }

  // Upload file
  const chooseUpload = () => {
    inputRef.current.click()
  }
  const onFile = e => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setAudioBlob(file)
    setAudioUrl(url)
    setMode('preview')
  }

  // Create note (transcription and summary handled in action)
  const handleCreateNote = async () => {
    if (!audioBlob) return
    setIsWorking(true)
    try {
      const note = await CreateNewNote({ file: audioBlob })
      queryClient.invalidateQueries(['notes'])
      if (note?.doc?.id) {
        router.push(`/dashboard/notes/${note.doc.id}`)
      } else {
        alert('Note created but could not get note ID.')
      }
      setMode(null)
      setAudioBlob(null)
      setAudioUrl(null)
    } catch (err) {
      console.error('Note creation error:', err)
      alert('Note could not be created. Please try again.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <div className="flex justify-center items-start min-h-screen pt-16">
      <main className="mx-auto w-full max-w-4xl p-6 md:p-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Record or Upload Audio</CardTitle>
          </CardHeader>

          <CardContent>
            {!mode && (
              <div className="flex gap-4 w-full">
                <Button onClick={startRecording} className="flex-1 flex-col h-32" variant="outline">
                  <Mic className="h-8 w-8 mb-2" />
                  Record
                </Button>
                <Button onClick={chooseUpload} className="flex-1 flex-col h-32" variant="outline">
                  <UploadIcon className="h-8 w-8 mb-2" />
                  Upload
                </Button>
                <input ref={inputRef} type="file" accept="audio/*" hidden onChange={onFile} />
              </div>
            )}

            {mode === 'record' && isRecording && (
              <div className="text-center py-6">
                <div className="text-lg mb-4">Recording...</div>
                <Button onClick={stopRecording} className="h-12 w-12 rounded-full bg-red-500 mx-auto">
                  <Square className="h-6 w-6 text-white" />
                </Button>
              </div>
            )}

            {mode === 'preview' && audioUrl && (
              <div className="space-y-4">
                <audio controls src={audioUrl} className="w-full" />
                <Button onClick={handleCreateNote} disabled={isWorking} className="w-full">
                  {isWorking ? <Loader2 className="animate-spin mr-2" /> : null}
                  {isWorking ? 'Creating Note...' : 'Create Note'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default NewNotePage;