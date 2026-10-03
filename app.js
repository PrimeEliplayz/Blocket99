import { supabase, getCurrentUser, getStatsPageData, signOut } from './auth.js';

const page = document.body.dataset.page;
const activePage = page === 'player' ? 'stats' : page === 'clan-detail' ? 'clans' : page;
const app = document.createElement('div');
app.className = 'app-shell';
document.body.append(app);

const navItems = [
    ['stats', 'Stats', 'stats.html', '<path d="M4 19h16M7 15V9m5 6V5m5 10v-4"/>'],
    ['leaderboard', 'Leaderboard', 'leaderboard.html', '<path d="M8 21h8m-4-4v4m-5-8H5a2 2 0 0 1-2-2V5h5m8 8h3a2 2 0 0 0 2-2V5h-5"/><path d="M8 3h8v7a4 4 0 0 1-8 0V3Z"/>'],
    ['chat', 'Chat', 'chat.html', '<path d="M21 11.5a7.5 7.5 0 0 1-8 7.5 8 8 0 0 1-3.5-.8L4 20l1.5-4A7.5 7.5 0 1 1 21 11.5Z"/><path d="M5 4.5a6.5 6.5 0 0 0-2 10"/>'],
    ['clans', 'Clans', 'clans.html', '<path d="m14 7 3 3m-8 4 8-8 3 3-8 8m-3-3-3 3m-3 3 5-5m11-9 2 2"/>'],
    ['market', 'Market', 'market.html', '<path d="M3 9h18l-2-5H5L3 9Zm2 0v11h14V9m-9 11v-7h4v7"/>'],
    ['blooks', 'Blooks', 'blooks.html', '<path d="M4 7h16v14H4zM7 3h10v4H7zM8 11h8m-8 4h5"/>'],
    ['inventory', 'Inventory', 'inventory.html', '<path d="M5 8h14l1 13H4L5 8Zm3 0V5a4 4 0 0 1 8 0v3"/>'],
    ['bazaar', 'Bazaar', 'bazaar.html', '<path d="M4 7h16l-2 4H6L4 7Zm2 4v10h12V11m-8 10v-6h4v6"/>'],
    ['news', 'News', 'news.html', '<path d="M4 4h14v16H4zM18 8h2v12h-2M7 8h8m-8 4h8m-8 4h5"/>'],
    ['credits', 'Credits', 'credits.html', '<path d="M12 3v18m5-14H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6"/>'],
    ['settings', 'Settings', 'settings.html', '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.7-1.4-2.4L7.1 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 2Z"/>']
];

const titles = {
    stats: ['Stats', 'Your Blocket overview.'],
    player: ['Player', 'Player profile.'],
    leaderboard: ['Leaderboard', 'See how players are stacking up.'],
    chat: ['Chat', 'Talk with the Blocket community.'],
    clans: ['Clans', 'Find your crew or start one.'],
    'clan-detail': ['Clan', 'Clan details and members.'],
    market: ['Market', 'Open packs and browse player listings.'],
    blooks: ['Blooks', 'Explore the blook catalog.'],
    inventory: ['Inventory', 'Your collection, all in one place.'],
    bazaar: ['Bazaar', 'Put a blook up for sale.'],
    news: ['News', 'Updates from the Blocket team.'],
    credits: ['Credits', 'Your token balance and ways to earn.'],
    settings: ['Settings', 'Manage your Blocket profile.']
};

const icon = (path) => `<span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${path}</svg></span>`;
const sidebar = document.createElement('aside');
sidebar.className = 'sidebar';
sidebar.innerHTML = `<a class="brand" href="stats.html" aria-label="Blocket home">BLOCKET</a><nav class="side-nav" aria-label="Main navigation">${navItems.map(([id, label, url, path]) => `<a class="nav-link" href="${url}" ${id === activePage ? 'aria-current="page"' : ''}>${icon(path)}<span>${label}</span></a>`).join('')}</nav><footer class="sidebar-footer"><div class="social-links"><a class="social-link" href="https://discord.com" aria-label="Discord">D</a><a class="social-link" href="https://www.youtube.com" aria-label="YouTube">▶</a><a class="social-link" href="https://x.com" aria-label="X">X</a></div><a class="store-link" href="market.html">$ Visit the Store</a><button class="sidebar-sign-out" id="sign-out" type="button">Sign out</button></footer>`;
app.append(sidebar);

const main = document.createElement('main');
main.className = 'app-main';
main.id = 'app-main';
const pageWrap = document.createElement('div');
pageWrap.className = 'page-wrap';
const [title, subtitle] = titles[page] || titles.stats;
pageWrap.innerHTML = `<p class="page-kicker">BLOCKET</p><h1 class="page-title">${title}</h1><p class="page-subtitle">${subtitle}</p><div id="page-content"></div><p class="notice" id="page-notice" role="status" aria-live="polite"></p>`;
main.append(pageWrap);
app.append(main);

const badgeDialog = document.createElement('dialog');
badgeDialog.className = 'dialog';
badgeDialog.innerHTML = '<div class="badge-dialog-icon"><img class="badge-dialog-image" id="badge-dialog-image" alt=""></div><h2 id="badge-dialog-title"></h2><p id="badge-dialog-description"></p><button class="button-secondary" id="badge-dialog-close" type="button">Close</button>';
app.append(badgeDialog);
badgeDialog.querySelector('#badge-dialog-close').addEventListener('click', () => badgeDialog.close());

