**Checkbox** — labeled checkbox for acceptance-criteria checklists, multi-select filters, and consent.

```jsx
<Checkbox label="المستخدم مسجّل الدخول" defaultChecked />
<Checkbox label="يدعم الهوية الوطنية" checked={v} onChange={e => setV(e.target.checked)} />
```

Controlled or uncontrolled; supports `disabled`.
