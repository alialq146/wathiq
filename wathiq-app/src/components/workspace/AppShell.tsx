"use client";

import React from "react";
import Image from "next/image";
import { Avatar, Button, Icon } from "@/components/ds";
import { PROJECT } from "@/lib/data";
import { useWorkspaceData } from "./WorkspaceDataContext";

export type ScreenId =
  | "overview"
  | "requirements"
  | "analysis"
  | "stakeholders"
  | "rules"
  | "audit";

interface NavEntry {
  id: ScreenId;
  label: string;
  icon: string;
  count?: number;
}

export interface AppShellProps {
  current: ScreenId;
  onNavigate?: (id: ScreenId) => void;
  onNewAnalysis?: () => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  children: React.ReactNode;
  rightRail?: React.ReactNode;
}

const APP_VERSION = "0.7.0";

/** Lightweight anchored popover with a click-catching backdrop. */
function Dropdown({
  open,
  onClose,
  children,
  align = "start",
  placement = "down",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  align?: "start" | "end";
  placement?: "down" | "up";
}) {
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
      <div
        style={{
          position: "absolute",
          top: placement === "down" ? "calc(100% + 6px)" : "auto",
          bottom: placement === "up" ? "calc(100% + 6px)" : "auto",
          insetInlineStart: align === "start" ? 0 : "auto",
          insetInlineEnd: align === "end" ? 0 : "auto",
          zIndex: 41,
          minWidth: 240,
          background: "var(--surface-card)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          padding: 6,
        }}
      >
        {children}
      </div>
    </>
  );
}

