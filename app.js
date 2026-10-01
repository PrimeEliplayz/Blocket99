import { supabase, getCurrentUser, getStatsPageData, signOut } from './auth.js';

const page = document.body.dataset.page;
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
    leaderboard: ['Leaderboard', 'See how players are stacking up.'],
    chat: ['Chat', 'Talk with the Blocket community.'],
    clans: ['Clans', 'Find your crew or start one.'],
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
sidebar.innerHTML = `<a class="brand" href="stats.html" aria-label="Blocket home">BLOCKET</a><nav class="side-nav" aria-label="Main navigation">${navItems.map(([id, label, url, path]) => `<a class="nav-link" href="${url}" ${id === page ? 'aria-current="page"' : ''}>${icon(path)}<span>${label}</span></a>`).join('')}</nav><footer class="sidebar-footer"><div class="social-links"><a class="social-link" href="https://discord.com" aria-label="Discord">D</a><a class="social-link" href="https://www.youtube.com" aria-label="YouTube">▶</a><a class="social-link" href="https://x.com" aria-label="X">X</a></div><a class="store-link" href="market.html">$ Visit the Store</a></footer>`;
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
badgeDialog.innerHTML = '<img id="badge-dialog-image" width="76" height="76" alt=""><p class="page-kicker" id="badge-dialog-state"></p><h2 id="badge-dialog-title"></h2><p id="badge-dialog-description"></p><button class="button-secondary" id="badge-dialog-close" type="button">Close</button>';
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
    const shell = node('section');
    const profileRow = node('div', undefined, 'profile-row');
    const avatar = node('img', undefined, 'profile-avatar');
    avatar.src = profile.avatar_path || 'assets/badges/Gold%20Doubloon.webp';
    avatar.alt = 'Gold Doubloon profile picture';
    const meta = node('div', undefined, 'profile-meta');
    meta.append(node('p', profile.username, 'profile-name'));
    const badgeGrid = node('div', undefined, 'badge-grid');
    badges.forEach((badge) => {
        const earned = earnedBadgeIds.has(badge.id);
        const button = node('button', undefined, `badge-button${earned ? '' : ' is-locked'}`);
        button.type = 'button';
        button.title = `${badge.name}: ${badge.description}`;
        button.setAttribute('aria-label', `${earned ? 'Earned' : 'Locked'} badge: ${badge.name}`);
        const image = node('img');
        image.src = badge.image_path;
        image.alt = '';
        button.append(image);
        button.addEventListener('click', () => {
            badgeDialog.querySelector('#badge-dialog-image').src = badge.image_path;
            badgeDialog.querySelector('#badge-dialog-state').textContent = earned ? 'Earned' : 'Not earned yet';
            badgeDialog.querySelector('#badge-dialog-title').textContent = badge.name;
            badgeDialog.querySelector('#badge-dialog-description').textContent = badge.description;
            badgeDialog.showModal();
        });
        badgeGrid.append(button);
    });
    meta.append(badgeGrid);
    profileRow.append(avatar, meta);
    shell.append(profileRow);
    const grid = node('section', undefined, 'stat-grid');
    const cards = [
        ['Tokens', 'tokenIcon.webp', stats.tokens],
        ['Blooks Unlocked', 'unlockIcon.webp', `${stats.blooks_unlocked} / ${stats.total_blooks}`],
        ['Packs Opened', 'openedIcon.webp', stats.packs_opened]
    ];
    cards.forEach(([label, imagePath, value]) => {
        const card = node('article', undefined, 'stat-card');
        const image = node('img'); image.className = 'stat-icon'; image.src = `assets/badges/${imagePath}`; image.alt = '';
        const formattedValue = typeof value === 'number' ? money(value) : value;
        const text = node('div'); text.append(node('p', label, 'stat-label'), node('p', formattedValue, 'stat-value'));
        card.append(image, text, node('span', undefined, 'stat-balance'));
        grid.append(card);
    });
    shell.append(grid);
    content.replaceChildren(shell);
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

async function renderChat() {
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
        const { error } = await supabase.from('chat_messages').insert({ body, room: 'global' });
        if (error) { setNotice(error.message, 'error'); return; }
        form.reset(); await load();
    });
    window.setInterval(() => load().catch((error) => setNotice(error.message, 'error')), 7000);
}

