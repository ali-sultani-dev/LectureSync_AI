'use client'
import React, { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { generateQuizFromNote } from '@/actions/generateQuizFromNote'
import { useQuizNoteStore } from '@/lib/quizNoteStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function QuizPage() {
  const router = useRouter();
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState({});
  const [feedback, setFeedback] = useState({});
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const fetchingRef = useRef(false); // Prevent multiple fetches

  const note = useQuizNoteStore(state => state.note);
  const setQuizNote = useQuizNoteStore(state => state.setNote);

  // Recursively extract all text from Lexical rich text
  function extractTextFromLexical(richText) {
    if (!richText?.root?.children) return '';
    function getText(nodes) {
      if (!Array.isArray(nodes)) return '';
      return nodes
        .map(node => {
          if (node.text) return node.text;
          if (node.children) return getText(node.children);
          return '';
        })
        .join(' ');
    }
    return getText(richText.root.children).trim();
  }

  useEffect(() => {
    // Only fetch if not already fetching
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    setQuiz(null);
    setSelected({});
    setFeedback({});
    setScore(0);
    setShowScore(false);
    async function fetchQuiz() {
      try {
        let quizNote = note;

        if (!quizNote && id) {
          const res = await fetch(`/api/notes/${id}?depth=1`, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            quizNote = data.doc;
            setQuizNote(quizNote);
          }
        }
        // hardcoded transcript for demo
        let transcript = quizNote ? extractTextFromLexical(quizNote.transcript) : '';
        let summary = quizNote ? extractTextFromLexical(quizNote.summary) : '';
        if (!transcript && !summary) {
          transcript = 'Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize foods from carbon dioxide and water. Photosynthesis in plants generally involves the green pigment chlorophyll and generates oxygen as a by-product.';
        }
        const quizInput = transcript.length > 40 ? transcript : summary;
        if (!quizInput) throw new Error('No transcript or summary found for this note');
        // Improved prompt for more reliable JSON output
        const prompt = `Create a quiz with 5 multiple-choice questions based on the following transcript. Each question should have 4 options. Format as JSON: [{"question":"...","options":["...","...","...","..."],"answer":1}, ...] where "answer" is the index (0-3) of the correct option in the "options" array.\n\nTranscript:\n${quizInput}`;
        const aiResponse = await generateQuizFromNote(quizInput, prompt);
        console.log('AI response:', aiResponse);
        const text = aiResponse?.text || aiResponse?.output || aiResponse;
        let quizArr;
        try {
          let cleanText = text;
          // Remove triple backticks and language tag if present
          if (typeof cleanText === 'string') {
            cleanText = cleanText.trim();
            if (cleanText.startsWith('```json')) {
              cleanText = cleanText.slice(7);
            }
            if (cleanText.startsWith('```')) {
              cleanText = cleanText.slice(3);
            }
            if (cleanText.endsWith('```')) {
              cleanText = cleanText.slice(0, -3);
            }
            cleanText = cleanText.trim();
          }
          quizArr = typeof cleanText === 'string' ? JSON.parse(cleanText) : cleanText;
          if (!Array.isArray(quizArr)) throw new Error('Quiz is not an array');
        //   check for required fields
          if (!quizArr.every(q => q.question && Array.isArray(q.options) && typeof q.answer === 'number')) {
            throw new Error('Quiz format invalid. Each question must have question, options, and answer fields, and answer must be a number (index).');
          }
        } catch (e) {
          console.error('Failed to parse AI quiz response:', text);
          setError('Failed to parse quiz from AI. Here is the raw response:');
          setQuiz(text);
          return;
        }
        setQuiz(quizArr);
      } catch (err) {
        setError(err.message || 'Error generating quiz');
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    }
    fetchQuiz();
  }, [note, id]);

  // Handle answer selection and feedback
  const handleSelect = (qIdx, optionIdx) => {
    if (selected[qIdx] !== undefined || loading) return;
    setSelected(prev => ({ ...prev, [qIdx]: optionIdx }));
    const isCorrect = quiz[qIdx].answer === optionIdx;
    setFeedback(prev => ({ ...prev, [qIdx]: isCorrect }));
    if (isCorrect) setScore(s => s + 1);
    if (Object.keys(selected).length + 1 === quiz.length) setShowScore(true);
  };

  return (
    <div className="mx-auto w-full max-w-4xl p-6 md:p-8">
      <Button
        variant="outline"
        size="sm"
        className="mb-4"
        onClick={() => router.push(`/dashboard/notes/${id}`)}
        disabled={loading}
      >
        ← Back to Note
      </Button>
      <Card className="mb-6">
        <CardContent>
          <h1 className="text-2xl font-bold mb-4">Quiz</h1>
          {loading && <div>Generating quiz…</div>}
          {error && typeof quiz === 'string' && (
            <div>
              <div className="text-red-500 mb-2">{error}</div>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto">{quiz}</pre>
            </div>
          )}
          {quiz && Array.isArray(quiz) && (
            <ol className="space-y-6">
              {quiz.map((q, i) => (
                <li key={i} className="bg-gray-50 rounded p-4 border">
                  <div className="font-semibold mb-2">Q{i + 1}: {q.question}</div>
                  <div className="space-y-2">
                    {q.options.map((opt, j) => {
                      const isSelected = selected[i] === j;
                      let btnClass = 'bg-white border-gray-200 hover:bg-gray-100';
                      if (selected[i] !== undefined) {
                        if (isSelected && feedback[i]) {
                          btnClass = 'bg-green-200 border-green-500';
                        } else if (isSelected && !feedback[i]) {
                          btnClass = 'bg-red-200 border-red-500';
                        }
                      }
                      return (
                        <button
                          key={j}
                          className={`block w-full text-left px-4 py-2 rounded border transition-colors ${btnClass}`}
                          disabled={selected[i] !== undefined || loading}
                          onClick={() => handleSelect(i, j)}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {selected[i] !== undefined && (
                    <div className={`mt-2 font-semibold ${feedback[i] ? 'text-green-700' : 'text-red-700'}`}>
                      {feedback[i]
                        ? 'Correct!'
                        : (() => {
                            if (typeof q.answer !== 'number' || !Array.isArray(q.options)) return 'Incorrect. (No answer key)';
                            const correctOption = q.options[q.answer];
                            if (correctOption) {
                              return `Incorrect. Correct answer: ${correctOption}`;
                            } else {
                              return `Incorrect. Correct answer: Option ${q.answer + 1}`;
                            }
                          })()}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
          {showScore && (
            <div className="mt-8 text-xl font-bold text-center">
              Your score: {score} / {quiz.length}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}