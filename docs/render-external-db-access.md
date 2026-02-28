# Render External DB Access (Public + Firewall + SSL)

This project currently works from local via SSH tunnel (`LOCAL_PORT`), but Render cannot reach private RFC1918 DB addresses directly.

Use this checklist to connect the existing DB server from Render safely.

## 1) Make DB endpoint publicly reachable

You need one public endpoint that forwards to your DB server:

- Public IP or domain (example: `db.example.com`)
- Port `5432` (or your DB port)
- NAT / reverse proxy / cloud DB public endpoint

Keep your DB host private internally, expose only the gateway endpoint.

## 2) Firewall allowlist (Render egress only)

Render notes:

- If your service has **Static Outbound IPs**, allowlist those addresses.
- Without static outbound IPs, Render egress IPs are dynamic.

Practical policy:

1. Enable static outbound IPs for the backend service.
2. Allow only those `/32` IPs to DB port in your firewall/security group.
3. Deny all other inbound DB traffic.

## 3) Enforce SSL on PostgreSQL server

`postgresql.conf` example:

```conf
listen_addresses = '*'
ssl = on
ssl_cert_file = '/etc/postgresql/server.crt'
ssl_key_file = '/etc/postgresql/server.key'
password_encryption = scram-sha-256
```

`pg_hba.conf` example:

```conf
# Allow Render backend only, with SSL + SCRAM
hostssl all app_user <RENDER_STATIC_OUTBOUND_IP>/32 scram-sha-256

# Explicitly block non-SSL remote access
hostnossl all all 0.0.0.0/0 reject
```

Reload PostgreSQL:

```bash
sudo systemctl reload postgresql
```

## 4) Render backend env vars

Set these on `p6ix-backend`:

```env
DB_HOST=<public-db-endpoint>
DB_PORT=5432
DB_NAME=<db_name>
DB_USER=<db_user>
DB_PASSWORD=<db_password>
DB_SSLMODE=require
DB_CONNECT_TIMEOUT=10
```

Optional strict verification:

```env
DB_SSLMODE=verify-full
DB_SSLROOTCERT=/etc/ssl/certs/your-ca.pem
```

Then deploy the backend.

## 5) Validation

After deploy:

1. `GET /healthz/` should return `200`
2. `POST /api/token/` with invalid credentials should return fast (`400/401`), not timeout
3. Render logs must not show `psycopg2 OperationalError ... timeout expired`

---

## What has already been applied in this repo

- Django now supports external DB SSL/timeout env vars:
  - `DB_SSLMODE`
  - `DB_SSLROOTCERT`
  - `DB_SSLCERT`
  - `DB_SSLKEY`
  - `DB_CONNECT_TIMEOUT`
- Render backend env already set:
  - `DB_SSLMODE=require`
  - `DB_CONNECT_TIMEOUT=10`

