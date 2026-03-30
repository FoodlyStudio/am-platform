-- ============================================================
-- AM PLATFORM — Supabase Schema
-- ============================================================

-- ============================================================
-- MODUL: SALES
-- ============================================================

CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- dane podstawowe (z CSV importu)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  company TEXT NOT NULL,
  position TEXT,
  linkedin_url TEXT,
  company_website TEXT,
  industry TEXT,

  -- dane z kwalifikacji
  buying_signal TEXT,               -- sygnal zakupowy
  segment TEXT,                     -- gabinety, budowlanka, prawnicy...
  source TEXT DEFAULT 'sales_navigator', -- skad lead

  -- dane z AI scoringu
  ai_score INTEGER CHECK (ai_score BETWEEN 1 AND 10),
  ai_problem TEXT,                  -- zidentyfikowany problem
  ai_icebreaker TEXT,               -- wygenerowany icebreaker
  website_analysis TEXT,            -- analiza strony przez AI

  -- status
  status TEXT DEFAULT 'new' CHECK (status IN (
    'new', 'qualified', 'disqualified', 'archived'
  )),
  priority TEXT DEFAULT 'standard' CHECK (priority IN (
    'low', 'standard', 'high', 'critical'
  )),

  -- metadane
  assigned_to TEXT,                  -- kto obsluguje
  notes TEXT,
  tags TEXT[]
);

CREATE TABLE deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- pipeline
  stage TEXT NOT NULL DEFAULT 'nowy_lead' CHECK (stage IN (
    'nowy_lead',            -- 1. Znaleziony w Sales Navigator
    'dm_wyslany',           -- 2. Zaproszenie zaakceptowane, DM wyslany
    'odpowiedz',            -- 3. Klient odpisal
    'rozmowa_umowiona',     -- 4. Termin potwierdzony
    'diagnoza_zrobiona',    -- 5. Rozmowa odbyta, znamy problem
    'oferta_prezentowana',  -- 6. Prototyp + wycena pokazane
    'negocjacje',           -- 7. Klient rozważa
    'wygrana',              -- 8. Deal zamkniety
    'przegrana',            -- 9. Klient odmowil
    'nie_teraz'             -- 10. Zainteresowany, ale nie teraz
  )),
  stage_changed_at TIMESTAMPTZ DEFAULT now(),

  -- dane deala
  title TEXT NOT NULL,
  value DECIMAL(10,2),              -- wartosc w PLN
  currency TEXT DEFAULT 'PLN',
  project_type TEXT,                -- strona, system, aplikacja, chatbot
  expected_close_date DATE,

  -- diagnostyka
  diagnosis_notes TEXT,             -- notatki z rozmowy
  client_problem TEXT,              -- problem klienta
  suggested_solution TEXT,          -- AI: sugerowane rozwiazanie
  suggested_price_min DECIMAL(10,2),
  suggested_price_max DECIMAL(10,2),

  -- oferta
  offer_sent_at TIMESTAMPTZ,
  offer_opened_at TIMESTAMPTZ,
  offer_open_count INTEGER DEFAULT 0,
  offer_pdf_url TEXT,

  -- zamkniecie
  won_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,
  lost_reason TEXT,                 -- za drogo, nie teraz, wybrali kogos, inne
  lost_details TEXT,

  -- nurturing
  reengagement_date DATE,           -- kiedy ponowic kontakt
  nurturing_status TEXT,

  -- metadane
  assigned_to TEXT,
  notes TEXT
);

CREATE TABLE outreach_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,

  -- wiadomosc
  message_type TEXT NOT NULL CHECK (message_type IN (
    'connection_request',   -- zaproszenie LinkedIn
    'dm1_icebreaker',       -- pierwsza wiadomosc
    'fu1_case_study',       -- follow-up 1 (3 dni)
    'fu2_calendar',         -- follow-up 2 (8 dni)
    'post_offer_48h',       -- follow-up po ofercie 48h
    'post_offer_5d',        -- follow-up po ofercie 5 dni
    'post_offer_14d',       -- ostatni follow-up
    'reengagement_90d',     -- ponowny kontakt po 90 dniach
    'custom'                -- wiadomosc reczna
  )),
  message_content TEXT NOT NULL,    -- tresc wiadomosci
  message_variant TEXT,             -- A/B test variant
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'replied_positive', 'replied_neutral', 'replied_negative', 'no_reply'
  )),
  sent_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ         -- kiedy wyslac
);

CREATE TABLE call_scripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),

  pre_call_brief TEXT,              -- AI: briefing przed rozmowa
  script_notes TEXT,                -- notatki z rozmowy
  diagnosis_result JSONB,           -- AI: mapowanie problem → oferta
  follow_up_action TEXT
);

