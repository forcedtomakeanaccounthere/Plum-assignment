'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowRight, TrendingUp, Clock, CheckCircle, AlertCircle, Plus, Loader } from 'lucide-react'
import {
  fetchClaims,
  fetchMetrics,
  formatCurrency,
  formatRelativeDate,
  mapStatus,
  type Claim,
  type MetricsResponse,
} from '@/lib/api'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null)
  const [recentClaims, setRecentClaims] = useState<Claim[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const [metricsRes, claimsRes] = await Promise.all([
          fetchMetrics(),
          fetchClaims({ limit: 5 }),
        ])
        if (!cancelled) {
          setMetrics(metricsRes)
          setRecentClaims(claimsRes.claims)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const dist = metrics?.decisionDistribution
  const total = metrics?.totalClaims ?? 0
  const approved = dist?.APPROVED ?? 0
  const rejected = dist?.REJECTED ?? 0
  const pending = (dist?.MANUAL_REVIEW ?? 0) + (dist?.PARTIAL ?? 0)
  const processing = recentClaims.filter((c) => c.status === 'processing').length
  const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(1) : '0'
  const avgHours = metrics
    ? (metrics.avgProcessingTimeMs / 3600000).toFixed(1)
    : '—'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] gap-2 text-muted-foreground">
        <Loader className="h-5 w-5 animate-spin" />
        Loading dashboard…
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Dashboard</h1>
          <p className="text-muted-foreground">Live overview from your claims database.</p>
        </div>
        <Button size="lg" className="gap-2 w-fit" onClick={() => router.push('/dashboard/claims/new')}>
          <Plus className="h-4 w-4" />
          New Claim
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}. {process.env.NODE_ENV === 'development' ? 'Ensure the backend is running on port 3001.' : 'Check backend status or logs.'}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Total Claims</h3>
            <CheckCircle className="h-4 w-4 text-primary/60" />
          </div>
          <div className="text-2xl font-bold">{total}</div>
        </div>
        <div className="glass rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Approved</h3>
            <TrendingUp className="h-4 w-4 text-emerald-400/60" />
          </div>
          <div className="text-2xl font-bold">{approved}</div>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="text-emerald-400">{approvalRate}%</span> approval rate
          </p>
        </div>
        <div className="glass rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Processing</h3>
            <Clock className="h-4 w-4 text-yellow-400/60" />
          </div>
          <div className="text-2xl font-bold">{processing}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Avg. <span className="text-yellow-400">{avgHours}h</span>
          </p>
        </div>
        <div className="glass rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Rejected / Review</h3>
            <AlertCircle className="h-4 w-4 text-orange-400/60" />
          </div>
          <div className="text-2xl font-bold">{rejected + pending}</div>
        </div>
      </div>

      <div className="glass rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Recent Claims</h3>
            <p className="text-sm text-muted-foreground">Latest submitted claims</p>
          </div>
          <Link href="/dashboard/claims">
            <Button variant="outline" size="sm" className="gap-2">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        {recentClaims.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No claims yet. Submit your first claim.</p>
        ) : (
          <div className="space-y-3">
            {recentClaims.map((claim) => {
              const status = mapStatus(claim)
              return (
                <button
                  key={claim.claimId}
                  type="button"
                  onClick={() => router.push(`/dashboard/claims/${claim.claimId}`)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-border transition-colors text-left"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm">{claim.claimId}</p>
                      <span className="inline-block px-2.5 py-0.5 rounded-full border text-xs font-medium capitalize">
                        {status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{claim.memberName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatCurrency(claim.claimAmount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeDate(claim.submittedAt)}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
