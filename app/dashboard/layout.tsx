'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut, FileText, Home, Settings, BarChart3 } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = React.useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = React.useState(true)

  React.useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/')
      return
    }
    setUser(JSON.parse(userData))
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    router.push('/')
  }

  if (!user) return null

  const menuItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard' },
    { icon: FileText, label: 'Claims', href: '/dashboard/claims' },
    { icon: BarChart3, label: 'Analytics', href: '/dashboard/analytics' },
    { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
  ]

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 border-r border-border bg-card/50 flex flex-col`}>
        <div className="p-6">
          {sidebarOpen && (
            <>
              <h2 className="text-lg font-bold">Plum OPD</h2>
              <p className="text-xs text-muted-foreground">v1.0</p>
            </>
          )}
        </div>

        <nav className="flex-1 space-y-2 px-3">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <button
                key={item.label}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:bg-secondary/20 border border-transparent'
                }`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            )
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-center text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
            size="sm"
          >
            <LogOut className="h-4 w-4" />
            {sidebarOpen && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="border-b border-border bg-card/50 sticky top-0 z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <h1 className="text-lg font-semibold">Claim Adjudication System</h1>
            <div className="text-sm text-muted-foreground">Welcome, {user?.name}</div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
