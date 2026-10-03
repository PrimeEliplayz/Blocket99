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

create table if not exists public.friendships (
    id uuid primary key default gen_random_uuid(),
    requester_id uuid not null references public.profiles (id) on delete cascade,
    recipient_id uuid not null references public.profiles (id) on delete cascade,
    status text not null default 'pending' check (status in ('pending', 'accepted')),
    created_at timestamptz not null default now(),
    accepted_at timestamptz,
    check (requester_id <> recipient_id),
    unique (requester_id, recipient_id)
);

create index if not exists friendships_recipient_status_idx
    on public.friendships (recipient_id, status);

create table if not exists public.player_stats (
    user_id uuid primary key references public.profiles (id) on delete cascade,
    packs_opened bigint not null default 0 check (packs_opened >= 0),
    blooks_unlocked integer not null default 0 check (blooks_unlocked >= 0),
    total_blooks integer not null default 917 check (total_blooks > 0),
    tokens bigint not null default 100 check (tokens >= 0),
    updated_at timestamptz not null default now()
);

alter table public.player_stats
    add column if not exists packs_opened bigint not null default 0 check (packs_opened >= 0),
    add column if not exists blooks_unlocked integer not null default 0 check (blooks_unlocked >= 0),
    add column if not exists total_blooks integer not null default 917 check (total_blooks > 0),
    add column if not exists tokens bigint not null default 0 check (tokens >= 0);

create table if not exists public.token_claims (
    user_id uuid not null references public.profiles (id) on delete cascade,
    claim_day date not null,
    amount bigint not null check (amount > 0),
    primary key (user_id, claim_day)
);

create table if not exists public.blooks (
    id text primary key,
    name text not null unique,
    rarity text not null default 'Common',
    description text not null default '',
    image_path text,
    sort_order integer not null default 0
);

create table if not exists public.packs (
    id text primary key,
    name text not null unique,
    subtitle text not null default '',
    price_tokens bigint not null check (price_tokens >= 0),
    is_available boolean not null default true,
    sort_order integer not null default 0
);

create table if not exists public.pack_blooks (
    pack_id text not null references public.packs (id) on delete cascade,
    blook_id text not null references public.blooks (id) on delete cascade,
    weight integer not null default 1 check (weight > 0),
    primary key (pack_id, blook_id)
);

create table if not exists public.user_blooks (
    user_id uuid not null references public.profiles (id) on delete cascade,
    blook_id text not null references public.blooks (id) on delete cascade,
    quantity integer not null default 1 check (quantity >= 0),
    obtained_at timestamptz not null default now(),
    primary key (user_id, blook_id)
);

create table if not exists public.pack_openings (
    id bigint generated always as identity primary key,
    user_id uuid not null references public.profiles (id) on delete cascade,
    pack_id text not null references public.packs (id),
    blook_id text not null references public.blooks (id),
    price_paid bigint not null check (price_paid >= 0),
    opened_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
    id bigint generated always as identity primary key,
    author_id uuid not null references public.profiles (id) on delete cascade,
    room text not null default 'global' check (room = 'global'),
    body text not null check (char_length(body) between 1 and 500),
    created_at timestamptz not null default now()
);

create table if not exists public.clans (
    id uuid primary key default gen_random_uuid(),
    name text not null unique check (char_length(name) between 3 and 32),
    description text not null default '' check (char_length(description) <= 240),
    owner_id uuid not null references public.profiles (id) on delete cascade,
    created_at timestamptz not null default now()
);

create table if not exists public.clan_members (
    clan_id uuid not null references public.clans (id) on delete cascade,
    user_id uuid not null references public.profiles (id) on delete cascade,
    role text not null default 'member' check (role in ('owner', 'member')),
    joined_at timestamptz not null default now(),
    primary key (clan_id, user_id)
);

create table if not exists public.clan_invites (
    id uuid primary key default gen_random_uuid(),
    clan_id uuid not null references public.clans (id) on delete cascade,
    invitee_id uuid not null references public.profiles (id) on delete cascade,
    inviter_id uuid not null references public.profiles (id) on delete cascade,
    status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
    created_at timestamptz not null default now(),
    unique (clan_id, invitee_id)
);

