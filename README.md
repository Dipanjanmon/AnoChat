# AnonChat — Local development notes

This project expects secret configuration via environment variables. Do NOT commit your secrets.

## Create a `.env`

1. Copy ` .env.example` to `.env` at the repository root.
2. Fill in your real `GEMINI_API_KEY` and any other values.

The repository's `.gitignore` already excludes `.env`.

## Running with Docker Compose

Docker Compose automatically loads `.env` placed in the compose directory.

Start services (builds images and injects env vars into the `backend` service):

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml up --build
```

## Running the backend locally (PowerShell)

Temporarily set the `GEMINI_API_KEY` for the session and run Spring Boot:

```powershell
$env:GEMINI_API_KEY='your_real_gemini_api_key_here'
cd backend
.\mvnw.cmd spring-boot:run
```

Or load the whole `.env` into your PowerShell session before running:

```powershell
Get-Content ..\.env | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)') {
    $n = $matches[1].Trim(); $v = $matches[2].Trim();
    Set-Item -Path Env:\$n -Value $v
  }
}
.\mvnw.cmd spring-boot:run
```

## Running the backend locally (WSL / macOS / Linux)

```bash
export $(grep -v '^#' .env | xargs)
./mvnw spring-boot:run
```

## Notes

- `docker-compose.override.yml` already maps `GEMINI_API_KEY`, `GEMINI_MODEL`, and `GEMINI_MEMORY_TTL_MINUTES` from the compose `.env` into the backend container.
- Do not store the real API key in Git. Use `.env` or a secret manager in production.
