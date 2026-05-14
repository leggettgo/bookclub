const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- Predefined tag lists ----

const GENRES = [
    'Academia', 'Action & Adventure', 'Art & Photography', 'Biography',
    "Children's", 'Classics', 'Comics', 'Coming of Age', 'Contemporary Fiction',
    'Cosy', 'Crime & Detectives', 'Dark Academia', 'Dystopian', 'Essays',
    'Fantasy', 'Fiction', 'Food & Drink', 'Gothic', 'Graphic Novel',
    'Health & Lifestyle', 'Historical Fiction', 'History', 'Horror', 'Humour',
    'LGBTQ+', 'Literary Fiction', 'Magical Realism', 'Manga',
    'Media & Entertainment', 'Memoir & Autobiography', 'Mental Health & Psychology',
    'Modern Classics', 'Music', 'Mystery', 'Narrative Non-Fiction',
    'Nature & the Environment', 'New Adult', 'Non-Fiction', 'Novel', 'Novella',
    'Paranormal', 'Poetry', 'Politics', 'Religion & Spirituality', 'Romance',
    'Romantasy', 'Science & Technology', 'Science Fiction', 'Self-Help',
    'Sex & Sexuality', 'Short Story', 'Speculative Fiction', 'Sports',
    'Thriller & Suspense', 'Travel', 'True Crime', 'Young Adult'
];

const TAGS = [
    'Activism', 'Addiction', 'Adventure', 'Animal Rights', 'Anti-Capitalism',
    'Apocalyptic', 'Artificial Intelligence', 'Banned Books', 'Capitalism',
    'Christmas', 'Civil Rights Movements', 'Colonialism & Coloniality',
    'Decolonisation & Decoloniality', 'Diaspora', 'Ecological Justice', 'Emotional',
    'Environmental Justice', 'Familial Relationships', 'Feminism', 'Friendships',
    'Grief', 'Halloween', 'Lesbian & Gay', 'Linguistics', 'Magic System',
    'Mental Illness', 'MLM (Men Loving Men)', 'Museum Studies', 'Palestine',
    'Post-Apocalyptic', 'Race', 'Race & Racism', 'Reflective', 'Revolution',
    'Self-Discovery', 'Slice of Life', 'Social Justice', 'Socialism', 'Space',
    'Trans & Non-Binary', 'Utopian', 'War', 'WLW (Women Loving Women)',
    'World-Building'
];

const NICHE_TAGS = [
    'ACAB', 'Cannibalism', 'Character Driven', 'Character Study', 'Cults',
    'DnD', 'Dragons', 'Drugs & Drug Use', 'Female Protagonist', 'Female Rage',
    'Ghosts', 'Greek Pantheon', 'Kinks', 'Medieval',
    'Miscommunication', 'Multi-Generational', 'Murder', 'Overpowered Protagonist',
    'Plot Twist', 'Police Brutality', 'Quest', 'Robots', 'Secret Society',
    'Sex Work', 'Trauma', 'Underdog', 'Unlikable Characters',
    'Unlikable Protagonist', 'Unreliable Narrator', 'Veganism', 'Vegetarianism'
];

// ---- State ----

let allBooks = [];
let activeFilters = { genres: [], tags: [], niche_tags: [], owners: [] };
let selectedBookData = null;
let tagState = { genres: [], tags: [], niche_tags: [] };
let pendingDelete = null;
let searchTimeout = null;

// ---- Load & Render ----

async function loadBooks() {
    const { data, error } = await db
        .from('community_library')
        .select('*')
        .order('created_at', { ascending: false });

    const grid = document.getElementById('library-grid');

    if (error) {
        grid.innerHTML = '<p>Failed to load books.</p>';
        return;
    }

    allBooks = data || [];
    buildFilterDropdown();
    renderBooks();
}

function renderBooks() {
    const grid = document.getElementById('library-grid');
    const filtered = getFilteredBooks();

    if (filtered.length === 0) {
        grid.innerHTML = '<p>No books found.</p>';
        return;
    }

    grid.innerHTML = filtered.map(book => `
        <div class="library-card" data-id="${book.id}">
            <button class="card-delete-btn" data-id="${book.id}" title="Remove">×</button>
            ${book.cover_url
                ? `<img class="library-cover" src="${escHtml(book.cover_url)}" alt="Cover of ${escHtml(book.title)}">`
                : `<div class="library-cover-placeholder"></div>`
            }
            <div class="library-card-info">
                <p class="library-title">${escHtml(book.title)}</p>
                <p class="library-author">${escHtml(book.author)}</p>
            </div>
        </div>
    `).join('');

    grid.querySelectorAll('.card-delete-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            initiateDelete(parseInt(btn.dataset.id));
        });
    });

    grid.querySelectorAll('.library-card').forEach(card => {
        card.addEventListener('click', () => {
            const book = allBooks.find(b => b.id === parseInt(card.dataset.id));
            if (book) openDetailModal(book);
        });
    });
}

