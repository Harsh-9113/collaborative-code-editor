create or replace function public.owns_workspace_row(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = target_workspace_id
      and w.owner_id = auth.uid()
  );
$$;

drop policy if exists "workspace creators can add owner membership" on public.workspace_members;
create policy "workspace creators can add owner membership"
on public.workspace_members for insert
with check (
  user_id = auth.uid()
  and role = 'owner'
  and public.owns_workspace_row(workspace_id)
);