const content = document.getElementById('page-content');
const notice = document.getElementById('page-notice');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const money = (value) => Number(value || 0).toLocaleString();
const node = (tag, text, className = '') => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
};
const panel = (heading) => {
    const section = node('section', undefined, 'surface panel');
    section.append(node('h2', heading, 'panel-title'));
    return section;
};
const setNotice = (text, state = '') => {
    notice.textContent = text;
    notice.dataset.state = state;
};
const setContent = (markup) => { content.innerHTML = markup; };
const empty = (text) => node('p', text, 'notice');
const showBadgeDetails = (badge) => {
    badgeDialog.querySelector('#badge-dialog-image').src = badge.image_path;
    badgeDialog.querySelector('#badge-dialog-title').textContent = badge.name;
    badgeDialog.querySelector('#badge-dialog-description').textContent = badge.description;
    badgeDialog.showModal();
};

async function requireUser() {
    const { user, error } = await getCurrentUser();
    if (error || !user) {
        window.location.replace('login.html');
        return null;
    }
    return user;
}

async function renderStats(user) {
    const result = await getStatsPageData(user.id);
    if (result.error) throw result.error;
    const { profile, stats, badges, earnedBadgeIds } = result;
    const [{ count: messagesSent, error: messagesError }, { data: relationships, error: friendsError }, { data: requests, error: requestsError }] = await Promise.all([
        supabase.from('chat_messages').select('id', { count: 'exact', head: true }).eq('author_id', user.id),
        supabase.from('friendships').select('requester_id, recipient_id').eq('status', 'accepted').or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`),
        supabase.from('friendships').select('id, requester_id').eq('recipient_id', user.id).eq('status', 'pending')
    ]);
    if (messagesError || friendsError || requestsError) throw messagesError || friendsError || requestsError;

    const otherIds = [...new Set([
        ...relationships.map((row) => row.requester_id === user.id ? row.recipient_id : row.requester_id),
        ...requests.map((row) => row.requester_id)
    ])];
    const { data: people, error: peopleError } = otherIds.length
        ? await supabase.from('profiles').select('id, username, avatar_path').in('id', otherIds)
        : { data: [], error: null };
    if (peopleError) throw peopleError;
    const peopleById = new Map(people.map((person) => [person.id, person]));

    const shell = node('section', undefined, 'stats-dashboard');
    const topbar = node('header', undefined, 'profile-topbar');
    const topActions = node('nav', undefined, 'profile-top-actions');
    const back = node('a', '↶', 'profile-icon-button'); back.href = 'index.html'; back.setAttribute('aria-label', 'Back to home');
    const settings = node('a', '⚙', 'profile-icon-button'); settings.href = 'settings.html'; settings.setAttribute('aria-label', 'Settings');
    const news = node('a', '▤', 'profile-icon-button'); news.href = 'news.html'; news.setAttribute('aria-label', 'News');
    topActions.append(back, settings, news);
    const account = node('a', undefined, 'profile-account'); account.href = 'settings.html';
    const accountAvatar = node('img'); accountAvatar.src = profile.avatar_path || 'assets/badges/Gold%20Doubloon.webp'; accountAvatar.alt = '';
    account.append(accountAvatar, node('span', profile.username));
    topbar.append(topActions, node('h1', profile.username, 'profile-top-title'), account);
    shell.append(topbar);

    const profileHero = node('section', undefined, 'profile-hero');
    const heroAvatar = node('img', undefined, 'profile-hero-avatar');
    heroAvatar.src = profile.avatar_path || 'assets/badges/Gold%20Doubloon.webp'; heroAvatar.alt = `${profile.username} profile picture`;
    const heroInfo = node('div', undefined, 'profile-hero-info');
    heroInfo.append(node('h2', profile.username, 'profile-hero-name'));
    const badgeGrid = node('div', undefined, 'badge-grid');
    badges.filter((badge) => earnedBadgeIds.has(badge.id)).forEach((badge) => {
        const button = node('button', undefined, 'badge-button');
        button.type = 'button'; button.title = badge.name; button.setAttribute('aria-label', `Badge: ${badge.name}`);
        const image = node('img'); image.src = badge.image_path; image.alt = '';
        button.append(image); button.addEventListener('click', () => showBadgeDetails(badge)); badgeGrid.append(button);
    });
    heroInfo.append(badgeGrid);
    profileHero.append(heroAvatar, heroInfo);

    const actions = node('nav', undefined, 'profile-action-bar');
    const viewStats = node('a', 'View Stats', 'profile-action profile-action-orange'); viewStats.href = '#profile-stats';
    const trade = node('a', 'Trade', 'profile-action profile-action-green'); trade.href = 'bazaar.html';
    const giveaways = node('a', 'Giveaways', 'profile-action profile-action-pink'); giveaways.href = 'news.html';
    const claim = node('button', 'Claim Tokens', 'profile-action profile-action-lime'); claim.type = 'button';
    claim.addEventListener('click', async () => {
        claim.disabled = true;
        const { data, error } = await supabase.rpc('claim_daily_tokens');
        claim.disabled = false;
        if (error) setNotice(error.message, 'error');
        else {
            stats.tokens = data.tokens;
            document.getElementById('stat-tokens').textContent = money(data.tokens);
            setNotice(data.claimed ? 'Tokens claimed.' : 'You already claimed tokens today.', data.claimed ? 'success' : '');
        }
    });
    actions.append(viewStats, trade, giveaways, claim);
    shell.append(profileHero, actions);

    const searchForm = node('form', undefined, 'stats-player-search');
    searchForm.innerHTML = '<label class="sr-only" for="stats-search-name">Search player username</label><input id="stats-search-name" name="username" minlength="3" maxlength="24" pattern="[A-Za-z0-9_]{3,24}" placeholder="Search player" required><button class="search-icon-button" type="submit" aria-label="Search player"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg></button>';
    searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const username = new FormData(searchForm).get('username').toString().trim();
        window.location.assign(`player.html?username=${encodeURIComponent(username)}`);
    });
    shell.append(searchForm);

    const statsHeading = node('h2', 'Stats', 'section-tag');
    statsHeading.id = 'profile-stats';
    shell.append(statsHeading);
    const grid = node('section', undefined, 'stat-grid profile-stat-grid');
    const cards = [
        ['Tokens', 'tokenIcon.webp', stats.tokens, 'stat-tokens'],
        ['Blooks Unlocked', 'unlockIcon.webp', `${stats.blooks_unlocked} / ${stats.total_blooks}`],
        ['Packs Opened', 'openedIcon.webp', stats.packs_opened],
        ['Messages Sent', 'chat', messagesSent || 0]
    ];
    cards.forEach(([label, imagePath, value, id]) => {
        const card = node('article', undefined, 'stat-card');
        let image;
        if (imagePath === 'chat') {
            image = node('span', undefined, 'stat-icon stat-icon-chat');
            image.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v12H9l-5 3V5Z"/></svg>';
        } else {
            image = node('img'); image.className = 'stat-icon'; image.src = `assets/badges/${imagePath}`; image.alt = '';
        }
        const formattedValue = typeof value === 'number' ? money(value) : value;
        const valueNode = node('p', formattedValue, `stat-value${id ? ` ${id}` : ''}`);
        if (id) valueNode.id = id;
        const text = node('div'); text.append(node('p', label, 'stat-label'), valueNode);
        card.append(image, text, node('span', undefined, 'stat-balance'));
        grid.append(card);
    });
    shell.append(grid);

    const socialGrid = node('section', undefined, 'social-panels');
    const friendsPanel = node('section', undefined, 'social-panel');
    friendsPanel.append(node('h2', 'Friends', 'section-tag'));
    const friendGrid = node('div', undefined, 'friend-grid');
    relationships.forEach((relationship) => {
        const friendId = relationship.requester_id === user.id ? relationship.recipient_id : relationship.requester_id;
        const friend = peopleById.get(friendId);
        if (friend) friendGrid.append(createPlayerCard(friend));
    });
    if (!relationships.length) friendGrid.append(node('p', 'No friends yet.', 'empty-note'));
    friendsPanel.append(friendGrid);

    const requestsPanel = node('section', undefined, 'social-panel');
    requestsPanel.append(node('h2', 'Requests', 'section-tag'));
    const requestGrid = node('div', undefined, 'request-grid');
    requests.forEach((request) => {
        const person = peopleById.get(request.requester_id);
        if (!person) return;
        const card = createPlayerCard(person);
        const controls = node('div', undefined, 'request-controls');
        const accept = node('button', 'Accept', 'mini-action mini-action-accept'); accept.type = 'button';
        const decline = node('button', '×', 'mini-action mini-action-decline'); decline.type = 'button'; decline.setAttribute('aria-label', `Decline request from ${person.username}`);
        accept.addEventListener('click', () => respondToFriendRequest(request.id, true));
        decline.addEventListener('click', () => respondToFriendRequest(request.id, false));
        controls.append(accept, decline); card.append(controls); requestGrid.append(card);
    });
    if (!requests.length) requestGrid.append(node('p', 'No requests.', 'empty-note'));
    requestsPanel.append(requestGrid);
    socialGrid.append(friendsPanel, requestsPanel);
    shell.append(socialGrid);
    content.replaceChildren(shell);
}

function createPlayerCard(profile) {
    const card = node('a', undefined, 'friend-card');
    card.href = `player.html?username=${encodeURIComponent(profile.username)}`;
    const avatar = node('img'); avatar.src = profile.avatar_path || 'assets/badges/Gold%20Doubloon.webp'; avatar.alt = '';
    card.append(avatar, node('span', profile.username));
    return card;
}

async function respondToFriendRequest(requestId, accept) {
    const { error } = await supabase.rpc('respond_friend_request', { p_request_id: requestId, p_accept: accept });
    if (error) setNotice(error.message, 'error');
    else window.location.reload();
}

async function renderPlayer(user) {
    const username = new URLSearchParams(window.location.search).get('username')?.trim().toLowerCase();
    if (!username || !/^[a-z0-9_]{3,24}$/.test(username)) throw new Error('Enter a valid player username.');
    const { data: profile, error: profileError } = await supabase.from('profiles').select('id, username, avatar_path, created_at').eq('username', username).maybeSingle();
    if (profileError) throw profileError;
    if (!profile) { content.replaceChildren(node('p', 'No player found with that username.', 'empty-note')); return; }

    const [{ data: rows, error: badgeError }, { data: stats, error: statsError }, { data: existingRequest, error: requestError }] = await Promise.all([
        supabase.from('user_badges').select('badges(id, name, description, image_path)').eq('user_id', profile.id),
        supabase.from('player_stats').select('tokens, blooks_unlocked, total_blooks, packs_opened').eq('user_id', profile.id).single(),
        supabase.from('friendships').select('id').eq('requester_id', user.id).eq('recipient_id', profile.id).eq('status', 'pending').maybeSingle()
    ]);
    if (badgeError || statsError || requestError) throw badgeError || statsError || requestError;

    const badges = rows.map((row) => row.badges).filter(Boolean);
    const root = node('section', undefined, 'searched-player-page');
    const hero = node('header', undefined, 'searched-player-hero');
    const back = node('a', '← Back to Stats', 'button-secondary'); back.href = 'stats.html';
    const avatar = node('img'); avatar.src = profile.avatar_path || 'assets/badges/Gold%20Doubloon.webp'; avatar.alt = `${profile.username} profile picture`;
    const heading = node('div'); heading.append(node('h2', profile.username), node('p', `Member since ${new Date(profile.created_at).toLocaleDateString()}`));
    hero.append(back, avatar, heading);
    const addFriend = node('button', existingRequest ? 'Request Sent' : 'Add Friend', 'button-primary');
    addFriend.type = 'button'; addFriend.disabled = Boolean(existingRequest) || profile.id === user.id;
    addFriend.addEventListener('click', async () => {
        const { error } = await supabase.rpc('send_friend_request', { p_username: profile.username });
        if (error) setNotice(error.message, 'error');
        else { addFriend.textContent = 'Request Sent'; addFriend.disabled = true; }
    });
    hero.append(addFriend); root.append(hero);

    const statsGrid = node('section', undefined, 'stat-grid public-player-stats');
    [['Tokens', stats.tokens], ['Blooks', `${stats.blooks_unlocked} / ${stats.total_blooks}`], ['Packs Opened', stats.packs_opened]].forEach(([label, value]) => {
        const card = node('article', undefined, 'stat-card'); card.append(node('p', label, 'stat-label'), node('p', typeof value === 'number' ? money(value) : value, 'stat-value')); statsGrid.append(card);
    });
    root.append(statsGrid, node('h2', 'Badges', 'section-tag'));
    const badgeGrid = node('div', undefined, 'public-badge-grid');
    badges.forEach((badge) => {
        const button = node('button', undefined, 'badge-button'); button.type = 'button'; button.title = badge.name;
        button.setAttribute('aria-label', `Badge: ${badge.name}`);
        const image = node('img'); image.src = badge.image_path; image.alt = '';
        button.append(image); button.addEventListener('click', () => showBadgeDetails(badge)); badgeGrid.append(button);
    });
    root.append(badgeGrid);
    if (!badges.length) root.append(node('p', 'No badges to show.', 'empty-note'));
    content.replaceChildren(root);
}

async function renderLeaderboard() {
    const { data, error } = await supabase.from('leaderboard').select('username, avatar_path, tokens, blooks_unlocked, packs_opened').order('tokens', { ascending: false }).limit(50);
    if (error) throw error;
    const table = document.createElement('div'); table.className = 'table-wrap';
    table.innerHTML = '<table class="data-table"><thead><tr><th>Rank</th><th>Player</th><th>Tokens</th><th>Blooks</th><th>Packs</th></tr></thead><tbody></tbody></table>';
    const body = table.querySelector('tbody');
    data.forEach((player, index) => {
        const row = document.createElement('tr');
        [index + 1, player.username, money(player.tokens), `${player.blooks_unlocked} / 917`, money(player.packs_opened)].forEach((value) => row.append(node('td', value)));
        body.append(row);
    });
    content.replaceChildren(table);
}

async function renderChat(user) {
    setContent('<section class="surface panel"><div class="message-list" id="messages" aria-live="polite"></div><form class="inline-form" id="chat-form"><label class="field"><span>Message</span><input name="body" maxlength="500" required autocomplete="off" placeholder="Say something..."></label><button class="button-primary" type="submit">Send</button></form></section>');
    const list = document.getElementById('messages');
    const load = async () => {
        const { data, error } = await supabase.from('chat_messages').select('id, body, created_at, profiles(username)').eq('room', 'global').order('created_at', { ascending: false }).limit(80);
        if (error) throw error;
        list.replaceChildren();
        data.reverse().forEach((message) => {
            const item = node('article', undefined, 'chat-message');
            item.append(node('p', `${message.profiles?.username || 'Player'} · ${new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 'chat-meta'), node('p', message.body));
            list.append(item);
        });
        list.scrollTop = list.scrollHeight;
    };
    await load();
    const form = document.getElementById('chat-form');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const body = new FormData(form).get('body').toString().trim();
        if (!body) return;
        const { error } = await supabase.from('chat_messages').insert({ author_id: user.id, body, room: 'global' });
        if (error) { setNotice(error.message, 'error'); return; }
        form.reset(); await load();
    });
    window.setInterval(() => load().catch((error) => setNotice(error.message, 'error')), 7000);
}

