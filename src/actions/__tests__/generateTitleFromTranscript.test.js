import { generateTitleFromTranscript } from '../generateTitleFromTranscript'
import { generateText } from 'ai'

// Mock the AI module
jest.mock('ai')
jest.mock('@ai-sdk/openai')

describe('generateTitleFromTranscript', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should generate a title from transcript', async () => {
    const mockTranscript = 'This is a lecture about machine learning and artificial intelligence'
    const mockTitle = 'Machine Learning and AI Lecture'

    generateText.mockResolvedValue({ text: mockTitle })

    const result = await generateTitleFromTranscript(mockTranscript)

    expect(generateText).toHaveBeenCalledWith({
      model: 'mocked-gpt-4-turbo',
      prompt: expect.stringContaining(mockTranscript),
    })
    expect(result).toBe(mockTitle)
  })

  it('should remove surrounding quotes from generated title', async () => {
    const mockTranscript = 'Sample transcript'
    const mockTitleWithQuotes = '"Sample Title"'
    const expectedTitle = 'Sample Title'

    generateText.mockResolvedValue({ text: mockTitleWithQuotes })

    const result = await generateTitleFromTranscript(mockTranscript)

    expect(result).toBe(expectedTitle)
  })

  it('should throw error for empty transcript', async () => {
    await expect(generateTitleFromTranscript('')).rejects.toThrow(
      'Transcript must be a non-empty string',
    )
  })

  it('should throw error for non-string transcript', async () => {
    await expect(generateTitleFromTranscript(null)).rejects.toThrow(
      'Transcript must be a non-empty string',
    )

    await expect(generateTitleFromTranscript(123)).rejects.toThrow(
      'Transcript must be a non-empty string',
    )
  })

  it('should throw error for whitespace-only transcript', async () => {
    await expect(generateTitleFromTranscript('   ')).rejects.toThrow(
      'Transcript must be a non-empty string',
    )
  })

  it('should handle AI service errors', async () => {
    const mockTranscript = 'Valid transcript'
    const mockError = new Error('AI service unavailable')

    generateText.mockRejectedValue(mockError)

    await expect(generateTitleFromTranscript(mockTranscript)).rejects.toThrow(
      'AI service unavailable',
    )
  })
})
