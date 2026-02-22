# Book Club

A simple website for a book club, built incrementally with HTML, CSS, and JavaScript.

## Features

1. **Reading List** — tracks books the club has read or is currently reading, with title, author, date, host, and description. The landing page highlights the current book; past books are on a separate page.
2. **Community Library** — (coming soon) a catalogue of books members own and are willing to lend, with tags for searching/filtering.

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (no frameworks)
- **Database:** Supabase (PostgreSQL with a REST API)
- **Hosting:** Netlify (deployed from GitHub)

## Authentication

Access will be protected by a single shared password — no user accounts. The password gates access to the site. Once entered, anyone can add/remove books from the community library.

## Project Structure

```
bookclub/
├── index.html              ← landing page (welcome + currently reading)
├── reading-list.html       ← past books list
├── css/
│   └── styles.css          ← all styling
├── js/
│   ├── config.js           ← Supabase credentials
│   ├── app.js              ← landing page logic
│   └── reading-list.js     ← reading list page logic
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
| bookclub_date | text | Flexible date format |
| host | text | Who chose/presented the book |
| is_reading | bool | True for the current book |
| cover_url | text | Link to cover image |
| description | text | Blurb or club notes |
| created_at | timestamptz | Auto-generated |

### community_library
| Column | Type | Notes |
|---|---|---|
| id | int8 | Primary key, auto-generated |
| title | text | Not null |
| author | text | Not null |
| owner | text | Not null |
| tags | text[] | For searching/filtering |
| created_at | timestamptz | Auto-generated |

## Build Plan

- [x] Project structure and basic HTML page
- [x] Supabase setup and database tables
- [x] Currently reading display on landing page
- [x] Reading list page with past books
- [ ] Community library display
- [ ] Add/remove books in community library
- [ ] Open Library API integration for book search
- [ ] Password protection
- [ ] Netlify deployment
- [ ] Dark mode
- [ ] Book cover images

## Development

No build tools needed. Open `index.html` in a browser to view the site locally.

Supabase credentials are stored in `js/config.js`. This file is checked into git because the anon key is designed to be public — security is handled by Row Level Security on the database (to be configured).
