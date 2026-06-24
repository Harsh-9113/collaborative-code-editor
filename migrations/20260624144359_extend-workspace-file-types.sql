alter table public.workspace_files
drop constraint if exists workspace_files_language_check;

alter table public.workspace_files
add constraint workspace_files_language_check
check (language in ('html', 'css', 'javascript', 'json', 'txt'));
