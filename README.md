# Smart Support Desk

A support desk where users report software issues and support agents resolve them. While writing a new ticket, an open-source AI suggests similar resolved tickets that may already have an answer.

## Project structure

```text
smart-support-desk/
├── README.md
├── start.ps1                  # one-command Windows launcher
├── .env.example               # sample settings (copied to backend/.env)
├── backend/                   # Django REST API
│   ├── manage.py
│   ├── requirements.txt       # Python dependencies
│   ├── config/                # project settings and main URLs
│   └── tickets/
│       ├── db.py              # MongoDB connection (PyMongo)
│       ├── serializers.py     # input validation rules
│       ├── views.py           # API endpoints
│       ├── permissions.py     # role check (user / agent)
│       ├── services/
│       │   └── similarity.py  # AI similar-ticket search
│       ├── management/commands/seed.py   # sample data
│       └── tests/             # automated tests
└── frontend/                  # Angular 18 app
    └── src/app/
        ├── core/              # API service, role state, request interceptor
        ├── features/          # dashboard, ticket list, ticket detail, ticket form
        ├── shared/            # reusable ticket table and status badge
        └── app.routes.ts      # page routes
```

## Run the project (Windows)

Install Python 3.10+, Node.js 18.19+ and MongoDB Community Server first. Then, from PowerShell in the project folder, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

(From Git Bash: `powershell.exe -ExecutionPolicy Bypass -File ./start.ps1`.)

This starts MongoDB, the Django backend and the Angular frontend, installs the packages on the first run, and adds 42 sample tickets if the database is empty. The first run can take several minutes. Keep the opened windows running, then visit **http://localhost:4200**.

## Features

### 1. Create a ticket
The user enters a title, description and category. Required fields and the 150-character title limit are checked in the browser and again on the server, and clear error messages are shown.
**Technology:** Angular Reactive Forms (frontend), `POST /api/tickets/`, Django REST Framework serializers (validation), PyMongo `insert_one` (saving to MongoDB).

### 2. Ticket list and filters
Users can see all tickets, filter them by status or category, and search by text. The filters stay in the page URL, so a refresh keeps them.
**Technology:** `GET /api/tickets/?status=&category=`, PyMongo `find` with a query filter, and Angular query parameters. The search box filters the already loaded tickets in the browser.

### 3. Ticket details
Each ticket has its own page showing the description, category, status, created date and resolution note.
**Technology:** `GET /api/tickets/<id>/`, MongoDB lookup by `ObjectId`, Angular router (`/tickets/:id`).

### 4. Agent updates (status and resolution note)
A support agent can change a ticket between Open, In Progress and Resolved. Resolving a ticket requires a resolution note.
**Technology:** `PATCH /api/tickets/<id>/`, a Django REST Framework permission class (`permissions.py`) that allows only agents, and serializer validation for the required note.

### 5. User / Support Agent roles
A switch in the top bar changes between User and Support Agent. There is no login screen. Users can create and view tickets; only agents can update them.
**Technology:** The role is saved in the browser (`localStorage`), and an Angular HTTP interceptor adds it to every request as the `X-Role` header. The backend checks that header. This is demo-level access control, not real authentication: there are no JWT tokens or passwords in the UI. An optional login endpoint (`POST /api/login/`) and demo accounts (`user1`–`user6`, `agent1`–`agent6`, password `demo1234`) exist in the backend but the UI does not use them.

### 6. Dashboard
Shows total, open, in-progress and resolved ticket counts, plus the five newest tickets and a preview panel.
**Technology:** `GET /api/tickets/stats/` using PyMongo `count_documents`, Angular signals for the live state.

### 7. AI: similar resolved tickets
**What it does:** while writing a new ticket, the user clicks **Check similar tickets** and sees up to 3 resolved tickets that mean something similar, each with a "Strong match" or "Related" label and its resolution note. Suggestions are advice only. They never close or change a ticket, and the user can still submit the ticket.
**How to use it:** open **New ticket**, type a title and description, click **Check similar tickets**, and open a suggestion in a new tab to read its resolution.
**Technology:**
- The open-source `all-MiniLM-L6-v2` model, run through the `sentence-transformers` library (built on PyTorch), runs fully on your own machine with no API key.
- It turns the title and description into numbers (embeddings) that capture meaning, so different wording can still match.
- Resolved tickets are ranked by cosine similarity, and the top 3 above a minimum score are returned by `POST /api/tickets/similar/`.
- Embeddings of resolved tickets are cached in memory for speed (`services/similarity.py`).
- Example: "I can't get a new password, the link says it is no longer valid" suggests "Password reset link shows expired".
- The model (about 90 MB) downloads automatically the first time it is used.

### 8. Sample data
Running `python manage.py seed` in `backend` adds 42 tickets (26 Resolved, 9 Open, 7 In Progress), including differently worded pairs for demonstrating the AI. `python manage.py seed --reset` clears the tickets first.
**Technology:** a Django management command using PyMongo.

## Tech stack summary

| Part | Technology |
|---|---|
| Frontend | Angular 18 (standalone components, signals, Reactive Forms, HTTP interceptor), plain CSS |
| Backend | Django, Django REST Framework, django-cors-headers |
| Database | MongoDB (local), accessed with PyMongo |
| AI | sentence-transformers, `all-MiniLM-L6-v2`, cosine similarity |

PyMongo is used instead of the Django MongoDB Backend because it is simpler to combine with Django REST Framework, has fewer moving parts and gives direct control over queries.

## MongoDB configuration

The default connection is in `backend/.env` (created from `.env.example`):

```text
MONGODB_URI=mongodb://localhost:27017/smart_support_desk
```

MongoDB must be running before the backend starts. MongoDB Atlas also works: put your own connection string in `backend/.env`. Never commit `.env` or any credentials.

## Run tests

From `backend`, with the virtual environment active and MongoDB running:

```bash
python manage.py test tickets
```

Tests use a separate database (`smart_support_desk_test`), so your real data is not touched.

## Known limitations

- The AI model is small and works best with English text.
- Similarity scores are suggestions, not proof that a past fix will solve the new issue.
- Embeddings are kept in memory and rebuilt when the server restarts.
- Roles are demo-level: the server trusts the `X-Role` header, so this is not suitable for production.