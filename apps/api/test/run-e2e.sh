#!/usr/bin/env bash
#
# One command for the whole integration suite: it owns the database.
#
# A throwaway container on a port of its own, so nothing here can reach the
# developer's dev database on 5432. Removed on the way out whatever the exit
# code, and removed again on the way in, so a hard crash cannot leave a
# container behind that the next run would trip over.
set -euo pipefail

NAME=pathpipe-e2e
PORT=55433

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
cleanup
trap cleanup EXIT

docker run -d --name "$NAME" \
  -e POSTGRES_PASSWORD=e2e -e POSTGRES_USER=e2e -e POSTGRES_DB=e2e \
  -p "$PORT":5432 postgres:16 >/dev/null

until docker exec "$NAME" pg_isready -U e2e -d e2e >/dev/null 2>&1; do sleep 0.3; done

# The app reads the rest of its configuration (JWT secret, OAuth ids) from
# .env.development.local at the repo root; dotenv never overwrites what is
# already exported, so only the database is redirected here.
export NODE_ENV=development
export NEST_DATABASE_HOST=127.0.0.1
export NEST_DATABASE_PORT="$PORT"
export NEST_DATABASE_USER=e2e
export NEST_DATABASE_PASS=e2e
export NEST_DATABASE_NAME=e2e

# One worker, one database. `--forceExit` because the app's BullMQ queues hold
# a Redis connection open that nothing closes on shutdown.
npx jest --config ./test/jest-e2e.json --runInBand --forceExit "$@"
