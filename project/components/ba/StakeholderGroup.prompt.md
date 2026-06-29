**StakeholderGroup** — overlapping avatar stack for the stakeholders or assignees on a requirement, with +N overflow.

```jsx
<StakeholderGroup people={["سارة العتيبي","عمر فيصل","ليان","نورة","خالد"]} max={4} />
<StakeholderGroup people={team} label="٥ أصحاب مصلحة" />
```

Accepts name strings or `{name, src}`. Composes the `Avatar` primitive.
