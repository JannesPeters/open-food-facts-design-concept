import type { ReactNode } from 'react'
import { ScanLine } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

const scannerAction = (
  <Button
    asChild
    variant="outline"
    size="sm"
    className="w-9 px-0 sm:w-auto sm:px-3"
  >
    <Link to="/scanner" aria-label="Scanner">
      <ScanLine className="size-4" />
      <span className="hidden sm:inline">Scanner</span>
    </Link>
  </Button>
)

function SiteHeader({
  trailing = scannerAction,
}: {
  trailing?: ReactNode
}) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/off-logo.svg"
            alt="Open Food Facts"
            className="h-9 w-auto dark:hidden"
          />
          <img
            src="/off-logo-dark.svg"
            alt="Open Food Facts"
            className="hidden h-9 w-auto dark:block"
          />
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
            Concept
          </span>
        </Link>
        {trailing}
      </div>
    </header>
  )
}

export default SiteHeader
