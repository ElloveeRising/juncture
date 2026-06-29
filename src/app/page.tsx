import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

// Root simply routes you to where you belong: the feed if you're in, the
// login screen if you're not. Nothing here is public.
export default async function Home() {
  const user = await getCurrentUser()
  redirect(user ? '/feed' : '/login')
}
