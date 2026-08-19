-- =============================================================================
-- Faro Cards - bucket de avatares
-- Publico em leitura (o <img src> vai direto), escrita/delete apenas do dono
-- via prefixo do path = auth.uid()::text.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Leitura publica (o bucket ja e public, mas a policy documenta)
create policy "avatars: leitura publica"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: dono envia"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: dono atualiza"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: dono apaga"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
