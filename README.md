# CalibiAI DSA Backend

Independent Node.js backend for the CalibiAI DSA learning and practice module.

## Prerequisites

- Node.js 18 or newer
- npm

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and add environment values when they are available.

3. Start the server:

   ```bash
   npm start
   ```

   For development with automatic restarts:

   ```bash
   npm run dev
   ```

The server listens on `PORT` when provided, or port `3000` by default.

This repository currently contains project initialization only. Database tables, Supabase connections, authentication, APIs, and code execution are intentionally out of scope.