async function renderClans(user) {
    setContent('<section class="surface panel clan-create-panel"><form class="inline-form" id="clan-form"><label class="field"><span>Create a clan</span><input name="name" minlength="3" maxlength="32" required placeholder="Clan name"></label><button class="button-primary" type="submit">Create Clan</button></form></section><section class="clan-invitations" id="clan-invitations"></section><section class="data-grid clan-list" id="clan-list"></section>');
    const list = document.getElementById('clan-list');
    const [{ data: clans, error: clansError }, { data: invitations, error: invitationsError }] = await Promise.all([
        supabase.from('clan_roster').select('*').order('member_count', { ascending: false }).limit(50),
        supabase.from('clan_invites').select('id, clan_id, created_at, clans(name)').eq('invitee_id', user.id).eq('status', 'pending').order('created_at', { ascending: false })
    ]);
    if (clansError || invitationsError) throw clansError || invitationsError;

    const invites = document.getElementById('clan-invitations');
    if (invitations.length) {
        invites.append(node('h2', 'Invitations', 'section-tag'));
        invitations.forEach((invite) => {
            const card = node('article', undefined, 'invitation-card');
            card.append(node('span', invite.clans.name));
            const accept = node('button', 'Accept Invitation', 'button-primary'); accept.type = 'button';
            accept.addEventListener('click', async () => {
                accept.disabled = true;
                const { error } = await supabase.rpc('join_clan', { p_clan_id: invite.clan_id });
                if (error) { accept.disabled = false; setNotice(error.message, 'error'); }
                else window.location.assign(`clan.html?clan=${encodeURIComponent(invite.clan_id)}`);
            });
            card.append(accept); invites.append(card);
        });
    }

    if (!clans.length) list.append(node('p', 'No clans yet.', 'empty-note'));
    clans.forEach((clan) => {
        const card = node('a', undefined, 'clan-list-card');
        card.href = `clan.html?clan=${encodeURIComponent(clan.id)}`;
        card.append(node('span', '♜', 'clan-card-emblem'), node('span', undefined, 'clan-list-copy'));
        card.lastElementChild.append(node('strong', clan.name), node('small', `${clan.member_count} members`));
        card.append(node('span', 'View Clan', 'clan-card-open'));
        list.append(card);
    });

    document.getElementById('clan-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const name = new FormData(form).get('name').toString().trim();
        const { data: clanId, error } = await supabase.rpc('create_clan', { p_name: name });
        if (error) setNotice(error.message, 'error');
        else window.location.assign(`clan.html?clan=${encodeURIComponent(clanId)}`);
    });
}

