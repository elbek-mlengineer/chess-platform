# Shatranj

The chess application, including accounts, friends and online games, is in [frontend](frontend/README.md).

```sh
cd frontend
npm ci
npm run dev
```

The Next.js server includes the online API and creates a private SQLite database automatically. No API keys or separate backend process are needed; the Nest starter in `backend/` is not used. Both friends must connect to the same running server. See the frontend README for LAN and production setup.
