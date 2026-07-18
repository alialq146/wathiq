# محاسبة الذكاء الاصطناعي · AI Accounting (v2.6)

> نظام محاسبة كامل لعمليات الذكاء الاصطناعي — الهدف الأول **حماية تكلفة الـ API**.
> استبدل «عدّاد التحليلات» القديم بنظام نقاط + سجل إلحاقي + Idempotency + امتيازات مركزية.

## 1. المكوّنات

| الطبقة | الملف | الدور |
|--------|------|------|
| الامتيازات | `src/lib/entitlements.ts` | `resolveEntitlements(user)` — المصدر الوحيد لقرار «ماذا يحق وكم يكلّف». **لا `if plan==="PRO"` مبعثر.** |
| التشغيل (مستقل عن المزوّد) | `src/lib/ai-runtime.ts` | توجيه النموذج/المزوّد/المهلة + تقدير التكلفة بالدولار من إعدادات قابلة للتعديل. |
| المحاسبة | `src/lib/ai-credits.ts` | المحفظة + حجز/تثبيت/استرجاع ذرّي + Idempotency + سجل إلحاقي. |
| المنسّق | `src/lib/ai-operation.ts` | `runAiOperation()` — نقطة الدخول الوحيدة: امتياز → توجيه → حجز → تنفيذ → تثبيت/استرجاع. |
| الإعدادات | `src/lib/settings/` مجموعتا `plans` + `ai` | كل الأرقام (تكلفة/منح/حدود/مهلة) قابلة للتعديل من الأدمن دون كود. |

## 2. البيانات (Schema)

- **`User`** محفظة النقاط: `aiCreditsGranted` (منحة الدورة، لقطة)، `aiCreditsUsed`، `aiCreditsPeriodEnd`، `aiCreditsDayUsed`، `aiCreditsDayEnd`، `aiCreditsOverride?` (تجاوز أدمن لكل مستخدم). **الرصيد = granted − used.**
- **`AiOperation`** (مرساة Idempotency + سجل المراجعة): صف واحد لكل عملية بكل التفاصيل — `idempotencyKey @unique`, `userId, plan, taskKey, level, persona, provider, model, creditsReserved/Committed/Refunded, promptTokens, completionTokens, estimatedCostUsd, executionMs, status, errorMessage, retryOfId, startedAt/endedAt`. الحالة: `RESERVED → COMMITTED | REFUNDED | FAILED | REJECTED`.
- **`AiLedgerEntry`** (السجل الإلحاقي — مصدر الحقيقة المحاسبي): صف لكل حركة `RESERVE|COMMIT|REFUND` بـ `credits` و`balanceUsed` (لقطة). **لا يُعدَّل ولا يُحذف أبدًا.** المحفظة على `User` = تجسيد مادّي لهذا السجل.

## 3. الامتيازات (Entitlements)

كل باقة تُعرّف في `settings.plans[plan]`: `monthlyCredits`, `dailyCreditLimit?`, `perRequestCreditLimit?`, `fullAnalysisEnabled`, `allowedTasks[]`, `allowedLevels[]`, `allowedPersonas[]`.
تكلفة العملية = `ai.tasks[task].credits × ai.levels[level].multiplier` (أدنى نقطة واحدة). `checkAiRequest()` يجمع تعطيل النظام (`ai.tasks[t].enabled`) + حق الباقة (`allowedTasks`) — كلاهما يجب أن يسمح.

## 4. دورة الحجز (ذرّية + Idempotent)

```
طلب مهمة (+ idempotencyKey من العميل — إلزامي للمحاسبة)
 → resolveEntitlements → checkAiRequest (يرفض المهمة/المستوى/الشخصية غير المتاحة، أو تجاوز سقف العملية)
 → RESERVE (معاملة واحدة):
     · شرط ذرّي: aiCreditsUsed ≤ granted − cost (و ≤ dailyLimit − cost)
     · إنشاء AiOperation بمفتاح فريد (تكرار المفتاح ⇒ P2002 ⇒ تراجع كامل ⇒ لا خصم مزدوج)
     · قيد RESERVE في السجل
 → تنفيذ الذكاء الاصطناعي
 → نجاح: COMMIT (تثبيت + تسجيل Tokens/التكلفة الفعلية)
 → فشل/مهلة: REFUND (إعادة النقاط، لا يُحاسَب)
```

> **مفتاح Idempotency من العميل إلزامي** (`AnalysisScreen`/`RequirementDetailScreen` يولّدان `crypto.randomUUID()` لكل محاولة). بدونه يرد المسار `missing-idempotency-key` للمستخدم المحاسَب.

> **الذرّية تحت التزامن** (v2.6.1): انتقالات الحالة (تثبيت/استرجاع) تتم بـ **compare-and-set** (`updateMany WHERE status="RESERVED"` يأخذ قفل الصف)، لا بحارس `findUnique` غير قافل — فمعاملتان متزامنتان (منظّفان، أو فشل/مهلة متسابقان) لا تسترجعان/تثبّتان مرتين.

