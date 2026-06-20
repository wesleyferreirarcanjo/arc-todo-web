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
| Build pack | Dockerfile |
| Dockerfile | `/Dockerfile` |
| Public URL | `http://ifo33mi1s8efs8myb5g441vh.72.60.59.203.sslip.io` |

### Build / run

| Step | Command / path |
| --- | --- |
| Build | `docker build -f Dockerfile .` (pass `VITE_API_BASE_URL` and `VITE_CHAT_API_BASE_URL` as build args) |
| Serve | `nginx:1.27-alpine` with SPA fallback (`nginx.conf`) |
| Port | `80` |

## Related resources

| Resource | UUID | Notes |
| --- | --- | --- |
| API `arc-todo-api` | `lmsx2avrg1k29ex12w6e3gce` | `http://lmsx2avrg1k29ex12w6e3gce.72.60.59.203.sslip.io` |
| MCP `arc-todo-mcp` | `qv9bek5he3ns8upu71rphbrc` | `http://qv9bek5he3ns8upu71rphbrc.72.60.59.203.sslip.io/mcp` |
| Chatbot `arc-todo-chatbot` | *(provision in Coolify)* | Chat UI at `/chat`; settings at `/settings/chatbot` |
| PostgreSQL `arc-todo-postgres` | `bibl6ncxa3xkph2r8ubmbl4t` | Used by API only |
| MinIO `arc-todo-minio` | `jsx5tkzb1b8hj5oz0ydt491u` | Used by API only (knowledge attachments) |

## Environment variables (production)

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | API URL baked at build time (`http://lmsx2avrg1k29ex12w6e3gce.72.60.59.203.sslip.io`). Must be **Available at Buildtime** in Coolify. |
| `VITE_CHAT_API_BASE_URL` | Chatbot service URL baked at build time. Must be **Available at Buildtime** in Coolify. |

Redeploy the frontend whenever the API or chatbot public URL changes.

## Deploy order

1. Ensure Postgres and MinIO are healthy.
2. Deploy API first and confirm `GET /health`.
3. Deploy / restart `arc-todo-chatbot` after the API is healthy (see [../arc-todo-chatbot/coolify.md](../arc-todo-chatbot/coolify.md)).
4. Set `VITE_API_BASE_URL` to the API URL and `VITE_CHAT_API_BASE_URL` to the chatbot URL.
5. Deploy this application.
6. Configure chatbot settings at `/settings/chatbot` and MCP tools at `/settings/mcp-tools`.
7. Deploy / restart `arc-todo-mcp` after MCP tools are configured.

## Notes

- Default login (from API seed): `admin` / `admin123` — change in Coolify before production use.
- Knowledge attachment files are stored in MinIO by the API; the web app has no MinIO env vars.
- Git source uses the Coolify deploy key (`private_key_uuid`: `lms2y9fjpybdznft4t7uf3td`).
- See [../arc-todo-api/coolify.md](../arc-todo-api/coolify.md) for API and Postgres Coolify IDs.
- See [../arc-todo-chatbot/coolify.md](../arc-todo-chatbot/coolify.md) for the chatbot service Coolify reference.
- See [../arc-todo-mcp/coolify.md](../arc-todo-mcp/coolify.md) for the MCP server Coolify reference.
