import { getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'

export async function GET() {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: await headers() })

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    return Response.json(user)
  } catch (error) {
    console.error('Error fetching current user:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
