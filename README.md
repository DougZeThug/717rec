# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/71485458-eece-4db2-a818-0dbc3e38e42e

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/71485458-eece-4db2-a818-0dbc3e38e42e) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/71485458-eece-4db2-a818-0dbc3e38e42e) and click on Share -> Publish.

For governed releases (versioning, tags, deployment checklist, rollback steps), use the runbook in [`docs/RELEASE_AND_DEPLOYMENT.md`](docs/RELEASE_AND_DEPLOYMENT.md).

## Testing and coverage commands

```sh
npm test
npm run test:coverage
npm run test:coverage:ci
npm run test:coverage:deepsource
npm run test:coverage:debug
npm run test:coverage:debug:subset
```

- `test:coverage` keeps the full local developer report (`coverage/index.html`).
- `test:coverage:ci` runs the lightweight PR-gate coverage pass with a **10-minute hard timeout** in deterministic single-worker mode (`timeout 10m env CI=true vitest run --coverage --maxWorkers=1`).
- `test:coverage:deepsource` is the DeepSource path: it has a **15-minute hard runtime budget** and emits **LCOV only** at `coverage/deepsource/lcov.info`.

Single source of truth: script values in `package.json` are authoritative; documentation should match those exact script definitions.
- `test:coverage:debug` runs coverage in single-thread mode with verbose logging to isolate hangs.
- `test:coverage:debug:subset` runs only `src/services`, `src/hooks`, and `src/utils` test files so teams can bisect by directory quickly.

### Coverage hang triage playbook

When coverage fails or times out in CI, reproduce locally with `npm run test:coverage:debug` first.

When coverage appears to hang, run this sequence exactly to narrow down the culprit without guesswork:

1. **Confirm hang in deterministic mode**
   ```sh
   npm run test:coverage:debug
   ```
2. **Run focused subset (services/hooks/utils)**
   ```sh
   npm run test:coverage:debug:subset
   ```
3. **Bisect by directory with file-pattern execution**
   ```sh
   npm run test:coverage:debug -- "src/services/**/{__tests__,tests}/**/*.{test,spec}.{ts,tsx}"
   npm run test:coverage:debug -- "src/hooks/**/{__tests__,tests}/**/*.{test,spec}.{ts,tsx}"
   npm run test:coverage:debug -- "src/utils/**/{__tests__,tests}/**/*.{test,spec}.{ts,tsx}"
   ```
4. **Narrow to one package/folder**
   ```sh
   npm run test:coverage:debug -- "src/services/<area>/**/{__tests__,tests}/**/*.{test,spec}.{ts,tsx}"
   ```
5. **Narrow to one file**
   ```sh
   npm run test:coverage:debug -- "src/services/<area>/tests/<name>.test.ts"
   ```

If a directory keeps hanging, temporarily tighten `test.include` in `vitest.config.ts` to only that directory's globs, then rerun `npm run test:coverage:debug`. Keep shrinking the include globs until a single culprit spec is identified, then restore the broader include patterns after fixing the test.

## Can I connect a custom domain to my Lovable project?

Yes it is!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
