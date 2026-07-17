# CLAUDE.md

> إرشادات لـ Claude Code / وكلاء الذكاء الاصطناعي العاملين على هذا المستودع.
> **المصدر الكامل للإرشادات هو [`AGENTS.md`](./AGENTS.md) — اقرأه أولًا.** هذا الملف ملخّص سريع فقط.

## ابدأ من هنا
1. **[`wathiq-app/docs/CURRENT_STATUS.md`](./wathiq-app/docs/CURRENT_STATUS.md)** — الحالة الحالية والمهمة التالية.
2. **[`AGENTS.md`](./AGENTS.md)** — سير العمل + القواعد غير القابلة للتفاوض + قواعد الكود.
3. **[`wathiq-app/docs/ARCHITECTURE.md`](./wathiq-app/docs/ARCHITECTURE.md)** — كيف يعمل النظام.

## التطبيق
- الكود في `wathiq-app/`. المكدّس: Next.js 15 + React 19 + TypeScript + Prisma/Postgres على Vercel.
- الفحص قبل أي دفع: `cd wathiq-app && npx tsc --noEmit && npx next build`.

## أهم القواعد (التفصيل في AGENTS.md)
- افحص الملفات الفعلية؛ لا refactor واسع؛ لا سلوك وظيفي جديد دون سبب مُثبت.
- لا تكشف أسرارًا؛ لا تذكر أسماء نماذج/مزوّد الذكاء في الواجهة/التقارير/الكود.
- حافظ على العزل (`requireActor`/`ownedBy`/`requireSuperAdmin`) وعلى RTL + الجوال + الوضعين.
- وثّق كل إصدار: `CHANGELOG.md` + `JOURNEY.md` + `wathiq-app/src/lib/version.ts`.
- انتبه لـ `db push --accept-data-loss` (استخدم `SKIP_DB_PUSH` في الإنتاج) — لا تُتلف بيانات.
