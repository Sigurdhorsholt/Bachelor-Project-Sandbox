-- Add meetingcode column (nullable) and unique index (enforces uniqueness only for non-NULL values)
BEGIN;

ALTER TABLE IF EXISTS meetings
    ADD COLUMN IF NOT EXISTS meetingcode TEXT;

-- Create unique index only for non-null meeting codes (allows multiple NULLs until app backfills)
CREATE UNIQUE INDEX IF NOT EXISTS ux_meetings_meetingcode
    ON meetings(meetingcode)
    WHERE meetingcode IS NOT NULL;

COMMIT ;
