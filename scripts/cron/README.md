# Payoes VPS cron scripts

Shell scripts to call protected Payoes cron endpoints from a VPS (or any host with `cron` and `curl`).

| Script | Endpoint | Purpose |
|--------|----------|---------|
| `run-settlement.sh` | `POST /api/cron/settlement` | Detect escrow QR deposits and process settlements/refunds |
| `run-webhook-retries.sh` | `POST /api/cron/webhook-retries` | Retry failed merchant webhook deliveries |

Both endpoints require the same `CRON_SECRET` configured on the Payoes web app.

## Prerequisites

- Payoes web app deployed and reachable over HTTPS
- `CRON_SECRET` set in `.env.local` at the repository root (or hosting provider env vars)
- VPS with `cron`, `curl`, and `bash`

Generate a secret (run on your machine or VPS):

```bash
openssl rand -base64 32
```

Use the **same** value on Payoes (`CRON_SECRET`) and in this folder's `.env`.

## Step 1: Copy scripts to the VPS

On your VPS, create a directory and copy this folder:

```bash
sudo mkdir -p /opt/payoes-cron
sudo chown "$USER":"$USER" /opt/payoes-cron
```

From your local machine (replace `user@vps` and path):

```bash
scp -r scripts/cron/* user@vps:/opt/payoes-cron/
```

Or clone the repo on the VPS and symlink:

```bash
ln -s /path/to/payoes/scripts/cron /opt/payoes-cron
```

Make scripts executable:

```bash
chmod +x /opt/payoes-cron/*.sh
mkdir -p /opt/payoes-cron/logs
```

## Step 2: Configure environment

```bash
cd /opt/payoes-cron
cp .env.example .env
chmod 600 .env
```

Edit `.env`:

```bash
PAYOES_URL=https://your-payoes-host.com
CRON_SECRET=your-shared-secret
```

`PAYOES_URL` must match the public URL of your Payoes app (same as `NEXT_PUBLIC_APP_URL` in production).

## Step 3: Smoke test

```bash
./run-settlement.sh
./run-webhook-retries.sh
```

Expected output includes `HTTP 200` and a JSON body, for example:

```json
{"detected":0,"processed":0}
```

```json
{"processed":0}
```

If you see `503`, `CRON_SECRET` is missing on the Payoes app. If you see `401`, the secret does not match.

## Step 4: Install crontab

Open the system crontab:

```bash
crontab -e
```

Paste the entries from `crontab.example` (adjust paths if you did not use `/opt/payoes-cron`).

Recommended schedule:

| Job | Schedule | Why |
|-----|----------|-----|
| Settlement | Every 1 minute (`* * * * *`) | QR/escrow payments are only detected by this worker |
| Webhook retries | Every 5 minutes (`*/5 * * * *`) | Catches failed deliveries on quiet deployments |

Verify crontab:

```bash
crontab -l
```

## Step 5: Monitor logs

```bash
tail -f /opt/payoes-cron/logs/settlement.log
tail -f /opt/payoes-cron/logs/webhook-retries.log
```

Non-zero exit codes from the scripts mean the HTTP call failed. Cron will not retry automatically; check logs and fix `PAYOES_URL` / `CRON_SECRET` / app health.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `503 CRON_SECRET is not configured` | Set `CRON_SECRET` on Payoes and restart the app |
| `401 Unauthorized` | Ensure `.env` secret matches Payoes exactly |
| QR paid but payment stuck pending | Confirm settlement cron runs every minute |
| `curl: command not found` | Install curl or set `CURL_BIN` in `.env` |
| Connection refused / timeout | Check firewall, DNS, and that `PAYOES_URL` is correct |

## Related docs

- [Webhook retry worker](../../apps/docs/local-setup/webhook-retry-worker.mdx)
- [Environment variables](../../apps/docs/local-setup/environment-variables.mdx)
