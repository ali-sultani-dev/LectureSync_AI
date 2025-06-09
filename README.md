# LectureSync AI

A note-taking application that transforms audio recordings into organized notes with AI-powered transcription and chat functionality.

## Requirements

- Node.js 
- PostgreSQL database
- OpenAI API key

## Setup

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/lecturesync"
OPENAI_API_KEY="your-openai-api-key"
BLOB_READ_WRITE_TOKEN="your-vercel-blob-storage-key"
PAYLOAD_SECRET="your-secret-key"
```


## Running the Project

```bash
npm run dev
```

The application will run at http://localhost:3000

## Testing

We use Jest for testing. Tests are located in `src/actions/__tests__/`

Run tests with:
```bash
npm test
```
