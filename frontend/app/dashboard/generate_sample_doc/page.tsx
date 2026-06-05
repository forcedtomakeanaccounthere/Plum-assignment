'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Loader, CheckCircle, Download, AlertTriangle, Wand2, History, ImageIcon, FileType, Code, FormInput, Trash2, PlusCircle } from 'lucide-react'
import { generateSampleDoc, fetchGeneratedSamples, suggestSampleData } from '@/lib/api'

const DOC_TYPES = [
  { id: 'prescription', label: 'Prescription' },
  { id: 'pharmacy_bill', label: 'Pharmacy Bill' },
  { id: 'hospital_bill', label: 'Hospital Bill' },
  { id: 'diagnostic', label: 'Diagnostic Report' },
]

const VARIATIONS = [
  { id: 'clean', label: 'Clean Digital' },
  { id: 'phone', label: 'Phone Photo (Perspective)' },
  { id: 'faded', label: 'Faded Print' },
  { id: 'stamp', label: 'With Stamp' },
  { id: 'shadow', label: 'With Shadow' },
  { id: 'ocr_hard', label: 'Hard OCR (Noise + Blur)' },
]

// ─── Document Editor Component ──────────────────────────────────────────────

interface DocumentEditorProps {
  data: any
  onChange: (newData: any) => void
}

