# قرارات معمارية · Architecture Decision Records

سجلّ القرارات المعمارية لوثّق. كل ملف يوثّق قرارًا: السياق، القرار، البدائل، النتائج.
**لا تعكس قرارًا موثّقًا هنا دون سبب مثبت وتحديث الـ ADR.**

| ADR | القرار |
|-----|--------|
| [ADR-001](ADR-001-no-foreign-key-relations.md) | بلا علاقات FK — أعمدة نصية + عزل في طبقة التطبيق |
| [ADR-002](ADR-002-owner-only-access-layer.md) | مالك واحد + طبقة وصول مركزية (جاهزة للتعاون) |
| [ADR-003](ADR-003-no-redis.md) | بلا Redis |
| [ADR-004](ADR-004-no-inngest.md) | بلا Inngest — Cron مؤمّن بسرّ |
| [ADR-005](ADR-005-no-object-storage.md) | بلا تخزين كائنات (R2/S3) |
| [ADR-006](ADR-006-settings-driven-policies.md) | السياسات من الإعدادات، الأسرار من البيئة |
| [ADR-007](ADR-007-prisma-db-push.md) | prisma db push بدل ملفات migration |
| [ADR-008](ADR-008-optimistic-concurrency.md) | تزامن تفاؤلي عبر expectedUpdatedAt |
| [ADR-009](ADR-009-deferred-pagination.md) | تأجيل الترقيم |
| [ADR-010](ADR-010-vercel-neon.md) | Vercel + Neon |
| [ADR-011](ADR-011-ai-optional.md) | الذكاء الاصطناعي اختياري |
| [ADR-012](ADR-012-deterministic-brd-srs.md) | BRD/SRS توليد حتمي (SRS اختياري) |
| [ADR-013](ADR-013-ai-credit-accounting.md) | محاسبة الذكاء الاصطناعي بالنقاط (Credit Ledger + Idempotency) |
| [ADR-014](ADR-014-orphaned-reservation-reaper.md) | منظّف الحجوزات اليتيمة (Reaper + Cron مؤمّن) |