async function renderClanDetail(user) {
    const clanId = new URLSearchParams(window.location.search).get('clan');
    if (!clanId || !/^[0-9a-f-]{36}$/i.test(clanId)) throw new Error('Clan not found.');
    const [{ data: clan, error: clanError }, { data: memberships, error: memberError }] = await Promise.all([
        supabase.from('clans').select('id, name, description, owner_id, created_at').eq('id', clanId).maybeSingle(),
        supabase.from('clan_members').select('user_id, role').eq('clan_id', clanId)
    ]);
    if (clanError || memberError) throw clanError || memberError;
    if (!clan) throw new Error('Clan not found.');

    const memberIds = memberships.map((member) => member.user_id);
    const [{ data: profiles, error: profilesError }, { data: messages, error: messagesError }] = await Promise.all([
        memberIds.length ? supabase.from('profiles').select('id, username, avatar_path').in('id', memberIds) : Promise.resolve({ data: [], error: null }),
        supabase.from('clan_messages').select('id, author_id, body, created_at').eq('clan_id', clanId).order('created_at', { ascending: true }).limit(60)
    ]);
    if (profilesError) throw profilesError;
    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    const currentMembership = memberships.find((member) => member.user_id === user.id);
    const isOwner = currentMembership?.role === 'owner';

    const root = node('section', undefined, 'clan-detail-page');
    const topbar = node('header', undefined, 'clan-topbar');
    const controls = node('nav', undefined, 'profile-top-actions');
    const back = node('a', '↶', 'profile-icon-button'); back.href = 'clans.html'; back.setAttribute('aria-label', 'Back to clans');
    const settings = node('a', '⚙', 'profile-icon-button'); settings.href = 'settings.html'; settings.setAttribute('aria-label', 'Settings');
    const news = node('a', '▤', 'profile-icon-button'); news.href = 'news.html'; news.setAttribute('aria-label', 'News');
    controls.append(back, settings, news);
    topbar.append(controls, node('h1', clan.name, 'clan-top-title'), node('span', 'BLOCKET', 'clan-top-brand'));
    root.append(topbar);

    const columns = node('div', undefined, 'clan-detail-columns');
    const left = node('aside', undefined, 'clan-left-rail');
    const shield = node('section', undefined, 'clan-side-tile');
    shield.append(node('span', '◇', 'clan-side-symbol'), node('strong', 'Not Shielded'));
    const disguise = node('section', undefined, 'clan-side-tile');
    disguise.append(node('span', '◉', 'clan-side-symbol'), node('strong', 'Not Disguised'));
    const inventory = node('a', undefined, 'clan-side-tile clan-inventory-tile'); inventory.href = 'inventory.html';
    inventory.append(node('span', '▧', 'clan-side-symbol'), node('strong', 'Inventory'));
    left.append(shield, disguise, inventory);

    const center = node('section', undefined, 'clan-center-column');
    const overview = node('section', undefined, 'clan-overview');
    const banner = node('div', undefined, 'clan-banner');
    banner.append(node('span', '♜', 'clan-crest'), node('span', `${memberships.length} Members`, 'clan-member-count'));
    const summary = node('div', undefined, 'clan-summary');
    summary.append(node('h2', clan.name, 'clan-name'), node('p', clan.description || 'Welcome to the clan.', 'clan-description'));
    const owner = profileMap.get(clan.owner_id);
    summary.append(node('p', owner ? `♟ ${owner.username}` : '', 'clan-owner-line'));
    overview.append(banner, summary);

    if (isOwner) {
        const invitePanel = node('section', undefined, 'surface panel clan-invite-panel');
        invitePanel.append(node('h2', 'Invite a player', 'panel-title'));
        const inviteForm = node('form', undefined, 'inline-form');
        inviteForm.innerHTML = '<label class="field"><span>Username</span><input name="username" minlength="3" maxlength="24" pattern="[A-Za-z0-9_]{3,24}" required placeholder="Player username"></label><button class="button-primary" type="submit">Send Invitation</button>';
        inviteForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const username = new FormData(form).get('username').toString().trim();
            const { error } = await supabase.rpc('invite_to_clan', { p_clan_id: clan.id, p_username: username });
            if (error) setNotice(error.message, 'error'); else { setNotice('Invitation sent.', 'success'); form.reset(); }
        });
        invitePanel.append(inviteForm); center.append(invitePanel);
    } else if (!currentMembership) {
        center.append(node('p', 'Clan membership is by invitation only.', 'invitation-required'));
    }

    const activity = node('section', undefined, 'clan-activity');
    if (currentMembership) {
        const messageList = node('div', undefined, 'clan-message-list');
        messages.forEach((message) => {
            const messageProfile = profileMap.get(message.author_id);
            const entry = node('article', undefined, 'clan-message');
            entry.append(node('strong', messageProfile?.username || 'Member'), node('p', message.body));
            messageList.append(entry);
        });
        if (!messages.length) messageList.append(node('p', 'No clan messages yet.', 'empty-note'));
        activity.append(messageList);
        const messageForm = node('form', undefined, 'inline-form clan-message-form');
        messageForm.innerHTML = '<label class="field"><span>Message</span><input name="body" maxlength="500" required placeholder="Write to your clan"></label><button class="button-primary" type="submit">Send</button>';
        messageForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const body = new FormData(form).get('body').toString().trim();
            const { error } = await supabase.from('clan_messages').insert({ clan_id: clan.id, author_id: user.id, body });
            if (error) setNotice(error.message, 'error'); else window.location.reload();
        });
        activity.append(messageForm);
    }
    center.append(overview, activity);

    const membersPanel = node('section', undefined, 'clan-members-panel');
    membersPanel.append(node('h2', 'Clan Members', 'section-tag'));
    memberships.forEach((member) => {
        const memberProfile = profileMap.get(member.user_id);
        if (!memberProfile) return;
        const card = node('a', undefined, 'clan-member-card');
        card.href = `player.html?username=${encodeURIComponent(memberProfile.username)}`;
        const avatar = node('img'); avatar.src = memberProfile.avatar_path || 'assets/badges/Gold%20Doubloon.webp'; avatar.alt = '';
        const details = node('span', undefined, 'clan-member-details');
        details.append(node('strong', memberProfile.username), node('small', member.role === 'owner' ? 'Clan Owner' : 'Clan Member'));
        card.append(avatar, details);
        membersPanel.append(card);
    });
    columns.append(left, center, membersPanel);
    root.append(columns);
    content.replaceChildren(root);
}

