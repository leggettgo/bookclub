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
    'Ghosts', 'Greek Pantheon', 'Kinks [can be specified further]', 'Medieval',
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
        btn.addEventListener('click', () => initiateDelete(parseInt(btn.dataset.id)));
    });
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
        <label class="filter-option">
            <input type="checkbox" data-category="${category}" data-value="${escHtml(v)}"
                ${activeFilters[category].includes(v) ? 'checked' : ''}>
            ${escHtml(v)}
        </label>
    `).join('');

    container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
            const cat = cb.dataset.category;
            const val = cb.dataset.value;
            if (cb.checked) {
                activeFilters[cat].push(val);
            } else {
                activeFilters[cat] = activeFilters[cat].filter(v => v !== val);
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
            const cb = document.querySelector(`#filter-dropdown input[data-category="${cat}"][data-value="${val}"]`);
            if (cb) cb.checked = false;
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

    const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=8&fields=title,author_name,cover_i,key`;

    try {
        const res  = await fetch(url);
        const json = await res.json();
        renderSearchResults(json.docs || []);
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
            ${r.cover_i
                ? `<img src="https://covers.openlibrary.org/b/id/${r.cover_i}-S.jpg" alt="">`
                : `<div class="result-no-cover"></div>`
            }
            <div>
                <p class="result-title">${escHtml(r.title)}</p>
                <p class="result-author">${escHtml((r.author_name || ['Unknown']).join(', '))}</p>
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
        author:    (result.author_name || ['Unknown']).join(', '),
        cover_url: result.cover_i
            ? `https://covers.openlibrary.org/b/id/${result.cover_i}-M.jpg`
            : null
    };

    document.getElementById('search-results').innerHTML = '';
    document.getElementById('search-results').classList.add('hidden');
    document.getElementById('book-search').value = '';

    document.getElementById('selected-book-preview').innerHTML = `
        ${selectedBookData.cover_url
            ? `<img src="${escHtml(selectedBookData.cover_url)}" alt="Cover" class="preview-cover">`
            : ''
        }
        <div>
            <p><strong>${escHtml(selectedBookData.title)}</strong></p>
            <p>${escHtml(selectedBookData.author)}</p>
        </div>
    `;

    document.getElementById('add-book-form').classList.remove('hidden');
    document.getElementById('input-owner').focus();
}

// ---- Tag Selectors ----

function setupTagSelector(fieldId, dropdownId, category, options) {
    const field    = document.getElementById(fieldId);
    const dropdown = document.getElementById(dropdownId);

    dropdown.innerHTML = options.map(opt => `
        <span class="tag-tile" data-category="${category}" data-value="${escHtml(opt)}">${escHtml(opt)}</span>
    `).join('');

    field.addEventListener('click', e => {
        e.stopPropagation();
        ['genres-dropdown', 'tags-dropdown', 'niche-dropdown'].forEach(id => {
            if (id !== dropdownId) document.getElementById(id).classList.add('hidden');
        });
        dropdown.classList.toggle('hidden');
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

    const { data, error } = await db
        .from('community_library')
        .insert({
            title:      selectedBookData.title,
            author:     selectedBookData.author,
            cover_url:  selectedBookData.cover_url,
            owner,
            genres:     tagState.genres,
            tags:       tagState.tags,
            niche_tags: tagState.niche_tags
        })
        .select()
        .single();

    if (error) {
        console.error(error);
        btn.textContent = 'Add to Library';
        btn.disabled = false;
        return;
    }

    allBooks = [data, ...allBooks];
    buildFilterDropdown();
    renderBooks();
    closeModal();
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
    ['genres-selector', 'tags-selector', 'niche-selector'].forEach(id => {
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

loadBooks();
