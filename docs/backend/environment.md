# Backend Environment Variables

Copy `backend_nest/.env.example` → `backend_nest/.env` and fill in all required values before starting the server.

---

## Required

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret key for signing and verifying JWTs. Use a long random string. |
| `ANTHROPIC_API_KEY` | Claude API key. Used by `ResearchService` for market research and chat. |
| `TAVILY_API_KEY` | Web search API key. Used by `ResearchService` for research queries and chat tool use. |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID. Used to verify Google sign-in tokens. |

---

## Optional / Defaults

| Variable | Default | Description |
|----------|---------|-------------|
| `AMQP_URL` | `amqp://localhost` | RabbitMQ connection URL. Required if running news analysis pipeline. |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama local LLM URL. Required for news sentiment analysis. |
| `OLLAMA_MODEL` | `llama3.2` | Ollama model to use for news article analysis. |
| `OTX_API_KEY` | — | AlienVault OTX API key. Required for threat intel OTX sync. |
| `MISP_URL` | — | MISP instance URL. Optional — MISP source is skipped if not set. |
| `MISP_API_KEY` | — | MISP API key. Required if `MISP_URL` is set. |
| `SENTRY_DSN` | — | Sentry DSN for error tracking. Optional — skipped if not set. |
| `LOG_FILE` | — | Path to write Pino logs. Logs to stdout only if not set. |
| `LOG_LEVEL` | `warn` | Pino log level: `error`, `warn`, `info`, `debug`. |

---

## Notes

- The `finhub` variable (Finnhub API key) appears in `.env.example` but is legacy — Yahoo Finance is used for stock data now.
- RabbitMQ must be running for the news analysis pipeline. Start with Docker: `docker-compose up`.
- Ollama must be running locally and have the configured model pulled (`ollama pull llama3.2`).
- If Ollama is not running, the news analysis worker will fail silently — check `/ollama/status` before triggering analysis.
