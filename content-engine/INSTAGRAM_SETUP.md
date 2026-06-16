# Connecting Instagram

You do **not** need the Instagram API to use this tool. Local mode and the
manual import (`node cli.js intake-manual`) work today with zero accounts. Set
up the API only when you want the engine to **auto-pull** tagged posts,
mentions, and DMs.

---

## TL;DR

| You want… | What you need |
|---|---|
| Run locally, import posts by hand | Nothing — use `intake-manual` / `intake-url` |
| Auto-pull tagged posts & @mentions | IG Business/Creator + FB Page + Meta app + access token |
| Auto-read DMs in production | All of the above **+ Meta App Review** for messaging |

Check where you stand any time:

```bash
node cli.js setup-status
```

---

## What the Instagram API requires

The Instagram Graph API is gated behind several Meta requirements. All of these
must be true before a token will return your media or mentions:

1. **Instagram Business or Creator account.** A personal account will not work.
   Switch in the IG app: *Settings → Account type and tools → Switch to
   professional account.*

2. **A Facebook Page connected to that Instagram account.** The Graph API reaches
   Instagram *through* a Facebook Page. Link them in the IG app under
   *Settings → Business tools → Connect a Facebook Page* (or from the Page's
   *Linked accounts* settings).

3. **A Meta Developer App.** Create one at
   [developers.facebook.com](https://developers.facebook.com/apps) → *Create App*
   → choose the **Business** type. Add the **Instagram Graph API** product.

4. **Permissions (scopes)** on the access token, matched to what you want to pull:
   - `instagram_basic` — read account + media (required for everything)
   - `pages_show_list`, `pages_read_engagement` — reach IG through the Page
   - `instagram_manage_comments` — tagged posts and **@mentions**
   - `instagram_manage_messages` — **DMs / Direct messages**

5. **App Review (for production DM access).** While your app is in *Development*
   mode, tokens only work for you and people with a role on the app — fine for
   testing. To read DMs from the public in production, Meta requires **App
   Review** for `instagram_manage_messages`, plus a Business Verification. Tagged
   posts and mentions need review for `instagram_manage_comments`.

> **Local fallback always works.** Until the API is approved, drop photos in
> `inbox/`, paste a post URL with `intake-url`, or run `intake-manual`. Same
> queue, same approval flow.

---

## Getting the two values the engine needs

The engine needs exactly two things to poll the Graph API:

- `INSTAGRAM_ACCESS_TOKEN` — a (preferably long-lived) access token
- `INSTAGRAM_BUSINESS_ACCOUNT_ID` — your IG business account's numeric id

Quickest path using the [Graph API Explorer](https://developers.facebook.com/tools/explorer/):

1. Pick your app, click **Generate Access Token**, and grant the scopes above.
2. Find your Page id: `GET /me/accounts`.
3. Find the IG business account id:
   `GET /{page-id}?fields=instagram_business_account`.
4. (Recommended) Exchange the short-lived token for a long-lived one:
   `GET /oauth/access_token?grant_type=fb_exchange_token&client_id={META_APP_ID}&client_secret={META_APP_SECRET}&fb_exchange_token={short-token}`

Then save them — easiest via the wizard:

```bash
node cli.js setup          # choose "Instagram API" and paste the values
node cli.js setup-status   # confirm Instagram shows ● connected
node cli.js intake-pull --source all   # pull tagged / mentions / dm
```

…or put them in `.env` directly:

```
CONTENT_MODE=instagram
INSTAGRAM_ACCESS_TOKEN=EAAG...
INSTAGRAM_BUSINESS_ACCOUNT_ID=178414...
META_APP_ID=
META_APP_SECRET=
```

`META_APP_ID` / `META_APP_SECRET` are only needed to refresh long-lived tokens;
polling works with just the token + business account id.

---

## No API today? Import manually

This is the recommended way to start. It feeds the exact same queue as the API:

```bash
# Guided: asks username, source (tagged_post / dm / manual), caption, image
node cli.js intake-manual

# Or one-liner from a post URL (username is parsed from the link)
node cli.js intake-url "https://www.instagram.com/<user>/p/<code>/" --source tagged_post
```

Then review and approve in the dashboard (`node cli.js web` → the **setup** tab
shows your connection status at a glance).
