**RequirementCard** — the core object of the Wathiq workspace. Composes the requirement ID, title, `StatusBadge`, `PriorityLabel`, `ConfidenceMeter`, and a meta footer.

```jsx
<RequirementCard
  id="FR-014"
  title="تسجيل الدخول عبر الهوية الوطنية"
  description="يجب أن يدعم النظام تسجيل الدخول عبر منصة النفاذ الوطني الموحّد."
  status="review"
  priority="high"
  confidence={88}
  criteria={6}
  openQuestions={2}
  onClick={() => open(req)}
/>
```

Pass `selected` for the active item in a list. `onClick` makes it interactive.
