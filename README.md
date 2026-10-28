# COMIC RUGS — COD + email starter

This is a starter project, not a live store until you connect and deploy your own accounts. It includes:
- Responsive storefront with sample ready-made rug listings
- Cash-on-delivery order creation, with product prices verified server-side
- Custom rug quote-request form (no charge is taken; owner confirms the quote)
- Supabase database and owner dashboard with status updates
- Owner email notification through Resend for new COD orders and custom requests

## Accounts and costs
- Supabase: database, authentication and Edge Functions. Free tier may be enough for a demo; check current limits.
- Resend: sends owner notification emails. A verified sender/domain may be required for production delivery.
- Static hosting: any host that can serve the `public/` folder (for example, Cloudflare Pages, Netlify, or GitHub Pages).

Do not use a real customer's data until you have reviewed privacy, delivery, cancellation, and refund policies. The sample product catalogue/prices are fictional and must be approved by the brand before launch.

## Step 1 — Create Supabase project
1. Create a project at https://supabase.com and save the Project URL and anon/public key.
2. Open SQL Editor and run all of `supabase/schema.sql`.
3. In Authentication settings, enable email/password sign-in. Turn off public sign-ups after creating the owner account if you do not want anyone registering.
4. Create the owner user under Authentication → Users (use the owner's email and a strong password).
5. Copy that user's UUID, then run this SQL with the real UUID:
   ```sql
   insert into public.store_admins (user_id) values ('PASTE_OWNER_USER_UUID');
   ```
   This is what grants dashboard access. Never put the service-role key in browser files.

## Step 2 — Configure the frontend
1. Open `public/index.html` and `public/dashboard.html`.
2. In each file replace `PASTE_SUPABASE_PROJECT_URL` with the project URL and `PASTE_SUPABASE_ANON_KEY` with the anon/public key.
3. The anon key is intended for browser use with RLS. Never use `service_role` or any secret key in these files.

## Step 3 — Set up email notifications
1. Create an account at https://resend.com.
2. Verify a sender domain/address as required by Resend. For production, use an address on a domain you control; don't assume a personal Gmail address can be used as the sender.
3. Create a Resend API key.
4. Install Supabase CLI and sign in; link this project using its project reference.
5. Set these secrets in a terminal (replace values with your own):
   ```sh
   supabase secrets set RESEND_API_KEY=re_your_key OWNER_EMAIL=you@example.com EMAIL_FROM="COMIC RUGS <orders@your-verified-domain.com>"
   ```
   `OWNER_EMAIL` is the inbox that receives new-order alerts. It can be a Gmail address. Never share the API key in chat or commit it to your project.

## Step 4 — Deploy backend functions
From this project folder, with Supabase CLI installed and the project linked:
```sh
supabase functions deploy create-order --no-verify-jwt
supabase functions deploy create-custom-request --no-verify-jwt
```
The functions use the server-side Supabase service-role secret supplied by the Supabase runtime; it must not be copied into website code. The functions validate the order and recalculate totals from database prices.

## Step 5 — Publish the website
Upload the contents of `public/` to your static host. The public root should serve `index.html`, and `dashboard.html` should be at `/dashboard.html`. HTTPS is required for production use.

## Step 6 — Test end-to-end
1. Open the public storefront and submit a test custom rug request.
2. Place a low-value test COD order with your own test contact details.
3. Confirm the order appears in Supabase → Table Editor → `orders` and the custom request in `custom_requests`.
4. Check the destination inbox, including Spam/Promotions. If the database row exists but no email arrives, check Resend's email logs, sender verification and the Edge Function logs.
5. Sign in to `/dashboard.html` with the owner account and confirm orders appear; update a status and refresh.
6. Do not claim it is live until all these tests pass.

## Gmail notification question
Gmail can show a phone notification for these messages if Gmail notifications are enabled for that account and Android notification permissions are allowed. Notifications can be delayed by sync/battery settings, and messages can land in Spam or Promotions. Email delivery itself is not a guarantee of an instant push notification.

## Limitations / next improvements
- This version is COD only; it does not take online payments.
- Custom rug forms collect specifications and a reference URL, not image uploads. The owner must contact the customer to quote.
- Dashboard quote/status updates are stored but do not email the customer automatically.
- Add rate limiting / bot protection and privacy/terms/delivery pages before public launch. Do not store unnecessary personal data.
- Add WhatsApp alerts and a payment gateway only after the COD/email flow is working.
