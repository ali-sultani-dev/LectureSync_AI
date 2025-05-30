'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { useInView } from 'framer-motion'

import { Container } from '@/components/home/Container'

interface Review {
  title: string
  body: string
  author: string
  rating: 1 | 2 | 3 | 4 | 5
}

const reviews: Array<Review> = [
  {
    title: 'Lecture notes, sorted!',
    body: 'LectureSyncAI made my study life so much easier. I just record, and the summaries are ready before I even get home.',
    author: 'Amelia H.',
    rating: 5,
  },
  {
    title: 'Never miss a thing',
    body: 'No more scrambling to keep up in meetings. The transcripts and summaries are so clear—it’s like having a personal assistant.',
    author: 'David S.',
    rating: 5,
  },
  {
    title: 'Transcription is spot on',
    body: 'I’ve tried other apps, but this one nails the audio-to-text every time. So good for group projects!',
    author: 'Priya R.',
    rating: 5,
  },
  {
    title: 'Summaries save hours',
    body: 'The AI summaries are so good, I hardly ever need to read the whole transcript. It highlights all the key points.',
    author: 'Alex W.',
    rating: 5,
  },
  {
    title: 'Great for revision',
    body: 'Before exams, I can just search my old lectures and quickly find what I need. Total game changer.',
    author: 'Jessica L.',
    rating: 5,
  },
  {
    title: 'Syncs across devices',
    body: 'I love being able to access my notes on my phone, laptop, and tablet. Super convenient!',
    author: 'Zane F.',
    rating: 5,
  },
  {
    title: 'Private and secure',
    body: 'Privacy was my biggest concern, but this app keeps my recordings and notes totally secure.',
    author: 'Nora K.',
    rating: 5,
  },
  {
    title: 'My meetings are way more efficient',
    body: 'I just focus on the discussion. LectureSyncAI does the rest.',
    author: 'Marcus P.',
    rating: 5,
  },
  {
    title: 'A must-have for students',
    body: 'If you’re serious about your studies, get this app. Makes every lecture easier to follow.',
    author: 'Sofia D.',
    rating: 5,
  },
  {
    title: 'No more stress',
    body: 'Even if I zone out for a minute, I know I can always catch up with the transcript and summary.',
    author: 'Leo M.',
    rating: 5,
  },
  {
    title: 'Saves so much time',
    body: 'Just record and let the AI do the rest. I’m way more productive now.',
    author: 'Ben T.',
    rating: 5,
  },
  {
    title: 'Amazing accuracy',
    body: 'The AI picks up on every detail and never misses a word. I’m seriously impressed.',
    author: 'Clara V.',
    rating: 5,
  },
  {
    title: 'So easy to use',
    body: 'I’m not techy, but this app is super intuitive. Recording and reviewing notes is a breeze.',
    author: 'Jorge C.',
    rating: 5,
  },
  {
    title: 'No more messy notebooks',
    body: 'Everything is digital, organized, and easy to find. Love it!',
    author: 'Anna P.',
    rating: 5,
  },
]

function StarIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  )
}

function StarRating({ rating }: { rating: Review['rating'] }) {
  return (
    <div className="flex">
      {[...Array(5).keys()].map((index) => (
        <StarIcon
          key={index}
          className={clsx('h-5 w-5', rating > index ? 'fill-cyan-500' : 'fill-gray-300')}
        />
      ))}
    </div>
  )
}

function Review({
  title,
  body,
  author,
  rating,
  className,
  ...props
}: Omit<React.ComponentPropsWithoutRef<'figure'>, keyof Review> & Review) {
  let animationDelay = useMemo(() => {
    let possibleAnimationDelays = ['0s', '0.1s', '0.2s', '0.3s', '0.4s', '0.5s']
    return possibleAnimationDelays[Math.floor(Math.random() * possibleAnimationDelays.length)]
  }, [])

  return (
    <figure
      className={clsx(
        'animate-fade-in rounded-3xl bg-white p-6 opacity-0 shadow-md shadow-gray-900/5',
        className,
      )}
      style={{ animationDelay }}
      {...props}
    >
      <blockquote className="text-gray-900">
        <StarRating rating={rating} />
        <p className="mt-4 text-lg/6 font-semibold before:content-['“'] after:content-['”']">
          {title}
        </p>
        <p className="mt-3 text-base/7">{body}</p>
      </blockquote>
      <figcaption className="mt-3 text-sm text-gray-600 before:content-['–_']">{author}</figcaption>
    </figure>
  )
}

