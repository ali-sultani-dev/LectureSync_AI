require('@testing-library/jest-dom')

// Mock Next.js server-side modules
jest.mock('next/headers', () => ({
  headers: jest.fn(() => new Map([['host', 'localhost:3000']])),
  cookies: jest.fn(() => ({
    toString: () => 'mocked-cookie-string',
  })),
}))

// Mock AI SDK
jest.mock('ai', () => ({
  generateText: jest.fn(),
  experimental_transcribe: jest.fn(),
}))

jest.mock('@ai-sdk/openai', () => ({
  openai: Object.assign(
    jest.fn((model) => `mocked-${model}`),
    {
      transcription: jest.fn((model) => `mocked-transcription-${model}`),
    },
  ),
}))

// Mock fetch globally
global.fetch = jest.fn()

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks()
})

// Setup environment variables for testing
process.env.NODE_ENV = 'test'
process.env.OPENAI_API_KEY = 'test-key'
