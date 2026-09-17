# Optional MySQL backend setup

The visualizer does not need MySQL to run or to deploy to GitHub Pages. Without this optional API it automatically uses its bundled browser relations and localStorage. Complete this guide only when you want local MySQL persistence, schema management, or the SQL workspace.

The MySQL tables and seed data must already exist in the `ra_visualizer` database.

## 1. Configure credentials

In this folder, copy `.env.example` to a new file named `.env`.

Set `DB_PASSWORD` to the password you chose for the MySQL user `ra_app`. Do not commit or share `.env`; it is ignored by Git.

## 2. Install packages

Run:

```bash
npm install
```

## 3. Run the application with MySQL

Run:

```bash
npm run dev:full
```

This starts the Node.js API on `http://localhost:5000` and the React site on the Vite URL printed in the terminal (normally `http://localhost:5173`).

To verify the database connection, open `http://localhost:5000/api/health`. It should show:

```json
{"ok":true}
```

## Saving relation changes

The data editor now has a **Save** button for each existing row. Saving sends a `PATCH` request to the API, which executes a parameterized MySQL `UPDATE` using the relation's primary key. Adding a tuple sends `INSERT`; deleting a tuple sends `DELETE`.

The **Reload database** button discards any unsaved browser edits and fetches the current MySQL records. It never resets or deletes database records.

## Browser-only development

To run the visualizer without configuring MySQL, use:

```bash
npm run dev
```

The app shows a browser-storage status message after the unavailable API request and remains fully usable for relational algebra execution, editing relations, table management, query history, theme persistence, and report downloads.