-- ============================================================
-- MODUL: CONTENT MARKETING
-- ============================================================

CREATE TABLE content_calendar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- planowanie
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  channel TEXT NOT NULL CHECK (channel IN (
    'instagram', 'linkedin_company', 'linkedin_personal', 'facebook', 'newsletter'
  )),
  content_type TEXT NOT NULL CHECK (content_type IN (
    'carousel', 'single_post', 'reel_script', 'story',
    'linkedin_post', 'article', 'newsletter'
  )),

  -- tresc
  title TEXT NOT NULL,
  content_body TEXT,                -- glowna tresc
  hook TEXT,                        -- hook otwierajacy
  cta TEXT,                         -- call to action
  hashtags TEXT[],
  media_urls TEXT[],                -- linki do grafik

  -- status
  status TEXT DEFAULT 'idea' CHECK (status IN (
    'idea', 'draft', 'ready', 'scheduled', 'published', 'archived'
  )),

  -- metryki (po publikacji)
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  link_clicks INTEGER DEFAULT 0,

  -- metadane
  topic_category TEXT,              -- edukacyjny, case study, behind the scenes, tips
  target_segment TEXT,              -- do jakiego segmentu klientow
  repurposed_from UUID REFERENCES content_calendar(id),
  notes TEXT
);

CREATE TABLE content_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- szablon
  name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN (
    'carousel_slide', 'linkedin_post', 'instagram_caption',
    'hook', 'cta', 'ad_angle', 'reel_script'
  )),
  content TEXT NOT NULL,            -- tresc szablonu z placeholderami
  variables TEXT[],                 -- lista zmiennych do wypelnienia
  category TEXT,                    -- kategoria tematyczna
  performance_score DECIMAL(3,1),   -- 1-10, na bazie metryki
  times_used INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- ============================================================
-- MODUL: FINANSE
-- ============================================================

CREATE TABLE income (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- zrodlo
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  project_name TEXT,

  -- kwota
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'PLN',
  payment_type TEXT CHECK (payment_type IN (
    'zaliczka', 'rata', 'platnosc_koncowa', 'jednorazowa', 'abonament'
  )),

  -- status
  status TEXT DEFAULT 'oczekujaca' CHECK (status IN (
    'oczekujaca', 'oplacona', 'czesciowa', 'zalegla', 'anulowana'
  )),
  invoice_number TEXT,
  invoice_date DATE,
  due_date DATE,
  paid_date DATE,
  paid_amount DECIMAL(10,2) DEFAULT 0,

  -- kategoria
  project_type TEXT,                -- strona, system, aplikacja
  notes TEXT
);

CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- wydatek
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'PLN',
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'podatki', 'ksiegowosc', 'narzedzia', 'hosting',
    'marketing', 'licencje', 'sprzet', 'biuro',
    'podroze', 'szkolenia', 'inne'
  )),

  -- typ
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT CHECK (recurring_frequency IN (
    'monthly', 'quarterly', 'yearly'
  )),

  -- daty
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT
);

-- ============================================================
-- WIDOKI (views)
-- ============================================================

CREATE VIEW monthly_pl AS
SELECT
  date_trunc('month', COALESCE(i.paid_date, i.invoice_date)) AS month,
  COALESCE(SUM(i.paid_amount), 0) AS revenue,
  COALESCE(
    (SELECT SUM(e.amount) FROM expenses e
     WHERE date_trunc('month', e.expense_date) = date_trunc('month', COALESCE(i.paid_date, i.invoice_date))
    ), 0
  ) AS costs,
  COALESCE(SUM(i.paid_amount), 0) -
  COALESCE(
    (SELECT SUM(e.amount) FROM expenses e
     WHERE date_trunc('month', e.expense_date) = date_trunc('month', COALESCE(i.paid_date, i.invoice_date))
    ), 0
  ) AS profit
FROM income i
WHERE i.status = 'oplacona'
GROUP BY month
ORDER BY month DESC;

CREATE VIEW pipeline_summary AS
SELECT
  stage,
  COUNT(*) AS deal_count,
  COALESCE(SUM(value), 0) AS total_value,
  COALESCE(AVG(value), 0) AS avg_value
FROM deals
WHERE stage NOT IN ('wygrana', 'przegrana', 'nie_teraz')
GROUP BY stage;

