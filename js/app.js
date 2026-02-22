const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loadCurrentBook() {
    const { data, error } = await db
        .from('reading_list')
        .select('*')
        .eq('is_reading', true)
        .single();

    const container = document.getElementById('current-book');

    if (error || !data) {
        container.innerHTML = '<p>No book selected right now.</p>';
        return;
    }

    let html = '';

    if (data.cover_url) {
        html += `<img src="${data.cover_url}" alt="Cover of ${data.title}">`;
    }

    html += `<h3>${data.title}</h3>`;
    html += `<p>${data.author}</p>`;

    if (data.description) {
        html += `<p>${data.description}</p>`;
    }

    container.innerHTML = html;
}

loadCurrentBook();
