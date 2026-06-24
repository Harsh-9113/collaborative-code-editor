create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  language text not null default 'javascript',
  content text not null default '',
  owner_name text not null,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.documents (
  id,
  title,
  language,
  content,
  owner_name,
  is_public
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'Welcome Script',
    'javascript',
    'console.log("Welcome to the collaborative editor!");',
    'Harsh',
    true
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Python Notes',
    'python',
    'def greet(name):\n    return f"Hello, {name}!"',
    'Asha',
    true
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'Project README',
    'markdown',
    '# Collaborative Code Editor\n\nShare, edit, and review code together.',
    'Rohan',
    false
  )
on conflict (id) do nothing;
