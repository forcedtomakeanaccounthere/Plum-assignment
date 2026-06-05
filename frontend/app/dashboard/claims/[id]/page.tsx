'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Loader,
  MessageCircle,
  ArrowLeft,
  AlertTriangle,
  ShieldAlert,
  FileText,
  Table2,
  Scale,
  X,
} from 'lucide-react'
import {
  fetchClaim,
  sendClaimChat,
  getStreamUrl,
  formatCurrency,
  mapStatus,
  type Claim,
  type AdjudicationExplainability,
} from '@/lib/api'

type TabId = 'extracted' | 'documents' | 'decision'
type PipelineStep = { step: string; status: string; message: string }

function fieldValue(v: unknown): string {
  if (v == null) return '—'
  if (typeof v === 'object' && v !== null && 'value' in v) {
    const val = (v as { value: unknown }).value
    return val == null ? '—' : String(val)
  }
  return String(v)
}

function buildExtractedRows(claim: Claim): Array<{ field: string; value: string; source?: string }> {
  const rows: Array<{ field: string; value: string; source?: string }> = []
  const s = claim.extractedSummary

  // 1. General Claim Details
  rows.push({ field: 'Member ID', value: claim.memberId, source: 'Claim Application' })
  rows.push({ field: 'Member name', value: claim.memberName, source: 'Claim Application' })
  rows.push({ field: 'Claim amount', value: formatCurrency(claim.claimAmount), source: 'Claim Application' })
  rows.push({ field: 'Treatment date', value: new Date(claim.treatmentDate).toLocaleDateString(), source: 'Claim Application' })
  if (claim.hospitalName) rows.push({ field: 'Hospital', value: claim.hospitalName, source: 'Claim Application' })

  // 2. Summary of Extraction
  if (s) {
    if (s.diagnosis) rows.push({ field: 'Diagnosis (Summary)', value: s.diagnosis, source: 'AI Summary' })
    if (s.doctorName) rows.push({ field: 'Doctor name (Summary)', value: s.doctorName, source: 'AI Summary' })
    if (s.doctorReg) rows.push({ field: 'Doctor registration (Summary)', value: s.doctorReg, source: 'AI Summary' })
    if (s.totalBilledAmount != null)
      rows.push({ field: 'Total billed (Summary)', value: formatCurrency(Number(s.totalBilledAmount)), source: 'AI Summary' })
    s.itemizedCosts?.forEach((c) => {
      rows.push({
        field: `Line item (${c.category})`,
        value: `${c.item} — ${formatCurrency(c.amount)}`,
        source: 'AI Summary',
      })
    })
  }

  // 3. Document-specific Extractions
  claim.documents?.forEach((doc) => {
    const ef = doc.extractedFields as Record<string, unknown> | undefined
    if (!ef) return
    const prefix = doc.type.charAt(0).toUpperCase() + doc.type.slice(1)
    
    if (ef.patient_name) rows.push({ field: 'Patient name', value: fieldValue(ef.patient_name), source: prefix })
    if (ef.doctor_name) rows.push({ field: 'Doctor name', value: fieldValue(ef.doctor_name), source: prefix })
    if (ef.doctor_registration) rows.push({ field: 'Doctor registration', value: fieldValue(ef.doctor_registration), source: prefix })
    if (ef.date) rows.push({ field: 'Document date', value: fieldValue(ef.date), source: prefix })
    if (ef.diagnosis) rows.push({ field: 'Diagnosis', value: fieldValue(ef.diagnosis), source: prefix })
    if (ef.total_amount) rows.push({ field: 'Document total', value: fieldValue(ef.total_amount), source: prefix })
    if (ef.extraction_notes) rows.push({ field: 'Extraction notes', value: fieldValue(ef.extraction_notes), source: prefix })

    // Medicines
    if (Array.isArray(ef.medicines) && ef.medicines.length > 0) {
      ef.medicines.forEach((med: any, idx: number) => {
        const name = med.name || 'Unknown medicine'
        const dosage = med.dosage ? ` (${med.dosage})` : ''
        rows.push({
          field: `Medicine #${idx + 1}`,
          value: `${name}${dosage}`,
          source: prefix,
        })
      })
    }

    // Procedures
    if (Array.isArray(ef.procedures) && ef.procedures.length > 0) {
      ef.procedures.forEach((proc: any, idx: number) => {
        const name = proc.name || 'Unknown procedure'
        const amount = proc.amount != null ? ` — ${formatCurrency(proc.amount)}` : ''
        rows.push({
          field: `Procedure #${idx + 1}`,
          value: `${name}${amount}`,
          source: prefix,
        })
      })
    }

    // Prescribed tests
    if (Array.isArray(ef.tests_prescribed) && ef.tests_prescribed.length > 0) {
      rows.push({
        field: 'Tests prescribed',
        value: ef.tests_prescribed.join(', '),
        source: prefix,
      })
    }

    // Itemized costs
    if (Array.isArray(ef.itemized_costs) && ef.itemized_costs.length > 0) {
      ef.itemized_costs.forEach((item: any, idx: number) => {
        const name = item.item || item.name || 'Unspecified item'
        const amount = item.amount != null ? formatCurrency(item.amount) : '—'
        const category = item.category ? ` (${item.category})` : ''
        rows.push({
          field: `Itemized cost #${idx + 1}${category}`,
          value: `${name} — ${amount}`,
          source: prefix,
        })
      })
    }
  })

  return rows
}

