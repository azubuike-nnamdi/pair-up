-- Confirmed, locked, and full pockets are all booked, and no longer available.
CREATE TYPE "PocketStatus_new" AS ENUM ('AVAILABLE', 'PENDING', 'BOOKED');

ALTER TABLE "Pocket" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Pocket"
  ALTER COLUMN "status" TYPE "PocketStatus_new"
  USING (
    CASE "status"::text
      WHEN 'CONFIRMED' THEN 'BOOKED'
      WHEN 'LOCKED' THEN 'BOOKED'
      WHEN 'FULL' THEN 'BOOKED'
      ELSE "status"::text
    END
  )::"PocketStatus_new";

ALTER TABLE "Pocket" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE';

DROP TYPE "PocketStatus";

ALTER TYPE "PocketStatus_new" RENAME TO "PocketStatus";

UPDATE "Pocket" AS pocket
SET "status" = 'BOOKED'
WHERE pocket."status" = 'AVAILABLE'
  AND (
    SELECT COUNT(*)
    FROM "Membership" AS membership
    WHERE membership."pocketId" = pocket."id"
      AND membership."status" IN ('PENDING', 'APPROVED')
  ) >= CASE pocket."type"
    WHEN 'TYPE_1' THEN 1
    WHEN 'TYPE_2' THEN 2
    ELSE 3
  END;
