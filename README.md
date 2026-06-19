# arc-todo-web

React web app for Arc Todo — personal task board with login and bearer token auth.

## Stack

- Vite
- React
- TypeScript
- React Router

## Prerequisites

- Node.js 20+
- Arc Todo API running at `http://localhost:3000`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment file:

```bash
cp .env.example .env
```

3. Start the dev server:

```bash
npm run dev
```

The app runs at `http://localhost:5173`.

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | API base URL | `http://localhost:3000` |

## Default login

Use the credentials configured in the API `.env`:

- Username: `admin`
- Password: `admin123`

## Scripts

- `npm run dev` — start Vite dev server
- `npm run build` — typecheck and production build
- `npm run preview` — preview production build
