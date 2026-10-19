-- Exercise guides for the Android app: library.zip and one small Lottie zip per animation,
-- served at /storage/v1/object/public/exercise-media/v1/... Public bucket, so downloads need no
-- policy. Deliberately no storage.objects policies for this bucket: anon and authenticated
-- clients can neither list nor write it. Uploads go through the service role
-- (scripts/ops/upload-exercise-media.mjs).
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-media', 'exercise-media', true, 1048576, array['application/zip'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