function openDetailModal(book) {
    const makeTiles = arr => (arr || []).map(v => `<span class="tag-tile">${escHtml(v)}</span>`).join('');

    const genreTiles = makeTiles(book.genres);
    const tagTiles   = makeTiles(book.tags);
    const nicheTiles = makeTiles(book.niche_tags);

    document.getElementById('detail-body').innerHTML = `
        <div class="detail-layout">
            <div class="detail-cover">
                ${book.cover_url
                    ? `<img src="${escHtml(book.cover_url)}" alt="${escHtml(book.title)}">`
                    : `<div class="library-cover-placeholder"></div>`}
            </div>
            <div class="detail-info">
                <h2 class="detail-title">${escHtml(book.title)}</h2>
                <p class="detail-author">${escHtml(book.author)}</p>
                <p class="detail-owner">Owned by ${escHtml(book.owner || 'Unknown')}</p>
            </div>
        </div>
        <div id="detail-tags-display">
            ${genreTiles ? `<p class="detail-section-label">Genres</p><div class="detail-tiles">${genreTiles}</div>` : ''}
            ${tagTiles   ? `<p class="detail-section-label">Tags</p><div class="detail-tiles">${tagTiles}</div>`   : ''}
            ${nicheTiles ? `<p class="detail-section-label">Niche Tags</p><div class="detail-tiles">${nicheTiles}</div>` : ''}
        </div>
        <button id="detail-edit-btn">Edit tags</button>
    `;

    document.getElementById('detail-edit-btn').addEventListener('click', () => openEditMode(book));
    document.getElementById('detail-edit-section').classList.add('hidden');
    document.getElementById('detail-modal').classList.remove('hidden');
}

function getFilteredBooks() {
    return allBooks.filter(book => {
        if (activeFilters.genres.length    && !activeFilters.genres.some(g    => (book.genres     || []).includes(g)))   return false;
        if (activeFilters.tags.length      && !activeFilters.tags.some(t      => (book.tags        || []).includes(t)))   return false;
        if (activeFilters.niche_tags.length && !activeFilters.niche_tags.some(t => (book.niche_tags || []).includes(t))) return false;
        if (activeFilters.owners.length    && !activeFilters.owners.includes(book.owner))                                  return false;
        return true;
    });
}

// ---- Filter Dropdown ----

function buildFilterDropdown() {
    const genres = [...new Set(allBooks.flatMap(b => b.genres     || []))].sort();
    const tags   = [...new Set(allBooks.flatMap(b => b.tags        || []))].sort();
    const niches = [...new Set(allBooks.flatMap(b => b.niche_tags  || []))].sort();
    const owners = [...new Set(allBooks.map(b => b.owner).filter(Boolean))].sort();

    renderFilterSection('filter-genres',     'section-genres',     'genres',     genres);
    renderFilterSection('filter-tags',       'section-tags',       'tags',       tags);
    renderFilterSection('filter-niche-tags', 'section-niche-tags', 'niche_tags', niches);
    renderFilterSection('filter-owners',     'section-owners',     'owners',     owners);
}

