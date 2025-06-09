import { CreateNewNote } from '../CreateNewNote'
import { transcribeAudio } from '../transcribe'
import { generateTitleFromTranscript } from '../generateTitleFromTranscript'
import { summariseTranscript } from '../summariseTranscript'

// Mock all dependencies
jest.mock('../transcribe')
jest.mock('../generateTitleFromTranscript')
jest.mock('../summariseTranscript')
jest.mock('next/headers')

describe('CreateNewNote', () => {
  const mockFile = new File(['audio content'], 'test.webm', { type: 'audio/webm' })

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset fetch mock
    global.fetch.mockReset()
  })

  it('should create a new note successfully', async () => {
    const mockTranscript = 'This is a test transcript'
    const mockTitle = 'Test Note Title'
    const mockSummary = 'Test summary'

    // Mock fetch responses for this test
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ doc: { id: 'mock-media-id' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ doc: { id: 'mock-note-id' } }),
      })

    transcribeAudio.mockResolvedValue({ text: mockTranscript })
    generateTitleFromTranscript.mockResolvedValue(mockTitle)
    summariseTranscript.mockResolvedValue(mockSummary)

    const result = await CreateNewNote({ file: mockFile })

    // Verify media upload
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/api/media'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: { Cookie: 'mocked-cookie-string' },
      }),
    )

    // Verify transcription
    expect(transcribeAudio).toHaveBeenCalledWith(expect.any(FormData))

    // Verify title generation
    expect(generateTitleFromTranscript).toHaveBeenCalledWith(mockTranscript)

    // Verify summary generation
    expect(summariseTranscript).toHaveBeenCalledWith(mockTranscript)

    // Verify note creation
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/api/notes'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'mocked-cookie-string',
        },
        body: expect.stringContaining(mockTitle),
      }),
    )

    expect(result).toEqual({ doc: { id: 'mock-note-id' } })
  })

  it('should throw error if file is not provided', async () => {
    await expect(CreateNewNote({ file: null })).rejects.toThrow('Provide a File under "file"')
  })

  it('should throw error if file is not a File instance', async () => {
    await expect(CreateNewNote({ file: 'not a file' })).rejects.toThrow(
      'Provide a File under "file"',
    )
  })

  it('should handle media upload failure', async () => {
    // Mock failed media upload
    global.fetch.mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve('Upload failed'),
    })

    await expect(CreateNewNote({ file: mockFile })).rejects.toThrow('Media upload failed')
  })

  it('should handle transcription failure', async () => {
    // Mock successful media upload
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ doc: { id: 'mock-media-id' } }),
    })

    transcribeAudio.mockRejectedValue(new Error('Transcription failed'))

    await expect(CreateNewNote({ file: mockFile })).rejects.toThrow('Transcription failed')
  })

  it('should use fallback title if title generation fails', async () => {
    const mockTranscript = 'Test transcript'

    // Mock fetch responses
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ doc: { id: 'mock-media-id' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ doc: { id: 'mock-note-id' } }),
      })

    transcribeAudio.mockResolvedValue({ text: mockTranscript })
    generateTitleFromTranscript.mockRejectedValue(new Error('Title generation failed'))
    summariseTranscript.mockResolvedValue('Test summary')

    const result = await CreateNewNote({ file: mockFile })

    // Should still create note with fallback title
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('New Audio Note'),
      }),
    )
  })

  it('should use transcript as fallback if summarization fails', async () => {
    const mockTranscript = 'Test transcript'

    // Mock fetch responses
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ doc: { id: 'mock-media-id' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ doc: { id: 'mock-note-id' } }),
      })

    transcribeAudio.mockResolvedValue({ text: mockTranscript })
    generateTitleFromTranscript.mockResolvedValue('Test Title')
    summariseTranscript.mockRejectedValue(new Error('Summarization failed'))

    await CreateNewNote({ file: mockFile })

    // Should use transcript as fallback summary
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining(mockTranscript),
      }),
    )
  })

  it('should handle note creation failure', async () => {
    // Mock successful media upload but failed note creation
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ doc: { id: 'mock-media-id' } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Note creation failed'),
      })

    transcribeAudio.mockResolvedValue({ text: 'Test transcript' })
    generateTitleFromTranscript.mockResolvedValue('Test Title')
    summariseTranscript.mockResolvedValue('Test summary')

    await expect(CreateNewNote({ file: mockFile })).rejects.toThrow('Note creation failed')
  })

  it('should create proper Lexical rich text format', async () => {
    const mockTranscript = 'Test transcript'
    const mockSummary = 'Test summary'

    // Mock fetch responses
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ doc: { id: 'mock-media-id' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ doc: { id: 'mock-note-id' } }),
      })

    transcribeAudio.mockResolvedValue({ text: mockTranscript })
    generateTitleFromTranscript.mockResolvedValue('Test Title')
    summariseTranscript.mockResolvedValue(mockSummary)

    await CreateNewNote({ file: mockFile })

    const noteCreateCall = global.fetch.mock.calls.find(
      (call) => call[0].includes('/api/notes') && call[1].method === 'POST',
    )

    const requestBody = JSON.parse(noteCreateCall[1].body)

    // Verify Lexical format for transcript
    expect(requestBody.transcript).toEqual({
      root: {
        type: 'root',
        version: 1,
        direction: 'ltr',
        format: '',
        indent: 0,
        children: [
          {
            type: 'paragraph',
            version: 1,
            direction: 'ltr',
            format: '',
            indent: 0,
            children: [
              {
                type: 'text',
                version: 1,
                text: mockTranscript,
                format: 0,
                detail: 0,
                style: '',
                mode: 'normal',
              },
            ],
          },
        ],
      },
    })

    // Verify Lexical format for summary
    expect(requestBody.summary).toEqual({
      root: {
        type: 'root',
        version: 1,
        direction: 'ltr',
        format: '',
        indent: 0,
        children: [
          {
            type: 'paragraph',
            version: 1,
            direction: 'ltr',
            format: '',
            indent: 0,
            children: [
              {
                type: 'text',
                version: 1,
                text: mockSummary,
                format: 0,
                detail: 0,
                style: '',
                mode: 'normal',
              },
            ],
          },
        ],
      },
    })
  })
})
