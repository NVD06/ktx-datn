-- Điểm vệ sinh đổi sang trừ dồn theo kỳ nửa tháng (giờ VN: 1–15, 16–cuối tháng) — tính lại điểm đã lưu.
UPDATE "HygieneRecord" h
SET "score" = s."score"
FROM (
  SELECT "id", GREATEST(0, 100 - SUM("deduction") OVER (
    PARTITION BY "roomId",
      date_trunc('month', "checkDate" + interval '7 hours'),
      extract(day FROM "checkDate" + interval '7 hours') >= 16
    ORDER BY "checkDate"
  ))::int AS "score"
  FROM "HygieneRecord"
) s
WHERE h."id" = s."id" AND h."score" <> s."score";