function listingCard(listing, onBuy) {
    const card = node('article', undefined, 'item-card');
    card.append(node('h3', listing.blooks?.name || 'Blook'), node('p', `Seller: ${listing.profiles?.username || 'Player'}`), node('p', `Quantity: ${listing.quantity}`), node('p', `${money(listing.price_each)} tokens each`));
    const buy = node('button', 'Buy one', 'button-primary'); buy.type = 'button';
    buy.addEventListener('click', () => onBuy(listing)); card.append(buy);
    return card;
}

async function renderMarket() {
    const pricing = [
        {
            name: '1H Booster',
            price: '$9.99',
            accent: 'shop-card--blue',
            tag: 'Boost all the chances of blocks by 2x more for EVERYONE! This boosts for 1 hour.',
            reward: '+20,000 tokens',
            action: 'Buy Now',
            buttonClass: 'shop-button--blue',
            footer: 'By clicking "Buy Now", you agree to Blocket\'s Terms of Service, End User License Agreement, and Privacy Policy. This is a one-time charge, you will NOT be charged monthly.'
        },
        {
            name: 'Plus',
            price: '$14.99',
            accent: 'shop-card--mid',
            tag: 'Access To Bonners Exclusive Ornaments Exclusive Chat Colors More Bazaar Listings Access To Creating Clans Upload Files in Chat Use Block Emojis Discard Plus Role',
            reward: '+30,000 tokens',
            action: 'Already Owned',
            buttonClass: 'shop-button--dark',
            footer: 'By clicking "Buy Now", you agree to Blocket\'s Terms of Service, End User License Agreement, and Privacy Policy. This is a one-time charge, you will NOT be charged monthly.'
        },
        {
            name: '3H Booster',
            price: '$14.99',
            accent: 'shop-card--gold',
            tag: 'Boost all the chances of blocks by 2x more for EVERYONE! This boosts for 3 hours.',
            reward: '+30,000 tokens',
            action: 'Buy Now',
            buttonClass: 'shop-button--gold',
            footer: 'By clicking "Buy Now", you agree to Blocket\'s Terms of Service, End User License Agreement, and Privacy Policy. This is a one-time charge, you will NOT be charged monthly.'
        }
    ];

    const shop = node('section', undefined, 'shop-shell');
    pricing.forEach((plan) => {
        const card = node('article', undefined, `shop-card ${plan.accent}`);
        if (plan.name === 'Plus') {
            const badge = node('div', 'Plus', 'shop-card-badge');
            card.append(badge);
        }
        const title = node('h2', plan.name, 'shop-card-title');
        const price = node('div', plan.price, 'shop-price');
        const feature = node('p', plan.tag, 'shop-copy');
        const token = node('div', plan.reward, 'shop-token');
        const button = node('button', plan.action, `shop-button ${plan.buttonClass}`); button.type = 'button';
        const divider = node('div', undefined, 'shop-divider');
        const note = node('p', plan.footer, 'shop-legal');
        card.append(title, price, feature, token, button, divider, note);
        shop.append(card);
    });

    const footerNote = node('p', 'You have spent $70 on Blocket.\nYou already have unlocked the Big Spender badge!', 'shop-footer-note');
    content.replaceChildren(shop, footerNote);

    const results = await supabase.from('market_listings').select('id, quantity, price_each, seller_id, profiles(username), blooks(name)').eq('status', 'active').order('created_at', { ascending: false }).limit(60);
    if (results.error) throw results.error;
    if (results.data.length) {
        const grid = node('section', undefined, 'data-grid market-listings');
        results.data.forEach((listing) => grid.append(listingCard(listing, async (item) => {
            const { error } = await supabase.rpc('purchase_listing', { p_listing_id: item.id, p_quantity: 1 });
            if (error) setNotice(error.message, 'error'); else { setNotice('Purchase complete.', 'success'); window.location.reload(); }
        })));
        const section = node('section', undefined, 'market-listings-wrap');
        section.append(node('h2', 'Player listings', 'panel-title'), grid);
        content.append(section);
    }
}

