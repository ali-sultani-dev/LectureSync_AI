'use server'

import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'

// Generates a quiz from a transcript using OpenAI GPT
export async function generateQuizFromNote(transcript, customPrompt) {
  // Validate input
  if (typeof transcript !== 'string' || !transcript.trim()) {
    throw new Error('Transcript must be a non-empty string')
  }
  // Build the prompt for the AI model
  const prompt =
    customPrompt ||
    `Create a quiz with 5 multiple-choice questions based on the following transcript. Each question should have 4 options. Format as JSON: [{"question":"...","options":["...","...","...","..."],"answer":1}, ...] where "answer" is the index (0-3) of the correct option in the "options" array.\n\nTranscript:\n${transcript}`
  // Call the AI model to generate the quiz
  const { text } = await generateText({
    model: openai('gpt-4-turbo'),
    prompt,
  })
  // Try to parse the result as JSON, otherwise return raw text
  try {
    return JSON.parse(text)
  } catch {
    return text.trim()
  }
}