CREATE VIEW segment_performance AS
SELECT
  l.segment,
  COUNT(DISTINCT d.id) AS total_deals,
  COUNT(DISTINCT d.id) FILTER (WHERE d.stage = 'wygrana') AS won_deals,
  ROUND(
    COUNT(DISTINCT d.id) FILTER (WHERE d.stage = 'wygrana')::DECIMAL /
    NULLIF(COUNT(DISTINCT d.id), 0) * 100, 1
  ) AS close_rate,
  COALESCE(AVG(d.value) FILTER (WHERE d.stage = 'wygrana'), 0) AS avg_ticket,
  COUNT(DISTINCT om.id) FILTER (WHERE om.status IN ('replied_positive', 'replied_neutral'))::DECIMAL /
    NULLIF(COUNT(DISTINCT om.id) FILTER (WHERE om.status = 'sent'), 0) * 100 AS reply_rate
FROM leads l
LEFT JOIN deals d ON d.lead_id = l.id
LEFT JOIN outreach_messages om ON om.lead_id = l.id
WHERE l.segment IS NOT NULL
GROUP BY l.segment;

-- ============================================================
-- INDEKSY
-- ============================================================

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_segment ON leads(segment);
CREATE INDEX idx_leads_ai_score ON leads(ai_score);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_deals_lead_id ON deals(lead_id);
CREATE INDEX idx_outreach_deal_id ON outreach_messages(deal_id);
CREATE INDEX idx_outreach_scheduled ON outreach_messages(scheduled_for);
CREATE INDEX idx_content_scheduled ON content_calendar(scheduled_date);
CREATE INDEX idx_content_status ON content_calendar(status);
CREATE INDEX idx_income_status ON income(status);
CREATE INDEX idx_income_paid_date ON income(paid_date);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users have full access (2-person team)
CREATE POLICY "Authenticated full access" ON leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON deals
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON outreach_messages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON call_scripts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON content_calendar
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON content_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON income
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON expenses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- SEED DATA: Pipeline stages config
-- ============================================================

CREATE TABLE pipeline_config (
  id SERIAL PRIMARY KEY,
  stage_key TEXT UNIQUE NOT NULL,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  stage_color TEXT NOT NULL,
  description TEXT,
  action TEXT
);

INSERT INTO pipeline_config (stage_key, stage_name, stage_order, stage_color, description, action) VALUES
('nowy_lead',           'Nowy lead',            1,  '#6C5CE7', 'Znaleziony w Sales Navigator, dane w CRM',         'Wyslac zaproszenie LinkedIn'),
('dm_wyslany',          'DM wyslany',           2,  '#0984E3', 'Zaproszenie zaakceptowane, wiadomosc wyslana',      'Czekac 3 dni na odpowiedz'),
('odpowiedz',           'Odpowiedz',            3,  '#00B894', 'Klient odpisal pozytywnie lub neutralnie',          'Zaproponowac rozmowe'),
('rozmowa_umowiona',    'Rozmowa umowiona',     4,  '#00CEC9', 'Termin w Cal.com potwierdzony',                     'Przygotowac sie do diagnozy'),
('diagnoza_zrobiona',   'Diagnoza zrobiona',    5,  '#FDCB6E', 'Rozmowa odbyta, znamy problem',                    'Przygotowac prototyp'),
('oferta_prezentowana', 'Oferta prezentowana',  6,  '#E17055', 'Prototyp + wycena pokazane',                       'Follow-up w 48h'),
('negocjacje',          'Negocjacje',           7,  '#D63031', 'Klient rozważa, pyta o szczegoly',                 'Odpowiadac szybko'),
('wygrana',             'WYGRANA',              8,  '#27AE60', 'Deal zamkniety',                                   'Rozpoczac projekt'),
('przegrana',           'PRZEGRANA',            9,  '#636E72', 'Klient odmowil',                                   'Tagowac powod, reminder 90 dni'),
('nie_teraz',           'NIE TERAZ',            10, '#B2BEC3', 'Zainteresowany, ale nie teraz',                    'Reminder 90 dni');

-- ============================================================
-- SEED DATA: Segmenty klientow
-- ============================================================

CREATE TABLE segments_config (
  id SERIAL PRIMARY KEY,
  segment_key TEXT UNIQUE NOT NULL,
  segment_name TEXT NOT NULL,
  industry_filter TEXT,
  signals TEXT[],
  priority TEXT DEFAULT 'standard'
);