function DocumentEditor({ data, onChange }: DocumentEditorProps) {
  const [view, setView] = useState<'form' | 'json'>('form')
  const [jsonError, setJsonError] = useState<string | null>(null)

  const handleJsonChange = (val: string) => {
    try {
      const parsed = JSON.parse(val)
      onChange(parsed)
      setJsonError(null)
    } catch (e) {
      setJsonError('Invalid JSON format')
    }
  }

  const updateField = (path: string[], value: any) => {
    const newData = { ...data }
    let current = newData
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]]
    }
    current[path[path.length - 1]] = value
    onChange(newData)
  }

  const removeItem = (path: string[], index: number) => {
    const newData = { ...data }
    let current = newData
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]]
    }
    const arr = [...current[path[path.length - 1]]]
    arr.splice(index, 1)
    current[path[path.length - 1]] = arr
    onChange(newData)
  }

  const addItem = (path: string[], template: any) => {
    const newData = { ...data }
    let current = newData
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]]
    }
    current[path[path.length - 1]] = [...current[path[path.length - 1]], template]
    onChange(newData)
  }

  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-border/50 pb-2">
        <Button 
          variant={view === 'form' ? 'default' : 'ghost'} 
          size="sm" 
          onClick={() => setView('form')}
          className="text-xs h-7"
        >
          <FormInput className="h-3.5 w-3.5 mr-1" /> Form View
        </Button>
        <Button 
          variant={view === 'json' ? 'default' : 'ghost'} 
          size="sm" 
          onClick={() => setView('json')}
          className="text-xs h-7"
        >
          <Code className="h-3.5 w-3.5 mr-1" /> JSON View
        </Button>
      </div>

      {view === 'json' ? (
        <div className="space-y-2">
          <textarea
            className={`w-full h-[500px] font-mono text-[11px] p-4 bg-slate-950 text-slate-50 rounded-lg border ${jsonError ? 'border-destructive' : 'border-slate-800'} outline-none`}
            defaultValue={JSON.stringify(data, null, 2)}
            onChange={(e) => handleJsonChange(e.target.value)}
          />
          {jsonError && <p className="text-[10px] text-destructive">{jsonError}</p>}
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Hospital Details */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Hospital Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase">Name</label>
                <input 
                  value={data.hospitalDetails?.name || ''} 
                  onChange={e => updateField(['hospitalDetails', 'name'], e.target.value)}
                  className="w-full bg-secondary/20 border border-border/50 rounded px-2 py-1.5 text-xs outline-none focus:border-primary/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase">GSTIN</label>
                <input 
                  value={data.hospitalDetails?.gstin || ''} 
                  onChange={e => updateField(['hospitalDetails', 'gstin'], e.target.value)}
                  className="w-full bg-secondary/20 border border-border/50 rounded px-2 py-1.5 text-xs outline-none focus:border-primary/50"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase">Address</label>
                <input 
                  value={data.hospitalDetails?.address || ''} 
                  onChange={e => updateField(['hospitalDetails', 'address'], e.target.value)}
                  className="w-full bg-secondary/20 border border-border/50 rounded px-2 py-1.5 text-xs outline-none focus:border-primary/50"
                />
              </div>
            </div>
          </section>

          {/* Patient Details */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Patient Details</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase">Name</label>
                <input 
                  value={data.patientDetails?.name || ''} 
                  onChange={e => updateField(['patientDetails', 'name'], e.target.value)}
                  className="w-full bg-secondary/20 border border-border/50 rounded px-2 py-1.5 text-xs outline-none focus:border-primary/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase">Age / Gender</label>
                <div className="flex gap-2">
                  <input 
                    value={data.patientDetails?.age || ''} 
                    onChange={e => updateField(['patientDetails', 'age'], e.target.value)}
                    className="w-1/2 bg-secondary/20 border border-border/50 rounded px-2 py-1.5 text-xs outline-none focus:border-primary/50"
                    placeholder="Age"
                  />
                  <input 
                    value={data.patientDetails?.gender || ''} 
                    onChange={e => updateField(['patientDetails', 'gender'], e.target.value)}
                    className="w-1/2 bg-secondary/20 border border-border/50 rounded px-2 py-1.5 text-xs outline-none focus:border-primary/50"
                    placeholder="Sex"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Document Content */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
              {data.docType === 'prescription' ? 'Prescription Content' : 'Billing Content'}
            </h3>
            
            <div className="space-y-2">
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Diagnosis</label>
              <textarea 
                value={data.documentDetails?.diagnosis || ''} 
                onChange={e => updateField(['documentDetails', 'diagnosis'], e.target.value)}
                className="w-full bg-secondary/20 border border-border/50 rounded px-2 py-1.5 text-xs outline-none focus:border-primary/50 min-h-[60px]"
              />
            </div>

            {data.docType === 'prescription' ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Medicines</span>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] text-emerald-500" onClick={() => addItem(['documentDetails', 'medicines'], { name: '', dosage: '', frequency: '', duration: '' })}>
                    <PlusCircle className="h-3 w-3 mr-1" /> Add Medicine
                  </Button>
                </div>
                <div className="space-y-2">
                  {data.documentDetails?.medicines?.map((med: any, idx: number) => (
                    <div key={idx} className="flex gap-2 group">
                      <input 
                        value={med.name} 
                        onChange={e => {
                          const newMeds = [...data.documentDetails.medicines]
                          newMeds[idx].name = e.target.value
                          updateField(['documentDetails', 'medicines'], newMeds)
                        }}
                        placeholder="Medicine Name"
                        className="flex-1 bg-secondary/10 border border-border/30 rounded px-2 py-1 text-[11px] outline-none"
                      />
                      <input 
                        value={med.dosage} 
                        onChange={e => {
                          const newMeds = [...data.documentDetails.medicines]
                          newMeds[idx].dosage = e.target.value
                          updateField(['documentDetails', 'medicines'], newMeds)
                        }}
                        placeholder="Dosage"
                        className="w-20 bg-secondary/10 border border-border/30 rounded px-2 py-1 text-[11px] outline-none"
                      />
                      <button onClick={() => removeItem(['documentDetails', 'medicines'], idx)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Bill Items</span>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] text-emerald-500" onClick={() => addItem(['documentDetails', 'items'], { particulars: '', qty: 1, rate: 0, amount: 0 })}>
                    <PlusCircle className="h-3 w-3 mr-1" /> Add Item
                  </Button>
                </div>
                <div className="space-y-2">
                  {data.documentDetails?.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-2 group">
                      <input 
                        value={item.particulars} 
                        onChange={e => {
                          const newItems = [...data.documentDetails.items]
                          newItems[idx].particulars = e.target.value
                          updateField(['documentDetails', 'items'], newItems)
                        }}
                        placeholder="Item Particulars"
                        className="flex-1 bg-secondary/10 border border-border/30 rounded px-2 py-1 text-[11px] outline-none"
                      />
                      <input 
                        type="number"
                        value={item.rate} 
                        onChange={e => {
                          const newItems = [...data.documentDetails.items]
                          newItems[idx].rate = Number(e.target.value)
                          newItems[idx].amount = newItems[idx].qty * newItems[idx].rate
                          updateField(['documentDetails', 'items'], newItems)
                        }}
                        placeholder="Rate"
                        className="w-24 bg-secondary/10 border border-border/30 rounded px-2 py-1 text-[11px] outline-none"
                      />
                      <button onClick={() => removeItem(['documentDetails', 'items'], idx)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

// ─── Main Page Component ────────────────────────────────────────────────────

export default function GenerateSampleDocPage() {
  const [docType, setDocType] = useState('prescription')
  const [format, setFormat] = useState<'image' | 'pdf'>('image')
  const [richData, setRichData] = useState<any>(null)
  const [selectedVariations, setSelectedVariations] = useState<string[]>(['clean', 'phone'])
  const [generating, setGenerating] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [generatedFiles, setGeneratedFiles] = useState<{ name: string; url: string }[]>([])
  const [pastSamples, setPastSamples] = useState<Array<{ name: string; files: Array<{ name: string; url: string }> }>>([])
  const [error, setError] = useState<string | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const data = await fetchGeneratedSamples()
      setPastSamples(data.folders)
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleSuggest = async () => {
    setSuggesting(true)
    setError(null)
    try {
      const data = await suggestSampleData(docType)
      setRichData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to suggest data')
    } finally {
      setSuggesting(false)
    }
  }

  const toggleVariation = (id: string) => {
    setSelectedVariations(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    )
  }

  const handleGenerate = async () => {
    if (!richData) {
      setError('Please click "AI Generate Rich Content" first.')
      return
    }

    setGenerating(true)
    setError(null)
    setGeneratedFiles([])

    try {
      const data = await generateSampleDoc({
        ...richData,
        docType,
        format,
        variations: selectedVariations,
      })

      setGeneratedFiles(data.files)
      loadHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Generate Advanced Sample Data</h1>
          <p className="text-muted-foreground mt-1">
            Create professional-grade medical documents using HTML templates and Mistral AI.
          </p>
        </div>
        <div className="flex gap-2 bg-secondary/30 p-1 rounded-lg border border-border">
          <Button
            variant={format === 'image' ? 'default' : 'ghost'}
            onClick={() => setFormat('image')}
            size="sm"
            className="flex items-center gap-2 px-4"
          >
            <ImageIcon className="h-4 w-4" />
            Image
          </Button>
          <Button
            variant={format === 'pdf' ? 'default' : 'ghost'}
            onClick={() => setFormat('pdf')}
            size="sm"
            className="flex items-center gap-2 px-4"
          >
            <FileType className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="glass rounded-xl border border-border p-6 space-y-6">
            <div className="flex justify-between items-center border-bottom pb-4 border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <h2 className="font-semibold text-lg">Document Content Editor</h2>
              </div>
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleSuggest}
                disabled={suggesting}
                className="text-xs flex items-center gap-1 shadow-md shadow-primary/20"
              >
                {suggesting ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                {richData ? 'Regenerate with AI' : 'AI Generate Rich Content'}
              </Button>
            </div>
            
            <div className="grid md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Document Type</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                >
                  {DOC_TYPES.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                {richData ? (
                  <DocumentEditor data={richData} onChange={setRichData} />
                ) : (
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl bg-secondary/5 text-muted-foreground py-20 gap-4">
                    <Wand2 className="h-10 w-10 opacity-20" />
                    <p className="text-sm font-medium italic">Click "AI Generate Rich Content" to start.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="glass rounded-xl border border-border p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              Augmentations & Visual Variations
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {VARIATIONS.map(v => (
                <button
                  key={v.id}
                  onClick={() => toggleVariation(v.id)}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl text-[10px] font-medium transition-all border ${
                    selectedVariations.includes(v.id)
                      ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/20'
                  }`}
                >
                  <div className={`p-1.5 rounded-full ${selectedVariations.includes(v.id) ? 'bg-primary/20' : 'bg-secondary/50'}`}>
                    <CheckCircle className={`h-3.5 w-3.5 ${selectedVariations.includes(v.id) ? 'opacity-100' : 'opacity-20'}`} />
                  </div>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <Button 
            className="w-full py-7 text-lg shadow-xl shadow-primary/20 font-bold tracking-tight rounded-xl" 
            onClick={handleGenerate}
            disabled={generating || selectedVariations.length === 0 || !richData}
          >
            {generating ? (
              <>
                <Loader className="mr-2 h-6 w-6 animate-spin" />
                Generating Advanced {format.toUpperCase()}...
              </>
            ) : (
              `Process & Generate Advanced ${format.toUpperCase()} Batch`
            )}
          </Button>

          {error && (
            <div className="flex items-center gap-3 text-destructive bg-destructive/10 p-4 rounded-xl text-sm border border-destructive/20 animate-in shake">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="font-semibold">Error Occurred</span>
                <span className="opacity-80">{error}</span>
              </div>
            </div>
          )}

          {generatedFiles.length > 0 && (
            <div className="glass rounded-xl border border-border p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-green-500 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Successfully Generated
                </h2>
                <span className="text-xs text-muted-foreground">{generatedFiles.length} variations created</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {generatedFiles.map((file, idx) => (
                  <div key={idx} className="group relative rounded-xl border border-border overflow-hidden bg-background aspect-[3/4] shadow-sm hover:shadow-md transition-all">
                    {file.url.toLowerCase().endsWith('.pdf') ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-secondary/10 p-4">
                        <FileType className="h-16 w-16 text-primary/40 mb-3" />
                        <span className="text-[11px] text-center font-bold truncate w-full text-muted-foreground px-2">{file.name}</span>
                      </div>
                    ) : (
                      <img 
                        src={file.url} 
                        alt={file.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/400x600/f1f5f9/94a3b8?text=Image+Error';
                        }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-end p-4 text-center">
                      <p className="text-white text-xs font-bold mb-3">{file.name}</p>
                      <a 
                        href={file.url} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs bg-white text-black px-4 py-2 rounded-full font-bold hover:bg-primary hover:text-white transition-all transform translate-y-2 group-hover:translate-y-0"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {file.url.toLowerCase().endsWith('.pdf') ? 'View PDF' : 'Download'}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6 h-full">
          <div className="glass rounded-xl border border-border p-6 flex flex-col h-full max-h-[1000px] shadow-sm">
            <h2 className="font-semibold flex items-center gap-2 mb-6 text-lg">
              <History className="h-5 w-5 text-primary" />
              Batch History
            </h2>
            
            {loadingHistory ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Loader className="h-8 w-8 animate-spin text-primary/40" />
                <span className="text-sm font-medium">Retrieving archives...</span>
              </div>
            ) : pastSamples.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4 border-2 border-dashed border-border rounded-xl p-8 text-center bg-secondary/5">
                <History className="h-12 w-12 opacity-10" />
                <span className="text-sm font-medium">No previous batches found.</span>
              </div>
            ) : (
              <div className="flex-1 overflow-auto space-y-8 pr-2 custom-scrollbar">
                {pastSamples.map((folder, fidx) => (
                  <div key={fidx} className="space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-border/50 pb-2">
                      <h3 className="text-[10px] font-black text-primary/60 uppercase tracking-widest">
                        {folder.name.split('_')[1]}
                      </h3>
                      <span className="text-[10px] font-bold text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded">
                        {new Date(parseInt(folder.name.split('_')[1])).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {folder.files.map((file, idx) => (
                        <div key={idx} className="group relative rounded-lg border border-border overflow-hidden bg-background aspect-[3/4] hover:border-primary/30 transition-all">
                          {file.url.toLowerCase().endsWith('.pdf') ? (
                            <div className="w-full h-full flex items-center justify-center bg-secondary/10">
                              <FileType className="h-8 w-8 text-primary/20" />
                            </div>
                          ) : (
                            <img 
                              src={file.url} 
                              alt={file.name}
                              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <a 
                              href={file.url} 
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-white text-black rounded-full hover:bg-primary hover:text-white transition-all transform scale-75 group-hover:scale-100 shadow-xl"
                              title={file.name}
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
