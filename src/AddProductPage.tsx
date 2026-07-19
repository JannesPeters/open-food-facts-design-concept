import { PlusSquare, ScanLine } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SiteHeader, { HeaderBackButton } from '@/components/SiteHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { sanitizeBarcode } from '@/lib/scores'

function AddProductPage() {
  const navigate = useNavigate()
  const [barcodeInput, setBarcodeInput] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const barcode = sanitizeBarcode(barcodeInput)
    if (!barcode) {
      return
    }
    navigate(`/product/${barcode}?mode=add`)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader leading={<HeaderBackButton />} />

      <main className="mx-auto flex w-full max-w-3xl flex-1 px-6 pb-10 pt-6">
        <section className="w-full space-y-6 rounded-2xl border border-border bg-card p-6 text-card-foreground">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              <PlusSquare className="size-3.5" />
              Add a product
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Enter a barcode to create a new product
            </h1>
            <p className="text-sm text-muted-foreground">
              We’ll open an editable product draft for this barcode so you can add
              product details and submit them to Open Food Facts.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
            <Input
              type="text"
              aria-label="Product barcode"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Enter barcode, e.g. 3017620422003"
              value={barcodeInput}
              onChange={(event) => setBarcodeInput(sanitizeBarcode(event.target.value))}
              className="sm:flex-1"
            />
            <Button type="submit" disabled={!barcodeInput.trim()}>
              Start adding product
            </Button>
          </form>

          <div className="border-t border-border pt-4">
            <Button asChild variant="outline" size="sm">
              <Link to="/scanner">
                <ScanLine className="size-4" />
                Scan instead
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default AddProductPage
