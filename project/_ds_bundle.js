/* @ds-bundle: {"format":3,"namespace":"WathiqDesignSystem_f0eeb8","components":[{"name":"AIInsightPanel","sourcePath":"components/ba/AIInsightPanel.jsx"},{"name":"ConfidenceMeter","sourcePath":"components/ba/ConfidenceMeter.jsx"},{"name":"PriorityLabel","sourcePath":"components/ba/PriorityLabel.jsx"},{"name":"RequirementCard","sourcePath":"components/ba/RequirementCard.jsx"},{"name":"StakeholderGroup","sourcePath":"components/ba/StakeholderGroup.jsx"},{"name":"StatusBadge","sourcePath":"components/ba/StatusBadge.jsx"},{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/ba/AIInsightPanel.jsx":"0bc4a5d0834e","components/ba/ConfidenceMeter.jsx":"32519893efb5","components/ba/PriorityLabel.jsx":"b17784f7ef1a","components/ba/RequirementCard.jsx":"dd005bda7e24","components/ba/StakeholderGroup.jsx":"209d3efb5dbd","components/ba/StatusBadge.jsx":"b67639e23ca1","components/core/Avatar.jsx":"8a6f961a6026","components/core/Badge.jsx":"bc49499e46b7","components/core/Button.jsx":"b7c0a506afe0","components/core/Card.jsx":"8ec0c38d6a52","components/core/IconButton.jsx":"af258c6e4491","components/core/Tag.jsx":"c8e21a3a5b24","components/forms/Checkbox.jsx":"324197394db3","components/forms/Input.jsx":"a0f1a2e8a538","components/forms/Select.jsx":"9e55dc112256","components/forms/Switch.jsx":"9f58b4305ba5","components/navigation/Tabs.jsx":"3556ee6b7edd","ui_kits/workspace/AnalysisScreen.jsx":"d06cce6e9c82","ui_kits/workspace/AppShell.jsx":"64a4fa22932f","ui_kits/workspace/OverviewScreen.jsx":"8923469d97a0","ui_kits/workspace/RequirementDetailScreen.jsx":"148655bff503","ui_kits/workspace/RequirementsScreen.jsx":"00cc20e650cc","ui_kits/workspace/kit-shared.jsx":"ddaf6cafb779"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.WathiqDesignSystem_f0eeb8 = window.WathiqDesignSystem_f0eeb8 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/ba/ConfidenceMeter.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * AI confidence indicator. Communicates how sure the model is about an
 * extraction or recommendation — central to Wathiq's "no black box" stance.
 * Renders as a labeled track (default) or a compact inline pill.
 */
