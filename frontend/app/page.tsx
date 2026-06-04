'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, FileText, Shield, Zap } from 'lucide-react'

export default function Page() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-card/20">
      <div className="max-w-5xl mx-auto px-6 py-16 space-y-16">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Plum OPD</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Automated outpatient claim adjudication with OCR, policy rules, and AI-assisted decisions.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Link href="/dashboard">
              <Button size="lg" className="gap-2">
                Open Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard/claims/new">
              <Button variant="outline" size="lg" className="gap-2">
                Submit a Claim
                <FileText className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="glass rounded-lg border border-border p-6 space-y-2">
            <Zap className="h-8 w-8 text-primary/70" />
            <h3 className="font-semibold">Real-time processing</h3>
            <p className="text-sm text-muted-foreground">
              Upload bills and prescriptions; watch OCR, extraction, and adjudication live via SSE.
            </p>
          </div>
          <div className="glass rounded-lg border border-border p-6 space-y-2">
            <Shield className="h-8 w-8 text-emerald-400/70" />
            <h3 className="font-semibold">Policy engine</h3>
            <p className="text-sm text-muted-foreground">
              Claims are validated against your active OPD policy with programmatic and AI soft rules.
            </p>
          </div>
          <div className="glass rounded-lg border border-border p-6 space-y-2">
            <FileText className="h-8 w-8 text-yellow-400/70" />
            <h3 className="font-semibold">Document chat (RAG)</h3>
            <p className="text-sm text-muted-foreground">
              Ask questions about a claim&apos;s documents after processing completes.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Admin policy configuration:{' '}
          <Link href="/dashboard/settings" className="text-primary hover:underline">
            /dashboard/settings
          </Link>{' '}
          (login required)
        </p>
      </div>
    </main>
  )
}
