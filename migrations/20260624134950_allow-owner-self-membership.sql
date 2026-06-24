drop policy if exists "workspace creators can add owner membership" on public.workspace_members;
create policy "workspace creators can add owner membership"
on public.workspace_members for insert
with check (
  user_id = auth.uid()
  and role = 'owner'
  and exists (
    select 1
    from public.workspaces w
    where w.id = workspace_members.workspace_id
      and w.owner_id = auth.uid()
  )
);
