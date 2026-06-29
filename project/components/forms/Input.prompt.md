**Input** — labeled text field with hint/error states and optional leading icon.

```jsx
<Input label="عنوان المتطلب" placeholder="مثال: تسجيل الدخول بالهوية الوطنية" />
<Input label="بحث" iconStart={<i data-lucide="search" />} />
<Input label="البريد" error="بريد غير صالح" />
```

Sizes `sm`/`md`/`lg`. Pass `error` for the invalid state, `hint` for helper text.