function ConfidenceMeter({
  value = 0,
  variant = "bar",
  label = "ثقة الذكاء الاصطناعي",
  showValue = true,
  style,
  ...rest
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const color = v >= 75 ? "var(--confidence-high)" : v >= 50 ? "var(--confidence-med)" : "var(--confidence-low)";
  const tier = v >= 75 ? "عالية" : v >= 50 ? "متوسطة" : "منخفضة";
  if (variant === "pill") {
    const bg = v >= 75 ? "var(--teal-50)" : v >= 50 ? "var(--amber-50)" : "var(--red-50)";
    const fg = v >= 75 ? "var(--teal-700)" : v >= 50 ? "var(--amber-600)" : "var(--red-600)";
    return /*#__PURE__*/React.createElement("span", _extends({
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 9px",
        borderRadius: "var(--radius-pill)",
        background: bg,
        color: fg,
        font: "var(--weight-medium) var(--text-xs)/1 var(--font-sans)",
        ...style
      }
    }, rest), /*#__PURE__*/React.createElement("svg", {
      width: "12",
      height: "12",
      viewBox: "0 0 12 12",
      fill: "none"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M6 1.2 7.5 4.3 10.9 4.8 8.4 7.2 9 10.6 6 9 3 10.6 3.6 7.2 1.1 4.8 4.5 4.3Z",
      fill: color
    })), v, "% \xB7 ", tier);
  }
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-medium) var(--text-xs)/1 var(--font-sans)",
      color: "var(--text-muted)"
    }
  }, label), showValue && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-semibold) var(--text-sm)/1 var(--font-mono)",
      color,
      direction: "ltr"
    }
  }, v, "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      borderRadius: 999,
      background: "var(--slate-150)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${v}%`,
      height: "100%",
      borderRadius: 999,
      background: color,
      transition: "width var(--dur-slow) var(--ease-out)"
    }
  })));
}
Object.assign(__ds_scope, { ConfidenceMeter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ba/ConfidenceMeter.jsx", error: String((e && e.message) || e) }); }

// components/ba/AIInsightPanel.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * AI insight / reasoning panel — Wathiq's transparent "no black box" surface.
 * Shows what the AI is doing (reasoning steps), how sure it is (confidence),
 * and what it suggests (recommendations). Teal accent marks AI-authored content.
 */
function AIInsightPanel({
  title = "تحليل وثّق",
  state = "complete",
  confidence,
  summary,
  reasoning = [],
  recommendations = [],
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--teal-200)",
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
      boxShadow: "var(--shadow-sm)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "12px 16px",
      background: "var(--teal-50)",
      borderBottom: "1px solid var(--teal-100)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 26,
      height: 26,
      borderRadius: "var(--radius-sm)",
      background: "var(--teal-500)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "0 0 26px"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "15",
    height: "15",
    viewBox: "0 0 16 16",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 1.5 9.6 5.6 13.7 6.3 10.6 9.3 11.4 13.5 8 11.4 4.6 13.5 5.4 9.3 2.3 6.3 6.4 5.6Z",
    fill: "#fff"
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-semibold) var(--text-base)/1 var(--font-sans)",
      color: "var(--teal-700)"
    }
  }, title), state === "analyzing" && /*#__PURE__*/React.createElement("span", {
    style: {
      marginInlineStart: "auto",
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      font: "var(--weight-medium) var(--text-xs)/1 var(--font-sans)",
      color: "var(--teal-600)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: "var(--teal-500)",
      animation: "wq-pulse 1.1s var(--ease-in-out) infinite"
    }
  }), "\u064A\u062D\u0644\u0651\u0644 \u0627\u0644\u0622\u0646\u2026")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, confidence != null && /*#__PURE__*/React.createElement(__ds_scope.ConfidenceMeter, {
    value: confidence
  }), summary && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      font: "var(--weight-regular) var(--text-base)/1.65 var(--font-sans)",
      color: "var(--text-body)"
    }
  }, summary), reasoning.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-semibold) var(--text-2xs)/1 var(--font-sans)",
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      color: "var(--text-subtle)",
      marginBottom: 10
    }
  }, "\u062E\u0637\u0648\u0627\u062A \u0627\u0644\u062A\u062D\u0644\u064A\u0644"), reasoning.map((step, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 10,
      paddingBottom: i === reasoning.length - 1 ? 0 : 12,
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 18,
      flex: "0 0 18px",
      borderRadius: "50%",
      background: "var(--teal-50)",
      border: "1.5px solid var(--teal-400)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      font: "var(--weight-semibold) 10px/1 var(--font-mono)",
      color: "var(--teal-700)"
    }
  }, i + 1), i !== reasoning.length - 1 && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1.5,
      flex: 1,
      background: "var(--teal-100)",
      marginTop: 3
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-regular) var(--text-sm)/1.55 var(--font-sans)",
      color: "var(--text-body)",
      paddingTop: 1
    }
  }, step)))), recommendations.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-semibold) var(--text-2xs)/1 var(--font-sans)",
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      color: "var(--text-subtle)"
    }
  }, "\u062A\u0648\u0635\u064A\u0627\u062A"), recommendations.map((rec, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 9,
      alignItems: "flex-start",
      padding: "10px 12px",
      background: "var(--slate-50)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-md)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--teal-600)",
      fontSize: 14,
      lineHeight: "1.4",
      flex: "0 0 auto"
    }
  }, "\u2192"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-regular) var(--text-sm)/1.55 var(--font-sans)",
      color: "var(--text-body)"
    }
  }, rec))))));
}
Object.assign(__ds_scope, { AIInsightPanel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ba/AIInsightPanel.jsx", error: String((e && e.message) || e) }); }

// components/ba/PriorityLabel.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const LEVELS = {
  critical: {
    c: "var(--priority-critical)",
    ar: "حرجة",
    en: "Critical",
    bars: 4
  },
  high: {
    c: "var(--priority-high)",
    ar: "عالية",
    en: "High",
    bars: 3
  },
  medium: {
    c: "var(--priority-medium)",
    ar: "متوسطة",
    en: "Medium",
    bars: 2
  },
  low: {
    c: "var(--priority-low)",
    ar: "منخفضة",
    en: "Low",
    bars: 1
  }
};

/** Priority label with a signal-bar glyph. Use on requirements and tasks. */
function PriorityLabel({
  level = "medium",
  lang = "ar",
  showLabel = true,
  style,
  ...rest
}) {
  const l = LEVELS[level] || LEVELS.medium;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      font: "var(--weight-medium) var(--text-sm)/1 var(--font-sans)",
      color: "var(--text-body)",
      ...style
    },
    title: l[lang === "en" ? "en" : "ar"]
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "flex-end",
      gap: 1.5,
      height: 12
    }
  }, [1, 2, 3, 4].map(i => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: 3,
      height: 3 + i * 2.5,
      borderRadius: 1,
      background: i <= l.bars ? l.c : "var(--slate-200)"
    }
  }))), showLabel && (lang === "en" ? l.en : l.ar));
}
Object.assign(__ds_scope, { PriorityLabel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ba/PriorityLabel.jsx", error: String((e && e.message) || e) }); }

// components/ba/StatusBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Requirement lifecycle status badge. Encodes the BA workflow states with
 * a consistent dot + bilingual-friendly label.
 */
const STATUS = {
  draft: {
    fg: "var(--status-neutral-fg)",
    bg: "var(--status-neutral-bg)",
    dot: "var(--slate-500)",
    ar: "مسودة",
    en: "Draft"
  },
  analyzing: {
    fg: "var(--status-info-fg)",
    bg: "var(--status-info-bg)",
    dot: "var(--blue-600)",
    ar: "قيد التحليل",
    en: "Analyzing"
  },
  review: {
    fg: "var(--status-warning-fg)",
    bg: "var(--status-warning-bg)",
    dot: "var(--amber-500)",
    ar: "قيد المراجعة",
    en: "In Review"
  },
  needs_info: {
    fg: "var(--status-ai-fg)",
    bg: "var(--status-ai-bg)",
    dot: "var(--teal-500)",
    ar: "بحاجة لمعلومات",
    en: "Needs Info"
  },
  approved: {
    fg: "var(--status-success-fg)",
    bg: "var(--status-success-bg)",
    dot: "var(--green-500)",
    ar: "معتمد",
    en: "Approved"
  },
  blocked: {
    fg: "var(--status-danger-fg)",
    bg: "var(--status-danger-bg)",
    dot: "var(--red-500)",
    ar: "محظور",
    en: "Blocked"
  }
};
function StatusBadge({
  status = "draft",
  lang = "ar",
  children,
  style,
  ...rest
}) {
  const s = STATUS[status] || STATUS.draft;
  const label = children || (lang === "en" ? s.en : s.ar);
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 10px",
      borderRadius: "var(--radius-pill)",
      font: "var(--weight-medium) var(--text-xs)/1 var(--font-sans)",
      color: s.fg,
      background: s.bg,
      whiteSpace: "nowrap",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: s.dot
    }
  }), label);
}
StatusBadge.STATUSES = Object.keys(STATUS);
Object.assign(__ds_scope, { StatusBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ba/StatusBadge.jsx", error: String((e && e.message) || e) }); }

// components/ba/RequirementCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Requirement summary card — the core object of the Wathiq workspace.
 * Shows the requirement ID (FR-xxx), title, status, priority, AI confidence,
 * and a meta footer (criteria count, open questions, assignees).
 */
function RequirementCard({
  id,
  title,
  description,
  status = "draft",
  priority = "medium",
  confidence,
  criteria,
  openQuestions,
  selected = false,
  onClick,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    style: {
      background: "var(--surface-card)",
      border: `1px solid ${selected ? "var(--primary)" : "var(--border-default)"}`,
      boxShadow: selected ? "0 0 0 3px var(--focus-ring)" : "var(--shadow-xs)",
      borderRadius: "var(--radius-lg)",
      padding: "16px 18px",
      cursor: onClick ? "pointer" : "default",
      transition: "box-shadow var(--dur-base) var(--ease-out), border-color var(--dur-base)",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      ...style
    },
    onMouseEnter: e => {
      if (onClick && !selected) {
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
        e.currentTarget.style.borderColor = "var(--border-strong)";
      }
    },
    onMouseLeave: e => {
      if (onClick && !selected) {
        e.currentTarget.style.boxShadow = "var(--shadow-xs)";
        e.currentTarget.style.borderColor = "var(--border-default)";
      }
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 5,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, id && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--font-mono-id)",
      color: "var(--blue-700)",
      background: "var(--blue-50)",
      padding: "2px 7px",
      borderRadius: "var(--radius-xs)",
      direction: "ltr"
    }
  }, id), /*#__PURE__*/React.createElement(__ds_scope.PriorityLabel, {
    level: priority,
    showLabel: false
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-semibold) var(--text-h4)/1.35 var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, title)), /*#__PURE__*/React.createElement(__ds_scope.StatusBadge, {
    status: status
  })), description && /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--weight-regular) var(--text-sm)/1.6 var(--font-sans)",
      color: "var(--text-muted)",
      margin: 0,
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden"
    }
  }, description), confidence != null && /*#__PURE__*/React.createElement(__ds_scope.ConfidenceMeter, {
    value: confidence
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      paddingTop: 4,
      borderTop: "1px solid var(--border-subtle)",
      marginTop: 2,
      font: "var(--weight-regular) var(--text-xs)/1 var(--font-sans)",
      color: "var(--text-muted)"
    }
  }, criteria != null && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--teal-600)"
    }
  }, "\u2713"), " ", criteria, " \u0645\u0639\u0627\u064A\u064A\u0631 \u0642\u0628\u0648\u0644"), openQuestions != null && openQuestions > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      color: "var(--amber-600)"
    }
  }, "\u25CF ", openQuestions, " \u0623\u0633\u0626\u0644\u0629 \u0645\u0641\u062A\u0648\u062D\u0629")));
}
Object.assign(__ds_scope, { RequirementCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ba/RequirementCard.jsx", error: String((e && e.message) || e) }); }

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Avatar with initials fallback and deterministic tint. */
function Avatar({
  name = "",
  src,
  size = 32,
  style,
  ...rest
}) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("");
  const tints = [["var(--blue-100)", "var(--blue-700)"], ["var(--teal-100)", "var(--teal-700)"], ["var(--amber-100)", "var(--amber-600)"], ["var(--slate-200)", "var(--slate-700)"], ["var(--violet-50)", "var(--violet-500)"]];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % tints.length;
  const [bg, fg] = tints[h];
  return /*#__PURE__*/React.createElement("span", _extends({
    title: name,
    style: {
      width: size,
      height: size,
      flex: `0 0 ${size}px`,
      borderRadius: "50%",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: src ? "transparent" : bg,
      color: fg,
      font: `var(--weight-semibold) ${Math.round(size * 0.4)}px/1 var(--font-sans)`,
      overflow: "hidden",
      boxShadow: "inset 0 0 0 1px rgba(13,22,41,0.06)",
      ...style
    }
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : initials);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/ba/StakeholderGroup.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Overlapping avatar stack for stakeholders / assignees, with +N overflow. */
function StakeholderGroup({
  people = [],
  max = 4,
  size = 28,
  label,
  style,
  ...rest
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      flexDirection: "row-reverse",
      paddingInlineStart: (shown.length - 1) * (size * 0.36)
    }
  }, shown.map((p, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      marginInlineStart: i === 0 ? 0 : -(size * 0.36),
      borderRadius: "50%",
      boxShadow: "0 0 0 2px var(--surface-card)",
      display: "inline-flex"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: typeof p === "string" ? p : p.name,
    src: typeof p === "object" ? p.src : undefined,
    size: size
  }))), extra > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      marginInlineStart: -(size * 0.36),
      width: size,
      height: size,
      borderRadius: "50%",
      background: "var(--slate-100)",
      color: "var(--text-muted)",
      font: `var(--weight-semibold) ${Math.round(size * 0.38)}px/1 var(--font-mono)`,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 0 0 2px var(--surface-card)",
      direction: "ltr"
    }
  }, "+", extra)), label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-regular) var(--text-sm)/1 var(--font-sans)",
      color: "var(--text-muted)"
    }
  }, label));
}
Object.assign(__ds_scope, { StakeholderGroup });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ba/StakeholderGroup.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Small status/label pill. Tones map to the semantic status palette. */
function Badge({
  children,
  tone = "neutral",
  variant = "soft",
  dot = false,
  style,
  ...rest
}) {
  const tones = {
    neutral: {
      fg: "var(--status-neutral-fg)",
      bg: "var(--status-neutral-bg)",
      dot: "var(--slate-500)"
    },
    info: {
      fg: "var(--status-info-fg)",
      bg: "var(--status-info-bg)",
      dot: "var(--blue-600)"
    },
    success: {
      fg: "var(--status-success-fg)",
      bg: "var(--status-success-bg)",
      dot: "var(--green-500)"
    },
    warning: {
      fg: "var(--status-warning-fg)",
      bg: "var(--status-warning-bg)",
      dot: "var(--amber-500)"
    },
    danger: {
      fg: "var(--status-danger-fg)",
      bg: "var(--status-danger-bg)",
      dot: "var(--red-500)"
    },
    ai: {
      fg: "var(--status-ai-fg)",
      bg: "var(--status-ai-bg)",
      dot: "var(--teal-500)"
    }
  };
  const t = tones[tone] || tones.neutral;
  const solid = variant === "solid";
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "3px 9px",
      borderRadius: "var(--radius-pill)",
      font: "var(--weight-medium) var(--text-xs)/1 var(--font-sans)",
      color: solid ? "#fff" : t.fg,
      background: solid ? t.dot : t.bg,
      whiteSpace: "nowrap",
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: solid ? "#fff" : t.dot
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Wathiq primary action button. Calm, enterprise styling — no gradients,
 * subtle shadow on solid variants, 8px radius.
 */
function Button({
  children,
  variant = "primary",
  size = "md",
  iconStart,
  iconEnd,
  fullWidth = false,
  disabled = false,
  type = "button",
  style,
  ...rest
}) {
  const sizes = {
    sm: {
      padding: "6px 12px",
      font: "13px",
      height: 30,
      gap: 6,
      radius: "var(--radius-sm)"
    },
    md: {
      padding: "8px 16px",
      font: "14px",
      height: 36,
      gap: 7,
      radius: "var(--radius-md)"
    },
    lg: {
      padding: "11px 20px",
      font: "15px",
      height: 44,
      gap: 8,
      radius: "var(--radius-md)"
    }
  };
  const s = sizes[size] || sizes.md;
  const variants = {
    primary: {
      background: "var(--primary)",
      color: "#fff",
      border: "1px solid var(--primary)",
      boxShadow: "var(--shadow-xs)"
    },
    secondary: {
      background: "var(--surface-card)",
      color: "var(--text-strong)",
      border: "1px solid var(--border-strong)",
      boxShadow: "var(--shadow-xs)"
    },
    ghost: {
      background: "transparent",
      color: "var(--text-body)",
      border: "1px solid transparent"
    },
    brand: {
      background: "var(--brand)",
      color: "#fff",
      border: "1px solid var(--brand)",
      boxShadow: "var(--shadow-xs)"
    },
    danger: {
      background: "var(--red-500)",
      color: "#fff",
      border: "1px solid var(--red-500)"
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: s.gap,
      height: s.height,
      padding: s.padding,
      font: `var(--weight-medium) ${s.font}/1 var(--font-sans)`,
      borderRadius: s.radius,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      width: fullWidth ? "100%" : undefined,
      transition: "background var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast), transform var(--dur-fast)",
      whiteSpace: "nowrap",
      ...(variants[variant] || variants.primary),
      ...style
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = "translateY(0.5px)";
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = "translateY(0)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = "translateY(0)";
    }
  }, rest), iconStart, children, iconEnd);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Surface container. The 12px-radius card is the signature Wathiq surface. */
