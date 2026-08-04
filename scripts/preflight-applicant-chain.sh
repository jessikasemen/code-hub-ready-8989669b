#!/usr/bin/env bash
# =============================================================================
#  preflight-applicant-chain.sh — LESEN, NICHT ÄNDERN.
#
#  Prüft vor dem Deploy/Tagesbetrieb, ob die Bewerber-Kette vollständig ist:
#    1) Pflichtspalten der letzten Migrationen
#    2) Erlaubte Reminder-Stufen (CHECK-Constraint)
#    3) Aktive Cron-Jobs
#    4) Zusagen ohne Mailversuch / ohne Registrierungs-Link
#    5) Termine weiter als 7 Tage in der Zukunft
#    6) Registrierungs-Fortschritt der letzten 7 Tage
#    7) Gesperrte Empfänger + pausierte Tenants
#
#  Ausführen AUF DEM BACKEND-SERVER:
#     cd /opt/apps/portal-migrations && bash scripts/preflight-applicant-chain.sh
# =============================================================================
set -uo pipefail

DB_CT="${BACKEND_DB_CONTAINER:-supabase-db}"
PSQL=(docker exec -i "$DB_CT" psql -U supabase_admin -d postgres -X)

log()  { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m  ! %s\033[0m\n" "$*"; }

docker inspect "$DB_CT" >/dev/null 2>&1 || { echo "✗ Container $DB_CT nicht gefunden — läuft das Skript auf dem Backend-Server?" >&2; exit 1; }

q() { "${PSQL[@]}" -v ON_ERROR_STOP=0 -c "$1"; }

log "1/7  Pflichtspalten der letzten Migrationen"
q "
SELECT x.t || '.' || x.c AS spalte,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name=x.t AND column_name=x.c
       ) THEN 'ok' ELSE 'FEHLT → Migration nachziehen' END AS status
  FROM (VALUES
    ('applications','registration_step'),
    ('applications','registration_link_opened_at'),
    ('applications','registration_step_at'),
    ('applications','invite_mail_status'),
    ('availability_schedules','max_days_ahead'),
    ('tenants','reminder_app_registration_subject'),
    ('tenants','reminder_app_reg_abandoned_subject'),
    ('tenants','bewerbung_reminder_24h_subject')
  ) AS x(t,c)
 ORDER BY 2 DESC, 1;"

log "1b/7  Fortschritts-Funktion vorhanden?"
q "SELECT CASE WHEN EXISTS (
       SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='record_registration_progress')
     THEN 'ok' ELSE 'FEHLT → 20260817000000_registration_progress.sql einspielen' END AS record_registration_progress;"

log "2/7  Erlaubte Reminder-Stufen (CHECK-Constraint)"
q "SELECT pg_get_constraintdef(oid) AS constraint_def
     FROM pg_constraint
    WHERE conname = 'application_reminder_log_reminder_kind_check';"
q "
SELECT k AS fehlende_stufe
  FROM unnest(ARRAY['interview_reminder_24h','registration_abandoned_24h',
                    'registration_pending_24h','booking_confirmation']) AS k
 WHERE pg_get_constraintdef(
         (SELECT oid FROM pg_constraint
           WHERE conname='application_reminder_log_reminder_kind_check')
       ) NOT LIKE '%' || k || '%';"

log "3/7  Aktive Cron-Jobs"
q "SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;"

log "4/7  Zusagen ohne Mailversuch bzw. ohne Registrierungs-Link (letzte 30 Tage)"
q "
SELECT a.email,
       a.status,
       COALESCE(a.invite_mail_status,'(nie versucht)') AS invite_mail_status,
       (t.token IS NOT NULL) AS hat_link,
       date_trunc('minute', a.updated_at) AS updated_at
  FROM applications a
  LEFT JOIN LATERAL (
    SELECT token FROM invitation_tokens
     WHERE application_id = a.id ORDER BY created_at DESC LIMIT 1
  ) t ON true
 WHERE a.created_at > now() - interval '30 days'
   AND a.status IN ('akzeptiert','vermittlung_zusage','fasttrack_angenommen')
   AND (a.invite_mail_status IS DISTINCT FROM 'sent' OR t.token IS NULL)
 ORDER BY a.updated_at DESC
 LIMIT 50;"

log "5/7  Buchungsfenster + Termine weiter als 7 Tage voraus"
q "SELECT id, name, max_days_ahead FROM availability_schedules ORDER BY max_days_ahead DESC LIMIT 20;"
q "
SELECT count(*) AS termine_ueber_7_tage
  FROM applications
 WHERE scheduled_at > now() + interval '7 days';"

log "6/7  Registrierungs-Fortschritt (Zusagen der letzten 7 Tage)"
q "
SELECT count(*)                                                        AS zusagen,
       count(*) FILTER (WHERE registration_link_opened_at IS NOT NULL)  AS link_geoeffnet,
       count(*) FILTER (WHERE COALESCE(registration_step,0) >= 1)       AS schritt_1_plus,
       count(*) FILTER (WHERE COALESCE(registration_step,0) >= 5)       AS formular_abgeschickt
  FROM applications
 WHERE created_at > now() - interval '7 days'
   AND status IN ('akzeptiert','vermittlung_zusage','fasttrack_angenommen');"

log "7/7  Zustellbarkeit: pausierte Tenants + gesperrte Empfänger"
q "SELECT id, name, emails_paused, (smtp_host IS NOT NULL AND smtp_password IS NOT NULL) AS smtp_ok
     FROM tenants WHERE is_active ORDER BY name;"
q "
SELECT count(*) AS gesperrte_empfaenger
  FROM suppressed_recipients
 WHERE created_at > now() - interval '30 days';" 2>/dev/null || warn "Tabelle suppressed_recipients nicht vorhanden"
q "
SELECT status, count(*) AS anzahl
  FROM email_send_log
 WHERE created_at > now() - interval '24 hours'
 GROUP BY status ORDER BY 2 DESC;"

printf "\n\033[1;32m✓ Vorflug-Check beendet (es wurde nichts verändert).\033[0m\n"
