# Relational Algebra Visualizer

An interactive college DBMS project for learning relational algebra through real execution. It parses expressions into an AST, validates them, evaluates them against the available relations, records intermediate results, draws an interactive D3 expression tree, and explains every step.

The deployed site is **browser-first**: its relational-algebra engine, visualizations, report generator, browser storage, and editable bundled sample database run without a server. A local Express/MySQL API is optional for development; when it is unavailable (including on GitHub Pages), the app automatically uses browser storage instead.

## Features

- Selection, projection, union, difference, Cartesian product, rename, intersection, theta/equi join, natural join, and division.
- Nested expressions, input validation with educational errors, tuple deduplication, and intermediate results.
- Basic client-side SQL translation: `SELECT columns FROM relation WHERE condition;`
- Step controls: First, Previous, Next, Last, Run All, Reset.
- Interactive D3 expression tree — click a node to inspect that operation.
- Editable relations, table manager, query history, and theme preference persisted with browser localStorage when MySQL is unavailable.
- Optional local Express/MySQL API for persistent database edits, schema changes, history, and a full SQL workspace during development.
- Day/Night theme, responsive layout, operator cheat sheet, interactive Learn section, user manual, team placeholders, and source references.
- Execution-state reports in PDF, DOCX, and TXT, plus final-result CSV, JSON, and Markdown exports. Each report is generated from the query and processing snapshot currently on screen.

## Browser fallback and optional MySQL

Opening the Vite site with `npm run dev` is enough to use the full visualizer. The initial connection attempt to the optional local API is allowed to fail; the app then loads its bundled sample database and keeps relation edits and query history in `localStorage`.

To use MySQL persistence locally, follow [SETUP.md](SETUP.md) and run `npm run dev:full`. The optional API is never required by the GitHub Pages deployment. The SQL workspace is visible only while that API is connected.

## GitHub Pages deployment — beginner guide

### Step 1 — Create Repository

1. Sign in to GitHub and click the **+** icon in the upper-right corner.
2. Choose **New repository**.
3. Choose a repository name, for example `relational-algebra-visualizer`.
4. Select **Public** (recommended for a college project) and click **Create repository**.
5. Keep the new repository page open.

### Step 2 — Upload Project

1. Download or copy this complete project folder.
2. On your empty GitHub repository page, choose **uploading an existing file**.
3. Drag the **contents** of this project folder into the upload area. This includes hidden/project folders such as `.github`, `src`, `tests`, and `docs`.
4. Confirm that `.github/workflows/deploy.yml`, `package.json`, `vite.config.js`, and `src` appear in the file list.
5. Scroll down and click **Commit changes** on the `main` branch.

> If your operating system hides folders beginning with a period, make sure you enable hidden files before uploading. The `.github/workflows/deploy.yml` file is required for automatic deployment.

### Step 3 — Enable GitHub Pages

In the repository, open:

```text
GitHub Repository
→ Settings
→ Pages
→ Build and deployment
→ Source: GitHub Actions
```

Click **Save** if GitHub shows a save option.

### Step 4 — Deployment

Pushing to the `main` branch starts the included GitHub Actions workflow automatically. It:

1. Checks out the repository.
2. Installs the package dependencies with `npm ci`.
3. Runs `npm run build`.
4. Uploads the generated `dist` folder.
5. Deploys that artifact with GitHub’s official Pages deployment action.

Follow the deployment from the repository’s **Actions** tab. A green check means the website was published. Every later push to `main` repeats the deployment automatically; you never need to upload `dist` yourself.

### Step 5 — Open Website

GitHub displays the deployed URL in the successful Actions deployment and in:

```text
Repository → Settings → Pages
```

Its format will be:

```text
https://USERNAME.github.io/REPOSITORY-NAME/
```

Replace `USERNAME` and `REPOSITORY-NAME` with your own details. The project does not invent or require a fixed URL.

## Why it works under a repository subpath

`vite.config.js` detects the GitHub Actions repository name and sets Vite’s `base` to `/REPOSITORY-NAME/` while the Pages build runs. Vite then writes asset URLs with the correct subpath. Local development uses `/` instead. The optional API defaults to `http://localhost:5000/api`; when that address is unavailable in a deployed site, the app handles the failed request and continues with browser storage.

## Run locally (optional)

Node.js 20 or newer is recommended. This starts the browser-first application:

```bash
npm install
npm run dev
```

Open the URL shown by Vite only for local development. Deployment itself is handled by GitHub Actions.

For optional MySQL development, use the instructions in [SETUP.md](SETUP.md) and then run:

```bash
npm run dev:full
```

## Test and build

```bash
npm run test
npm run build
```

The test suite covers each relational operation, valid/invalid expressions, nested expressions, joins, SQL translation, browser-storage helpers, and execution-state PDF/TXT/DOCX report content. The production build is also run by the Pages workflow.

## Query examples

| Concept | Expression |
| --- | --- |
| Selection | `σ Age > 20 (STUDENT)` |
| Projection | `π Name, Department (STUDENT)` |
| Nested | `π Name (σ Department = 'CSE' (STUDENT))` |
| Equi join | `STUDENT ⋈ STUDENT.CourseID = COURSE.CourseID COURSE` |
| Union | `CSE_STUDENTS ∪ ECE_STUDENTS` |
| Difference | `STUDENT − CSE_STUDENTS` |
| Product | `FACULTY × COURSE` |
| Intersection | `STUDENT ∩ CSE_STUDENTS` |
| Natural join | `STUDENT ⨝ COURSE` |
| Division | `STUDENT_COURSES ÷ REQUIRED_COURSES` |
| Rename | `ρ LEARNER (STUDENT)` |

## Project structure

```text
.
├── .github/workflows/deploy.yml  # Official GitHub Pages Actions deployment
├── public/
├── src/
│   ├── components/                # Dashboard, table, tree, editor, Learn/Help/team/report UI
│   ├── data/sampleDatabase.js
│   ├── engine/                    # Parser, executor, SQL translator, raw/result report exporters
│   ├── services/api.js             # Optional local MySQL client
│   ├── styles/app.css
│   ├── utils/storage.js
│   ├── App.jsx
│   └── main.jsx
├── server/                         # Optional local Express + MySQL API
├── tests/
├── docs/PROJECT_DOCUMENTATION.md
├── screenshots/
├── AI_PROMPTS.md
├── README.md
├── package.json
└── vite.config.js
```

## Notes and limitations

This is a teaching visualizer, not a production database management system. It uses simple in-memory nested-loop algorithms and a deliberately small SQL grammar. Browser localStorage is tied to the browser/device and can be cleared by the user. Replace the editable placeholders in [src/data/team.js](src/data/team.js) with the real team details before submission. See [project documentation](docs/PROJECT_DOCUMENTATION.md) for requirements, algorithms, complexity, testing, limitations, and future work.