function renderFilterSection(containerId, sectionId, category, values) {
    const section   = document.getElementById(sectionId);
    const container = document.getElementById(containerId);

    if (values.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    container.innerHTML = values.map(v => `
        <span class="tag-tile${activeFilters[category].includes(v) ? ' selected' : ''}"
              data-category="${category}" data-value="${escHtml(v)}">
            ${escHtml(v)}
        </span>
    `).join('');

    container.querySelectorAll('.tag-tile').forEach(tile => {
        tile.addEventListener('click', () => {
            const cat = tile.dataset.category;
            const val = tile.dataset.value;
            if (activeFilters[cat].includes(val)) {
                activeFilters[cat] = activeFilters[cat].filter(v => v !== val);
                tile.classList.remove('selected');
            } else {
                activeFilters[cat].push(val);
                tile.classList.add('selected');
            }
            updateActiveFilterChips();
            renderBooks();
        });
    });
}

function updateActiveFilterChips() {
    const container = document.getElementById('active-filters');
    const chips = [];

    for (const [cat, values] of Object.entries(activeFilters)) {
        values.forEach(v => {
            chips.push(`<span class="active-chip">${escHtml(v)} <button class="chip-remove" data-cat="${cat}" data-val="${escHtml(v)}">×</button></span>`);
        });
    }

    container.innerHTML = chips.join('');

    container.querySelectorAll('.chip-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const cat = btn.dataset.cat;
            const val = btn.dataset.val;
            activeFilters[cat] = activeFilters[cat].filter(v => v !== val);
            const tile = document.querySelector(`#filter-dropdown .tag-tile[data-category="${cat}"][data-value="${val}"]`);
            if (tile) tile.classList.remove('selected');
            updateActiveFilterChips();
            renderBooks();
        });
    });

    const total = Object.values(activeFilters).flat().length;
    document.getElementById('filter-btn').textContent = total > 0 ? `Filter (${total})` : 'Filter';
}

// ---- Delete with Undo ----

function initiateDelete(id) {
    if (pendingDelete) {
        clearTimeout(pendingDelete.timer);
        executeDelete(pendingDelete.id);
    }

    const book = allBooks.find(b => b.id === id);
    if (!book) return;

    allBooks = allBooks.filter(b => b.id !== id);
    renderBooks();
    buildFilterDropdown();

    document.getElementById('toast-msg').textContent = `"${book.title}" removed.`;
    document.getElementById('undo-toast').classList.remove('hidden');

    const timer = setTimeout(() => {
        executeDelete(id);
        hideToast();
    }, 6000);

    pendingDelete = { id, book, timer };
}

function undoDelete() {
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timer);
    allBooks = [pendingDelete.book, ...allBooks];
    allBooks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    renderBooks();
    buildFilterDropdown();
    hideToast();
    pendingDelete = null;
}

async function executeDelete(id) {
    await db.from('community_library').delete().eq('id', id);
    if (pendingDelete && pendingDelete.id === id) pendingDelete = null;
}

function hideToast() {
    document.getElementById('undo-toast').classList.add('hidden');
}

// ---- Add Book Modal ----

function openModal() {
    resetModal();
    document.getElementById('add-modal').classList.remove('hidden');
    document.getElementById('book-search').focus();
}

function closeModal() {
    document.getElementById('add-modal').classList.add('hidden');
}

function resetModal() {
    document.getElementById('book-search').value = '';
    document.getElementById('search-results').innerHTML = '';
    document.getElementById('search-results').classList.add('hidden');
    document.getElementById('add-book-form').classList.add('hidden');
    document.getElementById('selected-book-preview').innerHTML = '';
    document.getElementById('input-owner').value = '';
    tagState = { genres: [], tags: [], niche_tags: [] };
    document.querySelectorAll('.tag-selector-dropdown .tag-tile').forEach(t => t.classList.remove('selected'));
    document.querySelectorAll('.tag-search-input').forEach(i => { i.value = ''; });
    document.querySelectorAll('.tag-tile').forEach(t => t.classList.remove('hidden'));
    renderTagChips('genres');
    renderTagChips('tags');
    renderTagChips('niche_tags');
    selectedBookData = null;
}

async function searchOpenLibrary(query) {
    const resultsEl = document.getElementById('search-results');

    if (!query.trim()) {
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
        return;
    }

    resultsEl.innerHTML = '<p class="search-loading">Searching...</p>';
    resultsEl.classList.remove('hidden');

    try {
        const res  = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8&fields=title,author_name,cover_i,key`);
        const json = await res.json();
        const results = (json.docs || []).map(r => ({
            title:     r.title,
            author:    (r.author_name || ['Unknown']).join(', '),
            cover_url: r.cover_i ? `https://covers.openlibrary.org/b/id/${r.cover_i}-M.jpg` : null,
            thumb_url: r.cover_i ? `https://covers.openlibrary.org/b/id/${r.cover_i}-S.jpg` : null
        }));

        if (results.length > 0) {
            renderSearchResults(results);
        } else {
            await searchGoogleBooks(query);
        }
    } catch {
        await searchGoogleBooks(query);
    }
}

