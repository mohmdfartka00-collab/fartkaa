-- فرتكه V5: إصلاح الحسابات + المنتجات + الأفليت + الصور + Storage
-- شغّل هذا الملف كاملًا في Supabase > SQL Editor.

create extension if not exists pgcrypto;

-- 1) تأكد من الأعمدة المطلوبة
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists role text not null default 'customer';
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists address text;
alter table public.profiles add column if not exists city text;

alter table public.products add column if not exists old_price numeric(12,2);
alter table public.products add column if not exists stock integer not null default 999;
alter table public.products add column if not exists category text;
alter table public.products add column if not exists store text;
alter table public.products add column if not exists affiliate_url text;
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists description text;
alter table public.products add column if not exists rating numeric(3,2) not null default 0;
alter table public.products add column if not exists review_count integer not null default 0;

-- 2) إنشاء ملف العميل تلقائيًا بعد التسجيل.
-- هذا يمنع مشكلة: الحساب يتعمل في Auth لكن جدول profiles يظل فاضي.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles(id, full_name, role)
  values(new.id, coalesce(new.raw_user_meta_data->>'full_name',''), 'customer')
  on conflict (id) do update set full_name=excluded.full_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- 3) صلاحيات الحساب: المستخدم يقرأ ويعدل نفسه فقط، ولا يستطيع جعل نفسه مديرًا.
alter table public.profiles enable row level security;
drop policy if exists "fartaka profile read own" on public.profiles;
drop policy if exists "fartaka profile insert own" on public.profiles;
drop policy if exists "fartaka profile update own" on public.profiles;
create policy "fartaka profile read own" on public.profiles for select to authenticated using(id=auth.uid());
create policy "fartaka profile insert own" on public.profiles for insert to authenticated with check(id=auth.uid() and coalesce(role,'customer')='customer');
create policy "fartaka profile update own" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid() and role='customer');

-- 4) المنتجات: الزائر يستطيع القراءة، والمدير فقط يضيف/يعدل/يحذف.
alter table public.products enable row level security;
drop policy if exists "fartaka public read products" on public.products;
drop policy if exists "fartaka admin insert products" on public.products;
drop policy if exists "fartaka admin update products" on public.products;
drop policy if exists "fartaka admin delete products" on public.products;
create policy "fartaka public read products" on public.products for select to anon,authenticated using(true);
create policy "fartaka admin insert products" on public.products for insert to authenticated with check(exists(select 1 from public.profiles where id=auth.uid() and role='admin'));
create policy "fartaka admin update products" on public.products for update to authenticated using(exists(select 1 from public.profiles where id=auth.uid() and role='admin')) with check(exists(select 1 from public.profiles where id=auth.uid() and role='admin'));
create policy "fartaka admin delete products" on public.products for delete to authenticated using(exists(select 1 from public.profiles where id=auth.uid() and role='admin'));

-- 5) Storage bucket: لو لم يكن موجودًا يتم إنشاؤه.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('product-images','product-images',true,8388608,array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public=true,file_size_limit=8388608,allowed_mime_types=array['image/png','image/jpeg','image/webp'];

-- القراءة عامة لأن صور المنتجات يجب أن تظهر للزوار.
drop policy if exists "fartaka public read product images" on storage.objects;
drop policy if exists "fartaka admin upload product images" on storage.objects;
drop policy if exists "fartaka admin update product images" on storage.objects;
drop policy if exists "fartaka admin delete product images" on storage.objects;
create policy "fartaka public read product images" on storage.objects for select to anon,authenticated using(bucket_id='product-images');
create policy "fartaka admin upload product images" on storage.objects for insert to authenticated with check(bucket_id='product-images' and exists(select 1 from public.profiles where id=auth.uid() and role='admin'));
create policy "fartaka admin update product images" on storage.objects for update to authenticated using(bucket_id='product-images' and exists(select 1 from public.profiles where id=auth.uid() and role='admin')) with check(bucket_id='product-images' and exists(select 1 from public.profiles where id=auth.uid() and role='admin'));
create policy "fartaka admin delete product images" on storage.objects for delete to authenticated using(bucket_id='product-images' and exists(select 1 from public.profiles where id=auth.uid() and role='admin'));

-- 6) إعدادات الواجهة
create table if not exists public.site_settings(id bigint generated by default as identity primary key,hero_title text,hero_text text,hero_image text,updated_at timestamptz not null default now());
insert into public.site_settings(hero_title,hero_text) select 'تسوق أذكى. اختيارات أكثر.','منتجات وعروض وروابط أفليت وطلبات في تجربة واحدة.' where not exists(select 1 from public.site_settings);
alter table public.site_settings enable row level security;
drop policy if exists "fartaka public read site settings" on public.site_settings;
drop policy if exists "fartaka admin manage site settings" on public.site_settings;
create policy "fartaka public read site settings" on public.site_settings for select to anon,authenticated using(true);
create policy "fartaka admin manage site settings" on public.site_settings for all to authenticated using(exists(select 1 from public.profiles where id=auth.uid() and role='admin')) with check(exists(select 1 from public.profiles where id=auth.uid() and role='admin'));

-- 7) ضغطات الأفليت
create table if not exists public.affiliate_clicks(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete set null,product_id bigint references public.products(id) on delete set null,created_at timestamptz not null default now());
alter table public.affiliate_clicks enable row level security;
drop policy if exists "fartaka affiliate insert own" on public.affiliate_clicks;
drop policy if exists "fartaka affiliate admin read" on public.affiliate_clicks;
create policy "fartaka affiliate insert own" on public.affiliate_clicks for insert to authenticated with check(auth.uid()=user_id);
create policy "fartaka affiliate admin read" on public.affiliate_clicks for select to authenticated using(exists(select 1 from public.profiles where id=auth.uid() and role='admin'));

-- 8) ملاحظة: لا تجعل مفاتيح الدفع السرية داخل الموقع.
-- مفاتيح Paymob السرية توضع في Supabase Edge Function Secrets فقط.

-- 9) بعد إنشاء حسابك من الموقع، اجعله مديرًا بهذا السطر مع استبدال البريد:
-- update public.profiles set role='admin' where id=(select id from auth.users where email='YOUR_EMAIL@example.com');
