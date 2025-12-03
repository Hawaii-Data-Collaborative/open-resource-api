# search.auw211.org main site backend

A resource search API server built with Node.js, TypeScript, Koa, Prisma/SQLite/Meilisearch, Google APIs, and Salesforce APIs.

Cloned from https://github.com/211-Connect/open-resource-api.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Development](#development)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Build and Deploy](#build-and-deploy)
- [Troubleshooting](#troubleshooting)

## Overview

This server provides search functionality for 211 services. Key features include:

- Full-text search powered by Meilisearch
- Multi-language translation support via Google Cloud Translate
- User authentication with JWT tokens
- Database support (SQLite)
- Email functionality via Resend
- Salesforce integration for data synchronization
- Session management and CORS support

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Web Framework**: Koa (lightweight Node.js web framework)
- **Database ORM**: Prisma
- **Search Engine**: Meilisearch
- **Authentication**: JWT (JSON Web Tokens)
- **Translation**: Google Cloud Translate API
- **Testing**: Jest

### Key Dependencies Explained

- **Koa**: A modern, lightweight web framework created by the team behind Express. Uses async/await instead of callbacks.
- **Prisma**: A modern ORM that provides type-safe database access and automatic migrations.
- **Meilisearch**: A fast, typo-tolerant search engine perfect for user-facing search experiences.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download here](https://git-scm.com/)
- **Meilisearch** - [Installation guide](https://www.meilisearch.com/docs/learn/getting_started/installation)
  - For local development, you can run Meilisearch by downloading the .jar file or with Docker:
    ```bash
    docker run -p 7700:7700 -v $(pwd)/meili_data:/meili_data getmeili/meilisearch
    ```

### Optional Prerequisites

- **Docker** (for Meilisearch)

## Development

### Initial Setup

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd <new-directory>
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

   This will download all required packages listed in [package.json](package.json).

3. **Set up environment variables**:

   ```bash
   cp .env.example .env
   ```

   Then open [.env](.env) in your text editor and configure the variables. See [Environment Variables](#environment-variables) for details.

4. **Generate Prisma client**:

   ```bash
   npx prisma generate
   ```

   This creates TypeScript types and client code from your Prisma schema, enabling type-safe database queries.

5. **Copy the production database locally**:
   ```bash
   mkdir db
   scp auw1:/var/www/searchengine-backend/db/db.sqlite3 db/
   ```

### Running the Development Server

The development setup requires two terminal windows:

**Terminal 1 - TypeScript Compiler**:

```bash
npm run watch
```

This runs the TypeScript compiler in watch mode, automatically recompiling your code whenever you save changes.

**Terminal 2 - Development Server**:

```bash
npm run dev
```

This starts the Koa server with nodemon, which automatically restarts the server when compiled JavaScript files change. The server will run on the port specified in your `.env` file (default: 3004).

**What's happening**:

1. When you save a `.ts` file, the TypeScript compiler (Terminal 1) compiles it to JavaScript in the `dist/` folder
2. Nodemon (Terminal 2) detects the change in `dist/` and restarts the server
3. The debugger is available on port 9249 for use with Chrome DevTools or VS Code

### Development Workflow

1. Make changes to TypeScript files in [src/](src/)
2. The `watch` command automatically compiles them to [dist/](dist/)
3. The `dev` command automatically restarts the server
4. Test your changes at `http://localhost:3004` (or your configured port)

## Project Structure

```
search-server/
├── src/                     # Source TypeScript files
│   ├── index.ts             # Main application entry point
│   ├── routes/              # API route handlers
│   │   ├── v1/              # Version 1 API endpoints
│   │   ├── ping.ts          # Health check endpoint
│   │   └── sitemap.ts       # Sitemap generation
│   ├── middleware/          # Koa middleware (auth, error handling, etc.)
│   ├── scripts/             # Utility scripts for data management
│   │   ├── meilisearchIngest.ts  # Import data into Meilisearch
│   │   ├── processData.ts        # Process and transform data
│   │   ├── translate.ts          # Translation utilities
│   │   └── insertData.ts         # Database seeding
│   ├── lib/                 # Shared libraries and utilities
│   ├── schema.ts            # Schema helpers used by insertData.ts
│   ├── types.ts             # TypeScript type definitions
│   ├── constants.ts         # Application constants
│   ├── email.ts             # Email service
│   ├── translation.ts       # Translation service
│   └── cache.ts             # Caching utilities
├── dist/                    # Compiled JavaScript (generated, not in git)
├── prisma/                  # Prisma ORM files
│   └── schema.prisma        # Database schema definition
├── scripts/                 # .sh and .js scripts
│   └── copyDataFromSF.sh    # "Puppetmaster" script for fetching SF data, loading it into our database
├── templates/               # Nunjucks HTML templates for generating the sitemap pages
├── .env                     # Environment variables (not in git)
├── .env.example             # Example environment file
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── build.sh                 # Production build script
└── deploy.sh                # Production deployment script
```

## API Endpoints

The API is organized under `/v1/` prefix. Key endpoints include:

- **GET `/ping`**: Health check endpoint
- **GET `/sitemap`**: XML sitemap generation
- **API v1** routes are defined in [src/routes/v1/](src/routes/v1/)

To explore all available endpoints, check the route files in [src/routes/](src/routes/).

## Environment Variables

Copy [.env.example](.env.example) to `.env` and configure the following:

### Application Settings

- **`NODE_ENV`**: Set to `development` for local work, `production` for deployed environments
- **`PORT`**: The port your server will listen on (default: 3004)
- **`DEBUG`**: Debug namespace pattern (use `app:*` to see all debug logs)
- **`APP_SECRET`**: Secret key for session encryption (use a long random string)
- **`ADMIN_EMAIL`**: Administrator email address

### Database Configuration

- **`DB_FILE`**: Path to SQLite database file (for local development)
  - Example: `./db/db.sqlite3`

### Meilisearch Configuration

- **`MEILISEARCH_HOST`**: URL of your Meilisearch instance
  - Example: `http://localhost:7700`
- **`MEILISEARCH_KEY`**: Master key for Meilisearch authentication
  - Set this when starting Meilisearch: `--master-key=supersecret1234`

### Email Settings (Optional)

- **`SEND_EMAILS`**: Set to `true` to enable email sending
- **`SMTP_FROM`**: "From" address for emails
- **`EMAIL_API_KEY`**: Resend API key

### External Integrations (Optional)

- **`SF_CONSUMER_KEY`**: Salesforce OAuth consumer key
- **`SF_CONSUMER_SECRET`**: Salesforce OAuth consumer secret
- **`CLOUDFLARE_PUBLIC_KEY`**: Cloudflare Turnstile public key
- **`CLOUDFLARE_PRIVATE_KEY`**: Cloudflare Turnstile private key
- **`GOOGLE_PROJECT_ID`**: Google Cloud project ID for translation
- **`GOOGLE_APPLICATION_CREDENTIALS`**: Path to Google service account JSON file

## Build and Deploy

### Building for Production

```bash
./build.sh
```

This script:

1. Compiles TypeScript to JavaScript
2. Creates a zip file of the compiled code and dependencies
3. Prepares the application for deployment

### Deploying to Production

```bash
./deploy.sh
```

This script:

1. Copies the distribution files to the production server
2. Executes commands to update and restart the server

**Prerequisites for deployment**:

- You must have an SSH config entry called `auw1` in your `~/.ssh/config` file
- The entry should point to your production server

Example SSH config entry:

```
Host auw1
    HostName your-server.com
    User your-username
    IdentityFile ~/.ssh/your-key
```

## Troubleshooting

### Debug Mode

To enable detailed debug logs, set in your `.env`:

```env
DEBUG=app:*
```

This will show detailed logs from all parts of the application.

## License

Copyright (C) 2021 Connect 211

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>
