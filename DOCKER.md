# Docker Setup

This project has Docker support for running the Fastify API with PostgreSQL and Redis.

## Files Added

- `docker-compose.yml` - development stack with hot reload.
- `docker-compose.prod.yml` - production-style stack using the production Dockerfile target.
- `api/Dockerfile` - builds the Node.js API container.
- `api/.dockerignore` - keeps secrets, local dependencies, logs, and build output out of the Docker build context.
- `api/.env.example` - example API environment variables.
- `.env.example` - example Docker Compose variables.

## Why `.yml` Files Are Needed

Docker Compose uses `.yml` files to define and run multiple containers together.

For this backend, one container is not enough. The app also needs:

- a Node.js API container
- a PostgreSQL database container
- a Redis container
- health checks
- persistent volumes
- shared environment variables
- startup order between services

The compose file describes all of that in one place so you can start the full backend with one command.

## Development Setup

From the project root:

```bash
docker compose up --build
```

This starts:

- API: `http://localhost:5000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

The API source is mounted into the container, so code changes restart the server through Nodemon.

## Environment Variables

You already have `api/.env`. For a fresh setup, create it from the example:

```bash
cp api/.env.example api/.env
```

For Compose-level database overrides, you can also create a root `.env`:

```bash
cp .env.example .env
```

The default Docker database URL is:

```text
postgres://uber:uber_password@postgres:5432/uber_backend
```

Inside Docker, the host is `postgres`, not `localhost`.

## Run Drizzle Migrations

After the containers are running:

```bash
docker compose exec api npx drizzle-kit migrate
```

## Stop Containers

```bash
docker compose down
```

Stop and remove database/Redis volumes:

```bash
docker compose down -v
```

Use `-v` carefully because it deletes persisted database data.

## Production-Style Run

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

This uses the production Dockerfile target and does not mount your local source code into the API container.

## Useful Commands

View logs:

```bash
docker compose logs -f api
```

Open a shell in the API container:

```bash
docker compose exec api sh
```

Restart only the API:

```bash
docker compose restart api
```

Check running services:

```bash
docker compose ps
```
