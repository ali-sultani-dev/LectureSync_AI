'use server'

import { cookies, headers } from 'next/headers'

import { transcribeAudio } from './transcribe'
import { generateTitleFromTranscript } from './generateTitleFromTranscript'
import { summariseTranscript } from './summariseTranscript'

export async function CreateNewNote({ file }) {
  if (!(file instanceof File)) {
    throw new Error('Provide a File under "file"')
  }

  const cookieHeader = (await cookies()).toString()
  // Dynamically construct base URL for server-side fetch
  const host = headers().get('host')
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`

  //   Upload media
  const mfd = new FormData()
  mfd.append('file', file)
  mfd.append('_payload', JSON.stringify({ alt: 'Audio note upload' }))
  const mediaRes = await fetch(`${baseUrl}/api/media`, {
    method: 'POST',
    credentials: 'include',
    headers: { Cookie: cookieHeader },
    body: mfd,
  })

  if (!mediaRes.ok) {
    const errText = await mediaRes.text()
    console.error('Media upload failed:', errText)
    throw new Error('Media upload failed')
  }
  const media = await mediaRes.json()
  console.log('Uploaded media:', media)

  // Transcribe audio
  let transcriptText = ''
  try {
    const fd = new FormData()
    fd.append('audio', file, 'audio.webm')
    const result = await transcribeAudio(fd)
    transcriptText = result.text
  } catch (err) {
    console.error('Transcription failed:', err)
    throw new Error('Transcription failed')
  }

  // Generate a title using GPT
  let title = ''
  try {
    title = await generateTitleFromTranscript(transcriptText)
  } catch (err) {
    console.error('Title generation failed:', err)
    title = 'New Audio Note'
  }

  // Summarise transcript
  let summary = ''
  try {
    summary = await summariseTranscript(transcriptText)
  } catch (err) {
    console.error('Summarisation failed:', err)
    summary = transcriptText // fallback to transcript if summarisation fails
  }

  // Helper to wrap plain text into Lexical richText
  function toRichText(t) {
    return {
      root: {
        type: 'root',
        version: 1,
        direction: 'ltr',
        format: '',
        indent: 0,
        children: [
          {
            type: 'paragraph',
            version: 1,
            direction: 'ltr',
            format: '',
            indent: 0,
            children: [
              {
                type: 'text',
                version: 1,
                text: t || '',
                format: 0,
                detail: 0,
                style: '',
                mode: 'normal',
              },
            ],
          },
        ],
      },
    }
  }

  // Create the Note
  const noteBody = {
    title,
    audioFile: media.doc.id,
    transcript: toRichText(transcriptText),
    summary: toRichText(summary),
  }
  console.log('Note creation request body:', noteBody)

  const noteRes = await fetch(`${baseUrl}/api/notes`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: JSON.stringify(noteBody),
  })

  if (!noteRes.ok) {
    const errText = await noteRes.text()
    console.error('Note creation failed:', errText)
    throw new Error('Note creation failed')
  }

  const note = await noteRes.json()
  console.log('Created note:', note)
  return note
}
