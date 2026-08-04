-- Erlaubt 'booking_confirmation' als reminder_kind in application_reminder_log.
-- Selbstheilend: der Constraint wird aus der bekannten Liste UND allen bereits
-- vorhandenen Werten gebaut. So kann diese Migration auch dann nachlaufen,
-- wenn spätere Migrationen schon weitere Reminder-Arten eingeführt haben
-- (früher scheiterte sie mit "is violated by some row").

DO $$
DECLARE
  known text[] := ARRAY[
    'no_booking_24h','no_booking_72h','no_show_24h',
    'interview_invite_30min','booking_confirmation'
  ];
  allowed text[];
  list text;
BEGIN
  SELECT array_agg(DISTINCT k)
    INTO allowed
    FROM (
      SELECT unnest(known) AS k
      UNION
      SELECT DISTINCT reminder_kind FROM public.application_reminder_log
       WHERE reminder_kind IS NOT NULL
    ) s;

  SELECT string_agg(quote_literal(k), ',') INTO list FROM unnest(allowed) AS k;

  EXECUTE 'ALTER TABLE public.application_reminder_log
             DROP CONSTRAINT IF EXISTS application_reminder_log_reminder_kind_check';
  EXECUTE format(
    'ALTER TABLE public.application_reminder_log
       ADD CONSTRAINT application_reminder_log_reminder_kind_check
       CHECK (reminder_kind IN (%s))', list);
END $$;

NOTIFY pgrst, 'reload schema';
