/**
 * فحص مركزي لحالة الحساب — تستخدمه Server Actions وصفحة مساحة العمل
 * ومسارات الذكاء الاصطناعي، حتى لا يتكرر المنطق في كل مكان.
 *
 * القاعدة: الجلسة الموقّعة وحدها لا تكفي — الحساب يجب أن يكون موجودًا
 * في القاعدة وحالته ACTIVE. المحذوف أو المعطَّل (أو أي حالة غير ACTIVE)
 * يُرفض في كل عملية حساسة. SUPER_ADMIN الفعال يمر طبيعيًا (حالته ACTIVE).
 */

import { prisma, hasDatabase } from "./db";

export async function isAccountActive(uid: string): Promise<boolean> {
  if (!hasDatabase()) return true; // وضع بلا قاعدة: لا حسابات أصلًا
  try {
    const row = await prisma.user.findUnique({
      where: { id: uid },
      select: { accountStatus: true },
    });
    return Boolean(row && row.accountStatus === "ACTIVE");
  } catch {
    // فشل التحقق → نرفض أمانًا (fail-closed) بدل السماح لجلسة مجهولة الحالة.
    return false;
  }
}
