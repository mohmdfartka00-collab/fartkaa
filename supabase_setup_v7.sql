-- فرتكه V7: إصلاح استعادة كلمة المرور + تخصيص اللوجو والصور + إعدادات الواجهة
alter table public.site_settings add column if not exists logo_image text;
alter table public.site_settings add column if not exists footer_text text;
alter table public.site_settings add column if not exists category_images jsonb not null default '[]'::jsonb;

-- تأكد من وجود إعداد واحد على الأقل
insert into public.site_settings(hero_title,hero_text,footer_text,category_images)
select 'تسوق أذكى. اختيارات أكثر.','منتجات وعروض وروابط أفليت وطلبات في تجربة واحدة.','منصة تسوق وأفليت مصرية بتجربة حديثة.','[]'::jsonb
where not exists(select 1 from public.site_settings);

-- نفس Bucket الصور يستخدم للمنتجات واللوجو والبانرات وصور الأقسام.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('product-images','product-images',true,8388608,array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict (id) do update set public=true,file_size_limit=8388608,allowed_mime_types=array['image/png','image/jpeg','image/webp','image/svg+xml'];

-- صلاحيات إعدادات الموقع موجودة في V5؛ نعيد تأكيد سياسة المدير.
alter table public.site_settings enable row level security;
drop policy if exists "fartaka public read site settings" on public.site_settings;
drop policy if exists "fartaka admin manage site settings" on public.site_settings;
create policy "fartaka public read site settings" on public.site_settings for select to anon,authenticated using(true);
create policy "fartaka admin manage site settings" on public.site_settings for all to authenticated using(exists(select 1 from public.profiles where id=auth.uid() and role='admin')) with check(exists(select 1 from public.profiles where id=auth.uid() and role='admin'));

-- مهم: بعد إنشاء الحساب، اجعل حسابك مديرًا باستبدال البريد فقط.
-- update public.profiles set role='admin' where id=(select id from auth.users where email='YOUR_EMAIL@example.com');
