'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Search, ChevronRight, Loader } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  fetchClaims,
  formatCurrency,
  formatRelativeDate,
  mapStatus,
  type Claim,
} from '@/lib/api'

export default function ClaimsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const res = await fetchClaims({ limit: 100 })
        if (!cancelled) setClaims(res.claims)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load claims')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredClaims = claims.filter((claim) => {
    const status = mapStatus(claim)
    const matchesSearch =
      claim.claimId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.memberName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', text: '#22c55e' }
      case 'pending':
        return { bg: 'rgba(234, 179, 8, 0.1)', border: 'rgba(234, 179, 8, 0.3)', text: '#eab308' }
      case 'processing':
        return { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6' }
      case 'rejected':
        return { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#ef4444' }
      case 'partial':
        return { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.3)', text: '#a855f7' }
      default:
        return { bg: 'rgba(107, 114, 128, 0.1)', border: 'rgba(107, 114, 128, 0.3)', text: '#6b7280' }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Claims</h1>
          <p className="text-muted-foreground mt-1">Manage and track all submitted claims</p>
        </div>
        <Button className="gap-2" size="lg" onClick={() => router.push('/dashboard/claims/new')}>
          <Plus className="h-4 w-4" />
          New Claim
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="glass rounded-lg border border-border p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex items-center gap-2 bg-input rounded-lg px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by ID or patient name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex items-center gap-2 bg-input rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="rejected">Rejected</option>
            <option value="partial">Partial</option>
          </select>
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {filteredClaims.length} of {claims.length} claims
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 gap-2 text-muted-foreground">
          <Loader className="h-5 w-5 animate-spin" />
          Loading claims…
        </div>
      ) : (
        <div className="glass rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-secondary/10">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground">CLAIM ID</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground">PATIENT</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground">AMOUNT</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground">STATUS</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground">SUBMITTED</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredClaims.map((claim) => {
                  const status = mapStatus(claim)
                  const statusColor = getStatusColor(status)
                  return (
                    <tr key={claim.claimId} className="hover:bg-secondary/10 transition-colors duration-200">
                      <td className="px-6 py-4 text-sm font-semibold">{claim.claimId}</td>
                      <td className="px-6 py-4 text-sm">{claim.memberName}</td>
                      <td className="px-6 py-4 text-sm font-medium">{formatCurrency(claim.claimAmount)}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className="inline-block px-3 py-1 rounded-full border text-xs font-medium capitalize"
                          style={{
                            backgroundColor: statusColor.bg,
                            borderColor: statusColor.border,
                            color: statusColor.text,
                          }}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {formatRelativeDate(claim.submittedAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {claim.adjudicationExplainability?.fraudTriggered && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold animate-pulse">
                              ⚠️ Fraud Flag
                            </span>
                          )}
                          {status === 'partial' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-500 text-xs font-semibold">
                              ⚠️ Partial
                            </span>
                          )}
                          {status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold">
                              ⚠️ Rejected
                            </span>
                          )}
                          <button
                            onClick={() => router.push(`/dashboard/claims/${claim.claimId}`)}
                            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors ml-2"
                          >
                            <span className="text-sm font-medium">View</span>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filteredClaims.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-muted-foreground">No claims found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
