-- Ein-/Ausschalter fuer den Bewerber-Live-Chat (nur Portal / Fast-Track).
-- Der Chat dient dazu, Fragen vor dem Termin zu beantworten; der Admin muss ihn
-- jederzeit ausblenden koennen, ohne Code-Deploy.
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS applicant_chat_enabled boolean NOT NULL DEFAULT true;

INSERT INTO public.system_settings (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
