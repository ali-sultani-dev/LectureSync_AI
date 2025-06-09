import { generateQuizFromNote } from '../generateQuizFromNote'
import { generateText } from 'ai'

// Mock AI SDK
jest.mock('ai')
jest.mock('@ai-sdk/openai')

describe('generateQuizFromNote', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should generate quiz from transcript successfully', async () => {
    const mockTranscript = 'This is a test transcript about JavaScript fundamentals'
    const mockQuizJSON = [
      {
        question: 'What is JavaScript?',
        options: ['Programming language', 'Markup language', 'Database', 'Framework'],
        answer: 0,
      },
    ]

    generateText.mockResolvedValue({ text: JSON.stringify(mockQuizJSON) })

    const result = await generateQuizFromNote(mockTranscript)

    expect(generateText).toHaveBeenCalledWith({
      model: 'mocked-gpt-4-turbo',
      prompt: expect.stringContaining(mockTranscript),
    })
    expect(result).toEqual(mockQuizJSON)
  })

  it('should use custom prompt when provided', async () => {
    const mockTranscript = 'Test transcript'
    const customPrompt = 'Create 3 questions about this content'
    const mockQuizJSON = [{ question: 'Test question', options: ['A', 'B'], answer: 0 }]

    generateText.mockResolvedValue({ text: JSON.stringify(mockQuizJSON) })

    await generateQuizFromNote(mockTranscript, customPrompt)

    expect(generateText).toHaveBeenCalledWith({
      model: 'mocked-gpt-4-turbo',
      prompt: customPrompt,
    })
  })

  it('should use default prompt when custom prompt not provided', async () => {
    const mockTranscript = 'Test transcript about math'
    const mockQuizJSON = [{ question: 'Test', options: ['A'], answer: 0 }]

    generateText.mockResolvedValue({ text: JSON.stringify(mockQuizJSON) })

    await generateQuizFromNote(mockTranscript)

    expect(generateText).toHaveBeenCalledWith({
      model: 'mocked-gpt-4-turbo',
      prompt: expect.stringContaining('Create a quiz with 5 multiple-choice questions'),
    })
  })

  it('should return raw text when JSON parsing fails', async () => {
    const mockTranscript = 'Test transcript'
    const nonJSONResponse = 'This is not valid JSON response from AI'

    generateText.mockResolvedValue({ text: nonJSONResponse })

    const result = await generateQuizFromNote(mockTranscript)

    expect(result).toBe(nonJSONResponse.trim())
  })

  it('should throw error for empty transcript', async () => {
    await expect(generateQuizFromNote('')).rejects.toThrow('Transcript must be a non-empty string')
  })

  it('should throw error for whitespace-only transcript', async () => {
    await expect(generateQuizFromNote('   \n\t  ')).rejects.toThrow(
      'Transcript must be a non-empty string',
    )
  })

  it('should throw error for non-string transcript', async () => {
    await expect(generateQuizFromNote(null)).rejects.toThrow(
      'Transcript must be a non-empty string',
    )
    await expect(generateQuizFromNote(undefined)).rejects.toThrow(
      'Transcript must be a non-empty string',
    )
    await expect(generateQuizFromNote(123)).rejects.toThrow('Transcript must be a non-empty string')
    await expect(generateQuizFromNote({})).rejects.toThrow('Transcript must be a non-empty string')
  })

  it('should handle AI service errors', async () => {
    const mockTranscript = 'Test transcript'
    const mockError = new Error('AI service unavailable')

    generateText.mockRejectedValue(mockError)

    await expect(generateQuizFromNote(mockTranscript)).rejects.toThrow('AI service unavailable')
  })

  it('should handle complex quiz JSON response', async () => {
    const mockTranscript = 'Complex transcript about biology'
    const complexQuizJSON = [
      {
        question: 'What is photosynthesis?',
        options: [
          'Process of making food in plants',
          'Process of breathing in animals',
          'Process of digestion',
          'Process of reproduction',
        ],
        answer: 0,
      },
      {
        question: 'Which organelle is responsible for photosynthesis?',
        options: ['Mitochondria', 'Nucleus', 'Chloroplast', 'Ribosome'],
        answer: 2,
      },
    ]

    generateText.mockResolvedValue({ text: JSON.stringify(complexQuizJSON) })

    const result = await generateQuizFromNote(mockTranscript)

    expect(result).toEqual(complexQuizJSON)
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(2)
    expect(result[0]).toHaveProperty('question')
    expect(result[0]).toHaveProperty('options')
    expect(result[0]).toHaveProperty('answer')
  })

  it('should trim whitespace from raw text response', async () => {
    const mockTranscript = 'Test transcript'
    const textWithWhitespace = '  \n  Some non-JSON response  \n  '

    generateText.mockResolvedValue({ text: textWithWhitespace })

    const result = await generateQuizFromNote(mockTranscript)

    expect(result).toBe('Some non-JSON response')
  })
})
