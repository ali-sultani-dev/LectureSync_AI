import { useQueryClient } from '@tanstack/react-query'

export function useNotePrefetch() {
  const queryClient = useQueryClient()

  const prefetchNote = async (noteId: string | number) => {
    // Check if note is already cached
    const cachedNote = queryClient.getQueryData(['note', noteId])
    if (cachedNote) return cachedNote

    // Prefetch the note
    return queryClient.prefetchQuery({
      queryKey: ['note', noteId],
      queryFn: () =>
        fetch(`/api/notes/${noteId}?depth=2`, { credentials: 'include' }).then((r) => r.json()),
      staleTime: 10 * 60 * 1000, // 10 minutes
    })
  }

  const prefetchNotes = async (noteIds: (string | number)[]) => {
    // Prefetch multiple notes in parallel
    const prefetchPromises = noteIds.map((id) => prefetchNote(id))
    return Promise.allSettled(prefetchPromises)
  }

  return { prefetchNote, prefetchNotes }
}
