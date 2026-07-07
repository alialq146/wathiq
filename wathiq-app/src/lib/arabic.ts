/**
 * مطابقة العدد مع المعدود في العربية — حتى لا تظهر صيغ خاطئة مثل «3 متطلبًا».
 * القاعدة العملية المعتمدة هنا:
 *   0 و 3–10 → جمع («متطلبات»)، 1 → مفرد، 2 → مثنى، 11 فأكثر → تمييز منصوب («متطلبًا»).
 */
export function arCount(
  n: number,
  forms: { one: string; two: string; few: string; many: string }
): string {
  if (n === 1) return forms.one;
  if (n === 2) return forms.two;
  const last = n % 100;
  if (n === 0 || (last >= 3 && last <= 10)) return `${n} ${forms.few}`;
  return `${n} ${forms.many}`;
}

/** «متطلب واحد» / «متطلبان» / «5 متطلبات» / «13 متطلبًا» */
export function arReqCount(n: number): string {
  return arCount(n, { one: "متطلب واحد", two: "متطلبان", few: "متطلبات", many: "متطلبًا" });
}
