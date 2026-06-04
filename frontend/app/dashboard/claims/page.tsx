'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Search, Filter, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ClaimsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const claims = [
    { id: 'CLM-001', patient: 'John Doe', amount: '$1,200', status: 'approved', date: '2 hours ago' },
    { id: 'CLM-002', patient: 'Jane Smith', amount: '$850', status: 'pending', date: '4 hours ago' },
    { id: 'CLM-003', patient: 'Bob Wilson', amount: '$2,100', status: 'processing', date: '1 day ago' },
    { id: 'CLM-004', patient: 'Alice Brown', amount: '$1,500', status: 'approved', date: '2 days ago' },
    { id: 'CLM-005', patient: 'Charlie Davis', amount: '$950', status: 'rejected', date: '3 days ago' },
    { id: 'CLM-006', patient: 'Eva Martinez', amount: '$3,200', status: 'processing', date: '3 days ago' },
  ]

  const filteredClaims = claims.filter(claim => {
    const matchesSearch = claim.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         claim.patient.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || claim.status === statusFilter
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
      default:
        return { bg: 'rgba(107, 114, 128, 0.1)', border: 'rgba(107, 114, 128, 0.3)', text: '#6b7280' }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Filters & Search */}
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
          </select>
        </div>
        
        <div className="text-sm text-muted-foreground">
          Showing {filteredClaims.length} of {claims.length} claims
        </div>
      </div>

      {/* Claims Table */}
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
                const statusColor = getStatusColor(claim.status)
                return (
                  <tr key={claim.id} className="hover:bg-secondary/10 transition-colors duration-200">
                    <td className="px-6 py-4 text-sm font-semibold">{claim.id}</td>
                    <td className="px-6 py-4 text-sm">{claim.patient}</td>
                    <td className="px-6 py-4 text-sm font-medium">{claim.amount}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className="inline-block px-3 py-1 rounded-full border text-xs font-medium capitalize"
                        style={{
                          backgroundColor: statusColor.bg,
                          borderColor: statusColor.border,
                          color: statusColor.text
                        }}
                      >
                        {claim.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{claim.date}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => router.push(`/dashboard/claims/${claim.id}`)}
                        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                      >
                        <span className="text-sm font-medium">View</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredClaims.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-muted-foreground">No claims found matching your filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
