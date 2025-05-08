'use server'

import { experimental_transcribe as transcribe } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function transcribeAudio(formData) {
  try {
    const audioFile = formData.get('audio')
    if (!(audioFile instanceof File)) {
      throw new Error('No audio file provided under "audio" field')
    }

    const arrayBuffer = await audioFile.arrayBuffer()
    const audioBuffer = Buffer.from(arrayBuffer)

    const transcript = await transcribe({
      model: openai.transcription('whisper-1'),
      audio: audioBuffer,
    })

    return { text: transcript.text, success: true }
  } catch (error) {
    console.error('Transcription error:', error)
    throw new Error('Failed to transcribe audio')
  }
}