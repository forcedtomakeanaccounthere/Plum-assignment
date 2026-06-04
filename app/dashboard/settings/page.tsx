'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Save, Eye, EyeOff } from 'lucide-react'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    companyName: 'Plum Healthcare',
    email: 'admin@plum.com',
    apiKey: 'plm_test_1234567890',
    maxProcessingTime: '8',
    enableNotifications: true,
    darkMode: true,
    autoArchive: false,
  })

  const [showApiKey, setShowApiKey] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and application preferences</p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* General Settings */}
        <div className="glass rounded-lg border border-border p-6 space-y-6">
          <h2 className="text-lg font-semibold">General Settings</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Company Name</label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                className="w-full rounded-lg border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full rounded-lg border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Max Processing Time (hours)</label>
              <input
                type="number"
                value={settings.maxProcessingTime}
                onChange={(e) => handleChange('maxProcessingTime', e.target.value)}
                className="w-full rounded-lg border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* API Configuration */}
        <div className="glass rounded-lg border border-border p-6 space-y-6">
          <h2 className="text-lg font-semibold">API Configuration</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">API Key</label>
              <div className="flex gap-2">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.apiKey}
                  disabled
                  className="flex-1 rounded-lg border border-input bg-input px-3 py-2 text-sm text-foreground disabled:opacity-50"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="p-2 hover:bg-secondary/20 rounded-lg transition-colors"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Keep this secret. Never share your API key.</p>
            </div>

            <Button variant="outline" className="w-full">
              Regenerate API Key
            </Button>
          </div>
        </div>

        {/* Preferences */}
        <div className="glass rounded-lg border border-border p-6 space-y-6">
          <h2 className="text-lg font-semibold">Preferences</h2>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableNotifications}
                onChange={(e) => handleChange('enableNotifications', e.target.checked)}
                className="w-4 h-4 rounded border-input accent-primary"
              />
              <span className="text-sm">Enable email notifications</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.darkMode}
                onChange={(e) => handleChange('darkMode', e.target.checked)}
                className="w-4 h-4 rounded border-input accent-primary"
              />
              <span className="text-sm">Dark mode (currently enabled)</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoArchive}
                onChange={(e) => handleChange('autoArchive', e.target.checked)}
                className="w-4 h-4 rounded border-input accent-primary"
              />
              <span className="text-sm">Auto-archive completed claims after 30 days</span>
            </label>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="glass rounded-lg border border-destructive/30 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              These actions cannot be undone. Please proceed with caution.
            </p>

            <Button variant="destructive" className="w-full">
              Reset All Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-6 border-t border-border sticky bottom-0 bg-background/80 backdrop-blur-sm -mx-6 px-6 py-4">
        {saved && (
          <div className="flex items-center gap-2 text-emerald-400 text-sm">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            Settings saved successfully
          </div>
        )}
        <Button onClick={handleSave} className="gap-2 ml-auto">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  )
}