async function renderBlooks() {
    const { data, error } = await supabase.from('blooks').select('id, name, rarity, image_path, description').order('sort_order').limit(500);
    if (error) throw error;
    const grid = node('section', undefined, 'data-grid');
    if (!data.length) grid.append(empty('Blooks are not in the catalog yet.'));
    data.forEach((blook) => {
        const card = node('article', undefined, 'item-card');
        const title = node('h3', blook.name); const rarity = node('p', blook.rarity || 'Common');
        if (blook.image_path) { const image = node('img'); image.src = blook.image_path; image.alt = blook.name; card.append(image); }
        card.append(title, rarity, node('p', blook.description)); grid.append(card);
    });
    content.replaceChildren(grid);
}

async function renderInventory() {
    const { data, error } = await supabase.from('user_blooks').select('quantity, blooks(id, name, rarity, image_path, description)').gt('quantity', 0).order('blook_id');
    if (error) throw error;
    const grid = node('section', undefined, 'data-grid');
    if (!data.length) grid.append(empty('Your inventory is empty. Open a pack to get your first blook.'));
    data.forEach(({ quantity, blooks }) => {
        const card = node('article', undefined, 'item-card');
        card.append(node('h3', blooks.name), node('p', blooks.rarity || 'Common'), node('p', `Owned: ${quantity}`));
        if (blooks.image_path) { const image = node('img'); image.src = blooks.image_path; image.alt = blooks.name; card.prepend(image); }
        grid.append(card);
    });
    content.replaceChildren(grid);
}

