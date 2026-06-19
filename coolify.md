# Coolify — arc-todo Web

Vite + React frontend deployed in Coolify project **`arc-todo`** on server **`main`** (`72.60.59.203`).

## Project

| Field | Value |
| --- | --- |
| Coolify project name | `arc-todo` |
| Coolify project UUID | `qzmm8hhki6jz02yrrc21zung` |
| Environment | `production` (`oqofaco0eved39jqee22w7jo`) |
| Server UUID | `r9rokxstz1zlccajjxyenk93` |
| Destination UUID | `wchjqtdyj949s0ale2zofwgd` |

## This application

| Field | Value |
| --- | --- |
| Coolify resource name | `arc-todo-web` |
| Application UUID | `ifo33mi1s8efs8myb5g441vh` |
| Repository | [wesleyferreirarcanjo/arc-todo-web](https://github.com/wesleyferreirarcanjo/arc-todo-web) |
| Branch | `main` |
| Build pack | Nixpacks (static site via `nginx:alpine`) |
| Public URL | `http://ifo33mi1s8efs8myb5g441vh.72.60.59.203.sslip.io` |

### Build / publish

| Step | Command / path |
| --- | --- |
| Install | `npm ci` |
| Build | `npm run build` |
| Publish directory | `/dist` |
| Port | `80` |

## Related resources

| Resource | UUID | Notes |
| --- | --- | --- |
| API `arc-todo-api` | `lmsx2avrg1k29ex12w6e3gce` | `http://lmsx2avrg1k29ex12w6e3gce.72.60.59.203.sslip.io` |
| PostgreSQL `arc-todo-postgres` | `bibl6ncxa3xkph2r8ubmbl4t` | Used by API only |

## Environment variables (production)

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | API URL baked at build time (`http://lmsx2avrg1k29ex12w6e3gce.72.60.59.203.sslip.io`) |

Redeploy the frontend whenever the API public URL changes.

## Deploy order

1. Deploy API first and confirm `GET /health`.
2. Set `VITE_API_BASE_URL` to the API URL.
3. Deploy this application.

## Notes

- Default login (from API seed): `admin` / `admin123` — change in Coolify before production use.
- Git source uses the Coolify deploy key (`private_key_uuid`: `lms2y9fjpybdznft4t7uf3td`).
- See [../arc-todo-api/coolify.md](../arc-todo-api/coolify.md) for API and Postgres Coolify IDs.