**الضمانات المُختبَرة** (93 فحصًا على Postgres حقيقي — `qa-credits` 19، `qa-reaper` 19، `qa-operation` 18، `qa-settings` 18، `qa-billing` 10، `qa-http` 9):
- **لا تجاوز للمنحة**: 20 حجزًا متوازيًا × 3 نقاط على منحة 30 → **بالضبط 10 نجحت**، لا واحدة زيادة.
- **Idempotency**: نفس المفتاح مرتين → الثاني `reused`، خصم واحد فقط (خدمةً و HTTP).
- **الاسترجاع**: الفشل يعيد النقاط (used→0)، والعملية `FAILED` بـ `creditsRefunded`.
- **لا استرجاع/تثبيت مزدوج تحت التزامن** + منظّفان متزامنان يسترجعان كل يتيم مرة واحدة.
- الحد اليومي، الرصيد غير الكافي، الحساب المعطَّل، تجاوز الأدمن، تسجيل محاولات التجاوز، إعادة الضبط الشهري/اليومي، تطبيع الإعدادات وسقوفها، منح الفوترة SET (لا تراكم).

## 5. الاستقلال عن المزوّد

طبقة المحاسبة **لا تستورد أي مزوّد** — تتعامل مع نقاط/رموز/تكلفة وسلاسل `provider`/`model` فقط. `ai-runtime.ts` يحل النموذج/المزوّد/الأسعار من الإعدادات. تغيير المزوّد (OpenAI/Gemini/OpenRouter/محلي) = تعديل إعدادات `ai.modelRouting`/`costRates`/`providers`، **لا تعديل محاسبة**. أسماء النماذج والمزوّدين إعداد خادمي بحت — لا تُعاد للعميل النهائي.

## 6. الإدارة من الأدمن

`/admin/settings` تبويب **«محاسبة الذكاء الاصطناعي»** (SUPER_ADMIN): تكلفة كل مهمة بالنقاط، حد الرموز، مضاعِفات المستويات، المهلة/إعادة المحاولة. تبويب **«الخطط»**: المنحة الشهرية/السقف اليومي/سقف العملية/التحليل الشامل لكل باقة. كل تغيير يُسجَّل في `SettingsAuditLog`. إدارة المستخدم في `/admin`: تصفير الاستهلاك، منح مخصّص (تجاوز)، إلغاء التجاوز. **سجل العمليات** (تبويب AI Usage): من/متى/أي مهمة/أي مستوى/النموذج/النقاط/التكلفة/الحالة/الأخطاء + محاولات التجاوز (`REJECTED`).

## 7. عرض العميل

المستخدم يرى **نقاطًا فقط** (مستخدم/متبقٍ/تجديد)، وتكلفة المهمة قبل التشغيل — **لا Tokens ولا أسعار مزوّد ولا أسماء نماذج**. عند نفاد الرصيد تبقى المنصة اليدوية متاحة.

## 8. منظّف الحجوزات اليتيمة (v2.6.1)

عملية `RESERVED` تتعطّل بين الحجز والنتيجة (تعطّل خادم) تبقى خاصمةً للرصيد بلا استرجاع. `src/lib/ai-reaper.ts` (`reapOrphanedReservations`) يجد `RESERVED` الأقدم من `ai.reservationTimeoutMinutes` ويسترجعها عبر `refundCredits` (ذرّي، idempotent، آمن للتزامن) بسبب `orphaned-reservation-timeout`، على دفعات (`reservationCleanupBatchSize`). التشغيل: نقطة **`GET /api/cron/ai-reservation-cleanup`** مؤمّنة بـ `CRON_SECRET` (bearer، مقارنة زمن ثابت، 403 بلا سرّ). جدولة Vercel يومية في `vercel.json` (Pro يرفع التردد). المهلة بأرضية 10 دقائق (أعلى من أقصى مهلة طلب) وسقف 24 ساعة. النتائج مرئية في لوحة الأدمن (بطاقتا «حجوزات معلّقة» و«مستردّة تلقائيًا»). التفاصيل: `docs/DECISIONS/ADR-014` و`docs/DEPLOYMENT.md`.

## 9. نقاط التوسّع المستقبلية

- شخصيات/مستويات في الواجهة (البنية جاهزة — parameters تمرّ عبر الحجز).
- مزوّد بديل/failover (سجّل provider جديد في `ai-runtime` + registry تنفيذ).
- تجديد النقاط عند التفعيل/التجديد (مطبّق في `billing.ts` عبر `grantMonthlyCredits`/منحة الخطة).
- Carry-over/شحن أدمن فوري (الحقول موجودة: `aiCreditsGranted` قابل للرفع مباشرة).
