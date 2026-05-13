# govtooling.github.io

Static site for **U.S. Department of Labor Form WH-347** (Davis-Bacon certified payroll). Built with [Vite](https://vitejs.dev/) and React. Form data is stored only in the browser (localStorage) unless you export a JSON backup.

Reference: [WH-347 official instructions](https://www.dol.gov/agencies/whd/forms/wh347).

## Development

Requirements: Node.js 20+.

```bash
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`).

## Production build

```bash
npm run build
```

Output is written to `dist/`. Preview locally with `npm run preview`.

## GitHub Pages

1. In the repository **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from a branch”).
2. Push to `main`. The workflow [.github/workflows/pages.yml](.github/workflows/pages.yml) runs `npm ci`, `npm run build`, and publishes `dist/` to Pages.
3. For a `username.github.io` or `org.github.io` repository, the site is served from the repository root URL (Vite `base` is `/`).

### One-time permissions

Ensure **Settings → Actions → General → Workflow permissions** allows the default read/write for Actions to upload artifacts, and that Pages has permission to deploy from Actions (usually automatic).

## Disclaimer

This tool formats data to resemble the official WH-347 layout. It is not a substitute for legal or compliance advice. Use the current official form and instructions from the U.S. Department of Labor for required wording and filing rules.
