# Connect Arté Rish to Supabase

This app uses Google sign-in through Supabase Auth for gallery admins, Postgres for photos, services, and price options, and a private Storage bucket for images. Public visitors do not need an account. Do not put a Supabase `service_role` or secret key in this app.

## 1. Create your Supabase project

1. Sign in to Supabase and create a project. Save the database password somewhere private.
2. In the project, open **SQL Editor**, create a query, paste in [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates the tables, starter services and price options, private image bucket, and row-level access rules.
   If you already ran the setup, run the updated script again to add service pricing and the new service categories. It is safe to rerun. Existing Nails, Lash, and Skin photo categories are remapped to their new equivalents; photos in the old Body category become uncategorized so they are not assigned an unrelated service.
3. Configure Google sign-in using the steps in section 3.
4. Sign in once through the app's **Owner** button with the Google account that should manage the gallery. This creates its Supabase Auth user. Until you finish step 5, the app may say that the account is not an admin; that is expected.
5. In **SQL Editor**, register that Google account as a gallery admin. Replace the example address:

   ```sql
   insert into public.gallery_admins (user_id)
   select id
   from auth.users
   where lower(email) = lower('owner@example.com')
   on conflict (user_id) do nothing;
   ```

   The query should insert one row. If it inserts zero, check the spelling and confirm that the user exists under **Authentication → Users**. Repeat this step for each additional admin; each person must use their own Google account.

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

## 3. Configure Google sign-in and app redirects

### Create Google OAuth credentials

1. In Google Cloud Console, create or select a project and configure the OAuth consent screen. If the app is in testing mode, add each admin Google account as a test user.
2. Create an OAuth client ID of type **Web application**.
3. For **Authorized JavaScript origins**, add the local app origin (usually `http://localhost:8443`) and, after deployment, the Vercel site origin.
4. For **Authorized redirect URIs**, add the Supabase callback URL. Find the project URL in **Supabase → Project Settings → API** and use `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`.
5. In Supabase, open **Authentication → Sign In / Providers → Google**, enable Google, and enter the Google client ID and client secret. Save the settings. Keep the client secret in Supabase; never put it in `.env` or browser code.

### Allow the app to receive the sign-in response

In Supabase, open **Authentication → URL Configuration**:

1. Set **Site URL** to the app's local origin while developing (for example `http://localhost:8443`).
2. Add the local app origin to **Redirect URLs** with a path wildcard, such as `http://localhost:8443/**`. If the Vite port differs, use the origin printed by Vite.
3. When the site is deployed, set the production Site URL and add its HTTPS origin (for example `https://your-domain.vercel.app/**`) too.

The Owner button redirects back to `/?owner=1`. Supabase only accepts redirect URLs registered in this setting.

## 4. Verify the connection

1. Open the app and choose **Gallery**. With an empty database, it should show an empty gallery instead of stock photos.
2. Choose **Owner** and sign in with the Google account registered in `public.gallery_admins`.
3. The schema seeds the service categories and known prices from the supplied lists. In **Pricing**, admins can edit those labels or add optional entries. Unknown prices remain blank until confirmed; the customizable lash look is a range and needs a per-photo custom price if you want to show an exact amount.
4. Upload an image. Give it a title, caption, and service; in its edit panel choose a matching price entry and optionally set a custom price. The price appears to visitors only after they open the image.
5. Return to the public gallery. The image should appear, and the service chip should filter it. Open the image to see its price, then hide the image in the dashboard and refresh the public gallery to confirm it disappears.

Images use short-lived signed URLs from the private bucket. Refresh the page to request fresh links if an image link has expired. Hidden photos cannot be signed for public visitors; the admin can still preview them.

## 5. Brand and design reference

Current brand direction in [`src/index.css`](./src/index.css):

| Use                   | Color     |
| --------------------- | --------- |
| Warm blush background | `#efdccd` |
| Cream surface         | `#f7ede4` |
| Sand border           | `#e3c9b3` |
| Caramel accent        | `#a98464` |
| Brand brown           | `#6b4a2b` |
| Deep text             | `#3f2a18` |

The wordmark uses **Cormorant Garamond**; interface text uses **Jost**. The hard-coded service categories include Nails Extension, Lashes Extension, Facial Care, Gluta Drip, Slimming Services, Foot Care, Profilo, Botox, GLP1 Terzipatide, and Other Services. Prices not present in the supplied lists are intentionally left unset.

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
- **Google sign-in returns an error**: confirm the Google provider is enabled in Supabase, the Google OAuth client contains the Supabase callback URL, and the app origin is allowed in both Google Cloud and Supabase URL Configuration.
- **Upload or image-link error**: verify the SQL policies and `gallery` bucket were created by the setup script; images over 20 MB are rejected.
- **Pricing tab unavailable**: run the updated `supabase/schema.sql` in the project's SQL Editor, then refresh the dashboard.
- **A category cannot be deleted**: first change the category on every photo that uses it, then delete it.
