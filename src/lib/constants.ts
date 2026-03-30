import type { PipelineStage, LeadSegment, ExpenseCategory } from '@/types'

// ─── Pipeline ────────────────────────────────────────────────────────────────

export const PIPELINE_STAGES: {
  value: PipelineStage
  label: string
  color: string
  hex: string
  order: number
}[] = [
  { value: 'nowy_lead',           label: 'Nowy lead',           color: 'bg-[#6C5CE7]',  hex: '#6C5CE7', order: 1 },
  { value: 'dm_wyslany',          label: 'DM wysłany',          color: 'bg-[#0984E3]',  hex: '#0984E3', order: 2 },
  { value: 'odpowiedz',           label: 'Odpowiedź',           color: 'bg-[#00B894]',  hex: '#00B894', order: 3 },
  { value: 'rozmowa_umowiona',    label: 'Rozmowa umówiona',    color: 'bg-[#00CEC9]',  hex: '#00CEC9', order: 4 },
  { value: 'diagnoza_zrobiona',   label: 'Diagnoza zrobiona',   color: 'bg-[#FDCB6E]',  hex: '#FDCB6E', order: 5 },
  { value: 'oferta_prezentowana', label: 'Oferta prezentowana', color: 'bg-[#E17055]',  hex: '#E17055', order: 6 },
  { value: 'negocjacje',          label: 'Negocjacje',          color: 'bg-[#D63031]',  hex: '#D63031', order: 7 },
  { value: 'wygrana',             label: '🏆 WYGRANA',          color: 'bg-[#27AE60]',  hex: '#27AE60', order: 8 },
  { value: 'przegrana',           label: 'PRZEGRANA',           color: 'bg-[#636E72]',  hex: '#636E72', order: 9 },
  { value: 'nie_teraz',           label: 'Nie teraz',           color: 'bg-[#B2BEC3]',  hex: '#B2BEC3', order: 10 },
]

// ─── Segments ────────────────────────────────────────────────────────────────

export const LEAD_SEGMENTS: {
  value: LeadSegment
  label: string
  industry: string
  signals: string[]
}[] = [
  {
    value: 'gabinety_med',
    label: 'Gabinety medyczne',
    industry: 'Health, Wellness, Medical',
    signals: ['Stara strona', 'Brak rezerwacji online', 'Brak chatbota'],
  },
  {
    value: 'budowlanka',
    label: 'Firmy budowlane',
    industry: 'Construction',
    signals: ['Brak strony', 'Strona-wizytówka', 'Aktywne reklamy FB'],
  },
  {
    value: 'kancelarie',
    label: 'Kancelarie / Biura rachunkowe',
    industry: 'Legal Services, Accounting',
    signals: ['Stara strona', 'Brak CTA', 'Brak formularza'],
  },
  {
    value: 'beauty',
    label: 'Salony beauty',
    industry: 'Consumer Services',
    signals: ['Aktywny Instagram', 'Słaba strona', 'Brak automatyzacji'],
  },
  {
    value: 'szkolenia',
    label: 'Firmy szkoleniowe',
    industry: 'Professional Training & Coaching',
    signals: ['Aktywność LinkedIn', 'Słaba strona', 'Brak lejka'],
  },
  {
    value: 'nieruchomosci',
    label: 'Agencje nieruchomości',
    industry: 'Real Estate',
    signals: ['Stara strona', 'Brak szybkiego kontaktu', 'Brak chatbota'],
  },
  {
    value: 'it_male',
    label: 'Firmy IT / Software house',
    industry: 'Information Technology',
    signals: ['Systemy wewnętrzne', 'Automatyzacje'],
  },
  {
    value: 'transport',
    label: 'Firmy transportowe',
    industry: 'Transportation, Logistics',
    signals: ['Chaos operacyjny', 'Excel', 'Brak systemu'],
  },
]

// ─── Finance ─────────────────────────────────────────────────────────────────

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'podatki',      label: 'Podatki' },
  { value: 'ksiegowosc',   label: 'Księgowość' },
  { value: 'narzedzia',    label: 'Narzędzia SaaS' },
  { value: 'hosting',      label: 'Hosting / Infrastruktura' },
  { value: 'marketing',    label: 'Marketing' },
  { value: 'licencje',     label: 'Licencje' },
  { value: 'sprzet',       label: 'Sprzęt' },
  { value: 'biuro',        label: 'Biuro' },
  { value: 'podroze',      label: 'Podróże' },
  { value: 'szkolenia',    label: 'Szkolenia' },
  { value: 'inne',         label: 'Inne' },
]

// ─── Content ─────────────────────────────────────────────────────────────────

export const CONTENT_TYPES = [
  { value: 'carousel',       label: 'Karuzela' },
  { value: 'single_post',    label: 'Post z grafiką' },
  { value: 'reel_script',    label: 'Skrypt Reels' },
  { value: 'story',          label: 'Story' },
  { value: 'linkedin_post',  label: 'Post LinkedIn' },
  { value: 'article',        label: 'Artykuł' },
  { value: 'newsletter',     label: 'Newsletter' },
]

export const CONTENT_CHANNELS = [
  { value: 'instagram',          label: 'Instagram' },
  { value: 'linkedin_company',   label: 'LinkedIn (firma)' },
  { value: 'linkedin_personal',  label: 'LinkedIn (osobisty)' },
  { value: 'facebook',           label: 'Facebook' },
  { value: 'newsletter',         label: 'Newsletter' },
]

// ─── AI Score thresholds ─────────────────────────────────────────────────────

export const AI_SCORE_LABELS: Record<number, { label: string; color: string }> = {
  1:  { label: 'Bardzo słaby',  color: 'text-red-500' },
  2:  { label: 'Słaby',         color: 'text-red-400' },
  3:  { label: 'Poniżej avg',   color: 'text-orange-400' },
  4:  { label: 'Poniżej avg',   color: 'text-orange-400' },
  5:  { label: 'Przeciętny',    color: 'text-yellow-400' },
  6:  { label: 'Dobry',         color: 'text-yellow-300' },
  7:  { label: 'Dobry',         color: 'text-green-400' },
  8:  { label: 'Bardzo dobry',  color: 'text-green-400' },
  9:  { label: 'Świetny',       color: 'text-emerald-400' },
  10: { label: 'Idealny',       color: 'text-emerald-300' },
}
