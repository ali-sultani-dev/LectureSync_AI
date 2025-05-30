import { Container } from '@/components/home/Container'

const faqs = [
  [
    {
      question: 'What is LectureSyncAI?',
      answer:
        'LectureSyncAI is an AI-powered note-taking app that records, transcribes, and summarizes your lectures and meetings. It helps you stay organized, save time, and never miss important details.',
    },
    {
      question: 'How does the free plan work?',
      answer:
        'With the free plan, you can record up to 20 minutes per session, create up to 30 notes per month, and generate up to 5 AI-powered quizzes each month.',
    },
    {
      question: 'What do I get with Pro?',
      answer:
        'The Pro plan lets you record up to 1 hour per session, make up to 60 notes, and access up to 30 quizzes each month. You can also share notes with friends. Team collaboration tools are coming soon!',
    },
  ],
  [
    {
      question: 'Is my data secure?',
      answer:
        'Yes! Your recordings, transcripts, and notes are securely stored and only accessible by you. Privacy is a top priority for us.',
    },
    {
      question: 'Can I use LectureSyncAI for both lectures and meetings?',
      answer:
        'Absolutely! Whether it’s a class, a meeting, or an interview, LectureSyncAI is designed for all kinds of spoken content.',
    },
    {
      question: 'Can I search through my old notes?',
      answer:
        'Yes, all your notes and transcripts are fully searchable so you can easily find information from any past session.',
    },
  ],
  [
    {
      question: 'Does it work on all my devices?',
      answer:
        'Yes, you can access your notes and transcripts from any device with an internet connection.',
    },
    {
      question: 'How accurate are the transcriptions and summaries?',
      answer:
        'We use advanced AI models to provide high-quality, accurate transcriptions and summaries, but accuracy can vary based on audio quality and clarity.',
    },
    {
      question: 'How do I get started?',
      answer: 'Just sign up for a free account and start recording your first lecture or meeting!',
    },
  ],
]

export function Faqs() {
  return (
    <section
      id="faqs"
      aria-labelledby="faqs-title"
      className="border-t border-gray-200 py-20 sm:py-32"
    >
      <Container>
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2 id="faqs-title" className="text-3xl font-medium tracking-tight text-gray-900">
            Frequently asked questions
          </h2>
          <p className="mt-2 text-lg text-gray-600">
            If you have anything else you want to ask,{' '}
            <a href="mailto:support@lecturesync.ai" className="text-gray-900 underline">
              reach out to us
            </a>
            .
          </p>
        </div>
        <ul
          role="list"
          className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:max-w-none lg:grid-cols-3"
        >
          {faqs.map((column, columnIndex) => (
            <li key={columnIndex}>
              <ul role="list" className="space-y-10">
                {column.map((faq, faqIndex) => (
                  <li key={faqIndex}>
                    <h3 className="text-lg/6 font-semibold text-gray-900">{faq.question}</h3>
                    <p className="mt-4 text-sm text-gray-700">{faq.answer}</p>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
