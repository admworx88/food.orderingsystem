-- Track which kiosk each staff member is currently signed into.
-- Enforces cross-kiosk session exclusivity: one active session per staff member.

CREATE TABLE kiosk_active_sessions (
  profile_id   uuid        PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  kiosk_type   text        NOT NULL CHECK (kiosk_type IN ('restaurant', 'ocean_view')),
  signed_in_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE kiosk_active_sessions ENABLE ROW LEVEL SECURITY;

-- Kiosk server actions run as anon role — allow full CRUD on this table.
CREATE POLICY "anon_select_kiosk_sessions"
  ON kiosk_active_sessions FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_kiosk_sessions"
  ON kiosk_active_sessions FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_kiosk_sessions"
  ON kiosk_active_sessions FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_delete_kiosk_sessions"
  ON kiosk_active_sessions FOR DELETE TO anon USING (true);

-- Authenticated staff can also read/write (admin panel, etc.)
CREATE POLICY "auth_all_kiosk_sessions"
  ON kiosk_active_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Rollback:
-- DROP TABLE IF EXISTS kiosk_active_sessions;
