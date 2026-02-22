const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loadReadingList() {
    const { data, error } = await db
        .from('reading_list')
        .select('*')
        .eq('is_reading', false)
        .order('bookclub_date', { ascending: false });

    const container = document.getElementById('book-list');

    if (error) {
        container.innerHTML = '<p>Something went wrong loading the books.</p>';
        return;
    }

    if (data.length === 0) {
        container.innerHTML = '<p>No books yet.</p>';
        return;
    }

    let html = '';

    for (const book of data) {
        html += '<div class="book-card">';

        if (book.cover_url) {
            html += `<img src="${book.cover_url}" alt="Cover of ${book.title}">`;
        }

        html += `<h3>${book.title}</h3>`;
        html += `<p>${book.author}</p>`;

        if (book.bookclub_date) {
            html += `<p>${book.bookclub_date}</p>`;
        }

        if (book.host) {
            html += `<p>Hosted by ${book.host}</p>`;
        }
        
        if (book.description) {
            html += `<p>${book.description}</p>`;
        }

        html += '</div>';
    }

    container.innerHTML = html;
}

loadReadingList();
