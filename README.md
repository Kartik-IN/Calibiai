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

The server listens on `PORT` when provided, or port `5000` by default.

Health check: `GET http://localhost:5000/api/health`

## Database architecture

The initial DSA schema is defined in `supabase/migrations/202611190001_initial_dsa_schema.sql`.
It creates six application tables:

- `dsa_problems` — problem catalogue, difficulty, publication state, and LeetCode URL.
- `dsa_topics` — unique DSA topics.
- `problem_topics` — many-to-many problem/topic assignments.
- `problem_videos` — curated YouTube video IDs associated with problems.
- `user_problem_progress` — per-user `Attempted` or `Completed` status.
- `user_bookmarks` — per-user saved problems.

Problems connect to topics and videos through foreign keys. Progress and bookmarks use
Supabase Auth's existing `auth.users(id)` as `user_id`; no duplicate users table is created.
Problem-topic, problem-video, progress, and bookmark rows cascade when their application
problem is deleted. Auth users are not cascade-deleted.

The migration adds UUID keys, uniqueness and status constraints, lookup indexes, and
`updated_at` triggers. Not Started is represented by no progress row.

## Running the database migration

1. Open the Supabase Dashboard for the project.
2. Open **SQL Editor** and create a new query.
3. Paste the contents of `supabase/migrations/202611190001_initial_dsa_schema.sql`.
4. Review the SQL and run it once.
5. Confirm the six tables and RLS status in **Table Editor** or **Database → Tables**.

The migration has not been applied by this repository. Do not run it against a different
Supabase project. It contains no secrets, sample users, or sample DSA data.

## Row Level Security

RLS is enabled on all six tables. Anonymous and authenticated users can read published
problems, topics, published problem relationships, and videos. Authenticated students can
only read, create, update, or delete rows belonging to their own progress and bookmarks.
Admin management policies use only the trusted JWT claim
`auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'`; user-editable `user_metadata` is not
trusted. The service role is not used as a substitute for application authorization.

This migration prepares the schema only. It does not create authentication APIs, sample
users, or DSA records, and it has not verified a database read/write operation.
