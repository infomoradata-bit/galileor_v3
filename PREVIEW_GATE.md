# Temporary preview access gate

Visitors must enter a server-validated access code before they can see the app.
This is **not** a replacement for Supabase auth.

## Enable

Set in `.env.local` and Vercel:

```env
PALADIOR_ACCESS_CODE=your-secret-code
```

If this variable is **unset**, the gate is fully off.

## Remove when launching (checklist)

1. Delete `PALADIOR_ACCESS_CODE` from Vercel / `.env.local`
2. Delete these files:
   - `lib/previewGate.ts`
   - `app/preview/`
   - `app/api/preview-access/`
   - `components/PreviewGateForm.tsx`
   - `PREVIEW_GATE.md` (this file)
3. In `proxy.ts`, remove the block marked `Temporary preview gate`
4. In `components/Sidebar.tsx`, remove `lockPreview` and the **Lock preview** button
5. Remove the `PALADIOR_ACCESS_CODE` line from `.env.example` / README if present