async function renderClans(user) {
    setContent('<section class="surface panel"><form class="inline-form" id="clan-form"><label class="field"><span>Start a clan</span><input name="name" maxlength="32" required placeholder="Clan name"></label><button class="button-primary" type="submit">Create</button></form></section><section class="data-grid" id="clan-list" style="margin-top:14px"></section>');
    const list = document.getElementById('clan-list');
    const load = async () => {
        const { data, error } = await supabase.from('clan_roster').select('*').order('member_count', { ascending: false }).limit(50);
        if (error) throw error;
        list.replaceChildren();
        data.forEach((clan) => {
            const item = node('article', undefined, 'item-card');
            item.append(node('h3', clan.name), node('p', `${clan.member_count} members`));
            const join = node('button', 'Join', 'button-secondary'); join.type = 'button';
            join.addEventListener('click', async () => {
                const { error: joinError } = await supabase.rpc('join_clan', { p_clan_id: clan.id });
                if (joinError) setNotice(joinError.message, 'error'); else { setNotice('Joined clan.', 'success'); await load(); }
            });
            item.append(join); list.append(item);
        });
    };
    await load();
    document.getElementById('clan-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = new FormData(event.currentTarget).get('name').toString().trim();
        const { error } = await supabase.rpc('create_clan', { p_name: name });
        if (error) setNotice(error.message, 'error'); else { setNotice('Clan created.', 'success'); event.currentTarget.reset(); await load(); }
    });
}

function listingCard(listing, onBuy) {
    const card = node('article', undefined, 'item-card');
    card.append(node('h3', listing.blooks?.name || 'Blook'), node('p', `Seller: ${listing.profiles?.username || 'Player'}`), node('p', `Quantity: ${listing.quantity}`), node('p', `${money(listing.price_each)} tokens each`));
    const buy = node('button', 'Buy one', 'button-primary'); buy.type = 'button';
    buy.addEventListener('click', () => onBuy(listing)); card.append(buy);
    return card;
}

async function renderMarket() {
    const results = await supabase.from('market_listings').select('id, quantity, price_each, seller_id, profiles(username), blooks(name)').eq('status', 'active').order('created_at', { ascending: false }).limit(60);
    if (results.error) throw results.error;
    const grid = node('section', undefined, 'data-grid');
    if (!results.data.length) grid.append(empty('No blooks are listed yet. Visit the Bazaar to list one.'));
    results.data.forEach((listing) => grid.append(listingCard(listing, async (item) => {
        const { error } = await supabase.rpc('purchase_listing', { p_listing_id: item.id, p_quantity: 1 });
        if (error) setNotice(error.message, 'error'); else { setNotice('Purchase complete.', 'success'); window.location.reload(); }
    })));
    const section = node('section');
    section.append(node('h2', 'Player listings', 'panel-title'), grid);
    content.append(section);
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
    const { data, error } = await supabase.from('user_blooks').select('quantity, blooks(id, name, rarity, image_path, description)').order('blook_id');
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
    setContent('<section class="surface panel"><form id="listing-form"><label class="field"><span>Blook</span><select name="blook_id" id="listing-blook" required></select></label><label class="field"><span>Quantity</span><input name="quantity" type="number" min="1" step="1" value="1" required></label><label class="field"><span>Price per blook (tokens)</span><input name="price_each" type="number" min="1" step="1" value="10" required></label><button class="button-primary" type="submit">List in Bazaar</button></form></section><h2 class="panel-title" style="margin-top:24px">Your active listings</h2><section class="data-grid" id="my-listings"></section>');
    const select = document.getElementById('listing-blook');
    inventory.forEach(({ blook_id, quantity, blooks }) => { const option = node('option', `${blooks.name} · ${quantity} available`); option.value = blook_id; select.append(option); });
    if (!inventory.length) select.append(node('option', 'No blooks available to list'));
    const list = document.getElementById('my-listings');
    if (!listings.length) list.append(empty('You have no active listings.'));
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
    const { data, error } = await supabase.from('news_posts').select('id, title, body, published_at').eq('is_published', true).order('published_at', { ascending: false }).limit(30);
    if (error) throw error;
    const stack = node('section', undefined, 'data-grid');
    if (!data.length) stack.append(empty('No news yet.'));
    data.forEach((post) => { const article = node('article', undefined, 'item-card'); article.append(node('p', post.published_at ? new Date(post.published_at).toLocaleDateString() : '', 'page-kicker'), node('h3', post.title), node('p', post.body)); stack.append(article); });
    content.replaceChildren(stack);
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
    setContent(`<section class="surface panel"><form id="settings-form"><label class="field"><span>Email</span><input value="${esc(user.email)}" disabled></label><label class="field"><span>Username</span><input name="username" value="${esc(profile.username)}" minlength="3" maxlength="24" pattern="[a-zA-Z0-9_]+" required></label><button class="button-primary" type="submit">Save settings</button></form><button class="button-danger" id="delete-account" type="button" style="margin-top:18px">Sign out</button></section>`);
    document.getElementById('settings-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = new FormData(event.currentTarget).get('username').toString().trim().toLowerCase();
        const { error: updateError } = await supabase.from('profiles').update({ username }).eq('id', user.id);
        if (updateError) setNotice(updateError.message, 'error'); else setNotice('Settings saved.', 'success');
    });
    document.getElementById('delete-account').addEventListener('click', async () => {
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
        else if (page === 'leaderboard') await renderLeaderboard();
        else if (page === 'chat') await renderChat();
        else if (page === 'clans') await renderClans(user);
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