export default function ClaimDetailPage() {
  const params = useParams()
  const router = useRouter()
  const claimId = params.id as string
  const [claim, setClaim] = useState<Claim | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabId>('extracted')
  const [steps, setSteps] = useState<PipelineStep[]>([])
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([])

  const loadClaim = async () => {
    const data = await fetchClaim(claimId)
    setClaim(data)
    if (data.chatHistory?.length) {
      setChatMessages(data.chatHistory.map((m) => ({ role: m.role, content: m.content })))
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await loadClaim()
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load claim')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [claimId])

  useEffect(() => {
    if (!claim || claim.status !== 'processing') return
    const es = new EventSource(getStreamUrl(claimId))
    es.addEventListener('data', (ev) => {
      try {
        const payload = JSON.parse(ev.data)
        setSteps((prev) => [...prev.filter((s) => s.step !== payload.step), payload])
      } catch {
        /* ignore */
      }
    })
    es.addEventListener('final', () => {
      loadClaim().catch(() => {})
      es.close()
    })
    return () => es.close()
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
  const exp = claim.adjudicationExplainability as AdjudicationExplainability | undefined
  const extractedRows = buildExtractedRows(claim)

  const getDecisionTheme = (decisionStr?: string, isFraud?: boolean) => {
    if (isFraud) {
      return {
        border: 'border-red-500/40',
        bg: 'bg-red-500/5',
        text: 'text-red-500',
        badgeBg: 'bg-red-500/10',
      }
    }
    switch (decisionStr) {
      case 'APPROVED':
        return {
          border: 'border-emerald-500/40',
          bg: 'bg-emerald-500/5',
          text: 'text-emerald-500',
          badgeBg: 'bg-emerald-500/10',
        }
      case 'REJECTED':
        return {
          border: 'border-red-500/40',
          bg: 'bg-red-500/5',
          text: 'text-red-500',
          badgeBg: 'bg-red-500/10',
        }
      case 'PARTIAL':
        return {
          border: 'border-purple-500/40',
          bg: 'bg-purple-500/5',
          text: 'text-purple-500',
          badgeBg: 'bg-purple-500/10',
        }
      case 'MANUAL_REVIEW':
      default:
        return {
          border: 'border-yellow-500/40',
          bg: 'bg-yellow-500/5',
          text: 'text-yellow-500',
          badgeBg: 'bg-yellow-500/10',
        }
    }
  }

  const theme = getDecisionTheme(decision?.decision, exp?.fraudTriggered)

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'extracted', label: 'Extracted data', icon: Table2 },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'decision', label: 'Decision & explainability', icon: Scale },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{claim.claimId}</h1>
          <p className="text-muted-foreground">
            {claim.memberName} · {claim.memberId}
          </p>
        </div>
        <span className="px-3 py-1 rounded-full border text-sm capitalize">{status}</span>
      </div>

      {exp?.fraudTriggered && (
        <div className="rounded-lg border border-destructive bg-destructive/15 px-4 py-3 flex gap-3">
          <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="font-semibold text-destructive">Fraud indicator — urgent human intervention</p>
            <ul className="text-sm mt-1 list-disc pl-4">
              {exp.fraudFlags.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {exp?.needsHumanIntervention && !exp.fraudTriggered && (
        <div className="rounded-lg border border-orange-500/50 bg-orange-500/10 px-4 py-3 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-400 shrink-0" />
          <div>
            <p className="font-semibold text-orange-300">Human review recommended</p>
            <ul className="text-sm mt-1 text-muted-foreground list-disc pl-4">
              {exp.humanInterventionReasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {claim.status === 'processing' && (
        <div className="glass rounded-lg border border-border p-4 space-y-2">
          <h3 className="font-semibold text-sm">Processing pipeline</h3>
          {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader className="h-4 w-4 animate-spin" />
              OCR → extraction → rules → AI decision…
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {steps.map((s, i) => (
                <li key={i}>
                  <span className="font-medium capitalize">{s.step}</span>: {s.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'extracted' && (
        <div className="glass rounded-lg border border-border overflow-hidden">
          <p className="px-4 py-3 text-sm text-muted-foreground border-b border-border">
            Stored extraction for this member — no re-upload needed to review.
          </p>
          <table className="w-full text-sm">
            <thead className="bg-secondary/10">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Field</th>
                <th className="text-left px-4 py-2 font-medium">Value</th>
                <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {extractedRows.map((row, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 text-muted-foreground">{row.field}</td>
                  <td className="px-4 py-2 font-medium">{row.value}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground hidden sm:table-cell">
                    {row.source || 'Claim'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'documents' && (
        <div className="grid sm:grid-cols-2 gap-4">
          {claim.documents?.map((doc, i) => (
            <div key={i} className="glass rounded-lg border border-border p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold capitalize">{doc.type}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {doc.originalFileName || 'Document'} · {doc.mediaFormat || 'file'}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-secondary/30">{doc.processingStatus}</span>
              </div>
              {doc.cloudinaryUrl && (
                <div className="space-y-2">
                  {doc.mediaFormat === 'pdf' || doc.cloudinaryUrl.toLowerCase().includes('.pdf') ? (
                    <a
                      href={doc.cloudinaryUrl.startsWith('http') ? doc.cloudinaryUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${doc.cloudinaryUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-center py-8 rounded border border-dashed text-primary hover:underline text-sm"
                    >
                      Open PDF in new tab
                    </a>
                  ) : (
                    <a 
                      href={doc.cloudinaryUrl.startsWith('http') ? doc.cloudinaryUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${doc.cloudinaryUrl}`} 
                      target="_blank" 
                      rel="noreferrer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={doc.cloudinaryUrl.startsWith('http') ? doc.cloudinaryUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${doc.cloudinaryUrl}`}
                        alt={doc.type}
                        className="rounded border border-border max-h-48 w-full object-contain bg-black/20"
                      />
                    </a>
                  )}
                  <a
                    href={doc.cloudinaryUrl.startsWith('http') ? doc.cloudinaryUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${doc.cloudinaryUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary/20"
                  >
                    View original for manual check
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'decision' && (
        <div className="space-y-4">
          <div className={`glass rounded-lg border ${theme.border} ${theme.bg} p-6 grid sm:grid-cols-3 gap-4`}>
            <div>
              <p className="text-xs text-muted-foreground">Decision</p>
              <p className={`text-xl font-bold ${theme.text}`}>{decision?.decision || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Approved amount</p>
              <p className="text-xl font-bold">
                {decision?.approvedAmount != null ? formatCurrency(decision.approvedAmount) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Confidence</p>
              <p className="text-xl font-bold">
                {((exp?.confidenceScore ?? decision?.confidenceScore ?? 0) * 100).toFixed(0)}%
              </p>
              {exp?.aiConfidence != null && (
                <p className="text-xs text-muted-foreground mt-1">
                  AI: {(exp.aiConfidence * 100).toFixed(0)}% — {exp.aiAccuracyNote}
                </p>
              )}
            </div>
          </div>

          {exp?.partialCoverageNote && (
            <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm">
              <strong>Partial coverage:</strong> {exp.partialCoverageNote}
            </div>
          )}

          {exp?.topReasons && exp.topReasons.length > 0 && (
            <div className={`glass rounded-lg border ${decision?.decision !== 'APPROVED' ? `${theme.border} ${theme.bg}` : 'border-border'} p-5 space-y-3`}>
              <h3 className={`font-bold text-base flex items-center gap-2 ${decision?.decision !== 'APPROVED' ? theme.text : ''}`}>
                <span>⚠️</span> Top Adjudication & AI Reasons
              </h3>
              <ul className="list-disc pl-5 text-sm space-y-1.5 text-foreground/90">
                {exp.topReasons.map((r, i) => (
                  <li key={i} className="leading-relaxed">{r}</li>
                ))}
              </ul>
            </div>
          )}

          {exp?.ruleCategories && exp.ruleCategories.length > 0 && (
            <div className="glass rounded-lg border border-border p-4 space-y-4">
              <h3 className="font-semibold">By adjudication category</h3>
              {exp.ruleCategories.map((cat) => (
                <div key={cat.category} className="border-t border-border pt-3 first:border-0 first:pt-0">
                  <p className="text-sm font-medium text-primary">{cat.label}</p>
                  <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                    {cat.reasons.map((r, i) => (
                      <li key={i}>
                        <span className="font-mono text-xs text-foreground/80">{r.code}</span> — {r.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {exp?.aiReasoning && (
            <div className="glass rounded-lg border border-border p-4">
              <h3 className="font-semibold mb-2">AI reasoning</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{exp.aiReasoning}</p>
            </div>
          )}

          {decision?.deductions && decision.deductions.length > 0 && (
            <div className="glass rounded-lg border border-border p-4">
              <h3 className="font-semibold mb-2">Deductions</h3>
              <ul className="text-sm space-y-1">
                {decision.deductions.map((d, i) => (
                  <li key={i}>
                    {d.reason}: {formatCurrency(d.amount)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {claim.status !== 'processing' && (
        <Button
          className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg gap-0 p-0 z-20"
          onClick={() => setChatOpen(true)}
          title="Chat about this claim"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {chatOpen && (
        <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Claim chat (RAG)
              </h3>
              <button type="button" onClick={() => setChatOpen(false)} className="p-1 hover:bg-secondary/30 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
              Answers are grounded in uploaded documents and policy terms via vector search.
            </p>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[200px] max-h-[40vh]">
              {chatMessages.length === 0 && (
                <p className="text-sm text-muted-foreground">Ask about medicines, limits, or document details.</p>
              )}
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg text-sm ${m.role === 'user' ? 'bg-primary/10 ml-6' : 'bg-secondary/20 mr-6'}`}
                >
                  {m.content}
                </div>
              ))}
            </div>
            <form onSubmit={handleChat} className="p-4 border-t border-border flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about this claim…"
                className="flex-1 rounded-lg border border-input bg-input px-3 py-2 text-sm"
              />
              <Button type="submit" disabled={chatLoading || claim.status === 'processing'}>
                {chatLoading ? <Loader className="h-4 w-4 animate-spin" /> : 'Send'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
