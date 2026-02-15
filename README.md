# Book Club

A simple website for a book club with two features:

1. **Reading List** — tracks books the club has read or is currently reading (title, author, date read)
2. **Community Library** — a catalogue of books members own and are willing to lend (title, author, owner). Members can add and remove their own books.

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (no frameworks)
- **Database:** Supabase (PostgreSQL with a REST API)
- **Hosting:** Netlify (deployed from GitHub)

## Authentication

Access is protected by a single shared password — no user accounts. The password gates access to the site. Once entered, anyone can add/remove books from the community library.

## Project Structure

bookclub/
├── index.html          ← main page
├── css/
│   └── styles.css      ← all styling
├── js/
│   └── app.js          ← all JavaScript
├── .gitignore
└── README.md


## Build Plan

The site is being built incrementally, one feature at a time:

- [x] Project structure and basic HTML page
- [ ] Supabase setup (database tables for reading list and community library)
- [ ] Password protection
- [ ] Reading list display (fetch and show books from Supabase)
- [ ] Community library display
- [ ] Add/remove books in the community library
- [ ] Netlify deployment
- [ ] Dark mode

## Development

No build tools needed. Open `index.html` in a browser to view the site locally. For live reloading during development, use the VS Code "Live Server" extension.
