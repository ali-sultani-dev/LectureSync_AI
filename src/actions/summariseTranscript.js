'use server'

import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'

export async function summariseTranscript(transcript) {
  if (typeof transcript !== 'string' || !transcript.trim()) {
    throw new Error('Transcript must not be empty string')
  }
  const prompt = `Summarise the following transcript in 2-3 sentences, focusing on the main points and key takeaways.\n\nTranscript:\n${transcript}`
  const { text } = await generateText({
    model: openai('gpt-4-turbo'),
    prompt,
  })
  return text.trim()
}