/** App frame: right-anchored sidebar (RTL) + topbar. */
export function AppShell({ current, onNavigate, onNewAnalysis, search = "", onSearchChange, children, rightRail }: AppShellProps) {
  const { requirements, source, authEnabled } = useWorkspaceData();
  const [menu, setMenu] = React.useState<null | "project" | "settings">(null);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const toggleMenu = (m: "project" | "settings") => setMenu((cur) => (cur === m ? null : m));

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore — navigate anyway
    }
    window.location.assign("/login");
  };
  const nav: NavEntry[] = [
    { id: "overview", label: "نظرة عامة", icon: "layout-dashboard" },
    { id: "requirements", label: "المتطلبات", icon: "clipboard-list", count: requirements.length },
    { id: "analysis", label: "تحليل وثّق", icon: "sparkles" },
  ];
  const meta: NavEntry[] = [
    { id: "stakeholders", label: "أصحاب المصلحة", icon: "users" },
    { id: "rules", label: "قواعد العمل", icon: "shield-check" },
    { id: "audit", label: "سجل التدقيق", icon: "history" },
  ];

  const NavItem = ({ item }: { item: NavEntry }) => {
    const on = current === item.id;
    return (
      <button
        onClick={() => onNavigate && onNavigate(item.id)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "8px 10px",
          borderRadius: "var(--radius-md)",
          border: "none",
          background: on ? "var(--blue-50)" : "transparent",
          color: on ? "var(--blue-700)" : "var(--text-body)",
          font: `var(--weight-${on ? "semibold" : "medium"}) var(--text-sm)/1 var(--font-sans)`,
          cursor: "pointer",
          transition: "background var(--dur-fast)",
          textAlign: "start",
        }}
        onMouseEnter={(e) => {
          if (!on) e.currentTarget.style.background = "var(--slate-100)";
        }}
        onMouseLeave={(e) => {
          if (!on) e.currentTarget.style.background = "transparent";
        }}
      >
        <Icon name={item.icon} size={17} color={on ? "var(--blue-600)" : "var(--text-muted)"} />
        <span style={{ flex: 1 }}>{item.label}</span>
        {item.count != null && (
          <span
            style={{
              font: "var(--weight-medium) 11px/1 var(--font-mono)",
              color: on ? "var(--blue-600)" : "var(--text-subtle)",
              background: on ? "#fff" : "var(--slate-100)",
              borderRadius: 999,
              padding: "2px 6px",
            }}
          >
            {item.count}
          </span>
        )}
      </button>
    );
  };

  const currentLabel =
    nav.concat(meta).find((n) => n.id === current)?.label || "المتطلبات";

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100%",
        background: "var(--bg-app)",
        overflow: "hidden",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: "var(--sidebar-w)",
          flex: "0 0 var(--sidebar-w)",
          background: "var(--surface-card)",
          borderInlineStart: "1px solid var(--border-default)",
          display: "flex",
          flexDirection: "column",
          padding: "14px 12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 8px 14px" }}>
          <Image
            src="/assets/wathiq-mark.png"
            alt="Wathiq"
            width={30}
            height={30}
            style={{ borderRadius: 7 }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ font: "var(--weight-bold) 16px/1 var(--font-sans)", color: "var(--navy-900)" }}>وثّق</span>
            <span
              style={{
                font: "var(--weight-medium) 10px/1 var(--font-mono)",
                color: "var(--text-subtle)",
                letterSpacing: ".06em",
              }}
            >
              WATHIQ
            </span>
          </div>
        </div>

        {/* Project switcher */}
        <div style={{ position: "relative", marginBottom: 14 }}>
          <button
            onClick={() => toggleMenu("project")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              width: "100%",
              padding: "9px 10px",
              borderRadius: "var(--radius-md)",
              border: `1px solid ${menu === "project" ? "var(--border-strong)" : "var(--border-default)"}`,
              background: "var(--surface-card)",
              cursor: "pointer",
              boxShadow: "var(--shadow-xs)",
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: "var(--navy-800)",
                color: "#fff",
                font: "var(--weight-bold) 11px/1 var(--font-mono)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "0 0 24px",
              }}
            >
              {PROJECT.code}
            </span>
            <div style={{ flex: 1, minWidth: 0, textAlign: "start" }}>
              <div
                style={{
                  font: "var(--weight-semibold) 13px/1.2 var(--font-sans)",
                  color: "var(--text-strong)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {PROJECT.name}
              </div>
              <div style={{ font: "10px/1.2 var(--font-mono)", color: "var(--text-subtle)" }}>#{PROJECT.id}</div>
            </div>
            <Icon name="chevrons-up-down" size={15} color="var(--text-subtle)" />
          </button>

          <Dropdown open={menu === "project"} onClose={() => setMenu(null)}>
            <div style={{ font: "var(--weight-semibold) 10px/1 var(--font-sans)", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-subtle)", padding: "6px 8px 8px" }}>
              المشاريع
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "8px 8px",
                borderRadius: "var(--radius-md)",
                background: "var(--blue-50)",
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: "var(--navy-800)",
                  color: "#fff",
                  font: "var(--weight-bold) 11px/1 var(--font-mono)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "0 0 24px",
                }}
              >
                {PROJECT.code}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: "var(--weight-semibold) 13px/1.2 var(--font-sans)", color: "var(--text-strong)" }}>{PROJECT.name}</div>
                <div style={{ font: "10px/1.2 var(--font-mono)", color: "var(--text-subtle)" }}>#{PROJECT.id} · {requirements.length} متطلب</div>
              </div>
              <Icon name="check" size={15} color="var(--blue-600)" />
            </div>
            <button
              disabled
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                marginTop: 4,
                padding: "8px 8px",
                borderRadius: "var(--radius-md)",
                border: "none",
                background: "transparent",
                color: "var(--text-subtle)",
                font: "13px var(--font-sans)",
                cursor: "not-allowed",
                textAlign: "start",
              }}
            >
              <Icon name="plus" size={15} color="var(--text-subtle)" />
              <span style={{ flex: 1 }}>إضافة مشروع</span>
              <span style={{ font: "10px var(--font-sans)", color: "var(--text-subtle)" }}>قريبًا</span>
            </button>
          </Dropdown>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {nav.map((i) => (
            <NavItem key={i.id} item={i} />
          ))}
        </div>
        <div
          style={{
            font: "var(--weight-semibold) 10px/1 var(--font-sans)",
            letterSpacing: ".06em",
            textTransform: "uppercase",
            color: "var(--text-subtle)",
            padding: "16px 10px 8px",
          }}
        >
          السياق
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {meta.map((i) => (
            <NavItem key={i.id} item={i} />
          ))}
        </div>

        <div
          style={{
            position: "relative",
            marginTop: "auto",
            borderTop: "1px solid var(--border-subtle)",
            paddingTop: 12,
            display: "flex",
            alignItems: "center",
            gap: 9,
          }}
        >
          <Avatar name="سارة العتيبي" size={30} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: "var(--weight-semibold) 12px/1.3 var(--font-sans)", color: "var(--text-strong)" }}>
              سارة العتيبي
            </div>
            <div style={{ font: "10px/1.3 var(--font-sans)", color: "var(--text-subtle)" }}>محللة أعمال أولى</div>
          </div>
          <button
            onClick={() => toggleMenu("settings")}
            aria-label="الإعدادات"
            style={{
              display: "inline-flex",
              padding: 4,
              border: "none",
              borderRadius: "var(--radius-sm)",
              background: menu === "settings" ? "var(--slate-100)" : "transparent",
              cursor: "pointer",
            }}
          >
            <Icon name="settings" size={16} color="var(--text-subtle)" />
          </button>

          <Dropdown open={menu === "settings"} onClose={() => setMenu(null)} align="end" placement="up">
              <div style={{ padding: "8px 8px 10px", borderBottom: "1px solid var(--border-subtle)", marginBottom: 6 }}>
                <div style={{ font: "var(--weight-bold) 13px/1 var(--font-sans)", color: "var(--navy-900)" }}>وثّق · WATHIQ</div>
                <div style={{ font: "11px/1.5 var(--font-sans)", color: "var(--text-subtle)", marginTop: 3 }}>
                  منصّة تحليل الأعمال · الإصدار {APP_VERSION}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 8px",
                  font: "12px/1 var(--font-sans)",
                  color: "var(--text-body)",
                }}
              >
                <Icon name="database" size={14} color={source === "database" ? "var(--green-500)" : "var(--amber-600)"} />
                <span style={{ flex: 1 }}>مصدر البيانات</span>
                <span style={{ font: "var(--weight-semibold) 12px var(--font-sans)", color: source === "database" ? "var(--green-600)" : "var(--amber-600)" }}>
                  {source === "database" ? "قاعدة البيانات" : "بيانات تجريبية"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 8px",
                  font: "12px/1 var(--font-sans)",
                  color: "var(--text-body)",
                }}
              >
                <Icon name="clipboard-list" size={14} color="var(--text-subtle)" />
                <span style={{ flex: 1 }}>عدد المتطلبات</span>
                <span style={{ font: "var(--weight-semibold) 12px var(--font-mono)", color: "var(--text-strong)" }}>{requirements.length}</span>
              </div>
              <button
                onClick={() => { setMenu(null); onNavigate?.("audit"); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  marginTop: 4,
                  padding: "8px 8px",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  background: "transparent",
                  color: "var(--text-body)",
                  font: "13px var(--font-sans)",
                  cursor: "pointer",
                  textAlign: "start",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--slate-100)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Icon name="history" size={15} color="var(--text-muted)" />
                <span style={{ flex: 1 }}>فتح سجل التدقيق</span>
              </button>
              {authEnabled && (
                <button
                  onClick={logout}
                  disabled={loggingOut}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    marginTop: 2,
                    padding: "8px 8px",
                    borderRadius: "var(--radius-md)",
                    border: "none",
                    background: "transparent",
                    color: "var(--status-danger-fg)",
                    font: "13px var(--font-sans)",
                    cursor: loggingOut ? "default" : "pointer",
                    textAlign: "start",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--status-danger-bg)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <Icon
                    name={loggingOut ? "loader-circle" : "log-out"}
                    size={15}
                    color="var(--status-danger-fg)"
                    style={loggingOut ? { animation: "wq-spin 0.7s linear infinite" } : undefined}
                  />
                  <span style={{ flex: 1 }}>{loggingOut ? "جارٍ الخروج…" : "تسجيل الخروج"}</span>
                </button>
              )}
            </Dropdown>
        </div>
      </aside>

      {/* Main column */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header
          style={{
            height: "var(--topbar-h)",
            flex: "0 0 var(--topbar-h)",
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "0 22px",
            borderBottom: "1px solid var(--border-default)",
            background: "color-mix(in srgb, var(--surface-card) 80%, transparent)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              font: "var(--weight-regular) 13px/1 var(--font-sans)",
              color: "var(--text-muted)",
            }}
          >
            <span>{PROJECT.name}</span>
            <Icon name="chevron-left" size={14} color="var(--text-subtle)" />
            <span style={{ color: "var(--text-strong)", fontWeight: "var(--weight-semibold)" as React.CSSProperties["fontWeight"] }}>
              {currentLabel}
            </span>
          </div>
          <div style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <span style={{ position: "absolute", insetInlineStart: 10, display: "inline-flex" }}>
                <Icon name="search" size={15} color="var(--text-subtle)" />
              </span>
              <input
                value={search}
                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                placeholder="ابحث برقم متطلب أو نص…"
                style={{
                  width: 240,
                  height: 34,
                  paddingInlineStart: 32,
                  paddingInlineEnd: search ? 30 : 12,
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-default)",
                  background: "var(--slate-50)",
                  font: "13px var(--font-sans)",
                  color: "var(--text-strong)",
                  outline: "none",
                }}
              />
              {search && (
                <button
                  onClick={() => onSearchChange && onSearchChange("")}
                  aria-label="مسح البحث"
                  style={{
                    position: "absolute",
                    insetInlineEnd: 8,
                    display: "inline-flex",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "var(--text-subtle)",
                  }}
                >
                  <Icon name="x" size={14} />
                </button>
              )}
            </div>
            <Button variant="primary" size="sm" iconStart={<Icon name="sparkles" size={15} />} onClick={onNewAnalysis}>
              تحليل جديد
            </Button>
          </div>
        </header>

        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <main style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>{children}</main>
          {rightRail && (
            <aside
              style={{
                width: "var(--rail-w)",
                flex: "0 0 var(--rail-w)",
                borderInlineStart: "1px solid var(--border-default)",
                background: "var(--surface-card)",
                overflowY: "auto",
              }}
            >
              {rightRail}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