async function searchGoogleBooks(query) {
    const resultsEl = document.getElementById('search-results');
    resultsEl.innerHTML = '<p class="search-loading">Trying Google Books...</p>';

    try {
        const res  = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8`);
        const json = await res.json();
        const results = (json.items || []).map(item => {
            const info = item.volumeInfo || {};
            return {
                title:     info.title || 'Unknown',
                author:    (info.authors || ['Unknown']).join(', '),
                cover_url: info.imageLinks?.thumbnail?.replace('http://', 'https://') || null,
                thumb_url: info.imageLinks?.smallThumbnail?.replace('http://', 'https://') || null
            };
        });
        renderSearchResults(results);
    } catch {
        resultsEl.innerHTML = '<p class="search-loading">Search failed. Try again.</p>';
    }
}

function renderSearchResults(results) {
    const container = document.getElementById('search-results');

    if (results.length === 0) {
        container.innerHTML = '<p class="search-loading">No results found.</p>';
        return;
    }

    container._results = results;
    container.innerHTML = results.map((r, i) => `
        <div class="search-result" data-index="${i}">
            ${r.thumb_url
                ? `<img src="${escHtml(r.thumb_url)}" alt="">`
                : `<div class="result-no-cover"></div>`
            }
            <div>
                <p class="result-title">${escHtml(r.title)}</p>
                <p class="result-author">${escHtml(r.author)}</p>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.search-result').forEach(el => {
        el.addEventListener('click', () => selectSearchResult(container._results[parseInt(el.dataset.index)]));
    });
}

function selectSearchResult(result) {
    selectedBookData = {
        title:     result.title,
        author:    result.author,
        cover_url: result.cover_url
    };

    document.getElementById('search-results').innerHTML = '';
    document.getElementById('search-results').classList.add('hidden');
    document.getElementById('book-search').value = '';

    document.getElementById('selected-book-preview').innerHTML = `
        ${result.cover_url
            ? `<img src="${escHtml(result.cover_url)}" alt="Cover" class="preview-cover">`
            : ''
        }
        <div>
            <p><strong>${escHtml(result.title)}</strong></p>
            <p>${escHtml(result.author)}</p>
        </div>
    `;

    document.getElementById('add-book-form').classList.remove('hidden');
    document.getElementById('input-owner').focus();
}

// ---- Edit Tag State ----

let editTagState    = { genres: [], tags: [], niche_tags: [] };
let currentEditBook = null;

function openEditMode(book) {
    currentEditBook = book;
    editTagState = {
        genres:     [...(book.genres     || [])],
        tags:       [...(book.tags        || [])],
        niche_tags: [...(book.niche_tags || [])]
    };

    const dropdownIds = { genres: 'edit-genres-dropdown', tags: 'edit-tags-dropdown', niche_tags: 'edit-niche-dropdown' };
    ['genres', 'tags', 'niche_tags'].forEach(cat => {
        document.querySelectorAll(`#${dropdownIds[cat]} .tag-tile`).forEach(tile => {
            tile.classList.toggle('selected', editTagState[cat].includes(tile.dataset.value));
        });
        renderEditTagChips(cat);
    });

    document.getElementById('detail-tags-display').classList.add('hidden');
    document.getElementById('detail-edit-btn').classList.add('hidden');
    document.getElementById('detail-edit-section').classList.remove('hidden');
}

function cancelEditMode() {
    document.getElementById('detail-edit-section').classList.add('hidden');
    document.getElementById('detail-tags-display').classList.remove('hidden');
    document.getElementById('detail-edit-btn').classList.remove('hidden');
}

async function saveTagEdits() {
    const btn = document.getElementById('save-tags-btn');
    btn.textContent = 'Saving...';
    btn.disabled = true;

    const { error } = await db
        .from('community_library')
        .update({
            genres:     editTagState.genres,
            tags:       editTagState.tags,
            niche_tags: editTagState.niche_tags
        })
        .eq('id', currentEditBook.id);

    if (error) {
        console.error(error);
        btn.textContent = 'Save';
        btn.disabled = false;
        return;
    }

    const idx = allBooks.findIndex(b => b.id === currentEditBook.id);
    if (idx !== -1) allBooks[idx] = { ...allBooks[idx], ...editTagState };
    buildFilterDropdown();
    renderBooks();
    openDetailModal(allBooks[idx]);
}

