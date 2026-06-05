'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Upload, Loader, FileText, Pill, Paperclip, ImageIcon, FileType } from 'lucide-react'
import { submitClaim } from '@/lib/api'
import { uploadToCloudinary, isCloudinaryConfigured, detectMediaFormat } from '@/lib/cloudinary'

type DocSlot = 'bill' | 'prescription' | 'supporting'
type UploadFormat = 'image' | 'pdf'

function FileSlot({
  label,
  required,
  file,
  onSelect,
  icon: Icon,
  accept,
}: {
  label: string
  required?: boolean
  file: File | null
  onSelect: (f: File | null) => void
  icon: React.ComponentType<{ className?: string }>
  accept: string
}) {
  return (
    <div className="rounded-lg border border-dashed border-border p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </span>
      </div>
      <input
        type="file"
        accept={accept}
        className="text-xs w-full"
        onChange={(e) => onSelect(e.target.files?.[0] || null)}
      />
      {file && (
        <p className="text-xs text-muted-foreground truncate">
          {file.name} ({detectMediaFormat(file)})
        </p>
      )}
    </div>
  )
}

export default function NewClaimPage() {
  const router = useRouter()
  const [uploadFormat, setUploadFormat] = useState<UploadFormat>('image')
  const [memberId, setMemberId] = useState('')
  const [memberName, setMemberName] = useState('')
  const [treatmentDate, setTreatmentDate] = useState('')
  const [claimAmount, setClaimAmount] = useState('')
  const [hospitalName, setHospitalName] = useState('')
  const [billFile, setBillFile] = useState<File | null>(null)
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null)
  const [supportingFiles, setSupportingFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState('')

  const accept =
    uploadFormat === 'pdf'
      ? 'application/pdf'
      : 'image/jpeg,image/png,image/webp'

  const validateFile = (file: File, label: string) => {
    const fmt = detectMediaFormat(file)
    if (fmt !== uploadFormat) {
      throw new Error(`${label} must be ${uploadFormat === 'pdf' ? 'a PDF' : 'an image (JPG, PNG, WEBP)'}.`)
    }
    if (uploadFormat === 'pdf' && file.size > 10 * 1024 * 1024) {
      throw new Error(`${label} PDF must be under 10MB (max 3 pages processed).`)
    }
  }

  const handleSupportingAdd = (list: FileList | null) => {
    if (!list?.length) return
    const next: File[] = []
    for (let i = 0; i < list.length; i++) {
      try {
        validateFile(list[i], 'Supporting document')
        next.push(list[i])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Invalid file')
        return
      }
    }
    setSupportingFiles((prev) => [...prev, ...next].slice(0, 8))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!billFile || !prescriptionFile) {
      setError('Bill and prescription documents are required.')
      return
    }

    try {
      validateFile(billFile, 'Bill')
      validateFile(prescriptionFile, 'Prescription')
      supportingFiles.forEach((f, i) => validateFile(f, `Supporting document ${i + 1}`))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid files')
      return
    }

    const amount = parseFloat(claimAmount)
    if (isNaN(amount) || amount < 500) {
      setError('Claim amount must be at least ₹500.')
      return
    }

    setSubmitting(true)
    try {
      const uploads: Array<{ file: File; type: DocSlot }> = [
        { file: billFile, type: 'bill' },
        { file: prescriptionFile, type: 'prescription' },
        ...supportingFiles.map((f) => ({ file: f, type: 'supporting' as DocSlot })),
      ]

      let result: { claimId: string; streamUrl: string }

      if (isCloudinaryConfigured()) {
        const cloudinaryDocuments: Array<{
          url: string
          type: string
          originalname: string
          mimeType: string
          mediaFormat: UploadFormat
        }> = []
        for (let i = 0; i < uploads.length; i++) {
          setProgress(`Uploading to Cloudinary: ${uploads[i].type} (${i + 1}/${uploads.length})…`)
          const uploaded = await uploadToCloudinary(uploads[i].file)
          cloudinaryDocuments.push({
            url: uploaded.url,
            type: uploads[i].type,
            originalname: uploaded.originalname,
            mimeType: uploads[i].file.type,
            mediaFormat: detectMediaFormat(uploads[i].file),
          })
        }
        setProgress('Submitting claim for processing…')
        result = await submitClaim({
          memberId,
          memberName,
          treatmentDate,
          claimAmount: amount,
          hospitalName: hospitalName || undefined,
          cloudinaryDocuments,
        })
      } else {
        setProgress('Uploading files to server…')
        result = await submitClaim({
          memberId,
          memberName,
          treatmentDate,
          claimAmount: amount,
          hospitalName: hospitalName || undefined,
          files: uploads,
        })
      }

      router.push(`/dashboard/claims/${result.claimId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
      setProgress('')
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Claim</h1>
        <p className="text-muted-foreground mt-1">
          Images use Tesseract directly; PDFs (max 3 pages) use Poppler + pdf2image + Tesseract.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="glass rounded-lg border border-border p-6 space-y-4">
          <h2 className="font-semibold">Member details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Member ID *</label>
              <input
                required
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full rounded-lg border border-input bg-input px-3 py-2 text-sm"
                placeholder="EMP001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Member name *</label>
              <input
                required
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                className="w-full rounded-lg border border-input bg-input px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Treatment date *</label>
              <input
                type="date"
                required
                value={treatmentDate}
                onChange={(e) => setTreatmentDate(e.target.value)}
                className="w-full rounded-lg border border-input bg-input px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Claim amount (₹) *</label>
              <input
                type="number"
                required
                min={500}
                value={claimAmount}
                onChange={(e) => setClaimAmount(e.target.value)}
                className="w-full rounded-lg border border-input bg-input px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Hospital / clinic</label>
              <input
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                className="w-full rounded-lg border border-input bg-input px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="glass rounded-lg border border-border p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Documents
            </h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Upload format:</label>
              <select
                value={uploadFormat}
                onChange={(e) => {
                  setUploadFormat(e.target.value as UploadFormat)
                  setBillFile(null)
                  setPrescriptionFile(null)
                  setSupportingFiles([])
                }}
                className="rounded-lg border border-input bg-input px-3 py-1.5 text-sm"
              >
                <option value="image">Images (JPG, PNG, WEBP)</option>
                <option value="pdf">PDF (max 3 pages)</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-2">
            {uploadFormat === 'image' ? (
              <>
                <ImageIcon className="h-3.5 w-3.5" />
                Tesseract OCR runs directly on images.
              </>
            ) : (
              <>
                <FileType className="h-3.5 w-3.5" />
                PDFs are converted to images via Poppler (pdf2image), then OCR with pytesseract.
              </>
            )}
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <FileSlot
              label="Bill"
              required
              file={billFile}
              onSelect={setBillFile}
              icon={FileText}
              accept={accept}
            />
            <FileSlot
              label="Prescription"
              required
              file={prescriptionFile}
              onSelect={setPrescriptionFile}
              icon={Pill}
              accept={accept}
            />
          </div>

          <div className="rounded-lg border border-dashed border-border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Supporting documents (optional, multiple)</span>
            </div>
            <input
              type="file"
              accept={accept}
              multiple
              className="text-xs w-full"
              onChange={(e) => handleSupportingAdd(e.target.files)}
            />
            {supportingFiles.length > 0 && (
              <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                {supportingFiles.map((f, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      className="text-destructive shrink-0"
                      onClick={() => setSupportingFiles((prev) => prev.filter((_, j) => j !== i))}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {progress && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader className="h-4 w-4 animate-spin" />
            {progress}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="gap-2">
            {submitting && <Loader className="h-4 w-4 animate-spin" />}
            Submit claim
          </Button>
        </div>
      </form>
    </div>
  )
}
