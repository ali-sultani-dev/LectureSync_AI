// Mock the modules before importing to avoid ES modules issues
jest.mock('ai', () => ({
  generateText: jest.fn(),
}))

jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn((model) => `mocked-${model}`),
}))

jest.mock('payload', () => ({
  getPayload: jest.fn(),
}))

jest.mock('next/headers', () => ({
  headers: jest.fn(),
}))

// Mock the config file
jest.mock('../../payload.config', () => ({ default: {} }))

// Now import the modules
import { getAIResponseForNote, createNoteChat, updateNoteChat, loadNoteChats } from '../ChatActions'
import { generateText } from 'ai'
import { getPayload } from 'payload'
import { headers } from 'next/headers'

describe('ChatActions', () => {
  let mockPayload

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset environment variables
    process.env.OPENAI_API_KEY = 'test-api-key'

    // Mock headers
    headers.mockResolvedValue({
      get: jest.fn(),
      set: jest.fn(),
      'user-agent': 'test-agent',
    })

    // Mock payload instance
    mockPayload = {
      auth: jest.fn(),
      findByID: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      find: jest.fn(),
    }

    getPayload.mockResolvedValue(mockPayload)
  })

  describe('getAIResponseForNote', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    const mockNote = {
      id: 'note-123',
      title: 'Test Note',
      createdAt: '2024-01-01T00:00:00.000Z',
      category: { title: 'Study Notes' },
      transcript: {
        root: {
          children: [
            {
              type: 'paragraph',
              children: [{ text: 'This is a test transcript content.' }],
            },
          ],
        },
      },
      summary: {
        root: {
          children: [
            {
              type: 'paragraph',
              children: [{ text: 'This is a test summary.' }],
            },
          ],
        },
      },
    }

    it('should get AI response for note successfully', async () => {
      mockPayload.auth.mockResolvedValue({ user: mockUser })
      mockPayload.findByID.mockResolvedValue(mockNote)
      generateText.mockResolvedValue({ text: 'AI response about the note content' })

      const result = await getAIResponseForNote('note-123', 'What is this note about?')

      expect(mockPayload.auth).toHaveBeenCalled()
      expect(mockPayload.findByID).toHaveBeenCalledWith({
        collection: 'notes',
        id: 'note-123',
        user: mockUser,
      })
      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'mocked-gpt-3.5-turbo',
          prompt: 'What is this note about?',
          maxTokens: 1000,
          temperature: 0.7,
        }),
      )
      expect(result).toBe('AI response about the note content')
    })

    it('should return error message when OpenAI API key is missing', async () => {
      delete process.env.OPENAI_API_KEY

      const result = await getAIResponseForNote('note-123', 'Test message')

      expect(result).toBe(
        'OpenAI API key is not configured. Please check your environment variables.',
      )
    })

    it('should return error message when user is not authenticated', async () => {
      mockPayload.auth.mockResolvedValue({ user: null })

      const result = await getAIResponseForNote('note-123', 'Test message')

      expect(result).toBe('Authentication failed. Please log in again.')
    })

    it('should return error message when note is not found', async () => {
      mockPayload.auth.mockResolvedValue({ user: mockUser })
      mockPayload.findByID.mockResolvedValue(null)

      const result = await getAIResponseForNote('note-123', 'Test message')

      expect(result).toBe('Note not found. Please refresh the page and try again.')
    })

    it('should handle AI service errors gracefully', async () => {
      mockPayload.auth.mockResolvedValue({ user: mockUser })
      mockPayload.findByID.mockResolvedValue(mockNote)
      generateText.mockRejectedValue(new Error('AI service error'))

      const result = await getAIResponseForNote('note-123', 'Test message')

      expect(result).toContain(
        'I\'m having trouble connecting to the AI service right now. However, I can see you\'re asking about the note "Test Note"',
      )
      expect(result).toContain('AI service error')
    })

    it('should handle notes without category', async () => {
      const noteWithoutCategory = { ...mockNote, category: null }
      mockPayload.auth.mockResolvedValue({ user: mockUser })
      mockPayload.findByID.mockResolvedValue(noteWithoutCategory)
      generateText.mockResolvedValue({ text: 'AI response' })

      await getAIResponseForNote('note-123', 'Test message')

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('Category: Uncategorized'),
        }),
      )
    })

    it('should extract text from string transcript/summary', async () => {
      const noteWithStringContent = {
        ...mockNote,
        transcript: 'Simple string transcript',
        summary: 'Simple string summary',
      }
      mockPayload.auth.mockResolvedValue({ user: mockUser })
      mockPayload.findByID.mockResolvedValue(noteWithStringContent)
      generateText.mockResolvedValue({ text: 'AI response' })

      await getAIResponseForNote('note-123', 'Test message')

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('Simple string summary'),
        }),
      )
    })

    it('should handle general errors', async () => {
      mockPayload.auth.mockRejectedValue(new Error('Database connection error'))

      const result = await getAIResponseForNote('note-123', 'Test message')

      expect(result).toContain(
        "I'm having trouble accessing the note or connecting to the AI service right now.",
      )
      expect(result).toContain('Database connection error')
    })
  })

  describe('createNoteChat', () => {
    const mockUser = { id: 'user-123' }
    const mockChatData = {
      title: 'Test Chat',
      messages: [{ role: 'user', content: 'Hello' }],
    }

    it('should create note chat successfully', async () => {
      mockPayload.auth.mockResolvedValue({ user: mockUser })
      mockPayload.create.mockResolvedValue({ id: 'chat-123', ...mockChatData })

      const result = await createNoteChat('note-123', mockChatData.title, mockChatData.messages)

      expect(mockPayload.create).toHaveBeenCalledWith({
        collection: 'chats',
        data: {
          title: 'Test Chat',
          messages: mockChatData.messages,
          isActive: true,
          owner: 'user-123',
          noteId: 'note-123',
        },
        user: mockUser,
      })
      expect(result).toEqual({ id: 'chat-123', ...mockChatData })
    })

    it('should throw error when user is not authenticated', async () => {
      mockPayload.auth.mockResolvedValue({ user: null })

      await expect(
        createNoteChat('note-123', mockChatData.title, mockChatData.messages),
      ).rejects.toThrow('Unauthorized')
    })
  })

  describe('updateNoteChat', () => {
    const mockUser = { id: 'user-123' }
    const mockMessages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ]

    it('should update note chat successfully', async () => {
      mockPayload.auth.mockResolvedValue({ user: mockUser })
      mockPayload.update.mockResolvedValue({ id: 'chat-123', messages: mockMessages })

      const result = await updateNoteChat('chat-123', mockMessages)

      expect(mockPayload.update).toHaveBeenCalledWith({
        collection: 'chats',
        id: 'chat-123',
        data: {
          messages: mockMessages,
        },
        user: mockUser,
      })
      expect(result).toEqual({ id: 'chat-123', messages: mockMessages })
    })

    it('should throw error when user is not authenticated', async () => {
      mockPayload.auth.mockResolvedValue({ user: null })

      await expect(updateNoteChat('chat-123', mockMessages)).rejects.toThrow('Unauthorized')
    })
  })

  describe('loadNoteChats', () => {
    const mockUser = { id: 'user-123' }
    const mockChats = [
      { id: 'chat-1', title: 'Chat 1', noteId: 'note-123' },
      { id: 'chat-2', title: 'Chat 2', noteId: 'note-123' },
    ]

    it('should load note chats successfully', async () => {
      mockPayload.auth.mockResolvedValue({ user: mockUser })
      mockPayload.find.mockResolvedValue({ docs: mockChats })

      const result = await loadNoteChats('note-123')

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'chats',
        where: {
          and: [
            {
              owner: {
                equals: 'user-123',
              },
            },
            {
              noteId: {
                equals: 'note-123',
              },
            },
          ],
        },
        sort: '-updatedAt',
        limit: 50,
        user: mockUser,
      })
      expect(result).toEqual(mockChats)
    })

    it('should return empty array when user is not authenticated', async () => {
      mockPayload.auth.mockResolvedValue({ user: null })

      const result = await loadNoteChats('note-123')

      expect(result).toEqual([])
    })

    it('should return empty array when no chats found', async () => {
      mockPayload.auth.mockResolvedValue({ user: mockUser })
      mockPayload.find.mockResolvedValue({ docs: null })

      const result = await loadNoteChats('note-123')

      expect(result).toEqual([])
    })

    it('should handle database errors gracefully', async () => {
      mockPayload.auth.mockResolvedValue({ user: mockUser })
      mockPayload.find.mockRejectedValue(new Error('Database error'))

      const result = await loadNoteChats('note-123')

      expect(result).toEqual([])
    })
  })
})