function renderEditTagChips(category) {
    const chipsIds   = { genres: 'edit-genres-chips',       tags: 'edit-tags-chips',       niche_tags: 'edit-niche-chips' };
    const phIds      = { genres: 'edit-genres-placeholder', tags: 'edit-tags-placeholder', niche_tags: 'edit-niche-placeholder' };
    const dropIds    = { genres: 'edit-genres-dropdown',    tags: 'edit-tags-dropdown',    niche_tags: 'edit-niche-dropdown' };

    const container   = document.getElementById(chipsIds[category]);
    const placeholder = document.getElementById(phIds[category]);

    container.innerHTML = editTagState[category].map(v => `
        <span class="tag-chip">${escHtml(v)}
            <button type="button" class="chip-remove-btn" data-cat="${category}" data-val="${escHtml(v)}">×</button>
        </span>
    `).join('');

    if (placeholder) placeholder.classList.toggle('hidden', editTagState[category].length > 0);

    container.querySelectorAll('.chip-remove-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const cat = btn.dataset.cat;
            const val = btn.dataset.val;
            editTagState[cat] = editTagState[cat].filter(v => v !== val);
            const tile = document.querySelector(`#${dropIds[cat]} .tag-tile[data-value="${val}"]`);
            if (tile) tile.classList.remove('selected');
            renderEditTagChips(cat);
        });
    });
}

function setupEditTagSelector(fieldId, dropdownId, category, options) {
    const field    = document.getElementById(fieldId);
    const dropdown = document.getElementById(dropdownId);

    dropdown.innerHTML = `
        <input type="text" class="tag-search-input" placeholder="Search...">
        <div class="tag-tiles-container">
            ${options.map(opt => `
                <span class="tag-tile" data-category="${category}" data-value="${escHtml(opt)}">${escHtml(opt)}</span>
            `).join('')}
        </div>
    `;

    const searchInput = dropdown.querySelector('.tag-search-input');
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        dropdown.querySelectorAll('.tag-tile').forEach(tile => {
            tile.classList.toggle('hidden', !tile.dataset.value.toLowerCase().includes(query));
        });
    });
    searchInput.addEventListener('click', e => e.stopPropagation());

    field.addEventListener('click', e => {
        e.stopPropagation();
        ['edit-genres-dropdown', 'edit-tags-dropdown', 'edit-niche-dropdown'].forEach(id => {
            if (id !== dropdownId) document.getElementById(id).classList.add('hidden');
        });
        dropdown.classList.toggle('hidden');
        if (!dropdown.classList.contains('hidden')) searchInput.focus();
    });

    dropdown.querySelectorAll('.tag-tile').forEach(tile => {
        tile.addEventListener('click', e => {
            e.stopPropagation();
            const val = tile.dataset.value;
            if (editTagState[category].includes(val)) {
                editTagState[category] = editTagState[category].filter(v => v !== val);
                tile.classList.remove('selected');
            } else {
                editTagState[category].push(val);
                tile.classList.add('selected');
            }
            renderEditTagChips(category);
        });
    });
}

// ---- Tag Selectors ----

function setupTagSelector(fieldId, dropdownId, category, options) {
    const field    = document.getElementById(fieldId);
    const dropdown = document.getElementById(dropdownId);

    dropdown.innerHTML = `
        <input type="text" class="tag-search-input" placeholder="Search...">
        <div class="tag-tiles-container">
            ${options.map(opt => `
                <span class="tag-tile" data-category="${category}" data-value="${escHtml(opt)}">${escHtml(opt)}</span>
            `).join('')}
        </div>
    `;

    const searchInput = dropdown.querySelector('.tag-search-input');
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        dropdown.querySelectorAll('.tag-tile').forEach(tile => {
            tile.classList.toggle('hidden', !tile.dataset.value.toLowerCase().includes(query));
        });
    });
    searchInput.addEventListener('click', e => e.stopPropagation());

    field.addEventListener('click', e => {
        e.stopPropagation();
        ['genres-dropdown', 'tags-dropdown', 'niche-dropdown'].forEach(id => {
            if (id !== dropdownId) document.getElementById(id).classList.add('hidden');
        });
        dropdown.classList.toggle('hidden');
        if (!dropdown.classList.contains('hidden')) searchInput.focus();
    });

    dropdown.querySelectorAll('.tag-tile').forEach(tile => {
        tile.addEventListener('click', e => {
            e.stopPropagation();
            const val = tile.dataset.value;
            if (tagState[category].includes(val)) {
                tagState[category] = tagState[category].filter(v => v !== val);
                tile.classList.remove('selected');
            } else {
                tagState[category].push(val);
                tile.classList.add('selected');
            }
            renderTagChips(category);
        });
    });
}

