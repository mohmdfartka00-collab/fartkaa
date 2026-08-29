# فرتكه V3 — Supabase + Storage + Paymob

هذه النسخة مبنية على نسخة فرتكه المتقدمة، وتم فيها ربط طبقة التخزين والدفع مع Supabase بطريقة مناسبة للإطلاق.

### أهم الملفات
- `supabase-config.js` — إعدادات Supabase العامة.
- `payment-config.js` — رابط وظيفة الدفع العامة، بدون أسرار.
- `supabase_migration_v2.sql` — الجداول وRLS وStorage والسياسات والـRPC الآمن.
- `supabase/functions/create-paymob-intention/index.ts` — إنشاء عملية Paymob من الخلفية.
- `supabase/functions/paymob-webhook/index.ts` — استقبال وتحقق Webhook وتحديث حالة الطلب.
- `supabase/config.toml` — إعداد حماية وظائف Supabase.
- `ربط_سوبابيز_والدفع_والصور.md` — خطوات التشغيل بالتفصيل.

**ملاحظة:** لا يمكن وضع أسرار Paymob داخل ملف الموقع. يجب إضافتها كـ Secrets داخل Supabase Edge Functions.