create table if not exists public.clan_messages (
    id bigint generated always as identity primary key,
    clan_id uuid not null references public.clans (id) on delete cascade,
    author_id uuid not null references public.profiles (id) on delete cascade,
    body text not null check (char_length(body) between 1 and 500),
    created_at timestamptz not null default now()
);

create table if not exists public.market_listings (
    id uuid primary key default gen_random_uuid(),
    seller_id uuid not null references public.profiles (id) on delete cascade,
    blook_id text not null references public.blooks (id),
    quantity integer not null default 1 check (quantity >= 0),
    price_each bigint not null check (price_each > 0),
    status text not null default 'active' check (status in ('active', 'sold', 'cancelled')),
    created_at timestamptz not null default now()
);

create table if not exists public.news_posts (
    id bigint generated always as identity primary key,
    title text not null,
    body text not null,
    image_path text,
    is_published boolean not null default false,
    published_at timestamptz,
    created_at timestamptz not null default now()
);

alter table public.news_posts add column if not exists image_path text;

insert into public.blooks (id, name, rarity, description, sort_order) values
    ('seel', 'Seel', 'Uncommon', 'A cool friend for your collection.', 1)
on conflict (id) do nothing;

insert into public.packs (id, name, subtitle, price_tokens, sort_order) values
    ('seel_pack', 'Seel Pack', 'A cool collection', 10, 1)
on conflict (id) do nothing;

insert into public.pack_blooks (pack_id, blook_id, weight) values
    ('seel_pack', 'seel', 1)
on conflict (pack_id, blook_id) do nothing;

create or replace view public.leaderboard
with (security_invoker = true)
as
select p.username, p.avatar_path, s.tokens, s.blooks_unlocked, s.packs_opened
from public.player_stats as s
join public.profiles as p on p.id = s.user_id;

create or replace view public.clan_roster
with (security_invoker = true)
as
select c.id, c.name, c.description, c.created_at, count(m.user_id)::integer as member_count
from public.clans as c
left join public.clan_members as m on m.clan_id = c.id
group by c.id, c.name, c.description, c.created_at;

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

    insert into public.player_stats (user_id, tokens)
    values (new.id, 100);

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
alter table public.blooks enable row level security;
alter table public.packs enable row level security;
alter table public.pack_blooks enable row level security;
alter table public.user_blooks enable row level security;
alter table public.pack_openings enable row level security;
alter table public.chat_messages enable row level security;
alter table public.clans enable row level security;
alter table public.clan_members enable row level security;
alter table public.market_listings enable row level security;
alter table public.news_posts enable row level security;
alter table public.friendships enable row level security;
alter table public.token_claims enable row level security;
alter table public.clan_invites enable row level security;
alter table public.clan_messages enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Authenticated users can read public profiles" on public.profiles;
create policy "Authenticated users can read public profiles"
on public.profiles for select to authenticated using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Users can read their own stats" on public.player_stats;
create policy "Users can read their own stats"
on public.player_stats for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Authenticated users can read leaderboard stats" on public.player_stats;
create policy "Authenticated users can read leaderboard stats"
on public.player_stats for select to authenticated using (true);

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

drop policy if exists "Authenticated users can read public earned badges" on public.user_badges;
create policy "Authenticated users can read public earned badges"
on public.user_badges for select to authenticated using (true);

drop policy if exists "Authenticated users can read blooks" on public.blooks;
create policy "Authenticated users can read blooks"
on public.blooks for select to authenticated using (true);

drop policy if exists "Authenticated users can read packs" on public.packs;
create policy "Authenticated users can read packs"
on public.packs for select to authenticated using (true);

drop policy if exists "Authenticated users can read pack contents" on public.pack_blooks;
create policy "Authenticated users can read pack contents"
on public.pack_blooks for select to authenticated using (true);

