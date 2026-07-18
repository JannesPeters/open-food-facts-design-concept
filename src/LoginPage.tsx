import { LoaderCircle } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import SiteHeader, { HeaderBackButton } from '@/components/SiteHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signInOpenFoodFacts, fetchOpenFoodFactsAccount } from '@/lib/openFoodFacts'
import { setSessionAuth, setSessionUser, useSessionUser } from '@/lib/sessionUser'

function LoginPage() {
  const navigate = useNavigate()
  const sessionUser = useSessionUser()
  const [username, setUsername] = useState(sessionUser?.username ?? '')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (sessionUser) {
    return <Navigate to="/profile" replace />
  }

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedUsername = username.trim()

    if (!trimmedUsername || !password) {
      setErrorMessage('Enter your Open Food Facts username and password.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      const signedInUsername = await signInOpenFoodFacts({
        username: trimmedUsername,
        password,
      })
      const account = await fetchOpenFoodFactsAccount({
        username: signedInUsername,
        password,
      })
      setSessionUser({
        username: signedInUsername,
        name: account?.name,
        email: account?.email,
        country: account?.country,
      })
      setSessionAuth({ username: signedInUsername, password })
      navigate('/profile')
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Sign-in failed. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader leading={<HeaderBackButton />} showLoginAction={false} />

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-start px-4 py-6 sm:items-center sm:px-6 sm:py-10">
        <section className="mx-auto w-full max-w-xl rounded-2xl border border-border bg-card p-5 sm:p-8">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              Open Food Facts account
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Sign in
            </h1>
          </div>

          <div className="mt-6">
            <form onSubmit={handleProfileSubmit} className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="off-username">Open Food Facts username</Label>
                <Input
                  id="off-username"
                  name="off-username"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value)
                    if (errorMessage) {
                      setErrorMessage(null)
                    }
                  }}
                  placeholder="e.g. foodie123"
                  autoComplete="username"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Use your OFF username, not your email address.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="off-password">Password</Label>
                <Input
                  id="off-password"
                  name="off-password"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    if (errorMessage) {
                      setErrorMessage(null)
                    }
                  }}
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
              </div>

              {errorMessage && (
                <p className="text-sm text-destructive">{errorMessage}</p>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    'Continue to profile'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}

export default LoginPage