function renderTagChips(category) {
    const chipsId = { genres: 'genres-chips', tags: 'tags-chips', niche_tags: 'niche-chips' }[category];
    const phId    = { genres: 'genres-placeholder', tags: 'tags-placeholder', niche_tags: 'niche-placeholder' }[category];

    const container   = document.getElementById(chipsId);
    const placeholder = document.getElementById(phId);

    container.innerHTML = tagState[category].map(v => `
        <span class="tag-chip">${escHtml(v)}
            <button type="button" class="chip-remove-btn" data-cat="${category}" data-val="${escHtml(v)}">×</button>
        </span>
    `).join('');

    if (placeholder) placeholder.classList.toggle('hidden', tagState[category].length > 0);

    container.querySelectorAll('.chip-remove-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const cat = btn.dataset.cat;
            const val = btn.dataset.val;
            tagState[cat] = tagState[cat].filter(v => v !== val);
            const dropdownId = { genres: 'genres-dropdown', tags: 'tags-dropdown', niche_tags: 'niche-dropdown' }[cat];
            const tile = document.querySelector(`#${dropdownId} .tag-tile[data-value="${val}"]`);
            if (tile) tile.classList.remove('selected');
            renderTagChips(cat);
        });
    });
}

// ---- Submit ----

async function submitBook(e) {
    e.preventDefault();
    if (!selectedBookData) return;

    const ownerInput = document.getElementById('input-owner');
    const owner = ownerInput.value.trim();
    if (!owner) {
        ownerInput.classList.add('field-error');
        ownerInput.focus();
        return;
    }

    const btn = document.getElementById('submit-book-btn');
    btn.textContent = 'Adding...';
    btn.disabled = true;

    const { error } = await db
        .from('community_library')
        .insert({
            title:      selectedBookData.title,
            author:     selectedBookData.author,
            cover_url:  selectedBookData.cover_url,
            owner,
            genres:     tagState.genres,
            tags:       tagState.tags,
            niche_tags: tagState.niche_tags
        });

    if (error) {
        console.error(error);
        btn.textContent = 'Add to Library';
        btn.disabled = false;
        return;
    }

    closeModal();
    await loadBooks();
}

// ---- Utils ----

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ---- Init ----

document.getElementById('filter-btn').addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('filter-dropdown').classList.toggle('hidden');
});

document.addEventListener('click', e => {
    // Close filter bar dropdown
    if (!document.getElementById('filter-wrapper').contains(e.target)) {
        document.getElementById('filter-dropdown').classList.add('hidden');
    }
    // Close tag selector dropdowns
    ['genres-selector', 'tags-selector', 'niche-selector', 'edit-genres-selector', 'edit-tags-selector', 'edit-niche-selector'].forEach(id => {
        const selector = document.getElementById(id);
        if (selector && !selector.contains(e.target)) {
            selector.querySelector('.tag-selector-dropdown').classList.add('hidden');
        }
    });
});

document.getElementById('add-book-btn').addEventListener('click', openModal);
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('add-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('add-modal')) closeModal();
});

function closeDetailModal() {
    document.getElementById('detail-modal').classList.add('hidden');
    document.getElementById('detail-edit-section').classList.add('hidden');
}

document.getElementById('detail-modal-close').addEventListener('click', closeDetailModal);
document.getElementById('detail-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('detail-modal')) closeDetailModal();
});
document.getElementById('save-tags-btn').addEventListener('click', saveTagEdits);
document.getElementById('cancel-edit-btn').addEventListener('click', cancelEditMode);

document.getElementById('book-search').addEventListener('input', e => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => searchOpenLibrary(e.target.value), 400);
});

document.getElementById('add-book-form').addEventListener('submit', submitBook);
document.getElementById('input-owner').addEventListener('input', () => {
    document.getElementById('input-owner').classList.remove('field-error');
});
document.getElementById('undo-btn').addEventListener('click', undoDelete);

setupTagSelector('genres-field', 'genres-dropdown', 'genres',     GENRES);
setupTagSelector('tags-field',   'tags-dropdown',   'tags',       TAGS);
setupTagSelector('niche-field',  'niche-dropdown',  'niche_tags', NICHE_TAGS);

setupEditTagSelector('edit-genres-field', 'edit-genres-dropdown', 'genres',     GENRES);
setupEditTagSelector('edit-tags-field',   'edit-tags-dropdown',   'tags',       TAGS);
setupEditTagSelector('edit-niche-field',  'edit-niche-dropdown',  'niche_tags', NICHE_TAGS);

loadBooks();
