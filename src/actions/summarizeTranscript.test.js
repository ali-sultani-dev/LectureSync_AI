import { summariseTranscript } from '../summariseTranscript'
import { generateText } from 'ai'

// Mock the AI module
jest.mock('ai')
jest.mock('@ai-sdk/openai')

describe('summariseTranscript', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should generate a summary from transcript', async () => {
    const mockTranscript =
      'This is a long transcript about machine learning concepts including neural networks, deep learning, and artificial intelligence applications.'
    const mockSummary =
      'Summary of machine learning concepts covering neural networks and AI applications.'

    generateText.mockResolvedValue({ text: mockSummary })

    const result = await summariseTranscript(mockTranscript)

    expect(generateText).toHaveBeenCalledWith({
      model: 'mocked-gpt-4-turbo',
      prompt: expect.stringContaining(mockTranscript),
    })
    expect(result).toBe(mockSummary)
  })

  it('should handle AI service errors', async () => {
    const mockTranscript = 'Valid transcript for summarization'
    const mockError = new Error('AI service failed')

    generateText.mockRejectedValue(mockError)

    await expect(summariseTranscript(mockTranscript)).rejects.toThrow('AI service failed')
  })

  it('should use correct prompt format', async () => {
    const mockTranscript = 'Test transcript content'
    const mockSummary = 'Test summary'

    generateText.mockResolvedValue({ text: mockSummary })

    await summariseTranscript(mockTranscript)

    expect(generateText).toHaveBeenCalledWith({
      model: 'mocked-gpt-4-turbo',
      prompt: `Summarise the following transcript in 2-3 sentences, focusing on the main points and key takeaways.\n\nTranscript:\n${mockTranscript}`,
    })
  })

  it('should trim whitespace from result', async () => {
    const mockTranscript = 'Test transcript'
    const mockSummary = '   Summary with whitespace   '
    const expectedSummary = 'Summary with whitespace'

    generateText.mockResolvedValue({ text: mockSummary })

    const result = await summariseTranscript(mockTranscript)

    expect(result).toBe(expectedSummary)
  })
})
