'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight, TrendingUp, Clock, CheckCircle, AlertCircle, Plus } from 'lucide-react'

const data = [
  { name: 'Mon', approved: 40, rejected: 24, pending: 20 },
  { name: 'Tue', approved: 50, rejected: 30, pending: 25 },
  { name: 'Wed', approved: 45, rejected: 28, pending: 22 },
  { name: 'Thu', approved: 60, rejected: 35, pending: 30 },
  { name: 'Fri', approved: 75, rejected: 40, pending: 35 },
  { name: 'Sat', approved: 55, rejected: 32, pending: 25 },
  { name: 'Sun', approved: 30, rejected: 15, pending: 12 },
]

const recentClaims = [
  { id: 'CLM-001', patient: 'John Doe', amount: '$1,200', status: 'approved', date: '2 hours ago' },
  { id: 'CLM-002', patient: 'Jane Smith', amount: '$850', status: 'pending', date: '4 hours ago' },
  { id: 'CLM-003', patient: 'Bob Wilson', amount: '$2,100', status: 'processing', date: '1 day ago' },
]

export default function DashboardPage() {
  return (
    <div className="space-y-8 p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s your claim processing overview.</p>
        </div>
        <Button size="lg" className="gap-2 w-fit">
          <Plus className="h-4 w-4" />
          New Claim
        </Button>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Claims */}
        <div className="glass rounded-lg border border-border p-6 hover:border-primary/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Total Claims</h3>
            <CheckCircle className="h-4 w-4 text-primary/60" />
          </div>
          <div className="text-2xl font-bold">2,847</div>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="text-emerald-400">+12%</span> from last month
          </p>
        </div>

        {/* Approved */}
        <div className="glass rounded-lg border border-border p-6 hover:border-emerald-500/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Approved</h3>
            <TrendingUp className="h-4 w-4 text-emerald-400/60" />
          </div>
          <div className="text-2xl font-bold">2,156</div>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="text-emerald-400">75.8%</span> approval rate
          </p>
        </div>

        {/* Processing */}
        <div className="glass rounded-lg border border-border p-6 hover:border-yellow-500/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Processing</h3>
            <Clock className="h-4 w-4 text-yellow-400/60" />
          </div>
          <div className="text-2xl font-bold">342</div>
          <p className="text-xs text-muted-foreground mt-1">
            Avg. <span className="text-yellow-400">4.2 hours</span>
          </p>
        </div>

        {/* Pending Review */}
        <div className="glass rounded-lg border border-border p-6 hover:border-orange-500/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Pending Review</h3>
            <AlertCircle className="h-4 w-4 text-orange-400/60" />
          </div>
          <div className="text-2xl font-bold">349</div>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="text-orange-400">12%</span> need attention
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Chart */}
        <div className="glass rounded-lg border border-border p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-1">Claim Processing Trend</h3>
          <p className="text-sm text-muted-foreground mb-4">Last 7 days performance</p>
          <div className="space-y-3">
            {data.map((item) => (
              <div key={item.name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{item.name}</span>
                  <span className="text-muted-foreground">{item.approved + item.rejected + item.pending} total</span>
                </div>
                <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-secondary/20">
                  <div className="bg-emerald-500" style={{ width: `${(item.approved / (item.approved + item.rejected + item.pending)) * 100}%` }} />
                  <div className="bg-yellow-500" style={{ width: `${(item.pending / (item.approved + item.rejected + item.pending)) * 100}%` }} />
                  <div className="bg-red-500" style={{ width: `${(item.rejected / (item.approved + item.rejected + item.pending)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="glass rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg. Processing Time</span>
                <span className="font-semibold">4.2h</span>
              </div>
              <div className="w-full bg-secondary/20 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '65%' }} />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Success Rate</span>
                <span className="font-semibold">98.2%</span>
              </div>
              <div className="w-full bg-secondary/20 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '98.2%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">System Load</span>
                <span className="font-semibold">42%</span>
              </div>
              <div className="w-full bg-secondary/20 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '42%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Claims */}
      <div className="glass rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Recent Claims</h3>
            <p className="text-sm text-muted-foreground">Latest submitted claims</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-3">
          {recentClaims.map((claim) => (
            <div key={claim.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-border transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm">{claim.id}</p>
                  <span className="inline-block px-2.5 py-0.5 rounded-full border text-xs font-medium" style={{
                    backgroundColor: claim.status === 'approved' ? 'rgba(34, 197, 94, 0.1)' : claim.status === 'pending' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                    borderColor: claim.status === 'approved' ? 'rgba(34, 197, 94, 0.3)' : claim.status === 'pending' ? 'rgba(234, 179, 8, 0.3)' : 'rgba(107, 114, 128, 0.3)',
                    color: claim.status === 'approved' ? '#22c55e' : claim.status === 'pending' ? '#eab308' : '#6b7280'
                  }}>
                    {claim.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{claim.patient}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">{claim.amount}</p>
                <p className="text-xs text-muted-foreground">{claim.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
