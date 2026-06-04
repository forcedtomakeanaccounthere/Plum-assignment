'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Save, Loader, Mail, Lock } from 'lucide-react'
import { login, fetchPolicy, savePolicy } from '@/lib/api'

type PolicyConfig = Record<string, unknown>

export default function SettingsPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [email, setEmail] = useState('admin@plum.com')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)

  const [policyJson, setPolicyJson] = useState('')
  const [version, setVersion] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingPolicy, setLoadingPolicy] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    setAuthenticated(!!token)
    setCheckingAuth(false)
  }, [])

  useEffect(() => {
    if (!authenticated) return
    loadPolicy()
  }, [authenticated])

  const loadPolicy = async () => {
    setLoadingPolicy(true)
    setLoadError(null)
    try {
      const res = await fetchPolicy(true)
      if (res.active) {
        setPolicyJson(JSON.stringify(res.active, null, 2))
      }
      const active = res.history?.find((h) => h.isActive)
      setVersion(active?.version ?? null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load policy')
    } finally {
      setLoadingPolicy(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError(null)
    try {
      const res = await login(email, password)
      localStorage.setItem('auth_token', res.accessToken)
      localStorage.setItem('user', JSON.stringify(res.user))
      if (res.user.role !== 'admin') {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
        throw new Error('Admin role required for policy settings.')
      }
      setAuthenticated(true)
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleSave = async () => {
    setSaveError(null)
    setSaved(false)
    let parsed: PolicyConfig
    try {
      parsed = JSON.parse(policyJson)
    } catch {
      setSaveError('Invalid JSON. Fix syntax before saving.')
      return
    }

    setSaving(true)
    try {
      const res = await savePolicy(parsed)
      setSaved(true)
      setVersion(res.newVersion)
      setTimeout(() => setSaved(false), 4000)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save policy')
    } finally {
      setSaving(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Settings</h1>
          <p className="text-muted-foreground mt-1">Sign in to manage OPD policy configuration.</p>
        </div>
        <div className="glass rounded-lg border border-border p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <p className="text-sm text-destructive rounded-lg border border-destructive/30 px-3 py-2">
                {loginError}
              </p>
            )}
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-1">
                <Mail className="h-4 w-4" />
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-input bg-input px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-1">
                <Lock className="h-4 w-4" />
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-input bg-input px-3 py-2 text-sm"
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loginLoading}>
              {loginLoading && <Loader className="h-4 w-4 animate-spin" />}
              Sign in as admin
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
            Default: admin@plum.com / Password123
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Policy Configuration</h1>
        <p className="text-muted-foreground mt-1">
          Edit the active OPD policy (sourced from policy_terms.json). Changes apply immediately on save.
          {version != null && (
            <span className="block mt-1 text-xs">Active version: v{version}</span>
          )}
        </p>
      </div>

      {loadError && (
        <div className="text-sm text-destructive border border-destructive/30 rounded-lg px-3 py-2">
          {loadError}
        </div>
      )}

      {loadingPolicy ? (
        <div className="flex gap-2 text-muted-foreground text-sm">
          <Loader className="h-4 w-4 animate-spin" />
          Loading policy…
        </div>
      ) : (
        <textarea
          value={policyJson}
          onChange={(e) => {
            setPolicyJson(e.target.value)
            setSaved(false)
          }}
          rows={24}
          className="w-full font-mono text-xs rounded-lg border border-input bg-input p-4"
          spellCheck={false}
        />
      )}

      {saveError && <p className="text-sm text-destructive">{saveError}</p>}

      <div className="flex items-center gap-4 sticky bottom-0 py-4 bg-background/90 backdrop-blur border-t border-border">
        {saved && <span className="text-sm text-emerald-400">Policy saved and activated.</span>}
        <Button onClick={handleSave} disabled={saving || loadingPolicy} className="gap-2 ml-auto">
          {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save policy
        </Button>
      </div>
    </div>
  )
}
