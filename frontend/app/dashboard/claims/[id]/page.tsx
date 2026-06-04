'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader, MessageCircle, ArrowLeft } from 'lucide-react'
import {
  fetchClaim,
  sendClaimChat,
  getStreamUrl,
  formatCurrency,
  mapStatus,
  type Claim,
} from '@/lib/api'

type PipelineStep = {
  step: string
  status: string
  message: string
}

export default function ClaimDetailPage() {
  const params = useParams()
  const router = useRouter()
  const claimId = params.id as string
  const [claim, setClaim] = useState<Claim | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [steps, setSteps] = useState<PipelineStep[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([])
  const eventSourceRef = useRef<EventSource | null>(null)

  const loadClaim = async () => {
    const data = await fetchClaim(claimId)
    setClaim(data)
    if (data.chatHistory?.length) {
      setChatMessages(data.chatHistory.map((m) => ({ role: m.role, content: m.content })))
    }
  }

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        await loadClaim()
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load claim')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [claimId])

  useEffect(() => {
    if (!claim || claim.status !== 'processing') return

    const es = new EventSource(getStreamUrl(claimId))
    eventSourceRef.current = es

    es.addEventListener('data', (ev) => {
      try {
        const payload = JSON.parse(ev.data)
        setSteps((prev) => {
          const filtered = prev.filter((s) => s.step !== payload.step)
          return [...filtered, payload]
        })
      } catch {
        /* ignore */
      }
    })

    es.addEventListener('final', () => {
      loadClaim().catch(() => {})
      es.close()
    })

    return () => {
      es.close()
      eventSourceRef.current = null
    }
  }, [claimId, claim?.status])

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || claim?.status === 'processing') return
    setChatLoading(true)
    const msg = chatInput.trim()
    setChatInput('')
    setChatMessages((prev) => [...prev, { role: 'user', content: msg }])
    try {
      const res = await sendClaimChat(claimId, msg)
      setChatMessages((prev) => [...prev, { role: 'assistant', content: res.reply }])
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: err instanceof Error ? err.message : 'Chat failed' },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16 gap-2 text-muted-foreground">
        <Loader className="h-5 w-5 animate-spin" />
        Loading claim…
      </div>
    )
  }

  if (error || !claim) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <p className="text-destructive">{error || 'Claim not found'}</p>
      </div>
    )
  }

  const status = mapStatus(claim)
  const decision = claim.finalDecision

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{claim.claimId}</h1>
          <p className="text-muted-foreground">{claim.memberName} · {claim.memberId}</p>
        </div>
        <span className="px-3 py-1 rounded-full border text-sm capitalize">{status}</span>
      </div>

      {claim.status === 'processing' && (
        <div className="glass rounded-lg border border-border p-4 space-y-2">
          <h3 className="font-semibold text-sm">Processing pipeline</h3>
          {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader className="h-4 w-4 animate-spin" />
              Waiting for updates…
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {steps.map((s, i) => (
                <li key={i} className="text-muted-foreground">
                  <span className="text-foreground font-medium capitalize">{s.step}</span>: {s.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass rounded-lg border border-border p-4 space-y-2">
          <h3 className="font-semibold">Claim info</h3>
          <p className="text-sm">
            Amount: <strong>{formatCurrency(claim.claimAmount)}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Treatment: {new Date(claim.treatmentDate).toLocaleDateString()}
          </p>
          {claim.hospitalName && (
            <p className="text-sm text-muted-foreground">Hospital: {claim.hospitalName}</p>
          )}
          {claim.extractedSummary?.diagnosis && (
            <p className="text-sm">Diagnosis: {claim.extractedSummary.diagnosis}</p>
          )}
        </div>

        <div className="glass rounded-lg border border-border p-4 space-y-2">
          <h3 className="font-semibold">Decision</h3>
          <p className="text-lg font-bold">{decision?.decision || '—'}</p>
          {decision?.approvedAmount != null && (
            <p className="text-sm">Approved: {formatCurrency(decision.approvedAmount)}</p>
          )}
          {decision?.rejectionReasons?.length > 0 && (
            <ul className="text-xs text-destructive list-disc pl-4">
              {decision.rejectionReasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
          {decision?.notes && <p className="text-xs text-muted-foreground">{decision.notes}</p>}
        </div>
      </div>

      {claim.documents?.length > 0 && (
        <div className="glass rounded-lg border border-border p-4">
          <h3 className="font-semibold mb-2">Documents</h3>
          <ul className="space-y-2 text-sm">
            {claim.documents.map((doc, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="capitalize">{doc.type}</span>
                {doc.cloudinaryUrl ? (
                  <a
                    href={doc.cloudinaryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline truncate max-w-[60%]"
                  >
                    View
                  </a>
                ) : (
                  <span className="text-muted-foreground">{doc.processingStatus}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {claim.status !== 'processing' && (
        <div className="glass rounded-lg border border-border p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Ask about this claim (RAG)
          </h3>
          <div className="max-h-48 overflow-y-auto space-y-2 text-sm">
            {chatMessages.length === 0 && (
              <p className="text-muted-foreground">Ask a question about the uploaded documents.</p>
            )}
            {chatMessages.map((m, i) => (
              <div
                key={i}
                className={`p-2 rounded-lg ${m.role === 'user' ? 'bg-primary/10 ml-8' : 'bg-secondary/20 mr-8'}`}
              >
                {m.content}
              </div>
            ))}
          </div>
          <form onSubmit={handleChat} className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="e.g. What medicines were prescribed?"
              className="flex-1 rounded-lg border border-input bg-input px-3 py-2 text-sm"
            />
            <Button type="submit" disabled={chatLoading}>
              {chatLoading ? <Loader className="h-4 w-4 animate-spin" /> : 'Send'}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
