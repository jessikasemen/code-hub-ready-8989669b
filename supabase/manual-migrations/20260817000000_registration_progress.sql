-- Registrierungs-Fortschritt sichtbar machen (Phase 3).
--
-- Problem: Konto + Profil entstehen erst nach Schritt 5. Wer vorher abbricht,
-- hinterlässt keine Spur → Statistik zeigt „0 registriert", ohne zu sagen, ob
-- überhaupt jemand angefangen hat.
--
-- Lösung: schmaler Fortschritts-Stempel auf der Bewerbung, gesetzt über eine
-- tokengebundene Funktion. KEINE halben Auth-Konten.

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS registration_link_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS registration_step smallint,
  ADD COLUMN IF NOT EXISTS registration_step_at timestamptz;

COMMENT ON COLUMN public.applications.registration_link_opened_at IS
  'Erster Aufruf von /register?token=… (Link geöffnet).';
COMMENT ON COLUMN public.applications.registration_step IS
  'Höchster im Registrierungs-Wizard erreichter Schritt (1..5). 5 = Formular abgeschickt.';

-- Tokengebundener Fortschritts-Schreiber. security definer, weil der Bewerber
-- zu diesem Zeitpunkt keine Session hat; Schreibrecht ergibt sich allein aus
-- dem Besitz eines gültigen Einladungs-Tokens.
CREATE OR REPLACE FUNCTION public.record_registration_progress(
  _token text,
  _step int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _app uuid;
BEGIN
  IF _token IS NULL OR length(btrim(_token)) = 0 THEN
    RETURN false;
  END IF;
  IF _step IS NULL OR _step < 0 OR _step > 5 THEN
    RETURN false;
  END IF;

  SELECT application_id INTO _app
  FROM public.invitation_tokens
  WHERE token = btrim(_token)
  LIMIT 1;

  IF _app IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.applications
  SET registration_link_opened_at = COALESCE(registration_link_opened_at, now()),
      registration_step = GREATEST(COALESCE(registration_step, 0), _step),
      registration_step_at = CASE
        WHEN _step > COALESCE(registration_step, 0) THEN now()
        ELSE registration_step_at
      END
  WHERE id = _app;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.record_registration_progress(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_registration_progress(text, int) TO anon, authenticated, service_role;