function Card({
  children,
  padding = "lg",
  interactive = false,
  elevation = "sm",
  style,
  ...rest
}) {
  const pads = {
    none: 0,
    sm: "14px",
    md: "var(--pad-card)",
    lg: "var(--pad-card-lg)"
  };
  const shadows = {
    none: "none",
    sm: "var(--shadow-sm)",
    md: "var(--shadow-md)",
    lg: "var(--shadow-lg)"
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-lg)",
      padding: pads[padding] ?? pads.lg,
      boxShadow: shadows[elevation] ?? shadows.sm,
      transition: "box-shadow var(--dur-base) var(--ease-out), border-color var(--dur-base)",
      cursor: interactive ? "pointer" : "default",
      ...style
    },
    onMouseEnter: e => {
      if (interactive) {
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
        e.currentTarget.style.borderColor = "var(--border-strong)";
      }
    },
    onMouseLeave: e => {
      if (interactive) {
        e.currentTarget.style.boxShadow = shadows[elevation] ?? shadows.sm;
        e.currentTarget.style.borderColor = "var(--border-default)";
      }
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Square icon-only button. Pass a Lucide <i data-lucide> or an SVG as children. */
function IconButton({
  children,
  variant = "ghost",
  size = "md",
  label,
  disabled = false,
  style,
  ...rest
}) {
  const dims = {
    sm: 28,
    md: 34,
    lg: 40
  };
  const d = dims[size] || dims.md;
  const variants = {
    ghost: {
      background: "transparent",
      color: "var(--text-muted)",
      border: "1px solid transparent"
    },
    soft: {
      background: "var(--slate-100)",
      color: "var(--text-body)",
      border: "1px solid transparent"
    },
    outline: {
      background: "var(--surface-card)",
      color: "var(--text-body)",
      border: "1px solid var(--border-default)"
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    title: label,
    disabled: disabled,
    style: {
      width: d,
      height: d,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "var(--radius-md)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      transition: "background var(--dur-fast) var(--ease-out), color var(--dur-fast)",
      ...(variants[variant] || variants.ghost),
      ...style
    },
    onMouseEnter: e => {
      if (variant === "ghost") e.currentTarget.style.background = "var(--slate-100)";
    },
    onMouseLeave: e => {
      if (variant === "ghost") e.currentTarget.style.background = "transparent";
    }
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Outlined keyword tag — taxonomy, modules, removable filters. */
function Tag({
  children,
  onRemove,
  color = "slate",
  style,
  ...rest
}) {
  const colors = {
    slate: {
      fg: "var(--slate-600)",
      bd: "var(--border-default)",
      bg: "var(--surface-card)"
    },
    blue: {
      fg: "var(--blue-700)",
      bd: "var(--blue-200)",
      bg: "var(--blue-50)"
    },
    teal: {
      fg: "var(--teal-700)",
      bd: "var(--teal-200)",
      bg: "var(--teal-50)"
    }
  };
  const c = colors[color] || colors.slate;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "3px 8px 3px 10px",
      borderRadius: "var(--radius-sm)",
      font: "var(--weight-medium) var(--text-xs)/1.4 var(--font-sans)",
      color: c.fg,
      background: c.bg,
      border: `1px solid ${c.bd}`,
      ...style
    }
  }, rest), children, onRemove && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onRemove,
    "aria-label": "\u0625\u0632\u0627\u0644\u0629",
    style: {
      display: "inline-flex",
      border: "none",
      background: "transparent",
      cursor: "pointer",
      color: "var(--text-subtle)",
      padding: 0,
      lineHeight: 0,
      fontSize: 14
    }
  }, "\xD7"));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Checkbox with label. Use for acceptance-criteria checklists and filters. */
function Checkbox({
  label,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  id,
  style,
  ...rest
}) {
  const autoId = React.useId();
  const cbId = id || autoId;
  const [internal, setInternal] = React.useState(defaultChecked || false);
  const on = checked !== undefined ? checked : internal;
  const toggle = e => {
    if (disabled) return;
    if (checked === undefined) setInternal(e.target.checked);
    onChange && onChange(e);
  };
  return /*#__PURE__*/React.createElement("label", _extends({
    htmlFor: cbId,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 9,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.55 : 1,
      font: "var(--weight-regular) var(--text-base)/1.4 var(--font-sans)",
      color: "var(--text-body)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 18,
      flex: "0 0 18px",
      borderRadius: "var(--radius-xs)",
      border: `1.5px solid ${on ? "var(--primary)" : "var(--border-strong)"}`,
      background: on ? "var(--primary)" : "var(--surface-card)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "background var(--dur-fast), border-color var(--dur-fast)"
    }
  }, on && /*#__PURE__*/React.createElement("svg", {
    width: "11",
    height: "11",
    viewBox: "0 0 12 12",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2.5 6.2L4.8 8.5L9.5 3.5",
    stroke: "#fff",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), /*#__PURE__*/React.createElement("input", {
    id: cbId,
    type: "checkbox",
    checked: on,
    onChange: toggle,
    disabled: disabled,
    style: {
      position: "absolute",
      opacity: 0,
      width: 0,
      height: 0
    }
  }), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Text input with optional label, leading icon, and helper/error text. */
function Input({
  label,
  hint,
  error,
  iconStart,
  size = "md",
  id,
  style,
  containerStyle,
  ...rest
}) {
  const autoId = React.useId();
  const inputId = id || autoId;
  const sizes = {
    sm: {
      h: 32,
      f: "13px"
    },
    md: {
      h: 38,
      f: "14px"
    },
    lg: {
      h: 44,
      f: "15px"
    }
  };
  const s = sizes[size] || sizes.md;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      ...containerStyle
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      font: "var(--weight-medium) var(--text-sm)/1 var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center"
    }
  }, iconStart && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      insetInlineStart: 11,
      display: "inline-flex",
      color: "var(--text-subtle)",
      pointerEvents: "none"
    }
  }, iconStart), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    style: {
      width: "100%",
      height: s.h,
      padding: iconStart ? "0 12px 0 36px" : "0 12px",
      paddingInlineStart: iconStart ? 36 : 12,
      font: `var(--weight-regular) ${s.f}/1 var(--font-sans)`,
      color: "var(--text-strong)",
      background: "var(--surface-card)",
      border: `1px solid ${error ? "var(--red-500)" : "var(--border-strong)"}`,
      borderRadius: "var(--radius-md)",
      outline: "none",
      transition: "border-color var(--dur-fast), box-shadow var(--dur-fast)",
      ...style
    },
    onFocus: e => {
      e.target.style.borderColor = error ? "var(--red-500)" : "var(--border-focus)";
      e.target.style.boxShadow = `0 0 0 3px ${error ? "rgba(217,45,69,0.18)" : "var(--focus-ring)"}`;
    },
    onBlur: e => {
      e.target.style.borderColor = error ? "var(--red-500)" : "var(--border-strong)";
      e.target.style.boxShadow = "none";
    },
    "aria-invalid": !!error
  }, rest))), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-regular) var(--text-xs)/1.4 var(--font-sans)",
      color: error ? "var(--red-600)" : "var(--text-muted)"
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Native select styled to match Wathiq inputs. */
function Select({
  label,
  hint,
  options = [],
  size = "md",
  id,
  style,
  containerStyle,
  ...rest
}) {
  const autoId = React.useId();
  const selId = id || autoId;
  const sizes = {
    sm: 32,
    md: 38,
    lg: 44
  };
  const h = sizes[size] || sizes.md;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      ...containerStyle
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: selId,
    style: {
      font: "var(--weight-medium) var(--text-sm)/1 var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: selId,
    style: {
      width: "100%",
      height: h,
      padding: "0 12px",
      paddingInlineEnd: 34,
      font: "var(--weight-regular) var(--text-base)/1 var(--font-sans)",
      color: "var(--text-strong)",
      background: "var(--surface-card)",
      border: "1px solid var(--border-strong)",
      borderRadius: "var(--radius-md)",
      appearance: "none",
      cursor: "pointer",
      outline: "none",
      ...style
    },
    onFocus: e => {
      e.target.style.borderColor = "var(--border-focus)";
      e.target.style.boxShadow = "0 0 0 3px var(--focus-ring)";
    },
    onBlur: e => {
      e.target.style.borderColor = "var(--border-strong)";
      e.target.style.boxShadow = "none";
    }
  }, rest), options.map(o => {
    const val = typeof o === "string" ? o : o.value;
    const lab = typeof o === "string" ? o : o.label;
    return /*#__PURE__*/React.createElement("option", {
      key: val,
      value: val
    }, lab);
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      insetInlineEnd: 12,
      pointerEvents: "none",
      color: "var(--text-subtle)",
      fontSize: 12
    }
  }, "\u25BE")), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-regular) var(--text-xs)/1.4 var(--font-sans)",
      color: "var(--text-muted)"
    }
  }, hint));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Toggle switch for binary settings. */
