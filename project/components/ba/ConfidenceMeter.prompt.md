**ConfidenceMeter** — shows how confident the AI is about an extraction or recommendation. Thresholds: ≥75 high (teal), ≥50 medium (amber), else low (red).

```jsx
<ConfidenceMeter value={92} />
<ConfidenceMeter value={64} variant="pill" />
```

Use the `bar` variant in panels, the `pill` variant inline on rows and cards. Reinforces Wathiq's transparent, no-black-box AI.
