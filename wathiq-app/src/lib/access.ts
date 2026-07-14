/**
 * طبقة وصول المشروع المركزية (v2.4) — Collaboration-ready بلا نظام فرق.
 *
 * اليوم: المالك فقط (Owner-only) — نفس سلوك المنصة تمامًا.
 * غدًا: تُضاف ProjectMember هنا فقط (استعلام العضوية + تحويل الدور إلى
 * صلاحيات) دون تعديل عشرات المسارات — كل المستهلكين يقرؤون «العقد» الموحد:
 * ProjectAccess { role, canView, canEdit, canDelete, canUseAssistant, canExport }.
 *
 * قاعدة أمان ثابتة: هذه الطبقة ليست Feature Flag — لا يمكن تعطيل فحص
 * الملكية من الإعدادات، وأي مسار حساس يجب أن يمر من هنا أو من شرط
 * ملكية صريح في الاستعلام نفسه (scopeWhere).
 */

import { prisma } from "./db";

export type ProjectRole = "OWNER" | "EDITOR" | "REVIEWER";

export interface ProjectAccess {
  userId: string;
  projectId: string;
  role: ProjectRole;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canUseAssistant: boolean;
  canExport: boolean;
}

/** مصفوفة الدور → الصلاحيات — جاهزة للأدوار المستقبلية، OWNER فقط مستخدم الآن. */
const ROLE_CAPS: Record<ProjectRole, Omit<ProjectAccess, "userId" | "projectId" | "role">> = {
  OWNER: { canView: true, canEdit: true, canDelete: true, canUseAssistant: true, canExport: true },
  EDITOR: { canView: true, canEdit: true, canDelete: false, canUseAssistant: true, canExport: true },
  REVIEWER: { canView: true, canEdit: false, canDelete: false, canUseAssistant: false, canExport: true },
};

/**
 * وصول المستخدم لمشروع — null = لا وصول (المسارات تعامله 404/رفضًا).
 * اليوم: استعلام ملكية واحد خفيف. لاحقًا: يُضاف فحص ProjectMember هنا.
 */
export async function getProjectAccess(projectId: string, userId: string | null | undefined): Promise<ProjectAccess | null> {
  if (!projectId || !userId) return null;
  const owned = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
    select: { id: true },
  });
  if (!owned) return null;
  return { userId, projectId, role: "OWNER", ...ROLE_CAPS.OWNER };
}

export type AccessNeed = "view" | "edit" | "delete" | "assistant" | "export";

/** يرجع الوصول أو null إذا كانت الصلاحية المطلوبة غير متاحة. */
export async function requireProjectAccess(
  projectId: string,
  userId: string | null | undefined,
  need: AccessNeed = "view"
): Promise<ProjectAccess | null> {
  const access = await getProjectAccess(projectId, userId);
  if (!access) return null;
  const ok =
    need === "view" ? access.canView
    : need === "edit" ? access.canEdit
    : need === "delete" ? access.canDelete
    : need === "assistant" ? access.canUseAssistant
    : access.canExport;
  return ok ? access : null;
}

export const canViewProject = (a: ProjectAccess | null): boolean => a?.canView === true;
export const canEditProject = (a: ProjectAccess | null): boolean => a?.canEdit === true;
export const canDeleteProject = (a: ProjectAccess | null): boolean => a?.canDelete === true;
export const canUseAssistant = (a: ProjectAccess | null): boolean => a?.canUseAssistant === true;
export const canExportProject = (a: ProjectAccess | null): boolean => a?.canExport === true;

/**
 * شرط النطاق للاستعلامات الجماعية (قوائم المتطلبات/المعايير/الأسئلة…).
 * اليوم = الملكية؛ لاحقًا يتوسع إلى «مالك أو عضو» في مكان واحد.
 * (بديل موحد لـ ownedBy المنتشرة — الاستعمالات الجديدة تستخدم هذا.)
 */
export function scopeWhere(userId: string | null | undefined): { ownerId?: string } {
  return userId ? { ownerId: userId } : {};
}
