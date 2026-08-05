-- =============================================================================
-- Live-Chat fuer Bewerber (eine Unterhaltung je Bewerbung, Antwort vom Menschen).
--
-- Bewerber haben in der Registrierung noch KEIN Auth-Konto. Schreibrecht ergibt
-- sich daher allein aus dem Besitz eines gueltigen Tokens (magic_token der
-- Bewerbung oder invitation_tokens.token) -> tokengebundene SECURITY DEFINER
-- Funktionen. Kein anon-Zugriff auf die Tabelle selbst.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.applicant_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  tenant_id uuid,
  sender text NOT NULL CHECK (sender IN ('applicant', 'staff')),
  staff_id uuid,
  message text NOT NULL CHECK (length(btrim(message)) > 0 AND length(message) <= 4000),
  read_by_staff boolean NOT NULL DEFAULT false,
  read_by_applicant boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS applicant_chat_messages_app_idx
  ON public.applicant_chat_messages (application_id, created_at);

GRANT SELECT, INSERT, UPDATE ON public.applicant_chat_messages TO authenticated;
GRANT ALL ON public.applicant_chat_messages TO service_role;

ALTER TABLE public.applicant_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin staff full access" ON public.applicant_chat_messages;
CREATE POLICY "Admin staff full access" ON public.applicant_chat_messages
  FOR ALL TO authenticated
  USING (public.is_admin_staff(auth.uid()))
  WITH CHECK (public.is_admin_staff(auth.uid()));

-- Token -> Bewerbung (magic_token ODER Einladungs-Token).
CREATE OR REPLACE FUNCTION public.resolve_application_by_chat_token(_token text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _app uuid;
BEGIN
  IF _token IS NULL OR length(btrim(_token)) = 0 THEN RETURN NULL; END IF;

  SELECT a.id INTO _app FROM public.applications a
   WHERE a.magic_token = btrim(_token)
     AND (a.magic_token_expires_at IS NULL OR a.magic_token_expires_at > now())
   LIMIT 1;
  IF _app IS NOT NULL THEN RETURN _app; END IF;

  SELECT t.application_id INTO _app FROM public.invitation_tokens t
   WHERE t.token = btrim(_token)
   LIMIT 1;
  RETURN _app;
END $$;

-- Bewerber sendet.
CREATE OR REPLACE FUNCTION public.applicant_chat_send(_token text, _message text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _app uuid; _tenant uuid; _new uuid; _recent int;
BEGIN
  _app := public.resolve_application_by_chat_token(_token);
  IF _app IS NULL THEN RAISE EXCEPTION 'invalid_token'; END IF;
  IF _message IS NULL OR length(btrim(_message)) = 0 THEN RAISE EXCEPTION 'empty_message'; END IF;

  -- Flut-Schutz: max. 20 Nachrichten je Bewerbung pro 10 Minuten.
  SELECT count(*) INTO _recent FROM public.applicant_chat_messages
   WHERE application_id = _app AND sender = 'applicant'
     AND created_at > now() - interval '10 minutes';
  IF _recent >= 20 THEN RAISE EXCEPTION 'rate_limited'; END IF;

  SELECT tenant_id INTO _tenant FROM public.applications WHERE id = _app;

  INSERT INTO public.applicant_chat_messages (application_id, tenant_id, sender, message, read_by_applicant)
  VALUES (_app, _tenant, 'applicant', left(btrim(_message), 4000), true)
  RETURNING id INTO _new;

  RETURN _new;
END $$;

-- Bewerber liest (und quittiert Staff-Nachrichten).
CREATE OR REPLACE FUNCTION public.applicant_chat_messages_for_token(_token text)
RETURNS TABLE(id uuid, sender text, message text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _app uuid;
BEGIN
  _app := public.resolve_application_by_chat_token(_token);
  IF _app IS NULL THEN RAISE EXCEPTION 'invalid_token'; END IF;

  UPDATE public.applicant_chat_messages m
     SET read_by_applicant = true
   WHERE m.application_id = _app AND m.sender = 'staff' AND m.read_by_applicant = false;

  RETURN QUERY
    SELECT m.id, m.sender, m.message, m.created_at
      FROM public.applicant_chat_messages m
     WHERE m.application_id = _app
     ORDER BY m.created_at;
END $$;

REVOKE ALL ON FUNCTION public.resolve_application_by_chat_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.applicant_chat_send(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.applicant_chat_messages_for_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_application_by_chat_token(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.applicant_chat_send(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.applicant_chat_messages_for_token(text) TO service_role;

NOTIFY pgrst, 'reload schema';