INSERT INTO segments_config (segment_key, segment_name, industry_filter, signals) VALUES
('gabinety_med',   'Gabinety medyczne / stomatologia',           'Health, Wellness, Medical Practice',          ARRAY['Stara strona', 'Brak rezerwacji online', 'Brak chatbota']),
('budowlanka',     'Firmy budowlano-remontowe',                  'Construction',                                ARRAY['Brak strony', 'Strona-wizytowka', 'Aktywne reklamy FB']),
('kancelarie',     'Kancelarie prawne / biura rachunkowe',       'Legal Services, Accounting',                  ARRAY['Stara strona', 'Brak CTA', 'Brak formularza']),
('beauty',         'Salony beauty / fryzjerzy',                  'Consumer Services',                           ARRAY['Aktywny Instagram', 'Slaba strona', 'Brak automatyzacji']),
('szkolenia',      'Firmy szkoleniowe / trenerzy',               'Professional Training & Coaching',            ARRAY['Aktywnosc LinkedIn', 'Slaba strona', 'Brak lejka']),
('nieruchomosci',  'Agencje nieruchomosci',                      'Real Estate',                                 ARRAY['Stara strona', 'Brak szybkiego kontaktu', 'Brak chatbota']),
('it_male',        'Firmy IT / software house',                  'Information Technology',                      ARRAY['Systemy wewnetrzne', 'Automatyzacje']),
('transport',      'Firmy transportowe / logistyczne',           'Transportation, Logistics',                   ARRAY['Chaos operacyjny', 'Excel', 'Brak systemu']);

-- ============================================================
-- SEED DATA: Content templates (hooki i szablony)
-- ============================================================

INSERT INTO content_templates (name, template_type, content, variables, category) VALUES
(
  'Hook: pytanie o strone',
  'hook',
  'Czy Twoja strona internetowa generuje zapytania? Jesli nie, tracisz klientow kazdego dnia.',
  ARRAY[]::TEXT[],
  'lead_generation'
),
(
  'Hook: koszt Excela',
  'hook',
  'Ile kosztuje Cie Excel? Firmy uslugowe tracą sredni {godziny} godzin tygodniowo na reczne procesy.',
  ARRAY['godziny'],
  'automation'
),
(
  'Hook: konkurencja',
  'hook',
  'Twoja konkurencja juz automatyzuje. A Ty nadal {problem}.',
  ARRAY['problem'],
  'urgency'
),
(
  'Hook: prototyp',
  'hook',
  'Pokazujemy prototyp ZANIM zaplacisz. Dlaczego? Bo wiemy, ze to zmienia gre.',
  ARRAY[]::TEXT[],
  'trust'
),
(
  'Hook: chatbot',
  'hook',
  'Twoi klienci pisza po godzinach. Kto im odpowiada? Nikt? To problem za {kwota} PLN miesiecznie.',
  ARRAY['kwota'],
  'ai_solutions'
),
(
  'CTA: rozmowa',
  'cta',
  'Chcesz zobaczyc jak to wyglada dla Twojej firmy? Link w bio / DM "POKAZ"',
  ARRAY[]::TEXT[],
  'general'
),
(
  'CTA: case study',
  'cta',
  'Pelny case study w komentarzu. Napisz "CASE" a wysle Ci szczegoly.',
  ARRAY[]::TEXT[],
  'engagement'
),
(
  'Karuzela: 5 znakow zlej strony',
  'carousel_slide',
  E'Slide 1: {hook}\nSlide 2: Znak 1 - Strona nie jest responsywna\nSlide 3: Znak 2 - Brak formularza kontaktowego\nSlide 4: Znak 3 - Ladowanie dluzej niz 3 sekundy\nSlide 5: Znak 4 - Brak CTA na stronie glownej\nSlide 6: Znak 5 - Design starszy niz 3 lata\nSlide 7: {cta}',
  ARRAY['hook', 'cta'],
  'website'
),
(
  'LinkedIn: proces AM',
  'linkedin_post',
  E'Wiekszość firm IT wysyla PDF z wycena i czeka.\n\nMy robimy inaczej.\n\n1. Rozmawiamy 30 minut i rozumiemy problem\n2. Budujemy prototyp w 3 dni\n3. POKAZUJEMY go na zywo\n4. Dopiero potem rozmawiamy o cenie\n\nDlaczego?\n\nBo klient ktory WIDZI swoj produkt podejmuje decyzje 3x szybciej.\n\n{cta}',
  ARRAY['cta'],
  'process'
),
(
  'LinkedIn: case study template',
  'linkedin_post',
  E'Firma z branzy {branza} przyszla do nas z problemem:\n{problem}\n\nCo zrobilismy:\n{rozwiazanie}\n\nEfekt:\n{efekt}\n\nCzas realizacji: {czas}\n\n{cta}',
  ARRAY['branza', 'problem', 'rozwiazanie', 'efekt', 'czas', 'cta'],
  'case_study'
);
