'use server'

import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'

export async function generateTitleFromTranscript(transcript) {
  if (typeof transcript !== 'string' || !transcript.trim()) {
    throw new Error('Transcript must be a non-empty string')
  }
  const prompt = `Generate a concise, descriptive title (max 10 words) for the following transcript.\n\nTranscript:\n${transcript}`
  const { text } = await generateText({
    model: openai('gpt-4-turbo'),
    prompt,
  })
  return text.trim().replace(/^"|"$/g, '') // Remove surrounding quotes if there is any
}
