#!/bin/sh
set -e

echo "Starting Payoes web on port ${PORT:-3000}..."
exec "$@"
