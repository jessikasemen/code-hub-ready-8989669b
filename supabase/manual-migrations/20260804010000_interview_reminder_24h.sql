-- APPLY MANUALLY: bash scripts/migrate.sh
-- ============================================================================
-- Neue Erinnerungsstufe: interview_reminder_24h
--
-- Bisher gab es nur eine Terminerinnerung 30 Minuten vor dem Gespräch. Wer
-- den Termin Tage vorher gebucht hat, hatte ihn bis dahin längst vergessen.
-- send-appointment-reminders sendet deshalb zusätzlich ~24 Stunden vorher.
-- ============================================================================

ALTER TABLE public.application_reminder_log
  DROP CONSTRAINT IF EXISTS application_reminder_log_reminder_kind_check;

ALTER TABLE public.application_reminder_log
  ADD CONSTRAINT application_reminder_log_reminder_kind_check
  CHECK (reminder_kind IN (
    'no_booking_24h','no_booking_72h','no_show_24h',
    'interview_invite_30min','interview_reminder_24h',
    'registration_pending_24h','registration_pending_72h',
    'rebook_after_cancel_24h','rebook_after_cancel_72h',
    'booking_confirmation'
  ));

NOTIFY pgrst, 'reload schema';
