# Attendance Tracker (Netlify + Supabase)

## Quick start
1. Sign up at Supabase and create a project. Copy URL & keys into `.env` (rename `.env.example`).
2. Install deps: `npm install` (supabase-js, netlify-cli).
3. Run locally: `netlify dev`.
4. Deploy: push to Git then link repo in Netlify. Set env vars in Site > Settings > Environment.

## Functions
Serverless code lives in `functions/`. Example `auth-login.js` already provided.

## Database
Run SQL in `supabase/init.sql` inside Supabase SQL editor then enable RLS and policies as needed.
