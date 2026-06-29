import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { SignupForm } from './SignupForm'

export default async function SignupPage() {
  if (await getCurrentUser()) redirect('/feed')
  return <SignupForm />
}