async function renderBazaar(user) {
    const [{ data: inventory, error: inventoryError }, { data: listings, error: listingError }] = await Promise.all([
        supabase.from('user_blooks').select('blook_id, quantity, blooks(name)').gt('quantity', 0).order('blook_id'),
        supabase.from('market_listings').select('id, quantity, price_each, blooks(name)').eq('seller_id', user.id).eq('status', 'active').order('created_at', { ascending: false })
    ]);
    if (inventoryError || listingError) throw inventoryError || listingError;
    setContent('<section class="surface panel"><form id="listing-form"><label class="field"><span>Blook</span><select name="blook_id" id="listing-blook" required></select></label><label class="field"><span>Quantity</span><input name="quantity" id="listing-quantity" type="number" min="1" max="1" step="1" value="1" required></label><label class="field"><span>Price per blook (tokens)</span><input name="price_each" type="number" min="1" step="1" value="10" required></label><button class="button-primary" type="submit">List in Bazaar</button></form></section><h2 class="panel-title" style="margin-top:24px">Your active listings</h2><section class="data-grid" id="my-listings"></section>');
    const select = document.getElementById('listing-blook');
    const quantityInput = document.getElementById('listing-quantity');
    inventory.forEach(({ blook_id, quantity, blooks }, index) => {
        const option = node('option', `${blooks.name} · ${quantity} available`);
        option.value = blook_id;
        option.dataset.quantity = quantity;
        select.append(option);
        if (index === 0) quantityInput.max = quantity;
    });
    select.addEventListener('change', () => { quantityInput.max = select.selectedOptions[0]?.dataset.quantity || 1; });
    if (!inventory.length) select.append(node('option', 'No blooks available to list'));
    const list = document.getElementById('my-listings');
    if (!listings.length) list.append(empty('You have no active listings.'));
    listings.forEach((listing) => {
        const card = node('article', undefined, 'item-card');
        card.append(node('h3', listing.blooks.name), node('p', `${listing.quantity} listed at ${money(listing.price_each)} tokens each`));
        const cancel = node('button', 'Cancel listing', 'button-secondary');
        cancel.type = 'button';
        cancel.addEventListener('click', async () => {
            const { error: cancelError } = await supabase.rpc('cancel_market_listing', { p_listing_id: listing.id });
            if (cancelError) setNotice(cancelError.message, 'error');
            else { setNotice('Listing cancelled and returned to your inventory.', 'success'); await renderBazaar(user); }
        });
        card.append(cancel);
        list.append(card);
    });
    document.getElementById('listing-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!inventory.length) return;
        const form = new FormData(event.currentTarget);
        const { error } = await supabase.rpc('create_market_listing', {
            p_blook_id: form.get('blook_id'),
            p_quantity: Number(form.get('quantity')),
            p_price_each: Number(form.get('price_each'))
        });
        if (error) setNotice(error.message, 'error'); else { setNotice('Listing created.', 'success'); await renderBazaar(user); }
    });
}

async function renderNews() {
    setContent('<header class="news-topbar"><div class="news-heading"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10M7 11h10M7 15h6"/></svg><h1>Blocket News</h1></div><button class="news-close" id="close-news" type="button" aria-label="Close news">×</button></header><section class="news-feed" id="news-feed" aria-label="News articles"></section>');
    document.getElementById('close-news').addEventListener('click', () => window.location.assign('stats.html'));
    const { data, error } = await supabase.from('news_posts').select('id, title, body, image_path, published_at').eq('is_published', true).order('published_at', { ascending: false }).limit(30);
    if (error) throw error;
    const feed = document.getElementById('news-feed');
    if (!data.length) feed.append(node('p', 'No news yet.', 'news-empty'));
    data.forEach((post) => {
        const article = node('article', undefined, 'news-card');
        article.append(node('h2', post.title));
        if (post.image_path) {
            const image = node('img');
            image.className = 'news-card-image';
            image.src = post.image_path;
            image.alt = post.title;
            image.loading = 'lazy';
            article.append(image);
        }
        article.append(node('p', post.body, 'news-card-body'));
        if (post.published_at) {
            const date = node('p', new Date(post.published_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }), 'news-card-date');
            date.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></svg>' + esc(date.textContent);
            article.append(date);
        }
        feed.append(article);
    });
}

