-- صلاحيات bucket: designs (Public)
-- نفّذ في Supabase → SQL Editor → Run

drop policy if exists "designs public read" on storage.objects;
drop policy if exists "designs public upload" on storage.objects;
drop policy if exists "designs public update" on storage.objects;
drop policy if exists "designs public delete" on storage.objects;

create policy "designs public read"
on storage.objects for select
to public
using (bucket_id = 'designs');

create policy "designs public upload"
on storage.objects for insert
to public
with check (bucket_id = 'designs');

create policy "designs public update"
on storage.objects for update
to public
using (bucket_id = 'designs');

create policy "designs public delete"
on storage.objects for delete
to public
using (bucket_id = 'designs');
