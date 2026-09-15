#!/bin/sh
set -eu

# Compose supplies the Mongo credentials separately so URL-special characters
# are encoded safely instead of being interpolated into the Compose file.
if [ -z "${MONGODB_URI:-}" ]; then
  : "${MONGO_INITDB_ROOT_USERNAME:?MONGO_INITDB_ROOT_USERNAME is required}"
  : "${MONGO_INITDB_ROOT_PASSWORD:?MONGO_INITDB_ROOT_PASSWORD is required}"

  encoded_username="$(node -p 'encodeURIComponent(process.env.MONGO_INITDB_ROOT_USERNAME)')"
  encoded_password="$(node -p 'encodeURIComponent(process.env.MONGO_INITDB_ROOT_PASSWORD)')"
  database="${MONGO_INITDB_DATABASE:-youtube}"

  export MONGODB_URI="mongodb://${encoded_username}:${encoded_password}@mongodb:27017/${database}?authSource=admin"
  unset MONGO_INITDB_ROOT_USERNAME MONGO_INITDB_ROOT_PASSWORD
fi

exec "$@"
