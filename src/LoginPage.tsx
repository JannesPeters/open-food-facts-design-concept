import { ArrowUpRight, LogIn, UserPlus } from 'lucide-react'
import SiteHeader, { HeaderBackButton } from '@/components/SiteHeader'
import { Button } from '@/components/ui/button'

const offOrigin = 'https://world.openfoodfacts.org'
const offLoginPath = '/cgi/login.pl'
const offCreateAccountPath = '/cgi/user.pl'

function buildRedirectTarget(): string {
  if (typeof window === 'undefined') {
    return '/'
  }

  return `${window.location.origin}/producers`
}

function buildOffLoginUrl(): string {
  const redirect = encodeURIComponent(buildRedirectTarget())
  return `${offOrigin}${offLoginPath}?redirect=${redirect}`
}

function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader leading={<HeaderBackButton />} showLoginAction={false} />

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-6 py-10">
        <section className="mx-auto w-full max-w-xl rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              Open Food Facts account
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Sign in to contribute
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Account authentication is handled by Open Food Facts directly. Use
              your OFF username to sign in, then you can continue with producer
              workflows.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <a href={buildOffLoginUrl()}>
                <LogIn className="size-5" />
                Continue to Open Food Facts
                <ArrowUpRight className="size-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <a
                href={`${offOrigin}${offCreateAccountPath}`}
                target="_blank"
                rel="noreferrer"
              >
                <UserPlus className="size-5" />
                Create an account
                <ArrowUpRight className="size-4" />
              </a>
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default LoginPage
