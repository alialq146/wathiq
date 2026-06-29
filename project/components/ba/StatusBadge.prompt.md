**StatusBadge** — the canonical requirement lifecycle indicator. Always use this (not a raw Badge) for requirement state.

```jsx
<StatusBadge status="approved" />
<StatusBadge status="needs_info" />
<StatusBadge status="review" lang="en" />
```

Statuses: `draft` `analyzing` `review` `needs_info` `approved` `blocked`. Defaults to Arabic labels; pass `lang="en"` or custom children.
