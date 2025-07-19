A minimal Netlify + Supabase attendance-tracker starter ZIP has been generated.

• Download link: [Download the archive](https://ppl-ai-code-interpreter-files.s3.amazonaws.com/web/direct-files/90edecfe9be6829dc96dffed4d30647c/attendance-tracker.zip)

## How to run

1. Unzip `attendance-tracker.zip`.
2. `cd attendance-tracker`
3. Copy `.env.example` → `.env` and fill your Supabase URL / keys.
4. `npm install --save @supabase/supabase-js netlify-cli`
5. `npx netlify dev`

Open http://localhost:8888

Deploy by pushing repo to GitHub and linking in Netlify dashboard (set env vars there).

Backend SQL is in `supabase/init.sql`. Enable RLS and add owner policies.
