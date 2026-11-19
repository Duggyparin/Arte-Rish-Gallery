# Connect Arté Rish to Supabase

This app uses Supabase Auth for the owner, Postgres for photos and categories, and a private Storage bucket for images. Public visitors do not need an account. Do not put a Supabase `service_role` or secret key in this app.

## 1. Create your Supabase project

1. Sign in to Supabase and create a project. Save the database password somewhere private.
2. In the project, open **SQL Editor**, create a query, paste in [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates the tables, starter categories, private image bucket, and row-level access rules.
3. In **Authentication → Users**, invite or add the owner's email address. Public visitors should not be given owner access.
4. After the owner account exists, return to **SQL Editor** and register that email as the only gallery owner. Replace the example address:

   ```sql
   insert into public.gallery_admins (user_id)
   select id
   from auth.users
   where lower(email) = lower('owner@example.com')
   on conflict (user_id) do nothing;
   ```

   The query should insert one row. If it inserts zero, check the spelling and confirm that the user exists under **Authentication → Users**.

## 2. Connect the project in VS Code

1. Open the Arté Rish project folder in VS Code.
2. Open **Terminal → New Terminal**. The terminal must be at the folder containing `package.json`.
3. In PowerShell, copy the example environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

4. In Supabase, open **Project Settings → API** (or **API Keys**) and copy the **Project URL** and the **publishable key**. The legacy `anon` key also works. Never use a `service_role` or secret key.
5. Open `.env` in VS Code and replace both example values:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
   ```

   The URL should be only the project origin. Do not include `/rest/v1`; the Supabase client adds the API path itself.

6. Save `.env`. Restart the Vite development server so it reads the new values. Use the URL shown by the app/terminal; this project commonly runs at `http://localhost:8443`.

The `.env` file contains browser-safe public configuration, not a secret. The database and Storage policies in `schema.sql` enforce who can read or change data. Never copy a service-role key into `.env`, source code, a screenshot, or this guide.

## 3. Allow the sign-in link to return to the app

In Supabase, open **Authentication → URL Configuration**:

1. Set **Site URL** to the app's local origin while developing (for example `http://localhost:8443`).
2. Add the local app origin to **Redirect URLs** with a path wildcard, such as `http://localhost:8443/**`. If the Vite port differs, use the origin printed by Vite.
3. When the site is deployed, add its HTTPS origin (for example `https://your-domain.com/**`) too.

The owner sign-in page sends a one-time email link back to `/?owner=1`. Supabase only accepts redirect URLs registered in this setting.

## 4. Verify the connection

1. Open the app and choose **Gallery**. With an empty database, it should show an empty gallery instead of stock photos.
2. Choose **Owner**, enter the invited owner's email, and open the email link on the same device/browser.
3. Upload an image. Give it a title, caption, and category; save it as published.
4. Return to the public gallery. The image should appear, and the category chip should filter it. Hide the image in the dashboard and refresh the public gallery to confirm it disappears.

Images use short-lived signed URLs from the private bucket. Refresh the page to request fresh links if an image link has expired. Hidden photos cannot be signed for public visitors; the admin can still preview them.

## 5. Brand and design reference

Current brand direction in [`src/index.css`](./src/index.css):

| Use | Color |
| --- | --- |
| Warm blush background | `#efdccd` |
| Cream surface | `#f7ede4` |
| Sand border | `#e3c9b3` |
| Caramel accent | `#a98464` |
| Brand brown | `#6b4a2b` |
| Deep text | `#3f2a18` |

The wordmark uses **Cormorant Garamond**; interface text uses **Jost**. The service line is **Nails · Lash · Skin · Body**.

Suggested complete tagline:

> Thoughtful beauty, created by hand, and made to feel like you.

The tagline is currently written in the Home component; there is no editable site-settings table yet. The homepage hero currently uses the newest published gallery photo.

To use your brand image as the homepage hero:

1. In VS Code Explorer, create `public/brand/` and copy the image there as `hero.jpg` (or use its actual extension).
2. Open `src/App.tsx` and find `photos[0].src` inside the Home hero.
3. Replace that image element with:

   ```tsx
   <img src="/brand/hero.jpg" alt="Arté Rish beauty work" />
   ```

4. Save the file and check the preview. Keep the existing arch wrapper to preserve the current design.

The separate brand-image file was not present in the project files available for this update, so the current palette and typography are retained until you add it.

## Troubleshooting

- **“Connect Supabase…”**: check the two values in `.env`, ensure the file is beside `package.json`, and restart Vite.
- **Tables or bucket not found**: run the complete `supabase/schema.sql` in the correct Supabase project's SQL Editor.
- **Owner is denied**: confirm the email exists in **Authentication → Users** and its user ID is in `public.gallery_admins`.
- **Magic link returns an error**: check the Supabase Site URL and Redirect URLs against the actual local/deployed app origin.
- **Upload or image-link error**: verify the SQL policies and `gallery` bucket were created by the setup script; images over 20 MB are rejected.
- **A category cannot be deleted**: first change the category on every photo that uses it, then delete it.
