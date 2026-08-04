-- APPLY MANUALLY: bash scripts/migrate.sh
-- ============================================================================
-- 1) Neue Reminder-Stufe: registration_abandoned_24h
--    Bewerber hat den Registrierungs-Link geöffnet bzw. Schritt 1+ erreicht,
--    aber das Formular nie abgeschickt. Bisher bekam diese Gruppe nichts.
--
-- 2) Die 24h-Terminerinnerung (interview_reminder_24h) wird im Vorlagen-Editor
--    bearbeitbar: Betreff/Text/Button als Tenant-Felder mit Code-Fallback.
-- ============================================================================

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS reminder_app_reg_abandoned_subject text,
  ADD COLUMN IF NOT EXISTS reminder_app_reg_abandoned_body    text,
  ADD COLUMN IF NOT EXISTS bewerbung_reminder_24h_subject     text,
  ADD COLUMN IF NOT EXISTS bewerbung_reminder_24h_body        text,
  ADD COLUMN IF NOT EXISTS bewerbung_reminder_24h_button      text;

COMMENT ON COLUMN public.tenants.reminder_app_reg_abandoned_subject IS
  'Betreff: Registrierung begonnen, aber nicht abgeschickt (24h Nachfass).';
COMMENT ON COLUMN public.tenants.bewerbung_reminder_24h_subject IS
  'Betreff: Terminerinnerung 24 Stunden vor dem Bewerbungsgespräch.';

-- CHECK-Constraint erweitern (idempotent)
ALTER TABLE public.application_reminder_log
  DROP CONSTRAINT IF EXISTS application_reminder_log_reminder_kind_check;

ALTER TABLE public.application_reminder_log
  ADD CONSTRAINT application_reminder_log_reminder_kind_check
  CHECK (reminder_kind IN (
    'no_booking_24h','no_booking_72h','no_show_24h',
    'interview_invite_30min','interview_reminder_24h',
    'registration_pending_24h','registration_pending_72h',
    'registration_abandoned_24h',
    'rebook_after_cancel_24h','rebook_after_cancel_72h',
    'booking_confirmation'
  ));

NOTIFY pgrst, 'reload schema';
