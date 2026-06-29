**Tabs** — underline tab strip for switching views within a screen (e.g. Overview / Criteria / Rules / Questions).

```jsx
<Tabs
  items={[
    { id: "criteria", label: "معايير القبول", count: 6 },
    { id: "rules", label: "القواعد", count: 3 },
    { id: "questions", label: "أسئلة مفتوحة", count: 2 },
  ]}
  value={tab}
  onChange={setTab}
/>
```

Controlled (`value`+`onChange`) or uncontrolled. Each item supports an optional `count`.
