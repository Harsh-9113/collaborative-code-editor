create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.workspace_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  language text not null check (language in ('html', 'css', 'javascript')),
  content text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invited_email text not null,
  role text not null default 'editor' check (role in ('editor')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (workspace_id, invited_email)
);

create index if not exists workspace_members_user_id_idx on public.workspace_members(user_id);
create index if not exists workspace_members_workspace_id_idx on public.workspace_members(workspace_id);
create index if not exists workspace_files_workspace_id_idx on public.workspace_files(workspace_id);
create index if not exists workspace_invitations_email_idx on public.workspace_invitations(lower(invited_email));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

drop trigger if exists workspace_files_set_updated_at on public.workspace_files;
create trigger workspace_files_set_updated_at
before update on public.workspace_files
for each row execute function public.set_updated_at();

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_owner(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
  );
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_files enable row level security;
alter table public.workspace_invitations enable row level security;

drop policy if exists "profiles are readable by authenticated users" on public.profiles;
create policy "profiles are readable by authenticated users"
on public.profiles for select
using (auth.uid() is not null);

drop policy if exists "users create their own profile" on public.profiles;
create policy "users create their own profile"
on public.profiles for insert
with check (id = auth.uid() and lower(email) = lower(auth.email()));

drop policy if exists "users update their own profile" on public.profiles;
create policy "users update their own profile"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "members can read workspaces" on public.workspaces;
create policy "members can read workspaces"
on public.workspaces for select
using (public.is_workspace_member(id));

drop policy if exists "users can create owned workspaces" on public.workspaces;
create policy "users can create owned workspaces"
on public.workspaces for insert
with check (owner_id = auth.uid());

drop policy if exists "owners can update workspaces" on public.workspaces;
create policy "owners can update workspaces"
on public.workspaces for update
using (public.is_workspace_owner(id))
with check (public.is_workspace_owner(id));

drop policy if exists "owners can delete workspaces" on public.workspaces;
create policy "owners can delete workspaces"
on public.workspaces for delete
using (public.is_workspace_owner(id));

drop policy if exists "members can read membership" on public.workspace_members;
create policy "members can read membership"
on public.workspace_members for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "workspace owners can manage members" on public.workspace_members;
create policy "workspace owners can manage members"
on public.workspace_members for all
using (public.is_workspace_owner(workspace_id))
with check (public.is_workspace_owner(workspace_id));

drop policy if exists "users can accept invitations as members" on public.workspace_members;
create policy "users can accept invitations as members"
on public.workspace_members for insert
with check (
  user_id = auth.uid()
  and role = 'editor'
  and exists (
    select 1
    from public.workspace_invitations wi
    where wi.workspace_id = workspace_members.workspace_id
      and lower(wi.invited_email) = lower(auth.email())
      and wi.status = 'pending'
  )
);

drop policy if exists "members can read files" on public.workspace_files;
create policy "members can read files"
on public.workspace_files for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can create files" on public.workspace_files;
create policy "members can create files"
on public.workspace_files for insert
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can update files" on public.workspace_files;
create policy "members can update files"
on public.workspace_files for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can delete files" on public.workspace_files;
create policy "members can delete files"
on public.workspace_files for delete
using (public.is_workspace_member(workspace_id));

drop policy if exists "owners and invitees can read invitations" on public.workspace_invitations;
create policy "owners and invitees can read invitations"
on public.workspace_invitations for select
using (public.is_workspace_owner(workspace_id) or lower(invited_email) = lower(auth.email()));

drop policy if exists "owners can create invitations" on public.workspace_invitations;
create policy "owners can create invitations"
on public.workspace_invitations for insert
with check (public.is_workspace_owner(workspace_id) and invited_by = auth.uid());

drop policy if exists "owners can update invitations" on public.workspace_invitations;
create policy "owners can update invitations"
on public.workspace_invitations for update
using (public.is_workspace_owner(workspace_id) or lower(invited_email) = lower(auth.email()))
with check (public.is_workspace_owner(workspace_id) or lower(invited_email) = lower(auth.email()));

drop policy if exists "owners can delete invitations" on public.workspace_invitations;
create policy "owners can delete invitations"
on public.workspace_invitations for delete
using (public.is_workspace_owner(workspace_id));