function Switch({
  checked,
  defaultChecked,
  onChange,
  label,
  disabled = false,
  id,
  style,
  ...rest
}) {
  const autoId = React.useId();
  const swId = id || autoId;
  const [internal, setInternal] = React.useState(defaultChecked || false);
  const on = checked !== undefined ? checked : internal;
  const toggle = () => {
    if (disabled) return;
    const next = !on;
    if (checked === undefined) setInternal(next);
    onChange && onChange(next);
  };
  return /*#__PURE__*/React.createElement("label", _extends({
    htmlFor: swId,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.55 : 1,
      font: "var(--weight-regular) var(--text-base)/1 var(--font-sans)",
      color: "var(--text-body)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("button", {
    id: swId,
    type: "button",
    role: "switch",
    "aria-checked": on,
    onClick: toggle,
    disabled: disabled,
    style: {
      width: 36,
      height: 20,
      flex: "0 0 36px",
      borderRadius: 999,
      border: "none",
      padding: 2,
      background: on ? "var(--primary)" : "var(--slate-300)",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "background var(--dur-base) var(--ease-out)",
      display: "flex",
      justifyContent: on ? "flex-end" : "flex-start"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 16,
      borderRadius: "50%",
      background: "#fff",
      boxShadow: "var(--shadow-xs)",
      transition: "all var(--dur-base) var(--ease-out)"
    }
  })), label);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Underline tab strip. Controlled via value/onChange. */
function Tabs({
  items = [],
  value,
  onChange,
  style,
  ...rest
}) {
  const [internal, setInternal] = React.useState(items[0]?.id);
  const active = value !== undefined ? value : internal;
  const select = id => {
    if (value === undefined) setInternal(id);
    onChange && onChange(id);
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist",
    style: {
      display: "flex",
      gap: 4,
      borderBottom: "1px solid var(--border-default)",
      ...style
    }
  }, rest), items.map(it => {
    const on = it.id === active;
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      role: "tab",
      "aria-selected": on,
      onClick: () => select(it.id),
      style: {
        position: "relative",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        padding: "10px 12px",
        marginBottom: -1,
        font: `var(--weight-${on ? "semibold" : "medium"}) var(--text-base)/1 var(--font-sans)`,
        color: on ? "var(--text-strong)" : "var(--text-muted)",
        borderBottom: `2px solid ${on ? "var(--primary)" : "transparent"}`,
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        transition: "color var(--dur-fast)"
      }
    }, it.label, it.count != null && /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--weight-medium) var(--text-2xs)/1 var(--font-mono)",
        color: on ? "var(--primary)" : "var(--text-subtle)",
        background: on ? "var(--blue-50)" : "var(--slate-100)",
        borderRadius: "var(--radius-pill)",
        padding: "2px 6px"
      }
    }, it.count));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/AnalysisScreen.jsx
