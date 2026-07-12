import { redirect } from "next/navigation";
import Link from "next/link";
import { hasDatabase } from "@/lib/db";
import { authEnabled } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";
import { requireSuperAdmin } from "@/lib/admin";
import { getBillingSettings } from "@/lib/billing";
import { billingEmailEnabled } from "@/lib/billing-mailer";
import { emailConfigured } from "@/lib/mailer";
import { BillingSettingsClient } from "./BillingSettingsClient";

// إعدادات الفوترة — SUPER_ADMIN فقط، بلا فهرسة، وبيانات طازجة دائمًا.
export const dynamic = "force-dynamic";
export const metadata = { title: "إعدادات الفوترة · وثّق", robots: { index: false, follow: false } };

export default async function BillingSettingsPage() {
  if (!authEnabled() || !hasDatabase()) redirect("/admin");

  const session = await getSessionUser();
  if (!session) redirect("/login?next=/admin/billing/settings");

  const admin = await requireSuperAdmin();
  if (!admin) redirect("/admin");

  const settings = await getBillingSettings();
  const email = { providerConfigured: emailConfigured(), billingEmailEnabled: billingEmailEnabled() };

  return <BillingSettingsClient initial={settings} email={email} />;
}
