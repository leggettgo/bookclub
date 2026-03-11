const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const MONTHS = [
    'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'
];

let allBooks = [];
let availableYears = [];
let currentYearIndex = 0;

// Parse "DD/MM/YYYY" into { year, month } where month is 0-indexed
function parseBookDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    return {
        month: parseInt(parts[1], 10) - 1,
        year: parseInt(parts[2], 10)
    };
}

// Build and display the grid for a given year
function renderYear(year) {
    document.getElementById('current-year').textContent = year;

    const booksThisYear = allBooks.filter(book => {
        const date = parseBookDate(book.bookclub_date);
        return date && date.year === year;
    });

    // Group books by month
    const byMonth = {};
    for (const book of booksThisYear) {
        const date = parseBookDate(book.bookclub_date);
        if (date) {
            if (!byMonth[date.month]) byMonth[date.month] = [];
            byMonth[date.month].push(book);
        }
    }

    let html = '';

    for (let i = 0; i < 12; i++) {
        const books = byMonth[i] || [];
        const isEmpty = books.length === 0;

        html += `<div class="month-card${isEmpty ? ' empty' : ''}">`;
        html += `<div class="month-label">${MONTHS[i]}</div>`;

        for (const book of books) {
            if (book.cover_url) {
                html += `<img class="book-cover" src="${book.cover_url}" alt="Cover of ${book.title}">`;
            } else {
                html += `<div class="book-cover-placeholder">${book.title}</div>`;
            }

            html += `<h3>${book.title}</h3>`;
            html += `<p class="book-author">${book.author}</p>`;

            if (book.host) {
                html += `<p class="book-host">Hosted by ${book.host}</p>`;
            }
        }

        html += '</div>';
    }

    document.getElementById('calendar-grid').innerHTML = html;

    // Update button states
    document.getElementById('prev-year').disabled = currentYearIndex === 0;
    document.getElementById('next-year').disabled = currentYearIndex === availableYears.length - 1;
}

async function loadReadingList() {
    const { data, error } = await db
        .from('reading_list')
        .select('*')
        .order('bookclub_date', { ascending: false });

    const container = document.getElementById('calendar-grid');

    if (error) {
        console.log('Error details:', JSON.stringify(error));
        container.innerHTML = '<p>Something went wrong loading the books.</p>';
        return;
    }

    if (data.length === 0) {
        container.innerHTML = '<p>No books yet.</p>';
        return;
    }

    allBooks = data;

    // Collect unique years from the data, sorted ascending
    const yearSet = new Set();
    for (const book of allBooks) {
        const date = parseBookDate(book.bookclub_date);
        if (date) yearSet.add(date.year);
    }
    availableYears = Array.from(yearSet).sort((a, b) => a - b);

    // Start on the most recent year
    currentYearIndex = availableYears.length - 1;

    renderYear(availableYears[currentYearIndex]);
}

document.getElementById('prev-year').addEventListener('click', () => {
    if (currentYearIndex > 0) {
        currentYearIndex--;
        renderYear(availableYears[currentYearIndex]);
    }
});

document.getElementById('next-year').addEventListener('click', () => {
    if (currentYearIndex < availableYears.length - 1) {
        currentYearIndex++;
        renderYear(availableYears[currentYearIndex]);
    }
});

loadReadingList();
