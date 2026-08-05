-- APPLY MANUALLY via: bash scripts/deploy-backend.sh
-- Admin-Mitarbeiter darf die Mitarbeiter-Termine wieder sehen und verwalten.
-- Die "tighten"-Migration hatte den Zugriff auf bookings/time_slots entzogen,
-- dadurch blieb /admin/appointments leer (RLS filtert alle Zeilen weg).

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['bookings','time_slots'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admin staff full access" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admin staff read" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "Admin staff full access" ON public.%I FOR ALL TO authenticated
         USING (public.is_admin_staff(auth.uid()))
         WITH CHECK (public.is_admin_staff(auth.uid()))', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
