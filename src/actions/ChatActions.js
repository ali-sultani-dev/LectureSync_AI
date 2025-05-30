'use server'

import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { headers } from 'next/headers'

// Get AI response for a specific note
export async function getAIResponseForNote(noteId, message) {
  console.log('=== getAIResponseForNote called ===')
  console.log('noteId:', noteId, 'message:', message)

  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY environment variable is not set')
      return 'OpenAI API key is not configured. Please check your environment variables.'
    }

    console.log('OpenAI API key found, length:', process.env.OPENAI_API_KEY.length)

    // Get user from payload auth using headers
    console.log('Getting payload instance...')
    const payload = await getPayload({ config })
    console.log('Getting user auth...')
    const { user } = await payload.auth({ headers: await headers() })

    if (!user) {
      console.error('User authentication failed')
      return 'Authentication failed. Please log in again.'
    }

    console.log('User authenticated:', user.id)

    // Get the specific note
    console.log('Fetching note with ID:', noteId)
    const note = await payload.findByID({
      collection: 'notes',
      id: noteId,
      user: user,
    })

    if (!note) {
      console.error('Note not found for ID:', noteId)
      return 'Note not found. Please refresh the page and try again.'
    }

    console.log('Found note:', note.title)

    try {
      // Extract text content from rich text fields
      const extractTextFromRichText = (richTextContent) => {
        console.log('Extracting text from rich text:', typeof richTextContent)
        if (!richTextContent) return ''
        if (typeof richTextContent === 'string') return richTextContent

        // If it's an array of rich text nodes, extract text
        if (Array.isArray(richTextContent)) {
          return richTextContent
            .map((node) => {
              if (node.type === 'paragraph' && node.children) {
                return node.children.map((child) => child.text || '').join('')
              }
              return node.text || ''
            })
            .join('\n')
        }

        // Handle Lexical editor format
        if (richTextContent.root && richTextContent.root.children) {
          return extractTextFromRichText(richTextContent.root.children)
        }

        return JSON.stringify(richTextContent)
      }

      // Create comprehensive context from the specific note
      console.log('Extracting note content...')
      const transcriptText = extractTextFromRichText(note.transcript)
      const summaryText = extractTextFromRichText(note.summary)
      const categoryTitle = note.category?.title || 'Uncategorized'

      console.log('Transcript length:', transcriptText.length)
      console.log('Summary length:', summaryText.length)

      const noteContext = `Here is the complete content of the note "${note.title}":

Title: ${note.title}
Category: ${categoryTitle}
Created: ${new Date(note.createdAt).toLocaleDateString()}

${summaryText ? `Summary:\n${summaryText}\n\n` : ''}${transcriptText ? `Full Transcript:\n${transcriptText}\n\n` : ''}---

Please answer questions about this specific note content.`

      const systemPrompt = `You are an AI assistant for LectureSync AI, a note-taking application. You are helping the user with questions about a specific note.

${noteContext}

Please provide helpful, detailed responses about this note. You can:
- Answer questions about the content
- Explain concepts mentioned in the note
- Summarize specific sections
- Help with understanding the material
- Suggest study strategies for this content
- Find specific information within the note

Keep responses conversational and helpful. Focus specifically on the content provided in this note.`

      console.log('Calling OpenAI API for note:', note.title)
      console.log('System prompt length:', systemPrompt.length)

      const { text } = await generateText({
        model: openai('gpt-3.5-turbo'),
        system: systemPrompt,
        prompt: message,
        maxTokens: 1000,
        temperature: 0.7,
      })

      console.log('OpenAI API response received, length:', text.length)
      return text
    } catch (aiError) {
      console.error('AI SDK error:', aiError)
      console.error('Error details:', aiError.message)
      console.error('Error stack:', aiError.stack)

      // Fallback response with note info
      return `I'm having trouble connecting to the AI service right now. However, I can see you're asking about the note "${note.title}" in the ${note.category?.title || 'Uncategorized'} category. 

Error details: ${aiError.message}

Please try again in a moment.`
    }
  } catch (error) {
    console.error('AI response error:', error)
    console.error('Error stack:', error.stack)

    return `I'm having trouble accessing the note or connecting to the AI service right now. 

Error details: ${error.message}

Please try again in a moment, or check that your OpenAI API key is properly configured.`
  }
}

// Create a new chat for a specific note
export async function createNoteChat(noteId, title, messages) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: await headers() })

    if (!user) {
      throw new Error('Unauthorized')
    }

    const result = await payload.create({
      collection: 'chats',
      data: {
        title,
        messages,
        isActive: true,
        owner: user.id,
        noteId: noteId, // Link chat to specific note
      },
      user: user,
    })

    return result
  } catch (error) {
    console.error('Error creating note chat:', error)
    throw error
  }
}

// Update an existing note chat
export async function updateNoteChat(chatId, messages) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: await headers() })

    if (!user) {
      throw new Error('Unauthorized')
    }

    const result = await payload.update({
      collection: 'chats',
      id: chatId,
      data: {
        messages,
      },
      user: user,
    })

    return result
  } catch (error) {
    console.error('Error updating note chat:', error)
    throw error
  }
}

// Load chats for a specific note
export async function loadNoteChats(noteId) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: await headers() })

    if (!user) {
      throw new Error('Unauthorized')
    }

    const chats = await payload.find({
      collection: 'chats',
      where: {
        and: [
          {
            owner: {
              equals: user.id,
            },
          },
          {
            noteId: {
              equals: noteId,
            },
          },
        ],
      },
      sort: '-updatedAt',
      limit: 50,
      user: user,
    })

    return chats.docs || []
  } catch (error) {
    console.error('Error loading note chats:', error)
    return []
  }
}