async function renderCredits() {
    const result = await supabase.from('player_stats').select('tokens').single();
    if (result.error) throw result.error;
    const section = panel('Token balance');
    section.append(node('p', `${money(result.data.tokens)} tokens`, 'stat-value'), node('p', 'Tokens are spent when you open packs and can be earned through Blocket activities.', 'notice'));
    content.replaceChildren(section);
}

async function renderSettings(user) {
    const { data: profile, error } = await supabase.from('profiles').select('username, avatar_path').eq('id', user.id).single();
    if (error) throw error;
    setContent(`<section class="surface panel"><form id="settings-form"><label class="field"><span>Email</span><input value="${esc(user.email)}" disabled></label><label class="field"><span>Username</span><input name="username" value="${esc(profile.username)}" minlength="3" maxlength="24" pattern="[a-zA-Z0-9_]+" required></label><button class="button-primary" type="submit">Save settings</button></form><button class="button-danger" id="settings-sign-out" type="button" style="margin-top:18px">Sign out</button></section>`);
    document.getElementById('settings-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = new FormData(event.currentTarget).get('username').toString().trim().toLowerCase();
        const { error: updateError } = await supabase.from('profiles').update({ username }).eq('id', user.id);
        if (updateError) setNotice(updateError.message, 'error'); else setNotice('Settings saved.', 'success');
    });
    document.getElementById('settings-sign-out').addEventListener('click', async () => {
        const { error: logoutError } = await signOut();
        if (logoutError) setNotice(logoutError.message, 'error'); else window.location.assign('index.html');
    });
}

async function renderPackOpening() {
    const { data: packs, error } = await supabase.from('packs').select('id, name, price_tokens, subtitle').eq('is_available', true).order('sort_order');
    if (error) throw error;
    setContent('<section><h2 class="panel-title">Packs</h2><div class="data-grid" id="pack-select"></div></section>');
    const grid = document.getElementById('pack-select');
    packs.forEach((pack) => {
        const card = node('article', undefined, 'item-card');
        card.append(node('h3', pack.name), node('p', pack.subtitle), node('p', `${money(pack.price_tokens)} tokens`));
        const open = node('button', 'Open pack', 'button-primary'); open.type = 'button';
        open.addEventListener('click', () => openPack(pack));
        card.append(open); grid.append(card);
    });
    await renderMarket();
}

async function openPack(pack) {
    setContent(`<section class="surface pack-area"><div class="pack-opening" id="opening"><div class="pack-stage"><div class="seel-pack"><span class="pack-sparkle">SEEL</span><p class="pack-name">Seel Pack</p><p class="pack-tag">A cool collection</p></div><div class="pack-lid" aria-hidden="true"></div><div class="reveal-card" id="pack-result"><div class="reveal-seel">S</div><p class="reveal-name" id="reward-name">Seel</p></div></div><p id="pack-prompt">Ready to open ${esc(pack.name)}?</p><div class="pack-controls"><button class="button-primary" id="open-pack" type="button">Open for ${money(pack.price_tokens)} tokens</button><button class="button-secondary" id="again" type="button" hidden>Open another</button></div></div></section>`);
    const opening = document.getElementById('opening');
    const open = document.getElementById('open-pack');
    open.addEventListener('click', async () => {
        open.disabled = true;
        document.getElementById('pack-prompt').textContent = 'Shaking...';
        opening.classList.add('is-opening');
        const [result] = await Promise.all([
            supabase.rpc('open_pack', { p_pack_id: pack.id }),
            new Promise((resolve) => window.setTimeout(resolve, 1500))
        ]);
        if (result.error) {
            setNotice(result.error.message, 'error');
            open.disabled = false;
            opening.classList.remove('is-opening');
            return;
        }
        document.getElementById('reward-name').textContent = result.data.name;
        opening.classList.add('is-revealed');
        document.getElementById('pack-prompt').textContent = `You unlocked ${result.data.name}!`;
        open.hidden = true;
        const again = document.getElementById('again');
        again.hidden = false;
        again.addEventListener('click', () => openPack(pack), { once: true });
    });
}

async function renderMarketRoot(user) {
    if (page === 'market') return renderPackOpening(user);
    return renderBazaar(user);
}

async function boot() {
    const user = await requireUser();
    if (!user) return;
    document.title = `Blocket ${title}`;
    try {
        if (page === 'stats') await renderStats(user);
        else if (page === 'player') await renderPlayer(user);
        else if (page === 'leaderboard') await renderLeaderboard();
        else if (page === 'chat') await renderChat(user);
        else if (page === 'clans') await renderClans(user);
        else if (page === 'clan-detail') await renderClanDetail(user);
        else if (page === 'market') await renderMarketRoot(user);
        else if (page === 'blooks') await renderBlooks();
        else if (page === 'inventory') await renderInventory();
        else if (page === 'bazaar') await renderBazaar(user);
        else if (page === 'news') await renderNews();
        else if (page === 'credits') await renderCredits();
        else if (page === 'settings') await renderSettings(user);
        document.getElementById('sign-out').addEventListener('click', async () => {
            const { error } = await signOut();
            if (error) setNotice(error.message, 'error'); else window.location.replace('index.html');
        });
    } catch (error) {
        setNotice(error.message || 'Could not load this page.', 'error');
    }
}

boot();
