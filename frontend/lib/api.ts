const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: 'admin' | 'reviewer' | 'viewer'
}

export type ClaimDocument = {
  type: string
  cloudinaryUrl: string
  originalFileName?: string
  mediaFormat?: 'image' | 'pdf'
  mimeType?: string
  ocrText?: string
  extractedFields?: Record<string, unknown>
  processingStatus: string
}

export type AdjudicationExplainability = {
  decision: string
  confidenceScore: number
  aiConfidence: number
  aiReasoning: string
  ruleCategories: Array<{
    category: string
    label: string
    reasons: Array<{ code: string; message: string; passed: boolean }>
  }>
  topReasons: string[]
  fraudTriggered: boolean
  fraudFlags: string[]
  needsHumanIntervention: boolean
  urgentReview: boolean
  humanInterventionReasons: string[]
  partialCoverageNote?: string
  aiAccuracyNote: string
}

export type Claim = {
  _id?: string
  claimId: string
  memberId: string
  memberName: string
  treatmentDate: string
  submittedAt: string
  claimAmount: number
  hospitalName?: string
  status: string
  documents: ClaimDocument[]
  extractedSummary?: {
    diagnosis?: string
    doctorName?: string
    doctorReg?: string
    totalBilledAmount?: number
    itemizedCosts?: Array<{ item: string; amount: number; category: string }>
  }
  adjudicationExplainability?: AdjudicationExplainability
  finalDecision: {
    decision: string
    approvedAmount: number
    rejectionReasons: string[]
    deductions?: Array<{ reason: string; amount: number }>
    confidenceScore: number
    notes?: string
  }
  processingTimeMs?: number
  ruleEngineResult?: Record<string, unknown>
  aiDecisionResult?: Record<string, unknown>
  chatHistory?: Array<{ role: string; content: string; timestamp: string }>
}

export type ClaimsListResponse = {
  claims: Claim[]
  total: number
  meta: {
    totalApproved: number
    totalRejected: number
    totalPending: number
    avgProcessingTimeMs: number
  }
}

export type MetricsResponse = {
  totalClaims: number
  decisionDistribution: {
    APPROVED: number
    REJECTED: number
    PARTIAL: number
    MANUAL_REVIEW: number
  }
  avgProcessingTimeMs: number
  avgConfidenceScore: number
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  auth = false
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }

  if (auth) {
    const token = getToken()
    if (!token) throw new Error('Not authenticated')
    headers.Authorization = `Bearer ${token}`
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed (${res.status})`)
  }
  return data as T
}

export async function login(email: string, password: string) {
  return apiFetch<{ accessToken: string; user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function fetchMetrics() {
  return apiFetch<MetricsResponse>('/api/admin/metrics')
}

export async function fetchClaims(params?: { status?: string; limit?: number }) {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.limit) qs.set('limit', String(params.limit))
  const query = qs.toString() ? `?${qs.toString()}` : ''
  return apiFetch<ClaimsListResponse>(`/api/claims${query}`)
}

export async function generateSampleDoc(data: {
  docType: string
  patientName: string
  diagnosis: string
  doctorName: string
  hospitalInfo: string
  variations: string[]
  format: 'image' | 'pdf'
}) {
  return apiFetch<{ files: Array<{ name: string; url: string }> }>('/api/admin/generate-sample', {
    method: 'POST',
    body: JSON.stringify(data),
  }, true)
}

export async function fetchGeneratedSamples() {
  return apiFetch<{ folders: Array<{ name: string; files: Array<{ name: string; url: string }> }> }>('/api/admin/generated-samples', {}, true)
}

export async function suggestSampleData(docType: string) {
  return apiFetch<{ patientName: string; diagnosis: string; doctorName: string; hospitalInfo: string }>('/api/admin/suggest-sample-data', {
    method: 'POST',
    body: JSON.stringify({ docType }),
  }, true)
}

export async function fetchClaim(claimId: string) {
  return apiFetch<Claim>(`/api/claims/${claimId}`)
}

export async function submitClaim(payload: {
  memberId: string
  memberName: string
  treatmentDate: string
  claimAmount: number
  hospitalName?: string
  cashlessRequest?: boolean
  cloudinaryDocuments?: Array<{
    url: string
    type: string
    originalname: string
    mimeType?: string
    mediaFormat?: 'image' | 'pdf'
  }>
  files?: Array<{ file: File; type: string }>
}) {
  const form = new FormData()
  form.append('memberId', payload.memberId)
  form.append('memberName', payload.memberName)
  form.append('treatmentDate', payload.treatmentDate)
  form.append('claimAmount', String(payload.claimAmount))
  if (payload.hospitalName) form.append('hospitalName', payload.hospitalName)
  form.append('cashlessRequest', String(payload.cashlessRequest ?? false))

  if (payload.cloudinaryDocuments?.length) {
    form.append('cloudinaryDocuments', JSON.stringify(payload.cloudinaryDocuments))
  }

  if (payload.files?.length) {
    payload.files.forEach((f) => form.append('files[]', f.file))
    form.append('documentTypes', JSON.stringify(payload.files.map((f) => f.type)))
  }

  const res = await fetch(`${API_BASE}/api/claims`, {
    method: 'POST',
    body: form,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to submit claim')
  return data as { claimId: string; streamUrl: string }
}

export async function fetchPolicy(auth = true) {
  return apiFetch<{ active: Record<string, unknown> | null; history: Array<{ version: number; isActive: boolean }> }>(
    '/api/admin/policy',
    {},
    auth
  )
}

export async function savePolicy(config: Record<string, unknown>) {
  return apiFetch<{ newVersion: number; valid: boolean; activated: boolean }>(
    '/api/admin/policy',
    {
      method: 'POST',
      body: JSON.stringify({ ...config, activateImmediately: true }),
    },
    true
  )
}

export async function sendClaimChat(claimId: string, message: string) {
  return apiFetch<{ reply: string; sources?: unknown[] }>(`/api/claims/${claimId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

export function getStreamUrl(claimId: string) {
  return `${API_BASE}/api/claims/${claimId}/stream`
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

export function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr)
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins || 1} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

export function mapStatus(claim: Claim): string {
  if (claim.status === 'processing') return 'processing'
  const decision = claim.finalDecision?.decision
  if (decision === 'APPROVED') return 'approved'
  if (decision === 'REJECTED') return 'rejected'
  if (decision === 'PARTIAL') return 'partial'
  if (decision === 'MANUAL_REVIEW' || claim.status === 'under_review') return 'pending'
  return claim.status
}
