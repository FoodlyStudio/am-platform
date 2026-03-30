// ─── Lead ─────────────────────────────────────────────────────────────────────

export type LeadStatus   = 'new' | 'qualified' | 'disqualified' | 'archived'
export type LeadPriority = 'low' | 'standard' | 'high' | 'critical'
export type LeadSegment  =
  | 'gabinety_med'
  | 'budowlanka'
  | 'kancelarie'
  | 'beauty'
  | 'szkolenia'
  | 'nieruchomosci'
  | 'it_male'
  | 'transport'

export interface Lead {
  id: string
  created_at: string
  updated_at: string

  // basic (CSV / Sales Navigator)
  first_name: string
  last_name: string
  email?: string
  company: string
  position?: string
  linkedin_url?: string
  company_website?: string
  industry?: string

  // qualification
  buying_signal?: string
  segment?: LeadSegment | string
  source?: string

  // AI scoring
  ai_score?: number
  ai_problem?: string
  ai_icebreaker?: string
  website_analysis?: string

  // status
  status: LeadStatus
  priority: LeadPriority

  // meta
  assigned_to?: string
  notes?: string
  tags?: string[]
}

/** Convenience helper */
export const leadFullName = (l: Pick<Lead, 'first_name' | 'last_name'>) =>
  `${l.first_name} ${l.last_name}`.trim()

// ─── Deal ─────────────────────────────────────────────────────────────────────

export type PipelineStage =
  | 'nowy_lead'
  | 'dm_wyslany'
  | 'odpowiedz'
  | 'rozmowa_umowiona'
  | 'diagnoza_zrobiona'
  | 'oferta_prezentowana'
  | 'negocjacje'
  | 'wygrana'
  | 'przegrana'
  | 'nie_teraz'

export interface Deal {
  id: string
  created_at: string
  updated_at: string
  stage_changed_at?: string
  lead_id?: string
  lead?: Lead

  // core
  title: string
  value?: number
  currency: string
  project_type?: string
  expected_close_date?: string

  // stage
  stage: PipelineStage

  // diagnosis
  diagnosis_notes?: string
  client_problem?: string
  suggested_solution?: string
  suggested_price_min?: number
  suggested_price_max?: number

  // offer
  offer_sent_at?: string
  offer_opened_at?: string
  offer_open_count?: number
  offer_pdf_url?: string

  // close
  won_at?: string
  lost_at?: string
  lost_reason?: string
  lost_details?: string

  // nurturing
  reengagement_date?: string
  nurturing_status?: string

  // meta
  assigned_to?: string
  notes?: string
}

// ─── Outreach ─────────────────────────────────────────────────────────────────

export type OutreachMessageType =
  | 'connection_request'
  | 'dm1_icebreaker'
  | 'fu1_case_study'
  | 'fu2_calendar'
  | 'post_offer_48h'
  | 'post_offer_5d'
  | 'post_offer_14d'
  | 'reengagement_90d'
  | 'custom'

export type OutreachStatus =
  | 'draft'
  | 'sent'
  | 'replied_positive'
  | 'replied_neutral'
  | 'replied_negative'
  | 'no_reply'

export interface OutreachMessage {
  id: string
  created_at: string
  deal_id?: string
  lead_id?: string
  message_type: OutreachMessageType
  message_content: string
  message_variant?: string
  status: OutreachStatus
  sent_at?: string
  replied_at?: string
  scheduled_for?: string
}

// ─── Content ─────────────────────────────────────────────────────────────────

export type ContentType     = 'carousel' | 'single_post' | 'reel_script' | 'story' | 'linkedin_post' | 'article' | 'newsletter'
export type ContentStatus   = 'idea' | 'draft' | 'ready' | 'scheduled' | 'published' | 'archived'
export type ContentChannel  = 'instagram' | 'linkedin_company' | 'linkedin_personal' | 'facebook' | 'newsletter'

export interface ContentItem {
  id: string
  created_at: string
  updated_at: string

  scheduled_date?: string
  scheduled_time?: string
  channel?: ContentChannel
  content_type: ContentType
  title: string
  content_body?: string
  hook?: string
  cta?: string
  hashtags?: string[]
  media_urls?: string[]
  status: ContentStatus

  // metrics
  likes?: number
  comments?: number
  shares?: number
  reach?: number
  link_clicks?: number

  topic_category?: string
  target_segment?: string
  repurposed_from?: string
  notes?: string
}

export type TemplateType = 'hook' | 'cta' | 'carousel' | 'linkedin_post' | 'reel_script' | 'ad_angle'
export type TemplateCategory = 'lead_generation' | 'automation' | 'trust' | 'urgency' | 'case_study' | 'process'

export interface ContentTemplate {
  id: string
  created_at: string
  updated_at?: string
  name: string
  template_type: TemplateType | string
  content: string
  variables?: string[]
  category?: TemplateCategory | string
  performance_score?: number
  times_used?: number
  is_active?: boolean
  // Performance metrics (manually entered after publish)
  perf_likes?: number
  perf_comments?: number
  perf_reach?: number
  notes?: string
}

// ─── Finance ─────────────────────────────────────────────────────────────────

export type IncomeStatus = 'oczekujaca' | 'oplacona' | 'czesciowa' | 'zalegla' | 'anulowana'
export type PaymentType  = 'zaliczka' | 'rata' | 'platnosc_koncowa' | 'jednorazowa' | 'abonament'

export interface Income {
  id: string
  created_at: string
  updated_at: string
  deal_id?: string
  client_name: string
  project_name?: string
  amount: number
  currency: string
  payment_type?: PaymentType
  status: IncomeStatus
  invoice_number?: string
  invoice_date?: string
  due_date?: string
  paid_date?: string
  paid_amount: number
  project_type?: string
  notes?: string
}

export type ExpenseCategory =
  | 'podatki' | 'ksiegowosc' | 'narzedzia' | 'hosting'
  | 'marketing' | 'licencje' | 'sprzet' | 'biuro'
  | 'podroze' | 'szkolenia' | 'inne'

export interface Expense {
  id: string
  created_at: string
  amount: number
  currency: string
  description: string
  category: ExpenseCategory
  is_recurring?: boolean
  recurring_frequency?: 'monthly' | 'quarterly' | 'yearly'
  expense_date: string
  notes?: string
}

/** Legacy alias kept for RevenueChart / useFinance compatibility */
export type Transaction = (Income | Expense) & { type: 'income' | 'expense' }

export interface PLSummary {
  revenue: number
  expenses: number
  profit: number
  margin: number
  period: string
}

// ─── Auth / User ──────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  company?: string
  role?: string
  created_at: string
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

export interface SelectOption {
  label: string
  value: string
}

export interface TableColumn<T> {
  key: keyof T | string
  header: string
  render?: (value: unknown, row: T) => React.ReactNode
  sortable?: boolean
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}
