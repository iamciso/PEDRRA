# PEDRRA Training Platform

Interactive training platform for data breach risk assessment (PEDRRA). Built with Express + Socket.io backend and Vue 3 frontend.

## Architecture

```
server.js          Express + Socket.io server (REST API + real-time events)
db.js              SQLite database initialization and migrations
content.json       Slide content (file-based, not in DB)
frontend/          Vue 3 SPA (Vite)
  src/
    main.js        Router + route guards
    auth.js        JWT auth helpers (role-based localStorage keys)
    config.js      Base URL configuration
    utils/
      media.js     YouTube URL conversion, local video detection
      safeMd.js    Markdown renderer with HTML sanitization
    components/
      Login.vue            PIN + username/password login
      TrainerDashboard.vue Main trainer UI (~1960 lines, largest component)
      AttendeeView.vue     Full-screen attendee presentation view
      SlideCanvas.vue      Drag/drop visual slide editor
      MediaManager.vue     File upload/management
      MediaPicker.vue      Media library browser modal
      SurveyResults.vue    Poll/survey results with export
      Leaderboard.vue      Quiz leaderboard modal with podium
      SpinningWheel.vue    Random attendee picker wheel
```

## Tech Stack

- **Backend:** Node.js, Express 4, Socket.io 4, SQLite3, JWT, bcrypt, multer
- **Frontend:** Vue 3 (Options API), Vue Router, Vite 8, marked, pptxgenjs, socket.io-client
- **Deploy:** Render (render.yaml), Node 18

## Key Patterns

- **Auth:** JWT tokens stored per role (`token_trainer`, `token_attendee`). Always use `getUser()`/`getToken()` from `auth.js`, never raw `localStorage.getItem('user')`.
- **Real-time:** Socket.io for slides, polls, timers, reactions, hand-raise. REST for CRUD operations.
- **Markdown:** Always use `renderMarkdown()` from `utils/safeMd.js` for any user content rendered via `v-html`. Raw `marked.parse()` is forbidden.
- **File writes:** content.json uses atomic write (write to .tmp, rename). State persisted in state.json.
- **IDs:** Slide and element IDs must include a random component to avoid collisions (never use bare `Date.now()`).

## Quality Standards

Every code change (manual or automated) must satisfy ALL of the following before being considered complete.

### Security

- [ ] No user content rendered via `v-html` without `safeMd.js` sanitization
- [ ] All socket events that modify data validate inputs (type, range, size)
- [ ] Socket events that modify data use `socket.user.username` — never trust client-sent usernames
- [ ] Trainer-only socket events check `socket.user.role === 'Trainer'`
- [ ] REST endpoints that modify data use `authMiddleware()` with appropriate role
- [ ] File uploads validate MIME types — `application/octet-stream` must NOT be in allowed list
- [ ] `window.open()` HTML content escapes all user data with the `esc()` helper
- [ ] No hardcoded secrets in code — use environment variables with warnings for defaults
- [ ] File deletion endpoints check for path traversal

### Error Handling

- [ ] All `fetch()`/`authFetch()` calls check `res.ok` before calling `res.json()`
- [ ] All `db.run()`/`db.all()`/`db.get()` callbacks check the `err` parameter
- [ ] `window.open()` return values checked for null (pop-up blocker)
- [ ] Import/parse operations wrapped in try-catch with user-facing error messages
- [ ] Imported JSON slides validated for required fields (`id`, `type`)

### Memory Management

- [ ] `URL.createObjectURL()` always paired with `URL.revokeObjectURL()`
- [ ] `AudioContext` reused per component, never created per sound
- [ ] Socket listeners cleaned up: `socket.off()` before re-registering, cleanup in `unmounted()`
- [ ] `setInterval`/`setTimeout` cleared in `unmounted()`
- [ ] `requestAnimationFrame` cancelled in `unmounted()`
- [ ] `window.addEventListener` removed in `unmounted()`

### State Consistency

- [ ] Slides saved via REST emit `slides:updated` to sync socket clients
- [ ] AttendeeView listens for `slides:updated` to stay in sync
- [ ] Hand-raise state cleaned up on socket disconnect
- [ ] Poll/timer socket listeners cleaned up on slide change (`checkPollResults`)
- [ ] Auto-save protected against concurrent execution (`_isSaving` flag)

### Accessibility

- [ ] All `<img>` tags have `alt` attributes
- [ ] Interactive buttons have `aria-label` when text is icon-only or emoji-only
- [ ] Form inputs have associated labels or `aria-label`

### Performance

- [ ] No `Array.indexOf()` inside loops — use index variables or Maps
- [ ] Analytics/dashboard queries run in parallel (`Promise.all`) not nested callbacks
- [ ] Canvas element IDs use counter-based `_uniqueElId()` to avoid collisions
- [ ] SlideCanvas drag/move operations check array bounds before access

### Dark Mode

- [ ] Modal dialogs respect `[data-theme="dark"]` CSS rules
- [ ] New UI components use CSS variables (`--edps-blue`, `--border-color`, etc.) instead of hardcoded colors where possible

## Development Workflow

```bash
# Install
npm install && cd frontend && npm install && cd ..

# Dev (two terminals)
npm run dev          # Backend on :3000
cd frontend && npm run dev  # Frontend on :5173 (proxies to :3000)

# Build for production
npm run build        # Builds frontend into frontend/dist
npm start            # Serves everything from :3000
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes (production) | Secret for signing JWT tokens. Auto-generated on Render. |
| `CORS_ORIGIN` | Yes (production) | Comma-separated allowed origins (e.g. `https://pedrra.onrender.com`) |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Set to `production` for production mode |

## Database

SQLite (`pedrra.sqlite`). Tables: `users`, `answers`, `quiz_scores`, `session_config`. Migrations run automatically via `ALTER TABLE ADD COLUMN` with silent error handling for existing columns.

Default admin account: `admin` / `admin` with PIN `0000`. Change immediately in production.

## Review Checklist for Agents

When asked to review or improve this app, work through this list:

1. **Run the quality standards checklist above** against all changed/new code
2. **Check for regressions** — ensure previously fixed issues haven't been reintroduced
3. **Verify imports** — no unused imports, no missing imports, no direct `marked` imports (use `safeMd.js`)
4. **Verify cleanup** — every `mounted()` resource has a corresponding `unmounted()` cleanup
5. **Check git status** — no temp files, no secrets, no node_modules committed
6. **If no issues found**, report "No issues found" and stop — do not invent improvements

Do NOT:
- Add TypeScript, testing frameworks, or linting unless explicitly requested
- Refactor working code for style preferences
- Add features not requested
- Split components unless they exceed ~2000 lines