try { (() => {
/* AI Analysis screen — transparent pipeline: upload → analyzing → results.
   Showcases progress, live reasoning, confidence, and recommendations. */
function AnalysisScreen() {
  const STEPS = [{
    label: "قراءة المستند واستخراج النص",
    icon: "file-text"
  }, {
    label: "تحديد الجهات الفاعلة والنطاق",
    icon: "users"
  }, {
    label: "استخراج المتطلبات الوظيفية",
    icon: "clipboard-list"
  }, {
    label: "اشتقاق معايير القبول",
    icon: "check-circle"
  }, {
    label: "مطابقة قواعد العمل والسياسات",
    icon: "shield-check"
  }, {
    label: "رصد المعلومات الناقصة والأسئلة",
    icon: "message-circle-question"
  }];
  const [phase, setPhase] = React.useState("idle"); // idle | running | done
  const [active, setActive] = React.useState(0);
  const run = () => {
    setPhase("running");
    setActive(0);
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      if (i >= STEPS.length) {
        clearInterval(t);
        setActive(STEPS.length);
        setTimeout(() => setPhase("done"), 500);
      } else setActive(i);
    }, 750);
  };
  const reset = () => {
    setPhase("idle");
    setActive(0);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "28px",
      maxWidth: 760,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: "var(--weight-semibold) var(--text-h1)/1.2 var(--font-sans)",
      color: "var(--text-strong)",
      margin: "0 0 6px"
    }
  }, "\u062A\u062D\u0644\u064A\u0644 \u0648\u062B\u0651\u0642"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "14px/1.5 var(--font-sans)",
      color: "var(--text-muted)",
      margin: "0 0 24px"
    }
  }, "\u0643\u0644 \u062E\u0637\u0648\u0629 \u0634\u0641\u0651\u0627\u0641\u0629 \u2014 \u062A\u0631\u0649 \u0645\u0627 \u064A\u0642\u0631\u0623\u0647 \u0648\u062B\u0651\u0642\u060C \u0648\u0643\u064A\u0641 \u064A\u0633\u062A\u0646\u062A\u062C\u060C \u0648\u0628\u0623\u064A \u062F\u0631\u062C\u0629 \u062B\u0642\u0629."), phase === "idle" && /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1.5px dashed var(--border-strong)",
      borderRadius: "var(--radius-xl)",
      padding: "44px 24px",
      textAlign: "center",
      background: "var(--surface-card)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 52,
      height: 52,
      borderRadius: "var(--radius-lg)",
      background: "var(--blue-50)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file-up",
    size: 26,
    color: "var(--blue-600)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-semibold) 17px/1.4 var(--font-sans)",
      color: "var(--text-strong)",
      marginBottom: 6
    }
  }, "\u0627\u0631\u0641\u0639 \u0648\u062B\u064A\u0642\u0629 \u0627\u0644\u0645\u062A\u0637\u0644\u0628\u0627\u062A"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "13px/1.6 var(--font-sans)",
      color: "var(--text-muted)",
      marginBottom: 18,
      maxWidth: 380,
      marginInline: "auto"
    }
  }, "PDF \u0623\u0648 Word \u0623\u0648 \u0646\u0635 \u2014 \u0633\u064A\u0633\u062A\u062E\u0631\u062C \u0648\u062B\u0651\u0642 \u0627\u0644\u0645\u062A\u0637\u0644\u0628\u0627\u062A \u0648\u0645\u0639\u0627\u064A\u064A\u0631 \u0627\u0644\u0642\u0628\u0648\u0644 \u0648\u0642\u0648\u0627\u0639\u062F \u0627\u0644\u0639\u0645\u0644 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    iconStart: /*#__PURE__*/React.createElement(Icon, {
      name: "sparkles",
      size: 16
    }),
    onClick: run
  }, "\u0627\u0628\u062F\u0623 \u0627\u0644\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    iconStart: /*#__PURE__*/React.createElement(Icon, {
      name: "upload",
      size: 16
    })
  }, "\u0627\u062E\u062A\u064A\u0627\u0631 \u0645\u0644\u0641")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      font: "12px var(--font-mono)",
      color: "var(--text-subtle)",
      direction: "ltr"
    }
  }, "requirements-v2.3.docx \xB7 14 pages")), phase !== "idle" && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      borderRadius: "var(--radius-sm)",
      background: "var(--teal-500)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "0 0 30px"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 17,
    color: "#fff"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-semibold) 15px/1.2 var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, phase === "done" ? "اكتمل التحليل" : "جارٍ التحليل…"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "12px var(--font-mono)",
      color: "var(--text-subtle)",
      direction: "ltr"
    }
  }, "requirements-v2.3.docx")), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-semibold) 14px/1 var(--font-mono)",
      color: "var(--teal-600)",
      direction: "ltr"
    }
  }, Math.round(Math.min(active, STEPS.length) / STEPS.length * 100), "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      borderRadius: 999,
      background: "var(--slate-150)",
      overflow: "hidden",
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${Math.min(active, STEPS.length) / STEPS.length * 100}%`,
      height: "100%",
      background: "var(--teal-500)",
      borderRadius: 999,
      transition: "width var(--dur-slow) var(--ease-out)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 0
    }
  }, STEPS.map((s, i) => {
    const state = i < active ? "done" : i === active ? "active" : "todo";
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "8px 0",
        opacity: state === "todo" ? 0.45 : 1,
        transition: "opacity var(--dur-base)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 24,
        height: 24,
        flex: "0 0 24px",
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: state === "done" ? "var(--teal-500)" : state === "active" ? "var(--teal-50)" : "var(--slate-100)",
        border: state === "active" ? "1.5px solid var(--teal-400)" : "none"
      }
    }, state === "done" ? /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 13,
      color: "#fff",
      strokeWidth: 3
    }) : state === "active" ? /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "var(--teal-500)",
        animation: "wq-pulse 1.1s var(--ease-in-out) infinite"
      }
    }) : /*#__PURE__*/React.createElement(Icon, {
      name: s.icon,
      size: 13,
      color: "var(--text-subtle)"
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        font: `var(--weight-${state === "active" ? "semibold" : "regular"}) 14px/1.4 var(--font-sans)`,
        color: state === "todo" ? "var(--text-muted)" : "var(--text-body)"
      }
    }, s.label), state === "active" && /*#__PURE__*/React.createElement("span", {
      style: {
        marginInlineStart: "auto",
        font: "11px var(--font-sans)",
        color: "var(--teal-600)"
      }
    }, "\u064A\u0639\u0645\u0644\u2026"));
  }))), phase === "done" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 12
    }
  }, [{
    n: 6,
    l: "متطلبات",
    c: "var(--blue-600)"
  }, {
    n: 28,
    l: "معايير قبول",
    c: "var(--teal-600)"
  }, {
    n: 9,
    l: "قواعد عمل",
    c: "var(--navy-700)"
  }, {
    n: 5,
    l: "أسئلة مفتوحة",
    c: "var(--amber-600)"
  }].map(m => /*#__PURE__*/React.createElement(Card, {
    key: m.l,
    padding: "sm",
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: `var(--weight-bold) 26px/1 var(--font-sans)`,
      color: m.c
    }
  }, m.n), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "12px var(--font-sans)",
      color: "var(--text-muted)",
      marginTop: 4
    }
  }, m.l)))), /*#__PURE__*/React.createElement(AIInsightPanel, {
    confidence: 84,
    summary: "\u0627\u0633\u062A\u062E\u0631\u062C\u062A \u0666 \u0645\u062A\u0637\u0644\u0628\u0627\u062A \u0648\u0662\u0668 \u0645\u0639\u064A\u0627\u0631 \u0642\u0628\u0648\u0644 \u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u0646\u062F. \u0645\u062A\u0637\u0644\u0628\u0627\u0646 \u0628\u062D\u0627\u062C\u0629 \u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0625\u0636\u0627\u0641\u064A\u0629 \u0642\u0628\u0644 \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F.",
    reasoning: ["صُنّفت ٤ متطلبات وظيفية ومتطلبَا أداء غير وظيفيين.", "رُبطت ٩ قواعد عمل بمصادرها التنظيمية.", "رُصدت ٥ فجوات معلومات تتطلب توضيحًا من أصحاب المصلحة."],
    recommendations: ["راجع المتطلب FR-033 — ثقة منخفضة (٥٢٪) بسبب غموض الصلاحيات.", "وجّه الأسئلة الخمسة المفتوحة لأصحاب المصلحة المعنيين."]
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    iconStart: /*#__PURE__*/React.createElement(Icon, {
      name: "rotate-ccw",
      size: 15
    }),
    onClick: reset,
    style: {
      alignSelf: "flex-start"
    }
  }, "\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u062D\u0644\u064A\u0644"))));
}
window.AnalysisScreen = AnalysisScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/AnalysisScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/AppShell.jsx
try { (() => {
/* App frame: right-anchored sidebar (RTL) + topbar. */
function AppShell({
  current,
  onNavigate,
  children,
  rightRail
}) {
  const nav = [{
    id: "overview",
    label: "نظرة عامة",
    icon: "layout-dashboard"
  }, {
    id: "requirements",
    label: "المتطلبات",
    icon: "clipboard-list",
    count: REQUIREMENTS.length
  }, {
    id: "analysis",
    label: "تحليل وثّق",
    icon: "sparkles"
  }];
  const meta = [{
    id: "stakeholders",
    label: "أصحاب المصلحة",
    icon: "users"
  }, {
    id: "rules",
    label: "قواعد العمل",
    icon: "shield-check"
  }, {
    id: "audit",
    label: "سجل التدقيق",
    icon: "history"
  }];
  const NavItem = ({
    item
  }) => {
    const on = current === item.id;
    return /*#__PURE__*/React.createElement("button", {
      onClick: () => onNavigate && onNavigate(item.id),
      style: {
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
        textAlign: "start"
      },
      onMouseEnter: e => {
        if (!on) e.currentTarget.style.background = "var(--slate-100)";
      },
      onMouseLeave: e => {
        if (!on) e.currentTarget.style.background = "transparent";
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: item.icon,
      size: 17,
      color: on ? "var(--blue-600)" : "var(--text-muted)"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, item.label), item.count != null && /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--weight-medium) 11px/1 var(--font-mono)",
        color: on ? "var(--blue-600)" : "var(--text-subtle)",
        background: on ? "#fff" : "var(--slate-100)",
        borderRadius: 999,
        padding: "2px 6px"
      }
    }, item.count));
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      height: "100vh",
      width: "100%",
      background: "var(--bg-app)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("aside", {
    style: {
      width: "var(--sidebar-w)",
      flex: "0 0 var(--sidebar-w)",
      background: "var(--surface-card)",
      borderInlineStart: "1px solid var(--border-default)",
      display: "flex",
      flexDirection: "column",
      padding: "14px 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "4px 8px 14px"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/wathiq-mark.png",
    alt: "Wathiq",
    style: {
      width: 30,
      height: 30,
      borderRadius: 7
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-bold) 16px/1 var(--font-sans)",
      color: "var(--navy-900)"
    }
  }, "\u0648\u062B\u0651\u0642"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-medium) 10px/1 var(--font-mono)",
      color: "var(--text-subtle)",
      letterSpacing: ".06em"
    }
  }, "WATHIQ"))), /*#__PURE__*/React.createElement("button", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "9px 10px",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--border-default)",
      background: "var(--surface-card)",
      cursor: "pointer",
      marginBottom: 14,
      boxShadow: "var(--shadow-xs)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 24,
      height: 24,
      borderRadius: 6,
      background: "var(--navy-800)",
      color: "#fff",
      font: "var(--weight-bold) 11px/1 var(--font-mono)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "0 0 24px"
    }
  }, PROJECT.code), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      textAlign: "start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-semibold) 13px/1.2 var(--font-sans)",
      color: "var(--text-strong)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, PROJECT.name), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "10px/1.2 var(--font-mono)",
      color: "var(--text-subtle)"
    }
  }, "#", PROJECT.id)), /*#__PURE__*/React.createElement(Icon, {
    name: "chevrons-up-down",
    size: 15,
    color: "var(--text-subtle)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, nav.map(i => /*#__PURE__*/React.createElement(NavItem, {
    key: i.id,
    item: i
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-semibold) 10px/1 var(--font-sans)",
      letterSpacing: ".06em",
      textTransform: "uppercase",
      color: "var(--text-subtle)",
      padding: "16px 10px 8px"
    }
  }, "\u0627\u0644\u0633\u064A\u0627\u0642"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, meta.map(i => /*#__PURE__*/React.createElement(NavItem, {
    key: i.id,
    item: i
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto",
      borderTop: "1px solid var(--border-subtle)",
      paddingTop: 12,
      display: "flex",
      alignItems: "center",
      gap: 9
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "\u0633\u0627\u0631\u0629 \u0627\u0644\u0639\u062A\u064A\u0628\u064A",
    size: 30
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-semibold) 12px/1.3 var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, "\u0633\u0627\u0631\u0629 \u0627\u0644\u0639\u062A\u064A\u0628\u064A"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "10px/1.3 var(--font-sans)",
      color: "var(--text-subtle)"
    }
  }, "\u0645\u062D\u0644\u0644\u0629 \u0623\u0639\u0645\u0627\u0644 \u0623\u0648\u0644\u0649")), /*#__PURE__*/React.createElement(Icon, {
    name: "settings",
    size: 16,
    color: "var(--text-subtle)"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      height: "var(--topbar-h)",
      flex: "0 0 var(--topbar-h)",
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "0 22px",
      borderBottom: "1px solid var(--border-default)",
      background: "color-mix(in srgb, var(--surface-card) 80%, transparent)",
      backdropFilter: "blur(6px)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 7,
      font: "var(--weight-regular) 13px/1 var(--font-sans)",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", null, PROJECT.name), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-left",
    size: 14,
    color: "var(--text-subtle)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-strong)",
      fontWeight: "var(--weight-semibold)"
    }
  }, nav.concat(meta).find(n => n.id === current)?.label || "المتطلبات")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginInlineStart: "auto",
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      insetInlineStart: 10,
      display: "inline-flex"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 15,
    color: "var(--text-subtle)"
  })), /*#__PURE__*/React.createElement("input", {
    placeholder: "\u0627\u0628\u062D\u062B \u0628\u0631\u0642\u0645 \u0645\u062A\u0637\u0644\u0628 \u0623\u0648 \u0646\u0635\u2026",
    style: {
      width: 240,
      height: 34,
      paddingInlineStart: 32,
      paddingInlineEnd: 12,
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--border-default)",
      background: "var(--slate-50)",
      font: "13px var(--font-sans)",
      color: "var(--text-strong)",
      outline: "none"
    }
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    iconStart: /*#__PURE__*/React.createElement(Icon, {
      name: "upload",
      size: 15
    })
  }, "\u0631\u0641\u0639 \u0648\u062B\u064A\u0642\u0629"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    iconStart: /*#__PURE__*/React.createElement(Icon, {
      name: "sparkles",
      size: 15
    })
  }, "\u062A\u062D\u0644\u064A\u0644 \u062C\u062F\u064A\u062F"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      overflowY: "auto",
      minWidth: 0
    }
  }, children), rightRail && /*#__PURE__*/React.createElement("aside", {
    style: {
      width: "var(--rail-w)",
      flex: "0 0 var(--rail-w)",
      borderInlineStart: "1px solid var(--border-default)",
      background: "var(--surface-card)",
      overflowY: "auto"
    }
  }, rightRail))));
}
window.AppShell = AppShell;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/OverviewScreen.jsx
try { (() => {
/* Project overview — BA-specific: readiness, status distribution,
   acceptance-criteria coverage, missing information. Not a generic dashboard. */
function OverviewScreen({
  onOpen
}) {
  const statusCounts = {
    approved: 1,
    review: 1,
    needs_info: 1,
    analyzing: 1,
    draft: 1,
    blocked: 1
  };
  const statusMeta = [{
    id: "approved",
    label: "معتمد",
    c: "var(--green-500)"
  }, {
    id: "review",
    label: "قيد المراجعة",
    c: "var(--amber-500)"
  }, {
    id: "needs_info",
    label: "بحاجة لمعلومات",
    c: "var(--teal-500)"
  }, {
    id: "analyzing",
    label: "قيد التحليل",
    c: "var(--blue-600)"
  }, {
    id: "draft",
    label: "مسودة",
    c: "var(--slate-400)"
  }, {
    id: "blocked",
    label: "محظور",
    c: "var(--red-500)"
  }];
  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const missing = [{
    req: "FR-033",
    text: "تعريف الصلاحيات الدقيقة لكل دور وظيفي غير مكتمل.",
    sev: "high"
  }, {
    req: "FR-008",
    text: "معايير قبول التصدير غير محددة (الصيغ، الحدود).",
    sev: "medium"
  }, {
    req: "NFR-003",
    text: "بيئة قياس الأداء وشروط الحمل غير موثّقة.",
    sev: "medium"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px 28px 40px",
      maxWidth: 1120,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: "var(--weight-semibold) var(--text-h1)/1.2 var(--font-sans)",
      color: "var(--text-strong)",
      margin: 0
    }
  }, PROJECT.name), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "14px/1.5 var(--font-sans)",
      color: "var(--text-muted)",
      margin: "6px 0 0",
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "12px var(--font-mono)",
      color: "var(--text-subtle)",
      direction: "ltr"
    }
  }, "#", PROJECT.id), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", null, "\u0666 \u0645\u062A\u0637\u0644\u0628\u0627\u062A"), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", null, "\u0665 \u0623\u0635\u062D\u0627\u0628 \u0645\u0635\u0644\u062D\u0629"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.4fr 1fr 1fr",
      gap: 16,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-semibold) 14px var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, "\u062C\u0627\u0647\u0632\u064A\u0629 \u0627\u0644\u0645\u062A\u0637\u0644\u0628\u0627\u062A \u0644\u0644\u0627\u0639\u062A\u0645\u0627\u062F"), /*#__PURE__*/React.createElement(Badge, {
    tone: "warning"
  }, "\u0666\u0662\u066A")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 10,
      borderRadius: 999,
      background: "var(--slate-150)",
      overflow: "hidden",
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "17%",
      background: "var(--green-500)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "17%",
      background: "var(--amber-500)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "17%",
      background: "var(--teal-500)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "11%",
      background: "var(--blue-600)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "8px 16px",
      marginTop: 14
    }
  }, statusMeta.map(s => /*#__PURE__*/React.createElement("span", {
    key: s.id,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      font: "12px var(--font-sans)",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 2,
      background: s.c
    }
  }), " ", s.label, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "11px var(--font-mono)",
      color: "var(--text-subtle)"
    }
  }, statusCounts[s.id]))))), /*#__PURE__*/React.createElement(Card, {
    padding: "lg",
    style: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "12px var(--font-sans)",
      color: "var(--text-muted)",
      marginBottom: 8
    }
  }, "\u062A\u063A\u0637\u064A\u0629 \u0645\u0639\u0627\u064A\u064A\u0631 \u0627\u0644\u0642\u0628\u0648\u0644"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-bold) 32px/1 var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, "78", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      color: "var(--text-muted)"
    }
  }, "\u066A")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(ConfidenceMeter, {
    value: 78,
    label: "\u0662\u0662 \u0645\u0646 \u0662\u0668 \u0645\u0643\u062A\u0645\u0644\u0629"
  }))), /*#__PURE__*/React.createElement(Card, {
    padding: "lg",
    style: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "12px var(--font-sans)",
      color: "var(--text-muted)",
      marginBottom: 8
    }
  }, "\u0645\u062A\u0648\u0633\u0637 \u062B\u0642\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-bold) 32px/1 var(--font-sans)",
      color: "var(--teal-600)"
    }
  }, "74", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      color: "var(--text-muted)"
    }
  }, "\u066A")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      font: "12px/1.5 var(--font-sans)",
      color: "var(--text-muted)"
    }
  }, "\u0645\u062A\u0637\u0644\u0628 \u0648\u0627\u062D\u062F \u0628\u062B\u0642\u0629 \u0645\u0646\u062E\u0641\u0636\u0629 \u064A\u062D\u062A\u0627\u062C \u0645\u0631\u0627\u062C\u0639\u0629 \u0628\u0634\u0631\u064A\u0629."))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "none"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "14px 18px",
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert-triangle",
    size: 17,
    color: "var(--amber-600)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-semibold) 14px var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, "\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0646\u0627\u0642\u0635\u0629"), /*#__PURE__*/React.createElement(Badge, {
    tone: "warning",
    style: {
      marginInlineStart: "auto"
    }
  }, missing.length)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column"
    }
  }, missing.map((m, i) => /*#__PURE__*/React.createElement("button", {
    key: m.req,
    onClick: () => onOpen && onOpen(REQUIREMENTS.find(r => r.id === m.req) || REQUIREMENTS[0]),
    style: {
      display: "flex",
      gap: 11,
      alignItems: "flex-start",
      padding: "13px 18px",
      borderTop: i ? "1px solid var(--border-subtle)" : "none",
      background: "transparent",
      border: "none",
      borderTopColor: "var(--border-subtle)",
      cursor: "pointer",
      textAlign: "start"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: m.sev === "high" ? "var(--red-500)" : "var(--amber-500)",
      marginTop: 6,
      flex: "0 0 7px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--font-mono-id)",
      color: "var(--blue-700)",
      direction: "ltr"
    }
  }, m.req)), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "13px/1.5 var(--font-sans)",
      color: "var(--text-body)",
      marginTop: 3
    }
  }, m.text)), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-left",
    size: 15,
    color: "var(--text-subtle)"
  }))))), /*#__PURE__*/React.createElement(Card, {
    padding: "none"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "14px 18px",
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 17,
    color: "var(--text-muted)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-semibold) 14px var(--font-sans)",
      color: "var(--text-strong)"
    }
  }, "\u0623\u062D\u062F\u062B \u0627\u0644\u0645\u062A\u0637\u0644\u0628\u0627\u062A"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    style: {
      marginInlineStart: "auto"
    },
    onClick: () => onOpen && onOpen(null)
  }, "\u0639\u0631\u0636 \u0627\u0644\u0643\u0644")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column"
    }
  }, REQUIREMENTS.slice(0, 4).map((r, i) => /*#__PURE__*/React.createElement("button", {
    key: r.id,
    onClick: () => onOpen && onOpen(r),
    style: {
      display: "flex",
      gap: 11,
      alignItems: "center",
      padding: "12px 18px",
      borderTop: i ? "1px solid var(--border-subtle)" : "none",
      background: "transparent",
      border: "none",
      cursor: "pointer",
      textAlign: "start"
    }
  }, /*#__PURE__*/React.createElement(PriorityLabel, {
    level: r.priority,
    showLabel: false
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--font-mono-id)",
      color: "var(--text-muted)",
      direction: "ltr",
      fontSize: 12
    }
  }, r.id)), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-medium) 13px/1.4 var(--font-sans)",
      color: "var(--text-strong)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, r.title)), /*#__PURE__*/React.createElement(StatusBadge, {
    status: r.status
  })))))));
}
window.OverviewScreen = OverviewScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/OverviewScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/RequirementDetailScreen.jsx
try { (() => {
/* Requirement detail — header, tabs (criteria / rules / questions), meta. */
function RequirementDetail({
  req,
  onBack
}) {
  const [tab, setTab] = React.useState("criteria");
  const tabs = [{
    id: "criteria",
    label: "معايير القبول",
    count: ACCEPTANCE_CRITERIA.length
  }, {
    id: "rules",
    label: "قواعد العمل",
    count: BUSINESS_RULES.length
  }, {
    id: "questions",
    label: "أسئلة مفتوحة",
    count: OPEN_QUESTIONS.length
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 28px 40px",
      maxWidth: 860,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      border: "none",
      background: "transparent",
      color: "var(--text-muted)",
      font: "13px var(--font-sans)",
      cursor: "pointer",
      padding: 0,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 15
  }), " \u0627\u0644\u0639\u0648\u062F\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u062A\u0637\u0644\u0628\u0627\u062A"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--font-mono-id)",
      color: "var(--blue-700)",
      background: "var(--blue-50)",
      padding: "3px 9px",
      borderRadius: "var(--radius-sm)",
      direction: "ltr"
    }
  }, req.id), /*#__PURE__*/React.createElement(StatusBadge, {
    status: req.status
  }), /*#__PURE__*/React.createElement(Tag, {
    color: "slate"
  }, req.module)), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: "var(--weight-semibold) var(--text-h1)/1.3 var(--font-sans)",
      color: "var(--text-strong)",
      margin: "0 0 12px"
    }
  }, req.title), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "15px/1.7 var(--font-sans)",
      color: "var(--text-body)",
      margin: "0 0 20px",
      maxWidth: 680
    }
  }, req.description), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 28,
      padding: "14px 0",
      borderTop: "1px solid var(--border-subtle)",
      borderBottom: "1px solid var(--border-subtle)",
      marginBottom: 22,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-medium) 11px/1 var(--font-sans)",
      color: "var(--text-subtle)"
    }
  }, "\u0627\u0644\u0623\u0648\u0644\u0648\u064A\u0629"), /*#__PURE__*/React.createElement(PriorityLabel, {
    level: req.priority
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-medium) 11px/1 var(--font-sans)",
      color: "var(--text-subtle)"
    }
  }, "\u0623\u0635\u062D\u0627\u0628 \u0627\u0644\u0645\u0635\u0644\u062D\u0629"), /*#__PURE__*/React.createElement(StakeholderGroup, {
    people: req.stakeholders,
    size: 26
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      minWidth: 150
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-medium) 11px/1 var(--font-sans)",
      color: "var(--text-subtle)"
    }
  }, "\u062B\u0642\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A"), req.confidence != null ? /*#__PURE__*/React.createElement(ConfidenceMeter, {
    value: req.confidence,
    variant: "pill"
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      font: "13px var(--font-sans)",
      color: "var(--text-subtle)"
    }
  }, "\u0644\u0645 \u064A\u064F\u062D\u0644\u064E\u0651\u0644 \u0628\u0639\u062F"))), /*#__PURE__*/React.createElement(Tabs, {
    items: tabs,
    value: tab,
    onChange: setTab,
    style: {
      marginBottom: 18
    }
  }), tab === "criteria" && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, ACCEPTANCE_CRITERIA.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    style: {
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
      padding: "12px 14px",
      background: "var(--surface-card)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-md)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 1,
      width: 18,
      height: 18,
      flex: "0 0 18px",
      borderRadius: "var(--radius-xs)",
      border: `1.5px solid ${c.done ? "var(--green-500)" : "var(--border-strong)"}`,
      background: c.done ? "var(--green-500)" : "transparent",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, c.done && /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 12,
    color: "#fff",
    strokeWidth: 3
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--font-mono-id)",
      color: "var(--text-muted)",
      direction: "ltr"
    }
  }, c.id), c.ai && /*#__PURE__*/React.createElement(Badge, {
    tone: "ai",
    dot: true
  }, "\u0645\u064F\u0633\u062A\u062E\u0631\u064E\u062C \u0622\u0644\u064A\u064B\u0627")), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "14px/1.6 var(--font-sans)",
      color: "var(--text-body)"
    }
  }, c.text)))), /*#__PURE__*/React.createElement("button", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      alignSelf: "flex-start",
      marginTop: 4,
      padding: "8px 12px",
      border: "1px dashed var(--border-strong)",
      borderRadius: "var(--radius-md)",
      background: "transparent",
      color: "var(--text-muted)",
      font: "13px var(--font-sans)",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }), " \u0625\u0636\u0627\u0641\u0629 \u0645\u0639\u064A\u0627\u0631 \u0642\u0628\u0648\u0644")), tab === "rules" && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, BUSINESS_RULES.map(b => /*#__PURE__*/React.createElement("div", {
    key: b.id,
    style: {
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
      padding: "12px 14px",
      background: "var(--surface-card)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-md)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield-check",
    size: 18,
    color: "var(--navy-600)",
    style: {
      marginTop: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--font-mono-id)",
      color: "var(--text-muted)",
      direction: "ltr"
    }
  }, b.id), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "11px var(--font-sans)",
      color: "var(--text-subtle)"
    }
  }, "\xB7 ", b.source)), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "14px/1.6 var(--font-sans)",
      color: "var(--text-body)"
    }
  }, b.text))))), tab === "questions" && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, OPEN_QUESTIONS.map(q => /*#__PURE__*/React.createElement("div", {
    key: q.id,
    style: {
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
      padding: "12px 14px",
      background: "var(--amber-50)",
      border: "1px solid var(--amber-100)",
      borderRadius: "var(--radius-md)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "message-circle-question",
    size: 18,
    color: "var(--amber-600)",
    style: {
      marginTop: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "14px/1.6 var(--font-sans)",
      color: "var(--text-body)",
      marginBottom: 8
    }
  }, q.text), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, q.ai && /*#__PURE__*/React.createElement(Badge, {
    tone: "ai",
    dot: true
  }, "\u0633\u0624\u0627\u0644 \u0645\u0646 \u0648\u062B\u0651\u0642"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "12px var(--font-sans)",
      color: "var(--text-muted)",
      display: "inline-flex",
      alignItems: "center",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user",
    size: 13
  }), " \u0645\u0648\u062C\u0651\u0647 \u0625\u0644\u0649 ", q.to))), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm"
  }, "\u0625\u062C\u0627\u0628\u0629")))));
}
window.RequirementDetail = RequirementDetail;

/* Right rail for the detail view — AI insight panel + actions. */
function DetailRail({
  req
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(AIInsightPanel, {
    confidence: req.confidence ?? 70,
    summary: `استخرجت ${ACCEPTANCE_CRITERIA.length} معايير قبول و${BUSINESS_RULES.length} قواعد عمل من المستند المرفوع.`,
    reasoning: ["تحديد الجهات الفاعلة: المستخدم، النظام، منصة النفاذ الوطني.", "استخراج المسار الأساسي وحالات الاستثناء من النص.", "مطابقة القواعد المستخرجة مع سياسة الأمان ٢٫٣."],
    recommendations: ["أكمل معيار القبول AC-1.4 الخاص بقفل الحساب.", "أجب عن السؤالين المفتوحين قبل طلب الاعتماد."]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "brand",
    fullWidth: true,
    iconStart: /*#__PURE__*/React.createElement(Icon, {
      name: "check-circle",
      size: 16
    })
  }, "\u0637\u0644\u0628 \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    fullWidth: true,
    iconStart: /*#__PURE__*/React.createElement(Icon, {
      name: "message-circle",
      size: 16
    })
  }, "\u0637\u0644\u0628 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0625\u0636\u0627\u0641\u064A\u0629")));
}
window.DetailRail = DetailRail;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/RequirementDetailScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/RequirementsScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Requirements list screen — AI summary banner, filter row, requirement grid. */
function RequirementsScreen({
  onOpen
}) {
  const [filter, setFilter] = React.useState("all");
  const filters = [{
    id: "all",
    label: "الكل",
    n: REQUIREMENTS.length
  }, {
    id: "needs_info",
    label: "بحاجة لمعلومات",
    n: REQUIREMENTS.filter(r => r.status === "needs_info").length
  }, {
    id: "review",
    label: "قيد المراجعة",
    n: REQUIREMENTS.filter(r => r.status === "review").length
  }, {
    id: "approved",
    label: "معتمد",
    n: REQUIREMENTS.filter(r => r.status === "approved").length
  }, {
    id: "blocked",
    label: "محظور",
    n: REQUIREMENTS.filter(r => r.status === "blocked").length
  }];
  const list = filter === "all" ? REQUIREMENTS : REQUIREMENTS.filter(r => r.status === filter);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px 28px",
      maxWidth: 1180,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 16,
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: "var(--weight-semibold) var(--text-h1)/1.2 var(--font-sans)",
      color: "var(--text-strong)",
      margin: 0
    }
  }, "\u0627\u0644\u0645\u062A\u0637\u0644\u0628\u0627\u062A"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "14px/1.5 var(--font-sans)",
      color: "var(--text-muted)",
      margin: "6px 0 0"
    }
  }, "\u0666 \u0645\u062A\u0637\u0644\u0628\u0627\u062A \u0645\u0633\u062A\u062E\u0631\u062C\u0629 \u0645\u0646 \u0663 \u0648\u062B\u0627\u0626\u0642 \xB7 \u0622\u062E\u0631 \u062A\u062D\u0644\u064A\u0644 \u0642\u0628\u0644 \u0663 \u0633\u0627\u0639\u0627\u062A")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    iconStart: /*#__PURE__*/React.createElement(Icon, {
      name: "filter",
      size: 15
    })
  }, "\u062A\u0635\u0641\u064A\u0629"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    iconStart: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-up-down",
      size: 15
    })
  }, "\u062A\u0631\u062A\u064A\u0628"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "14px 16px",
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--teal-200)",
      background: "linear-gradient(180deg, var(--teal-50), var(--surface-card))",
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: "var(--radius-md)",
      background: "var(--teal-500)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "0 0 36px"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 19,
    color: "#fff"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-semibold) 14px/1.4 var(--font-sans)",
      color: "var(--teal-700)"
    }
  }, "\u062E\u0644\u0627\u0635\u0629 \u0648\u062B\u0651\u0642"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "13px/1.5 var(--font-sans)",
      color: "var(--text-body)"
    }
  }, "\u0627\u0643\u062A\u0645\u0644 \u062A\u062D\u0644\u064A\u0644 \u0666 \u0645\u062A\u0637\u0644\u0628\u0627\u062A \u0628\u0645\u062A\u0648\u0633\u0637 \u062B\u0642\u0629 \u0667\u0664\u066A. \u0645\u062A\u0637\u0644\u0628\u0627\u0646 \u0628\u062D\u0627\u062C\u0629 \u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0625\u0636\u0627\u0641\u064A\u0629 \u0648\u0664 \u0645\u0639\u0627\u064A\u064A\u0631 \u0642\u0628\u0648\u0644 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629 \u0642\u0628\u0644 \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F.")), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    iconEnd: /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-left",
      size: 15
    }),
    style: {
      color: "var(--teal-700)"
    }
  }, "\u0639\u0631\u0636 \u0627\u0644\u062A\u062D\u0644\u064A\u0644")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 18,
      flexWrap: "wrap"
    }
  }, filters.map(f => {
    const on = filter === f.id;
    return /*#__PURE__*/React.createElement("button", {
      key: f.id,
      onClick: () => setFilter(f.id),
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "6px 12px",
        borderRadius: "var(--radius-pill)",
        border: `1px solid ${on ? "var(--navy-800)" : "var(--border-default)"}`,
        background: on ? "var(--navy-800)" : "var(--surface-card)",
        color: on ? "#fff" : "var(--text-body)",
        font: "var(--weight-medium) 13px/1 var(--font-sans)",
        cursor: "pointer"
      }
    }, f.label, /*#__PURE__*/React.createElement("span", {
      style: {
        font: "11px/1 var(--font-mono)",
        opacity: 0.7
      }
    }, f.n));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
      gap: 16
    }
  }, list.map(r => /*#__PURE__*/React.createElement(RequirementCard, _extends({
    key: r.id
  }, r, {
    onClick: () => onOpen && onOpen(r)
  })))));
}
window.RequirementsScreen = RequirementsScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/RequirementsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/kit-shared.jsx
try { (() => {
/* Shared helpers for the Wathiq workspace UI kit.
   Exposes DS components + a Lucide <Icon> + mock data on window so each
   screen file (separate Babel scope) can use them as globals. */

const DS = window.WathiqDesignSystem_f0eeb8 || {};
function Icon({
  name,
  size = 18,
  color,
  style,
  strokeWidth = 1.75
}) {
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  return /*#__PURE__*/React.createElement("span", {
    className: "wq-ic",
    style: {
      ["--ic"]: size + "px",
      color,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "0 0 auto",
      ...style
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": name,
    style: {
      strokeWidth
    }
  }));
}

/* ---- Mock project + requirements data ---- */
const PROJECT = {
  id: "PRJ-4821",
  name: "منصة المدفوعات المؤسسية",
  code: "EPP"
};
const REQUIREMENTS = [{
  id: "FR-014",
  title: "تسجيل الدخول عبر الهوية الوطنية",
  description: "يجب أن يدعم النظام تسجيل الدخول عبر منصة النفاذ الوطني الموحّد للأفراد والمنشآت، مع التحقق الثنائي.",
  status: "review",
  priority: "high",
  confidence: 88,
  criteria: 6,
  openQuestions: 2,
  module: "المصادقة",
  stakeholders: ["سارة العتيبي", "عمر فيصل", "ليان حسن"]
}, {
  id: "FR-021",
  title: "إنشاء أمر دفع متعدد المستفيدين",
  description: "تمكين المنشأة من رفع ملف دفعات وإنشاء أوامر دفع مجمّعة مع التحقق من أرصدة المستفيدين.",
  status: "approved",
  priority: "critical",
  confidence: 94,
  criteria: 9,
  openQuestions: 0,
  module: "المدفوعات",
  stakeholders: ["خالد النمر", "نورة", "سارة العتيبي", "ماجد", "ريم"]
}, {
  id: "FR-008",
  title: "لوحة متابعة حالة المعاملات",
  description: "عرض حالة كل معاملة (قيد المعالجة، مكتملة، مرفوضة) مع إمكانية التصفية والتصدير.",
  status: "analyzing",
  priority: "medium",
  confidence: 71,
  criteria: 4,
  openQuestions: 1,
  module: "التقارير",
  stakeholders: ["نورة القحطاني", "عمر فيصل"]
}, {
  id: "FR-033",
  title: "حدود الصلاحيات حسب الدور الوظيفي",
  description: "تعريف صلاحيات دقيقة (إنشاء، اعتماد، صرف) مرتبطة بأدوار وظيفية قابلة للتهيئة.",
  status: "needs_info",
  priority: "high",
  confidence: 52,
  criteria: 3,
  openQuestions: 4,
  module: "الصلاحيات",
  stakeholders: ["ماجد الدوسري", "ريم"]
}, {
  id: "NFR-003",
  title: "زمن استجابة المعاملة أقل من ثانيتين",
  description: "يجب ألا يتجاوز زمن معالجة أمر الدفع الواحد ثانيتين تحت حمل ٥٠٠ معاملة بالثانية.",
  status: "draft",
  priority: "medium",
  confidence: null,
  criteria: 2,
  openQuestions: 1,
  module: "الأداء",
  stakeholders: ["عمر فيصل"]
}, {
  id: "FR-040",
  title: "إشعارات فورية عند فشل الصرف",
  description: "إرسال إشعار فوري (تطبيق + بريد) للمسؤول المالي عند فشل أي عملية صرف مع سبب الفشل.",
  status: "blocked",
  priority: "low",
  confidence: 64,
  criteria: 3,
  openQuestions: 2,
  module: "الإشعارات",
  stakeholders: ["ليان حسن", "خالد النمر"]
}];
const ACCEPTANCE_CRITERIA = [{
  id: "AC-1.1",
  text: "عند إدخال هوية صحيحة وكلمة مرور صحيحة، يُعاد توجيه المستخدم إلى لوحة التحكم.",
  done: true,
  ai: true
}, {
  id: "AC-1.2",
  text: "عند فشل التحقق، تظهر رسالة خطأ واضحة دون كشف سبب الفشل لأسباب أمنية.",
  done: true,
  ai: true
}, {
  id: "AC-1.3",
  text: "يُطلب رمز التحقق الثنائي بعد التحقق الأول من بيانات الدخول.",
  done: true,
  ai: true
}, {
  id: "AC-1.4",
  text: "بعد ثلاث محاولات فاشلة، يُقفل الحساب مؤقتًا لمدة ١٥ دقيقة.",
  done: false,
  ai: true
}, {
  id: "AC-1.5",
  text: "تنتهي صلاحية الجلسة تلقائيًا بعد ٣٠ دقيقة من الخمول.",
  done: false,
  ai: false
}, {
  id: "AC-1.6",
  text: "يُسجَّل كل دخول ناجح أو فاشل في سجل التدقيق مع الطابع الزمني.",
  done: true,
  ai: true
}];
const BUSINESS_RULES = [{
  id: "BR-22",
  text: "لا يُسمح بتسجيل الدخول إلا للحسابات الموثّقة عبر النفاذ الوطني فقط.",
  source: "سياسة الأمان ٢٫٣"
}, {
  id: "BR-23",
  text: "يجب أن يكون المستخدم مرتبطًا بمنشأة واحدة فعّالة على الأقل.",
  source: "قواعد العمل"
}, {
  id: "BR-24",
  text: "تُحفظ سجلات الدخول لمدة لا تقل عن ١٨ شهرًا.",
  source: "متطلب تنظيمي"
}];
const OPEN_QUESTIONS = [{
  id: "Q-1",
  text: "ما السلوك المتوقع عند تعطّل منصة النفاذ الوطني؟ هل يُسمح بمسار دخول بديل؟",
  to: "خالد النمر",
  ai: true
}, {
  id: "Q-2",
  text: "هل تختلف مدة قفل الحساب حسب نوع المستخدم (فرد / منشأة)؟",
  to: "سارة العتيبي",
  ai: true
}];
Object.assign(window, {
  Icon,
  PROJECT,
  REQUIREMENTS,
  ACCEPTANCE_CRITERIA,
  BUSINESS_RULES,
  OPEN_QUESTIONS,
  ...DS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/kit-shared.jsx", error: String((e && e.message) || e) }); }

__ds_ns.AIInsightPanel = __ds_scope.AIInsightPanel;

__ds_ns.ConfidenceMeter = __ds_scope.ConfidenceMeter;

__ds_ns.PriorityLabel = __ds_scope.PriorityLabel;

__ds_ns.RequirementCard = __ds_scope.RequirementCard;

__ds_ns.StakeholderGroup = __ds_scope.StakeholderGroup;

__ds_ns.StatusBadge = __ds_scope.StatusBadge;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
