#!/bin/sh
set -e

echo "Running Prisma migrations (push with force-reset)..."
npx prisma db push --force-reset

echo "Seeding the database..."
npm run prisma db seed

echo "Starting the application..."
exec "$@"
