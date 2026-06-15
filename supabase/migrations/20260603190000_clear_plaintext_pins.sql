-- Migration: Clear all plaintext PINs to force re-entry with bcrypt hashing
-- Context: pin_hash column was storing raw PIN strings (e.g. "1234"). The application
-- now hashes PINs with bcrypt (cost 10) on write and compares with bcrypt.compare().
-- Existing plaintext values are incompatible with bcrypt.compare() and must be cleared.
-- Action required: All staff must have their PINs reset via the Admin → Users panel
-- after this migration is applied.

UPDATE profiles
SET pin_hash = NULL
WHERE pin_hash IS NOT NULL
  AND pin_hash NOT LIKE '$2%';

-- Rollback:
-- There is no safe rollback — do not restore plaintext values.
-- Staff will need to reset PINs after any rollback as well.