drop policy if exists "Users can read their own inventory" on public.user_blooks;
create policy "Users can read their own inventory"
on public.user_blooks for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own pack history" on public.pack_openings;
create policy "Users can read their own pack history"
on public.pack_openings for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Authenticated users can read global chat" on public.chat_messages;
create policy "Authenticated users can read global chat"
on public.chat_messages for select to authenticated
using (room = 'global');

drop policy if exists "Users can send global chat messages" on public.chat_messages;
create policy "Users can send global chat messages"
on public.chat_messages for insert to authenticated
with check ((select auth.uid()) = author_id and room = 'global');

drop policy if exists "Users can delete their own chat messages" on public.chat_messages;
create policy "Users can delete their own chat messages"
on public.chat_messages for delete to authenticated
using ((select auth.uid()) = author_id);

drop policy if exists "Authenticated users can read clans" on public.clans;
create policy "Authenticated users can read clans"
on public.clans for select to authenticated using (true);

drop policy if exists "Authenticated users can read clan memberships" on public.clan_members;
create policy "Authenticated users can read clan memberships"
on public.clan_members for select to authenticated using (true);

drop policy if exists "Users can read their own friendships" on public.friendships;
create policy "Users can read their own friendships"
on public.friendships for select to authenticated
using ((select auth.uid()) in (requester_id, recipient_id));

drop policy if exists "Users can read their own token claims" on public.token_claims;
create policy "Users can read their own token claims"
on public.token_claims for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Invitees and clan owners can read invitations" on public.clan_invites;
create policy "Invitees and clan owners can read invitations"
on public.clan_invites for select to authenticated
using (
    invitee_id = (select auth.uid())
    or exists (
        select 1 from public.clan_members as membership
        where membership.clan_id = clan_invites.clan_id
            and membership.user_id = (select auth.uid())
            and membership.role = 'owner'
    )
);

drop policy if exists "Clan members can read clan messages" on public.clan_messages;
create policy "Clan members can read clan messages"
on public.clan_messages for select to authenticated
using (exists (
    select 1 from public.clan_members as membership
    where membership.clan_id = clan_messages.clan_id
        and membership.user_id = (select auth.uid())
));

drop policy if exists "Clan members can write their own messages" on public.clan_messages;
create policy "Clan members can write their own messages"
on public.clan_messages for insert to authenticated
with check (
    author_id = (select auth.uid())
    and exists (
        select 1 from public.clan_members as membership
        where membership.clan_id = clan_messages.clan_id
            and membership.user_id = (select auth.uid())
    )
);

drop policy if exists "Authenticated users can read active market listings" on public.market_listings;
create policy "Authenticated users can read active market listings"
on public.market_listings for select to authenticated
using (status = 'active' or (select auth.uid()) = seller_id);

drop policy if exists "Authenticated users can read published news" on public.news_posts;
create policy "Authenticated users can read published news"
on public.news_posts for select to authenticated using (is_published);

