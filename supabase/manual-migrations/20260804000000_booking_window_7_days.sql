-- APPLY MANUALLY: bash scripts/migrate.sh
-- ============================================================================
-- Buchungsfenster auf 7 Tage begrenzen.
--
-- Grund: Termine, die 1–2 Wochen in der Zukunft liegen, werden massenhaft
-- nicht wahrgenommen ("Nicht erschienen") oder storniert. Bewerber aus
-- Ads-Traffic haben eine sehr kurze Halbwertszeit — deshalb dürfen nur noch
-- Slots innerhalb der nächsten 7 Tage angeboten werden.
--
-- Jederzeit im Admin unter Verfügbarkeiten pro Kalender änderbar.
-- ============================================================================

ALTER TABLE public.availability_schedules
  ALTER COLUMN max_days_ahead SET DEFAULT 7;

UPDATE public.availability_schedules
   SET max_days_ahead = 7
 WHERE max_days_ahead > 7;

NOTIFY pgrst, 'reload schema';
