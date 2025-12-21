# FinFlow Docker Deployment Guide

## Prerequisites

- Docker and Docker Compose installed on your server
- External PostgreSQL database accessible from your server
- Port 7013 available on your server

## Environment Variables

Create a `.env` file in the project directory with the following variables:

```env
DATABASE_URL=postgresql://admin:346523@support.parkolay.com:7081/Budget
SESSION_SECRET=your-secure-random-session-secret-here
```

**Important:** Replace `SESSION_SECRET` with a secure random string for production.

## Deployment Options

### Option 1: Using Docker Compose (Recommended)

1. Clone or copy the project files to your server

2. Create the `.env` file with your environment variables

3. Build and run:
   ```bash
   docker-compose up -d --build
   ```

4. View logs:
   ```bash
   docker-compose logs -f
   ```

5. Stop the application:
   ```bash
   docker-compose down
   ```

### Option 2: Using Docker Directly

1. Build the Docker image:
   ```bash
   docker build -t finflow:latest .
   ```

2. Run the container:
   ```bash
   docker run -d \
     --name finflow-app \
     -p 7013:5000 \
     -e DATABASE_URL="postgresql://admin:346523@support.parkolay.com:7081/Budget" \
     -e SESSION_SECRET="your-secure-session-secret" \
     -e NODE_ENV=production \
     --restart unless-stopped \
     finflow:latest
   ```

3. View logs:
   ```bash
   docker logs -f finflow-app
   ```

4. Stop and remove:
   ```bash
   docker stop finflow-app
   docker rm finflow-app
   ```

## Accessing the Application

After deployment, the application will be available at:

```
http://your-server-ip:7013
```

## Health Check

The application includes a health check endpoint:

```
GET http://your-server-ip:7013/api/health
```

Expected response:
```json
{"status": "ok", "timestamp": "2025-01-01T00:00:00.000Z"}
```

## Updating the Application

1. Pull the latest code changes

2. Rebuild and restart:
   ```bash
   docker-compose up -d --build
   ```

## Troubleshooting

### Container won't start

Check logs for errors:
```bash
docker-compose logs finflow
```

### Database connection issues

Ensure your DATABASE_URL is correct and the database server is accessible from your Docker container.

### Session issues

Make sure SESSION_SECRET is set to a secure value. If sessions are not persisting, check that the database connection is working (sessions are stored in PostgreSQL in production).

## Security Notes

- Always use HTTPS in production (set up a reverse proxy like nginx with SSL)
- Use strong, unique values for SESSION_SECRET
- Keep your database credentials secure
- Consider using Docker secrets for sensitive environment variables
