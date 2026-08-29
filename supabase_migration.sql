
alter table public.products add column if not exists old_price numeric(12,2);
-- ترقية قاعدة بيانات فرتكه للوحة الإدارة والحسابات
alter table public.profiles add column if not exists role text not null default 'customer';

-- حذف سياسات الإدارة القديمة إن وُجدت
drop policy if exists "admin insert products" on public.products;
drop policy if exists "admin update products" on public.products;
drop policy if exists "admin delete products" on public.products;
drop policy if exists "admin insert categories" on public.categories;
drop policy if exists "admin update categories" on public.categories;
drop policy if exists "admin delete categories" on public.categories;
drop policy if exists "admin insert product images" on public.product_images;
drop policy if exists "admin update product images" on public.product_images;
drop policy if exists "admin delete product images" on public.product_images;

create policy "admin insert products" on public.products for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

create policy "admin update products" on public.products for update to authenticated
using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

create policy "admin delete products" on public.products for delete to authenticated
using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

create policy "admin insert categories" on public.categories for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

create policy "admin update categories" on public.categories for update to authenticated
using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

create policy "admin delete categories" on public.categories for delete to authenticated
using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

create policy "admin insert product images" on public.product_images for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

create policy "admin update product images" on public.product_images for update to authenticated
using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

create policy "admin delete product images" on public.product_images for delete to authenticated
using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

-- حماية رفع الملفات إلى مخزن الصور
drop policy if exists "admin upload product images" on storage.objects;
drop policy if exists "admin update product images storage" on storage.objects;
drop policy if exists "admin delete product images storage" on storage.objects;

create policy "admin upload product images" on storage.objects for insert to authenticated
with check (
  bucket_id='product-images' and
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
);

create policy "admin update product images storage" on storage.objects for update to authenticated
using (
  bucket_id='product-images' and
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
);

create policy "admin delete product images storage" on storage.objects for delete to authenticated
using (
  bucket_id='product-images' and
  exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
);

-- بعد إنشاء حساب المدير في الموقع، استبدل البريد في السطر التالي ثم شغّله:
-- update public.profiles
-- set role='admin'
-- where id=(select id from auth.users where email='ضع-بريد-المدير-هنا');