function splitArray<T>(array: Array<T>, numParts: number) {
  let result: Array<Array<T>> = []
  for (let i = 0; i < array.length; i++) {
    let index = i % numParts
    if (!result[index]) {
      result[index] = []
    }
    result[index].push(array[i])
  }
  return result
}

function ReviewColumn({
  reviews,
  className,
  reviewClassName,
  msPerPixel = 0,
}: {
  reviews: Array<Review>
  className?: string
  reviewClassName?: (reviewIndex: number) => string
  msPerPixel?: number
}) {
  let columnRef = useRef<React.ElementRef<'div'>>(null)
  let [columnHeight, setColumnHeight] = useState(0)
  let duration = `${columnHeight * msPerPixel}ms`

  useEffect(() => {
    if (!columnRef.current) {
      return
    }

    let resizeObserver = new window.ResizeObserver(() => {
      setColumnHeight(columnRef.current?.offsetHeight ?? 0)
    })

    resizeObserver.observe(columnRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <div
      ref={columnRef}
      className={clsx('animate-marquee space-y-8 py-4', className)}
      style={{ '--marquee-duration': duration } as React.CSSProperties}
    >
      {reviews.concat(reviews).map((review, reviewIndex) => (
        <Review
          key={reviewIndex}
          aria-hidden={reviewIndex >= reviews.length}
          className={reviewClassName?.(reviewIndex % reviews.length)}
          {...review}
        />
      ))}
    </div>
  )
}

function ReviewGrid() {
  let containerRef = useRef<React.ElementRef<'div'>>(null)
  let isInView = useInView(containerRef, { once: true, amount: 0.4 })
  let columns = splitArray(reviews, 3)
  let column1 = columns[0]
  let column2 = columns[1]
  let column3 = splitArray(columns[2], 2)

  return (
    <div
      ref={containerRef}
      className="relative -mx-4 mt-16 grid h-196 max-h-[150vh] grid-cols-1 items-start gap-8 overflow-hidden px-4 sm:mt-20 md:grid-cols-2 lg:grid-cols-3 rounded-2xl"
    >
      {isInView && (
        <>
          <ReviewColumn
            reviews={[...column1, ...column3.flat(), ...column2]}
            reviewClassName={(reviewIndex) =>
              clsx(
                reviewIndex >= column1.length + column3[0].length && 'md:hidden',
                reviewIndex >= column1.length && 'lg:hidden',
              )
            }
            msPerPixel={10}
          />
          <ReviewColumn
            reviews={[...column2, ...column3[1]]}
            className="hidden md:block"
            reviewClassName={(reviewIndex) => (reviewIndex >= column2.length ? 'lg:hidden' : '')}
            msPerPixel={15}
          />
          <ReviewColumn reviews={column3.flat()} className="hidden lg:block" msPerPixel={10} />
        </>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b from-white" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-white" />
    </div>
  )
}

export function Reviews() {
  return (
    <section id="reviews" aria-labelledby="reviews-title" className="pt-20 pb-16 sm:pt-32 sm:pb-24">
      <Container>
        <h2
          id="reviews-title"
          className="text-3xl font-medium tracking-tight text-gray-900 sm:text-center"
        >
          See how LectureSyncAI is changing the way people take notes.
        </h2>
        <p className="mt-2 text-lg text-gray-600 sm:text-center">
          Students and professionals are loving smarter, faster, and more organized notes with AI.
        </p>
        <ReviewGrid />
      </Container>
    </section>
  )
}