create or replace function public.open_pack(p_pack_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    current_user_id uuid := auth.uid();
    pack_row public.packs%rowtype;
    chosen_blook public.blooks%rowtype;
    current_tokens bigint;
    total_weight bigint;
    weight_roll bigint;
begin
    if current_user_id is null then
        raise exception 'You must be signed in to open a pack.';
    end if;

    select * into pack_row
    from public.packs
    where id = p_pack_id and is_available
    for share;

    if not found then
        raise exception 'This pack is not available.';
    end if;

    select tokens into current_tokens
    from public.player_stats
    where user_id = current_user_id
    for update;

    if not found or current_tokens < pack_row.price_tokens then
        raise exception 'Not enough tokens to open this pack.';
    end if;

    select sum(weight) into total_weight
    from public.pack_blooks
    where pack_id = pack_row.id;

    if coalesce(total_weight, 0) < 1 then
        raise exception 'This pack has no blooks yet.';
    end if;

    weight_roll := floor(random() * total_weight)::bigint;
    select b.* into chosen_blook
    from (
        select pb.blook_id, pb.weight,
            sum(pb.weight) over (order by pb.blook_id) as weight_limit
        from public.pack_blooks as pb
        where pb.pack_id = pack_row.id
    ) as weighted
    join public.blooks as b on b.id = weighted.blook_id
    where weighted.weight_limit > weight_roll
    order by weighted.weight_limit
    limit 1;

    insert into public.user_blooks (user_id, blook_id, quantity)
    values (current_user_id, chosen_blook.id, 1)
    on conflict (user_id, blook_id)
    do update set quantity = public.user_blooks.quantity + 1;

    update public.player_stats
    set tokens = tokens - pack_row.price_tokens,
        packs_opened = packs_opened + 1,
        blooks_unlocked = (
            select count(*)::integer
            from public.user_blooks
            where user_id = current_user_id and quantity > 0
        )
    where user_id = current_user_id;

    insert into public.pack_openings (user_id, pack_id, blook_id, price_paid)
    values (current_user_id, pack_row.id, chosen_blook.id, pack_row.price_tokens);

    return jsonb_build_object(
        'id', chosen_blook.id,
        'name', chosen_blook.name,
        'rarity', chosen_blook.rarity,
        'image_path', chosen_blook.image_path
    );
end;
$$;

create or replace function public.create_clan(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    current_user_id uuid := auth.uid();
    new_clan_id uuid;
begin
    if current_user_id is null then raise exception 'Sign in to create a clan.'; end if;
    if char_length(trim(p_name)) not between 3 and 32 then raise exception 'Clan names must be 3 to 32 characters.'; end if;

    insert into public.clans (name, owner_id)
    values (trim(p_name), current_user_id)
    returning id into new_clan_id;

    insert into public.clan_members (clan_id, user_id, role)
    values (new_clan_id, current_user_id, 'owner');
    return new_clan_id;
end;
$$;

create or replace function public.join_clan(p_clan_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    current_user_id uuid := auth.uid();
    pending_invite_id uuid;
begin
    if current_user_id is null then raise exception 'Sign in to accept a clan invitation.'; end if;

    select id into pending_invite_id
    from public.clan_invites
    where clan_id = p_clan_id
        and invitee_id = current_user_id
        and status = 'pending'
    for update;

    if not found then raise exception 'You must be invited before joining this clan.'; end if;

    insert into public.clan_members (clan_id, user_id)
    values (p_clan_id, current_user_id)
    on conflict (clan_id, user_id) do nothing;

    update public.clan_invites
    set status = 'accepted'
    where id = pending_invite_id;
end;
$$;

create or replace function public.invite_to_clan(p_clan_id uuid, p_username text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    current_user_id uuid := auth.uid();
    invited_user_id uuid;
    invite_id uuid;
    member_role text;
begin
    if current_user_id is null then raise exception 'Sign in to invite a player.'; end if;

    select role into member_role
    from public.clan_members
    where clan_id = p_clan_id and user_id = current_user_id;
    if not found or member_role <> 'owner' then raise exception 'Only the clan owner can send invitations.'; end if;

    select id into invited_user_id
    from public.profiles
    where username = lower(trim(p_username));
    if not found then raise exception 'No player found with that username.'; end if;
    if invited_user_id = current_user_id then raise exception 'You are already in this clan.'; end if;
    if exists (select 1 from public.clan_members where clan_id = p_clan_id and user_id = invited_user_id) then
        raise exception 'That player is already a clan member.';
    end if;

    insert into public.clan_invites (clan_id, invitee_id, inviter_id)
    values (p_clan_id, invited_user_id, current_user_id)
    returning id into invite_id;
    return invite_id;
end;
$$;

create or replace function public.send_friend_request(p_username text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    current_user_id uuid := auth.uid();
    target_user_id uuid;
    existing public.friendships%rowtype;
    request_id uuid;
begin
    if current_user_id is null then raise exception 'Sign in to add a friend.'; end if;
    select id into target_user_id from public.profiles where username = lower(trim(p_username));
    if not found then raise exception 'No player found with that username.'; end if;
    if target_user_id = current_user_id then raise exception 'You cannot add yourself.'; end if;

    select * into existing
    from public.friendships
    where (requester_id = current_user_id and recipient_id = target_user_id)
        or (requester_id = target_user_id and recipient_id = current_user_id)
    for update;

    if found and existing.status = 'accepted' then raise exception 'You are already friends.'; end if;
    if found and existing.requester_id = current_user_id then raise exception 'Friend request already sent.'; end if;
    if found then raise exception 'This player already sent you a request.'; end if;

    insert into public.friendships (requester_id, recipient_id)
    values (current_user_id, target_user_id)
    returning id into request_id;
    return request_id;
end;
$$;

create or replace function public.respond_friend_request(p_request_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    if auth.uid() is null then raise exception 'Sign in to respond to a friend request.'; end if;

    if p_accept then
        update public.friendships
        set status = 'accepted', accepted_at = now()
        where id = p_request_id and recipient_id = auth.uid() and status = 'pending';
    else
        delete from public.friendships
        where id = p_request_id and recipient_id = auth.uid() and status = 'pending';
    end if;

    if not found then raise exception 'This friend request is no longer available.'; end if;
end;
$$;

create or replace function public.claim_daily_tokens()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    current_user_id uuid := auth.uid();
    updated_tokens bigint;
begin
    if current_user_id is null then raise exception 'Sign in to claim tokens.'; end if;

    insert into public.token_claims (user_id, claim_day, amount)
    values (current_user_id, (now() at time zone 'utc')::date, 100)
    on conflict (user_id, claim_day) do nothing;

    if not found then
        select tokens into updated_tokens from public.player_stats where user_id = current_user_id;
        return jsonb_build_object('claimed', false, 'tokens', updated_tokens);
    end if;

    update public.player_stats
    set tokens = tokens + 100
    where user_id = current_user_id
    returning tokens into updated_tokens;

    return jsonb_build_object('claimed', true, 'tokens', updated_tokens);
end;
$$;

create or replace function public.create_market_listing(p_blook_id text, p_quantity integer, p_price_each bigint)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    current_user_id uuid := auth.uid();
    listing_id uuid;
begin
    if current_user_id is null then raise exception 'Sign in to create a listing.'; end if;
    if p_quantity < 1 or p_price_each < 1 then raise exception 'Quantity and price must be positive.'; end if;

    update public.user_blooks
    set quantity = quantity - p_quantity
    where user_id = current_user_id and blook_id = p_blook_id and quantity >= p_quantity;

    if not found then raise exception 'You do not have that many copies to list.'; end if;

    update public.player_stats
    set blooks_unlocked = (
        select count(*)::integer
        from public.user_blooks
        where user_id = current_user_id and quantity > 0
    )
    where user_id = current_user_id;

    insert into public.market_listings (seller_id, blook_id, quantity, price_each)
    values (current_user_id, p_blook_id, p_quantity, p_price_each)
    returning id into listing_id;
    return listing_id;
end;
$$;

create or replace function public.cancel_market_listing(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    current_user_id uuid := auth.uid();
    listing_row public.market_listings%rowtype;
begin
    if current_user_id is null then raise exception 'Sign in to cancel a listing.'; end if;

    select * into listing_row
    from public.market_listings
    where id = p_listing_id and seller_id = current_user_id and status = 'active'
    for update;

    if not found then raise exception 'This listing is no longer active.'; end if;

    insert into public.user_blooks (user_id, blook_id, quantity)
    values (current_user_id, listing_row.blook_id, listing_row.quantity)
    on conflict (user_id, blook_id)
    do update set quantity = public.user_blooks.quantity + excluded.quantity;

    update public.market_listings
    set quantity = 0, status = 'cancelled'
    where id = listing_row.id;

    update public.player_stats
    set blooks_unlocked = (
        select count(*)::integer
        from public.user_blooks
        where user_id = current_user_id and quantity > 0
    )
    where user_id = current_user_id;
end;
$$;

create or replace function public.purchase_listing(p_listing_id uuid, p_quantity integer default 1)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    current_user_id uuid := auth.uid();
    listing_row public.market_listings%rowtype;
    purchase_total bigint;
    remaining_quantity integer;
begin
    if current_user_id is null then raise exception 'Sign in to buy a listing.'; end if;
    if p_quantity < 1 then raise exception 'Purchase quantity must be positive.'; end if;

    select * into listing_row
    from public.market_listings
    where id = p_listing_id and status = 'active'
    for update;

    if not found then raise exception 'This listing is no longer available.'; end if;
    if listing_row.seller_id = current_user_id then raise exception 'You cannot buy your own listing.'; end if;
    if p_quantity > listing_row.quantity then raise exception 'Not enough copies remain in this listing.'; end if;

    purchase_total := listing_row.price_each * p_quantity;
    perform 1 from public.player_stats
    where user_id in (listing_row.seller_id, current_user_id)
    order by user_id
    for update;

    update public.player_stats
    set tokens = tokens - purchase_total
    where user_id = current_user_id and tokens >= purchase_total;
    if not found then raise exception 'Not enough tokens for this purchase.'; end if;

    update public.player_stats
    set tokens = tokens + purchase_total
    where user_id = listing_row.seller_id;

    insert into public.user_blooks (user_id, blook_id, quantity)
    values (current_user_id, listing_row.blook_id, p_quantity)
    on conflict (user_id, blook_id)
    do update set quantity = public.user_blooks.quantity + excluded.quantity;

    update public.player_stats
    set blooks_unlocked = (
        select count(*)::integer
        from public.user_blooks
        where user_id = current_user_id and quantity > 0
    )
    where user_id = current_user_id;

    remaining_quantity := listing_row.quantity - p_quantity;
    update public.market_listings
    set quantity = remaining_quantity,
        status = case when remaining_quantity = 0 then 'sold' else 'active' end
    where id = listing_row.id;

    return jsonb_build_object('quantity', p_quantity, 'total', purchase_total);
end;
$$;

revoke all on function public.open_pack(text) from public;
revoke all on function public.create_clan(text) from public;
revoke all on function public.join_clan(uuid) from public;
revoke all on function public.invite_to_clan(uuid, text) from public;
revoke all on function public.send_friend_request(text) from public;
revoke all on function public.respond_friend_request(uuid, boolean) from public;
revoke all on function public.claim_daily_tokens() from public;
revoke all on function public.create_market_listing(text, integer, bigint) from public;
revoke all on function public.cancel_market_listing(uuid) from public;
revoke all on function public.purchase_listing(uuid, integer) from public;
grant execute on function public.open_pack(text) to authenticated;
grant execute on function public.create_clan(text) to authenticated;
grant execute on function public.join_clan(uuid) to authenticated;
grant execute on function public.invite_to_clan(uuid, text) to authenticated;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.claim_daily_tokens() to authenticated;
grant execute on function public.create_market_listing(text, integer, bigint) to authenticated;
grant execute on function public.cancel_market_listing(uuid) to authenticated;
grant execute on function public.purchase_listing(uuid, integer) to authenticated;

revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (username) on public.profiles to authenticated;
grant select on public.player_stats to authenticated;
grant select on public.badges to authenticated;
grant select on public.user_badges to authenticated;
grant select on public.blooks, public.packs, public.pack_blooks to authenticated;
grant select on public.user_blooks, public.pack_openings to authenticated;
grant select on public.chat_messages to authenticated;
grant insert, delete on public.chat_messages to authenticated;
grant usage, select on sequence public.chat_messages_id_seq to authenticated;
grant select on public.clans, public.clan_members to authenticated;
grant select on public.friendships, public.clan_invites, public.clan_messages, public.token_claims to authenticated;
grant insert on public.clan_messages to authenticated;
grant usage, select on sequence public.clan_messages_id_seq to authenticated;
grant select on public.market_listings to authenticated;
grant select on public.news_posts to authenticated;
grant select on public.leaderboard, public.clan_roster to authenticated;

commit;
