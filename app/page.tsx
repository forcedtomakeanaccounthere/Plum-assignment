'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mail, Lock, Loader } from 'lucide-react'

export default function Page() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('demo@plum.com')
  const [password, setPassword] = useState('demo123')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (email && password) {
      localStorage.setItem('auth_token', 'demo_token_' + Date.now())
      localStorage.setItem('user', JSON.stringify({
        id: '1',
        email,
        name: 'Demo User',
        role: 'processor'
      }))
      
      router.push('/dashboard')
    }
    
    setIsLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 bg-gradient-to-br from-background via-background to-card/20">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Plum OPD</h1>
          <p className="text-muted-foreground">Enterprise claim adjudication system</p>
        </div>

        <div className="glass rounded-lg border border-border p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Sign In</h2>
            <p className="text-sm text-muted-foreground">Enter your credentials to access the system</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email
              </label>
              <input
                type="email"
                placeholder="demo@plum.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                className="w-full rounded-lg border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                className="w-full rounded-lg border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={isLoading}
              size="lg"
            >
              {isLoading && <Loader className="h-4 w-4 animate-spin" />}
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="pt-4 border-t border-border text-xs text-muted-foreground">
            <p className="text-center mb-2">Demo Credentials:</p>
            <p>Email: demo@plum.com</p>
            <p>Password: demo123</p>
          </div>
        </div>
      </div>
    </main>
  )
}
