'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Save,
  Loader,
  Mail,
  Lock,
  Plus,
  Trash2,
  Code2,
  FormInput,
  ChevronRight,
  ChevronDown,
  PlusCircle,
  RotateCcw,
} from 'lucide-react'
import { login, fetchPolicy, savePolicy } from '@/lib/api'

type PolicyValue = string | number | boolean | PolicyValue[] | PolicyObject
type PolicyObject = { [key: string]: PolicyValue }

// ─── helpers ────────────────────────────────────────────────────────────────

function isObject(v: unknown): v is PolicyObject {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isArray(v: unknown): v is PolicyValue[] {
  return Array.isArray(v)
}

function typeLabel(v: PolicyValue): string {
  if (isArray(v)) return 'array'
  if (isObject(v)) return 'object'
  if (typeof v === 'boolean') return 'boolean'
  if (typeof v === 'number') return 'number'
  return 'string'
}

// ─── Recursive Field Editor ──────────────────────────────────────────────────

interface FieldEditorProps {
  keyPath: string[]
  fieldKey: string
  value: PolicyValue
  onChange: (path: string[], newVal: PolicyValue) => void
  onDelete: (path: string[]) => void
  onAddSubfield: (path: string[]) => void
  depth: number
}

function FieldEditor({ keyPath, fieldKey, value, onChange, onDelete, onAddSubfield, depth }: FieldEditorProps) {
  const [collapsed, setCollapsed] = useState(depth > 1)
  const indent = depth * 16

  const handlePrimitiveChange = (raw: string) => {
    // detect type
    if (raw === 'true') onChange(keyPath, true)
    else if (raw === 'false') onChange(keyPath, false)
    else if (raw !== '' && !isNaN(Number(raw))) onChange(keyPath, Number(raw))
    else onChange(keyPath, raw)
  }

  // ── object ──────────────────────────────
  if (isObject(value)) {
    return (
      <div
        style={{ marginLeft: indent + 'px' }}
        className="border-l-2 border-border/50 pl-3 mb-2"
      >
        <div className="flex items-center gap-2 group py-1">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <span className="text-xs font-semibold text-primary/80 uppercase tracking-wider flex-1">
            {fieldKey}
          </span>
          <span className="text-xs text-muted-foreground bg-secondary/30 px-1.5 py-0.5 rounded">object</span>
          <button
            onClick={() => onAddSubfield(keyPath)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            title="Add subfield"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            subfield
          </button>
          <button
            onClick={() => onDelete(keyPath)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            title="Delete field"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {!collapsed && (
          <div className="mt-1">
            {Object.entries(value).map(([k, v]) => (
              <FieldEditor
                key={k}
                keyPath={[...keyPath, k]}
                fieldKey={k}
                value={v}
                onChange={onChange}
                onDelete={onDelete}
                onAddSubfield={onAddSubfield}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── array ──────────────────────────────
  if (isArray(value)) {
    return (
      <div
        style={{ marginLeft: indent + 'px' }}
        className="border-l-2 border-border/50 pl-3 mb-2"
      >
        <div className="flex items-center gap-2 group py-1">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <span className="text-xs font-semibold text-amber-400/80 uppercase tracking-wider flex-1">
            {fieldKey}
          </span>
          <span className="text-xs text-muted-foreground bg-secondary/30 px-1.5 py-0.5 rounded">
            array ({value.length})
          </span>
          <button
            onClick={() => onChange(keyPath, [...value, ''])}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            title="Add item"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            add entry
          </button>
          <button
            onClick={() => onDelete(keyPath)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            title="Delete field"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {!collapsed && (
          <div className="space-y-1 mt-1 pr-2">
            {value.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 group/item">
                <span className="text-xs text-muted-foreground w-5 text-right">{idx + 1}.</span>
                {isObject(item) || isArray(item) ? (
                  <span className="text-xs text-muted-foreground italic">[complex value]</span>
                ) : (
                  <input
                    type="text"
                    value={String(item)}
                    onChange={(e) => {
                      const newArr = [...value]
                      newArr[idx] = e.target.value
                      onChange(keyPath, newArr)
                    }}
                    className="flex-1 bg-input rounded px-2 py-1 text-sm border border-border/50 focus:border-primary/60 outline-none transition-colors"
                  />
                )}
                <button
                  onClick={() => {
                    const newArr = value.filter((_, i) => i !== idx)
                    onChange(keyPath, newArr)
                  }}
                  className="opacity-0 group-hover/item:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── primitive ──────────────────────────────
  const isBool = typeof value === 'boolean'
  return (
    <div
      style={{ marginLeft: indent + 'px' }}
      className="flex items-center gap-3 mb-1.5 group"
    >
      <label className="text-sm font-medium text-foreground/80 min-w-[180px] flex-shrink-0 truncate" title={fieldKey}>
        {fieldKey}
      </label>
      {isBool ? (
        <button
          onClick={() => onChange(keyPath, !value)}
          className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${value ? 'bg-primary' : 'bg-secondary'}`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${value ? 'translate-x-4' : 'translate-x-0.5'}`}
          />
        </button>
      ) : (
        <input
          type="text"
          value={String(value)}
          onChange={(e) => handlePrimitiveChange(e.target.value)}
          className="flex-1 bg-input rounded-lg px-3 py-1.5 text-sm border border-border/50 focus:border-primary/60 outline-none transition-colors font-mono"
        />
      )}
      <span className="text-xs text-muted-foreground bg-secondary/30 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
        {typeLabel(value)}
      </span>
      <button
        onClick={() => onDelete(keyPath)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        title="Delete field"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─── Deep helpers ─────────────────────────────────────────────────────────────

function getAtPath(obj: PolicyObject, path: string[]): PolicyValue {
  let cur: PolicyValue = obj
  for (const key of path) {
    if (isObject(cur)) cur = cur[key]
    else return cur
  }
  return cur
}

function setAtPath(obj: PolicyObject, path: string[], value: PolicyValue): PolicyObject {
  if (path.length === 0) return obj
  const [head, ...rest] = path
  if (rest.length === 0) {
    return { ...obj, [head]: value }
  }
  return {
    ...obj,
    [head]: setAtPath((isObject(obj[head]) ? obj[head] : {}) as PolicyObject, rest, value),
  }
}

function deleteAtPath(obj: PolicyObject, path: string[]): PolicyObject {
  if (path.length === 0) return obj
  const [head, ...rest] = path
  if (rest.length === 0) {
    const copy = { ...obj }
    delete copy[head]
    return copy
  }
  return {
    ...obj,
    [head]: deleteAtPath((isObject(obj[head]) ? obj[head] : {}) as PolicyObject, rest),
  }
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

type ViewMode = 'form' | 'json'

export default function SettingsPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [email, setEmail] = useState('admin@plum.com')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)

  const [policy, setPolicy] = useState<PolicyObject>({})
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('form')
  const [version, setVersion] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingPolicy, setLoadingPolicy] = useState(false)

  // New field dialog
  const [addFieldTarget, setAddFieldTarget] = useState<string[] | null>(null)
  const [newFieldKey, setNewFieldKey] = useState('')
  const [newFieldType, setNewFieldType] = useState<'string' | 'number' | 'boolean' | 'array' | 'object'>('string')
  const [newFieldValue, setNewFieldValue] = useState('')

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
        setPolicy(res.active as PolicyObject)
        setJsonText(JSON.stringify(res.active, null, 2))
      }
      const active = res.history?.find((h: any) => h.isActive)
      setVersion(active?.version ?? null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load policy'
      setLoadError(msg)
      if (msg.toLowerCase().includes('token') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('expired')) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
        setAuthenticated(false)
      }
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

  // ── sync form → json on form change ──
  const handleFieldChange = useCallback((path: string[], value: PolicyValue) => {
    setPolicy((prev) => {
      const next = setAtPath(prev, path, value)
      setJsonText(JSON.stringify(next, null, 2))
      setJsonError(null)
      return next
    })
  }, [])

  const handleFieldDelete = useCallback((path: string[]) => {
    setPolicy((prev) => {
      const next = deleteAtPath(prev, path)
      setJsonText(JSON.stringify(next, null, 2))
      setJsonError(null)
      return next
    })
  }, [])

  const handleAddSubfield = useCallback((parentPath: string[]) => {
    setAddFieldTarget(parentPath)
    setNewFieldKey('')
    setNewFieldType('string')
    setNewFieldValue('')
  }, [])

  const handleAddTopLevel = () => {
    setAddFieldTarget([])
    setNewFieldKey('')
    setNewFieldType('string')
    setNewFieldValue('')
  }

  const confirmAddField = () => {
    if (!newFieldKey.trim() || addFieldTarget === null) return
    let initialValue: PolicyValue
    switch (newFieldType) {
      case 'number': initialValue = Number(newFieldValue) || 0; break
      case 'boolean': initialValue = newFieldValue === 'true'; break
      case 'array': initialValue = []; break
      case 'object': initialValue = {}; break
      default: initialValue = newFieldValue
    }
    const fullPath = [...addFieldTarget, newFieldKey.trim()]
    setPolicy((prev) => {
      const next = setAtPath(prev, fullPath, initialValue)
      setJsonText(JSON.stringify(next, null, 2))
      return next
    })
    setAddFieldTarget(null)
  }

  // ── sync json → form when user edits json ──
  const handleJsonChange = (text: string) => {
    setJsonText(text)
    setJsonError(null)
    try {
      const parsed = JSON.parse(text)
      setPolicy(parsed)
    } catch {
      setJsonError('Invalid JSON — fix syntax to sync to form view')
    }
  }

  const handleSwitchView = (mode: ViewMode) => {
    if (mode === 'json') {
      setJsonText(JSON.stringify(policy, null, 2))
    }
    setViewMode(mode)
  }

  const handleSave = async () => {
    setSaveError(null)
    setSaved(false)
    if (jsonError) {
      setSaveError('Fix JSON syntax errors before saving.')
      return
    }
    setSaving(true)
    try {
      const res = await savePolicy(policy)
      setSaved(true)
      setVersion(res.newVersion)
      setTimeout(() => setSaved(false), 4000)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save policy')
    } finally {
      setSaving(false)
    }
  }

  // ── Login gate ──────────────────────────────────────────────────────────────
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
        <div className="glass rounded-xl border border-border p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <p className="text-sm text-destructive rounded-lg border border-destructive/30 px-3 py-2">
                {loginError}
              </p>
            )}
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-1.5">
                <Mail className="h-4 w-4" />
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-input bg-input px-3 py-2 text-sm outline-none focus:border-primary/60 transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-1.5">
                <Lock className="h-4 w-4" />
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-input bg-input px-3 py-2 text-sm outline-none focus:border-primary/60 transition-colors"
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

  // ── Policy Editor ───────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Policy Configuration</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Edit the active OPD policy. Changes apply immediately on save.
            {version != null && (
              <span className="ml-2 text-xs bg-secondary/40 px-2 py-0.5 rounded-full">v{version}</span>
            )}
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-secondary/30 rounded-lg p-1 border border-border">
          <button
            onClick={() => handleSwitchView('form')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === 'form'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FormInput className="h-3.5 w-3.5" />
            Form
          </button>
          <button
            onClick={() => handleSwitchView('json')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === 'json'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            JSON
          </button>
        </div>
      </div>

      {loadError && (
        <div className="text-sm text-destructive border border-destructive/30 rounded-lg px-3 py-2">
          {loadError}
        </div>
      )}

      {/* Add Field Dialog */}
      {addFieldTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-primary" />
              {addFieldTarget.length === 0 ? 'Add top-level field' : `Add subfield to: ${addFieldTarget.join('.')}`}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Field name</label>
                <input
                  type="text"
                  value={newFieldKey}
                  onChange={(e) => setNewFieldKey(e.target.value)}
                  placeholder="e.g. policy_holder"
                  autoFocus
                  className="mt-1 w-full rounded-lg border border-input bg-input px-3 py-2 text-sm outline-none focus:border-primary/60 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</label>
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-input bg-input px-3 py-2 text-sm outline-none focus:border-primary/60 transition-colors"
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="array">Array (list)</option>
                  <option value="object">Object (nested)</option>
                </select>
              </div>
              {(newFieldType === 'string' || newFieldType === 'number') && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Initial value</label>
                  <input
                    type={newFieldType === 'number' ? 'number' : 'text'}
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    placeholder={newFieldType === 'number' ? '0' : 'Enter value...'}
                    className="mt-1 w-full rounded-lg border border-input bg-input px-3 py-2 text-sm outline-none focus:border-primary/60 transition-colors"
                  />
                </div>
              )}
              {newFieldType === 'boolean' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Initial value</label>
                  <select
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-input bg-input px-3 py-2 text-sm outline-none"
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={confirmAddField} className="flex-1 gap-2">
                <Plus className="h-4 w-4" />
                Add field
              </Button>
              <Button variant="outline" onClick={() => setAddFieldTarget(null)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Editor body */}
      {loadingPolicy ? (
        <div className="flex gap-2 text-muted-foreground text-sm py-8 justify-center">
          <Loader className="h-4 w-4 animate-spin" />
          Loading policy…
        </div>
      ) : viewMode === 'form' ? (
        <div className="glass rounded-xl border border-border overflow-hidden">
          {/* Form header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-secondary/10">
            <span className="text-sm font-medium text-muted-foreground">
              {Object.keys(policy).length} top-level fields
            </span>
            <button
              onClick={handleAddTopLevel}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add field
            </button>
          </div>

          {/* Scrollable form */}
          <div className="p-5 overflow-y-auto max-h-[60vh] space-y-1">
            {Object.entries(policy).map(([k, v]) => (
              <FieldEditor
                key={k}
                keyPath={[k]}
                fieldKey={k}
                value={v}
                onChange={handleFieldChange}
                onDelete={handleFieldDelete}
                onAddSubfield={handleAddSubfield}
                depth={0}
              />
            ))}
            {Object.keys(policy).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Policy is empty. Add a field to get started.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="glass rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-secondary/10">
            <span className="text-sm font-medium text-muted-foreground">Direct JSON editor</span>
            <button
              onClick={() => setJsonText(JSON.stringify(policy, null, 2))}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset from form
            </button>
          </div>
          {jsonError && (
            <div className="px-5 py-2 bg-destructive/10 border-b border-destructive/20 text-xs text-destructive">
              {jsonError}
            </div>
          )}
          <textarea
            value={jsonText}
            onChange={(e) => handleJsonChange(e.target.value)}
            rows={28}
            className="w-full font-mono text-xs bg-transparent p-5 outline-none resize-none"
            spellCheck={false}
          />
        </div>
      )}

      {saveError && (
        <p className="text-sm text-destructive border border-destructive/30 rounded-lg px-3 py-2">
          {saveError}
        </p>
      )}

      {/* Sticky footer */}
      <div className="flex items-center gap-4 sticky bottom-0 py-4 bg-background/90 backdrop-blur border-t border-border z-10">
        {saved && (
          <span className="text-sm text-emerald-400 flex items-center gap-1.5">
            ✓ Policy saved and activated (v{version})
          </span>
        )}
        <Button onClick={handleSave} disabled={saving || loadingPolicy || !!jsonError} className="gap-2 ml-auto">
          {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save policy
        </Button>
      </div>
    </div>
  )
}
