begin;

create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    username text not null unique
        check (username ~ '^[a-z0-9_]{3,24}$'),
    avatar_path text not null default 'assets/badges/Gold Doubloon.webp',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.profiles
    add column if not exists avatar_path text not null default 'assets/badges/Gold Doubloon.webp';

create table if not exists public.player_stats (
    user_id uuid primary key references public.profiles (id) on delete cascade,
    games_played integer not null default 0 check (games_played >= 0),
    wins integer not null default 0 check (wins >= 0),
    losses integer not null default 0 check (losses >= 0),
    total_score bigint not null default 0 check (total_score >= 0),
    updated_at timestamptz not null default now()
);

create table if not exists public.badges (
    id text primary key,
    name text not null unique,
    description text not null default '',
    image_path text not null,
    created_at timestamptz not null default now()
);

create table if not exists public.user_badges (
    user_id uuid not null references public.profiles (id) on delete cascade,
    badge_id text not null references public.badges (id) on delete cascade,
    earned_at timestamptz not null default now(),
    awarded_by uuid references auth.users (id) on delete set null,
    primary key (user_id, badge_id)
);

create index if not exists user_badges_badge_id_idx
    on public.user_badges (badge_id);

insert into public.badges (id, name, description, image_path) values
    ('first_player', '1st Player', 'An early Blocket player.', 'assets/badges/1st player Badge.png'),
    ('six_month', '6 Month', 'A member for six months.', 'assets/badges/6 Month Badge.png'),
    ('administrator', 'Administrator', 'A Blocket administrator.', 'assets/badges/Administrator Badge.png'),
    ('booster', 'Booster', 'Supports the Blocket community.', 'assets/badges/Booster Badge.png'),
    ('co_owner', 'Co-Owner', 'A Blocket co-owner.', 'assets/badges/Co-Owner Badge.png'),
    ('developer', 'Developer', 'A Blocket developer.', 'assets/badges/Developer Badge.png'),
    ('hacker', 'Hacker', 'A Blocket hacker badge.', 'assets/badges/Hacker Badge.png'),
    ('mythical', 'Mythical', 'A mythical Blocket badge.', 'assets/badges/Mythical Badge.png'),
    ('og', 'OG', 'An original Blocket member.', 'assets/badges/OG Badge.png'),
    ('owner', 'Owner', 'A Blocket owner.', 'assets/badges/Owner Badge.png'),
    ('staff', 'Staff', 'A member of the Blocket staff.', 'assets/badges/Staff Badge.png'),
    ('tester', 'Tester', 'A Blocket tester.', 'assets/badges/Tester Badge.png'),
    ('verified', 'Verified', 'A verified Blocket member.', 'assets/badges/Verified Badge.png'),
    ('youtuber', 'YouTuber', 'A Blocket creator.', 'assets/badges/YouTuber Badge.png')
on conflict (id) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
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

drop trigger if exists player_stats_set_updated_at on public.player_stats;
create trigger player_stats_set_updated_at
before update on public.player_stats
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    requested_username text;
    safe_username text;
begin
    requested_username := lower(regexp_replace(
        coalesce(new.raw_user_meta_data ->> 'username', ''),
        '[^a-zA-Z0-9_]',
        '',
        'g'
    ));
    safe_username := left(requested_username, 24);

    if length(safe_username) < 3 then
        safe_username := 'player_' || left(replace(new.id::text, '-', ''), 8);
    elsif exists (
        select 1
        from public.profiles
        where username = safe_username
    ) then
        safe_username := left(safe_username, 15) || '_' || left(replace(new.id::text, '-', ''), 8);
    end if;

    insert into public.profiles (id, username)
    values (new.id, safe_username);

    insert into public.player_stats (user_id)
    values (new.id);

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.player_stats enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Users can read their own stats" on public.player_stats;
create policy "Users can read their own stats"
on public.player_stats for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own stats" on public.player_stats;
revoke insert, update, delete on public.player_stats from authenticated;

drop policy if exists "Authenticated users can read badges" on public.badges;
create policy "Authenticated users can read badges"
on public.badges for select to authenticated
using (true);

drop policy if exists "Users can read their own earned badges" on public.user_badges;
create policy "Users can read their own earned badges"
on public.user_badges for select to authenticated
using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (username) on public.profiles to authenticated;
grant select on public.player_stats to authenticated;
grant select on public.badges to authenticated;
grant select on public.user_badges to authenticated;

commit;
