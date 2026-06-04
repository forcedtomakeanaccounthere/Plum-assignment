'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Activity, Clock, Target, Award } from 'lucide-react'

export default function AnalyticsPage() {
  const stats = [
    { label: 'Total Processed', value: '2,847', change: '+12%', icon: Activity, positive: true },
    { label: 'Avg Processing Time', value: '4.2h', change: '-8%', icon: Clock, positive: true },
    { label: 'Success Rate', value: '98.2%', change: '+2.3%', icon: Award, positive: true },
    { label: 'Pending Review', value: '349', change: '+15%', icon: Target, positive: false },
  ]

  const monthlyData = [
    { month: 'Jan', approved: 240, rejected: 20, processing: 40 },
    { month: 'Feb', approved: 280, rejected: 18, processing: 32 },
    { month: 'Mar', approved: 320, rejected: 15, processing: 28 },
    { month: 'Apr', approved: 310, rejected: 20, processing: 35 },
    { month: 'May', approved: 350, rejected: 17, processing: 25 },
    { month: 'Jun', approved: 380, rejected: 14, processing: 22 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">Track performance metrics and trends</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="glass rounded-lg border border-border p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <Icon className={`h-8 w-8 ${stat.positive ? 'text-emerald-500/30' : 'text-orange-500/30'}`} />
              </div>
              <div className={`text-xs font-medium ${stat.positive ? 'text-emerald-400' : 'text-orange-400'}`}>
                {stat.positive ? '↑' : '↓'} {stat.change} this month
              </div>
            </div>
          )
        })}
      </div>

      {/* Detailed Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className="glass rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold mb-4">Processing Trend (Last 6 Months)</h3>
          <div className="space-y-4">
            {monthlyData.map((data) => (
              <div key={data.month} className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{data.month}</span>
                  <span>{data.approved + data.rejected + data.processing}</span>
                </div>
                <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-secondary/20">
                  <div 
                    className="bg-emerald-500"
                    style={{ width: `${(data.approved / (data.approved + data.rejected + data.processing)) * 100}%` }}
                  />
                  <div
                    className="bg-blue-500"
                    style={{ width: `${(data.processing / (data.approved + data.rejected + data.processing)) * 100}%` }}
                  />
                  <div
                    className="bg-red-500"
                    style={{ width: `${(data.rejected / (data.approved + data.rejected + data.processing)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Statistics Card */}
        <div className="glass rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold mb-4">Key Statistics</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Approval Rate</span>
                <span className="font-semibold">75.8%</span>
              </div>
              <div className="w-full bg-secondary/20 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '75.8%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">System Uptime</span>
                <span className="font-semibold">99.9%</span>
              </div>
              <div className="w-full bg-secondary/20 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '99.9%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Error Rate</span>
                <span className="font-semibold">0.1%</span>
              </div>
              <div className="w-full bg-secondary/20 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: '0.1%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
