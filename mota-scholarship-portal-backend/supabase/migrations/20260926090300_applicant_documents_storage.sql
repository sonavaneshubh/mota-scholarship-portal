-- =============================================================================
-- Applicant profile — private document storage.
--
-- Rules enforced at the storage layer, not the UI:
--   * The bucket is PRIVATE (public = false). There is no anonymous or public
--     URL; every read goes through a short-lived signed URL issued only after
--     the storage.objects policy below has confirmed the caller owns the folder.
--   * Object keys are namespaced as  {applicant_id}/{document_type}/{uuid}_{name}
--     so the first path segment is the ownership boundary the policy checks.
--   * Accepted types and the size ceiling are declared on the bucket, so an
--     oversized or unexpected file is refused by storage itself.
--   * Binary content is never stored in PostgreSQL. applicant_documents holds
--     metadata only (file_name, storage_path, mime_type, file_size, …).
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'applicant-documents',
  'applicant-documents',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
on conflict (id) do update
  set public              = excluded.public,
      file_size_limit     = excluded.file_size_limit,
      allowed_mime_types  = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- Ownership: the first path segment must equal the caller's own applicant id.
-- -----------------------------------------------------------------------------
drop policy if exists "applicant_documents_storage_read" on storage.objects;
create policy "applicant_documents_storage_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'applicant-documents'
    and (storage.foldername(name))[1] = public.current_applicant_id()::text
  );

drop policy if exists "applicant_documents_storage_insert" on storage.objects;
create policy "applicant_documents_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'applicant-documents'
    and (storage.foldername(name))[1] = public.current_applicant_id()::text
  );

drop policy if exists "applicant_documents_storage_update" on storage.objects;
create policy "applicant_documents_storage_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'applicant-documents'
    and (storage.foldername(name))[1] = public.current_applicant_id()::text
  )
  with check (
    bucket_id = 'applicant-documents'
    and (storage.foldername(name))[1] = public.current_applicant_id()::text
  );

drop policy if exists "applicant_documents_storage_delete" on storage.objects;
create policy "applicant_documents_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'applicant-documents'
    and (storage.foldername(name))[1] = public.current_applicant_id()::text
  );

drop policy if exists "applicant_documents_storage_admin" on storage.objects;
create policy "applicant_documents_storage_admin" on storage.objects
  for all to authenticated
  using (bucket_id = 'applicant-documents' and public.current_profile_role() = 'admin')
  with check (bucket_id = 'applicant-documents' and public.current_profile_role() = 'admin');
