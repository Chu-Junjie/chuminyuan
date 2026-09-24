-- Run once in the Supabase SQL editor. No service-role key is used in the browser.
begin;
create table public.subjects (id text primary key, name text not null, slug text not null unique, status text not null check(status in ('open','building')), sort_order int not null default 0);
create table public.chapters (id text primary key, subject_id text not null references public.subjects(id), title text not null, slug text, sort_order int not null default 0);
create table public.sops (id text primary key, chapter_id text not null references public.chapters(id), code text not null unique, title text not null, frequency int not null check(frequency between 1 and 5), keywords text[] not null default '{}', content_json jsonb not null, sort_order int not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text not null default '同学', avatar_url text, theme text not null default 'light', xp int not null default 0, level int not null default 1, is_admin boolean not null default false);
create table public.user_records (user_id uuid not null references auth.users(id) on delete cascade, kind text not null check(kind in ('progress','notes','bookmarks','folders','mistakes','reviews','settings')), id text not null, payload jsonb not null check(jsonb_typeof(payload)='object'), revision text not null, updated_at timestamptz not null, deleted boolean not null default false, primary key(user_id,kind,id));
create index user_records_user_kind on public.user_records(user_id,kind,updated_at desc);
create index sops_chapter_sort on public.sops(chapter_id,sort_order);
create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select coalesce((select is_admin from public.profiles where id=auth.uid()),false) $$;
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id) values(new.id);return new;end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
insert into public.profiles(id) select id from auth.users on conflict do nothing;
alter table public.subjects enable row level security;
alter table public.chapters enable row level security;
alter table public.sops enable row level security;
alter table public.profiles enable row level security;
alter table public.user_records enable row level security;
create policy "Authenticated curriculum read" on public.subjects for select to authenticated using(true);
create policy "Authenticated chapters read" on public.chapters for select to authenticated using(true);
create policy "Authenticated SOP read" on public.sops for select to authenticated using(true);
create policy "Admin subjects" on public.subjects for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Admin chapters" on public.chapters for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Admin SOPs" on public.sops for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Own profile" on public.profiles for select to authenticated using(id=auth.uid());
create policy "Own records" on public.user_records for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select on public.subjects,public.chapters,public.sops,public.profiles,public.user_records to authenticated;
grant insert,update,delete on public.subjects,public.chapters,public.sops,public.user_records to authenticated;
-- No profile update permission: clients cannot promote themselves to admin.
revoke insert,update,delete on public.profiles from anon,authenticated;

-- One transaction per record, serialized across devices. Conflicting newer cloud data is retained.
create function public.sync_record(p_user_id uuid,p_kind text,p_id text,p_payload jsonb,p_revision text,p_base_revision text,p_updated_at timestamptz,p_deleted boolean) returns text language plpgsql security invoker set search_path=public as $$
declare existing public.user_records; current_user_id uuid:=auth.uid();
begin
 if current_user_id is null or current_user_id<>p_user_id then raise exception 'Account changed; retry under the original account'; end if;
 if p_updated_at>now()+interval '5 minutes' then raise exception 'Device clock is ahead; correct its clock before syncing'; end if;
 perform pg_advisory_xact_lock(hashtextextended(current_user_id::text||':'||p_kind||':'||p_id,0));
 select * into existing from public.user_records where user_id=current_user_id and kind=p_kind and id=p_id;
 if found and existing.revision=p_revision then return 'ok'; end if;
 if found and existing.revision is distinct from p_base_revision then return 'conflict'; end if;
 insert into public.user_records(user_id,kind,id,payload,revision,updated_at,deleted) values(current_user_id,p_kind,p_id,p_payload,p_revision,p_updated_at,p_deleted)
 on conflict(user_id,kind,id) do update set payload=excluded.payload,revision=excluded.revision,updated_at=excluded.updated_at,deleted=excluded.deleted;
 return 'ok';
end; $$;
revoke all on function public.sync_record(uuid,text,text,jsonb,text,text,timestamptz,boolean) from public;
grant execute on function public.sync_record(uuid,text,text,jsonb,text,text,timestamptz,boolean) to authenticated;

-- Typed read views over the offline sync envelope; security_invoker preserves underlying RLS.
create view public.user_sop_progress with(security_invoker=true) as select user_id,id,payload->>'sopId' sop_id,payload->>'status' status,payload->>'position' reading_position,updated_at from public.user_records where kind='progress' and not deleted;
create view public.notes with(security_invoker=true) as select user_id,id,payload->>'sopId' sop_id,payload->>'text' content,updated_at from public.user_records where kind='notes' and not deleted;
create view public.bookmarks with(security_invoker=true) as select user_id,id,payload->>'sopId' sop_id,payload->>'folder' folder,updated_at from public.user_records where kind='bookmarks' and not deleted;
create view public.bookmark_folders with(security_invoker=true) as select user_id,id,payload->>'name' name,updated_at from public.user_records where kind='folders' and not deleted;
create view public.mistakes with(security_invoker=true) as select user_id,id,payload->>'subject' subject_id,payload->>'chapter' chapter_id,payload->>'sopId' sop_id,payload->>'title' title,payload->>'source' source,payload->>'date' date,payload->'tags' error_tags,payload->>'status' status,payload->>'question' question,payload->>'stuck' stuck,payload->>'reason' reason,payload->>'reaction' reaction,payload->>'understanding' understanding,payload->>'createdAt' created_at,updated_at from public.user_records where kind='mistakes' and not deleted;
create view public.mistake_images with(security_invoker=true) as select r.user_id,r.id mistake_id,image->>'id' id,image->>'originalId' original_id,image->>'kind' image_type,image->>'name' name from public.user_records r cross join lateral jsonb_array_elements(coalesce(r.payload->'images','[]'::jsonb)) image where r.kind='mistakes' and not r.deleted;
create view public.review_history with(security_invoker=true) as select user_id,id,payload->>'mistakeId' mistake_id,payload->>'result' result,payload->>'hintCount' hint_count,payload->>'reviewedAt' reviewed_at from public.user_records where kind='reviews' and not deleted;
grant select on public.user_sop_progress,public.notes,public.bookmarks,public.bookmark_folders,public.mistakes,public.mistake_images,public.review_history to authenticated;

insert into public.subjects(id,name,slug,status,sort_order) values ('math','数学','math','open',0),('chinese','语文','chinese','building',1),('english','英语','english','building',2),('physics','物理','physics','building',3),('geography','地理','geography','building',4),('biology','生物','biology','building',5);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('private-images','private-images',false,15728640,array['image/jpeg','image/png','image/webp','image/heic','image/heif']);
create policy "Own images read" on storage.objects for select to authenticated using(bucket_id='private-images' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Own images insert" on storage.objects for insert to authenticated with check(bucket_id='private-images' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Own images update" on storage.objects for update to authenticated using(bucket_id='private-images' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='private-images' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Own images delete" on storage.objects for delete to authenticated using(bucket_id='private-images' and (storage.foldername(name))[1]=auth.uid()::text);
commit;
