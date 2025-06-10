import { transcribeAudio } from '../transcribe'
import { experimental_transcribe as transcribe } from 'ai'

// Mock the AI module
jest.mock('ai')
jest.mock('@ai-sdk/openai')

describe('transcribeAudio', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should transcribe audio file successfully', async () => {
    const mockTranscriptText = 'This is a test transcription'
    const mockAudioFile = new File(['audio content'], 'test.webm', { type: 'audio/webm' })
    const mockFormData = new FormData()
    mockFormData.append('audio', mockAudioFile)

    transcribe.mockResolvedValue({ text: mockTranscriptText })

    const result = await transcribeAudio(mockFormData)

    expect(transcribe).toHaveBeenCalledWith({
      model: 'mocked-transcription-whisper-1',
      audio: expect.any(Buffer),
    })
    expect(result).toEqual({
      text: mockTranscriptText,
      success: true,
    })
  })

  it('should throw error when no audio file provided', async () => {
    const mockFormData = new FormData()
    // Not adding any file to formData

    await expect(transcribeAudio(mockFormData)).rejects.toThrow('Failed to transcribe audio')
  })

  it('should throw error when audio field is not a File', async () => {
    const mockFormData = new FormData()
    mockFormData.append('audio', 'not a file')

    await expect(transcribeAudio(mockFormData)).rejects.toThrow('Failed to transcribe audio')
  })

  it('should handle transcription service errors', async () => {
    const mockAudioFile = new File(['audio content'], 'test.webm', { type: 'audio/webm' })
    const mockFormData = new FormData()
    mockFormData.append('audio', mockAudioFile)

    const mockError = new Error('Transcription service unavailable')
    transcribe.mockRejectedValue(mockError)

    await expect(transcribeAudio(mockFormData)).rejects.toThrow('Failed to transcribe audio')
  })

  it('should convert audio file to buffer correctly', async () => {
    const audioContent = 'mock audio content'
    const mockAudioFile = new File([audioContent], 'test.webm', { type: 'audio/webm' })
    const mockFormData = new FormData()
    mockFormData.append('audio', mockAudioFile)

    // Mock arrayBuffer method
    mockAudioFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(audioContent.length))

    transcribe.mockResolvedValue({ text: 'transcribed text' })

    await transcribeAudio(mockFormData)

    expect(mockAudioFile.arrayBuffer).toHaveBeenCalled()
    expect(transcribe).toHaveBeenCalledWith({
      model: 'mocked-transcription-whisper-1',
      audio: expect.any(Buffer),
    })
  })
})
