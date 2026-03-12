# Book Club

A simple website for a book club, built incrementally with HTML, CSS, and JavaScript.

## Features

1. **Reading List** — tracks books the club has read or is currently reading, with title, author, date, host, and description. The landing page highlights the current book; past books are on a separate calendar grid page organised by month and year.
2. **Book Club Ops** — member photo grid with labels.
3. **Community Library** — (coming soon) a catalogue of books members own and are willing to lend, with tags for searching/filtering.
4. **Resources** — (coming soon)

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (no frameworks)
- **Database:** Supabase (PostgreSQL with a REST API)
- **Hosting:** Netlify (deployed from GitHub at https://onwardnoretreat.netlify.app/)

## Authentication

Access will be protected by a single shared password — no user accounts. The password gates access to the site. Once entered, anyone can add/remove books from the community library.

## Project Structure

```
bookclub/
├── index.html                  ← landing page (welcome + currently reading)
├── reading-list.html           ← past books calendar grid
├── community-library.html      ← community lending library (coming soon)
├── book-club-ops.html          ← member photo grid
├── resources.html              ← resources page (coming soon)
├── css/
│   └── styles.css              ← all styling
├── js/
│   ├── config.js               ← Supabase credentials
│   ├── app.js                  ← landing page logic
│   └── reading_list.js         ← reading list page logic
├── images/                     ← book covers and member photos
├── .gitignore
└── README.md
```

## Database Tables

### reading_list
| Column | Type | Notes |
|---|---|---|
| id | int8 | Primary key, auto-generated |
| title | text | Not null |
| author | text | Not null |
| bookclub_date | text | DD/MM/YYYY format |
| host | text | Who chose/presented the book |
| is_reading | bool | True for the current book |
| cover_url | text | Relative path e.g. `images/cover.jpg` |
| description | text | Blurb or club notes |
| created_at | timestamptz | Auto-generated |

### community_library
| Column | Type | Notes |
|---|---|---|
| id | int8 | Primary key, auto-generated |
| title | text | Not null |
| author | text | Not null |
| owner | text | Not null |
| tags | text[] | For searching/filtering, default `{}` |
| created_at | timestamptz | Auto-generated |

## Build Plan

- [x] Project structure and basic HTML page
- [x] Supabase setup and database tables
- [x] Currently reading display on landing page
- [x] Reading list page — calendar grid by month/year with year navigation
- [x] Book cover images stored in `images/` folder
- [x] Book Club Ops page — member photo grid
- [x] Netlify deployment
- [ ] Community library display
- [ ] Add/remove books in community library (with Open Library API for book search)
- [ ] Password protection
- [ ] Dark mode

## Development

No build tools needed. Open `index.html` in a browser via a local server (e.g. VS Code Live Server) to view the site locally.

Supabase credentials are stored in `js/config.js`. This file is checked into git because the anon key is designed to be public — security will be handled by Row Level Security once password protection is implemented. RLS is currently disabled on both tables.
