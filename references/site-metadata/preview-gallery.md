# Preview gallery

Open when building a site's share and search previews, share images, icons and site files with the bundled scripts, auditing and checking them headless, or applying approved proposals to the site.

## What the scripts produce

- **A gallery of 20 mockups per page:**
  - **Search:** Google desktop and phone, Bing, DuckDuckGo, Brave, Google Discover.
  - **Social:** Facebook, X, LinkedIn, Reddit, Bluesky, Mastodon, Threads.
  - **Chat:** Discord, Slack, Teams, Telegram, WhatsApp, iMessage, Signal.
  - **Modes:** each page as the site has it, and with the proposed metadata.
- **Share cards:** rendered and checked against the platforms' crops, with optional rights metadata embedded ([Image metadata](image-metadata.md)).
- **Site icons:** a favicon.ico, PNG icons, a maskable icon and an Apple touch icon from one source ([Site icons](site-icons.md)).
- **Proposed site files:**
  - robots.txt, a sitemap, an IndexNow key file and a workflow that submits changed pages ([Crawl files](crawl-files.md));
  - security.txt ([security.txt](security-txt.md)), llms.txt ([Agent discovery files](agent-discovery-files.md)), ads.txt and app-ads.txt ([ads.txt](ads-txt.md));
  - the web app manifest ([Web app manifest](../installed-web-apps/web-app-manifest.md));
  - `.well-known` files for TDMRep, Global Privacy Control and app links ([Well-known files](well-known-files.md)).
- **A metadata audit:** every head tag and site file checked against its standard, before and after the proposal ([Metadata audit](metadata-audit.md)).
- **Proposed heads:** each page's own head with its metadata replaced.
- **A headless check report.**

Nothing in the site changes until `apply-proposals.ts --write` runs, and no script runs Git.

## Requirements

- **Node.js 22.18 or later:** it runs the `.ts` scripts directly.
- **Playwright:** install it from `scripts/package.json` into a working copy of the tools (`npm ci --prefix scripts --ignore-scripts --no-audit --no-fund`), or use a global installation.
- **Browser:** Playwright's Chromium, or the installed Chrome with `--channel chrome`. It always runs headless; no window opens.

## Steps

1. **Configure:** write `preview.config.json` and the proposed metadata in a work folder outside the site, as [Preview configuration](preview-config.md) describes.
2. **Build and check everything:**

   ```powershell
   node scripts/share-previews/run-previews.ts --config <work>/preview.config.json --out <work>/previews --screenshots
   ```

3. **Review:** open `<work>/previews/index.html`. Review each finding with the site's owner and change the proposal until it is approved. Then run step 2 again.
4. **Apply to a work copy:** list the changes, then write them:

   ```powershell
   node scripts/share-previews/apply-proposals.ts --config <work>/preview.config.json --out <work>/previews --repo <work copy>
   node scripts/share-previews/apply-proposals.ts --config <work>/preview.config.json --out <work>/previews --repo <work copy> --write
   ```

5. **Prove it there:** run the site's own linters and tests in the work copy. Then apply to the repository the owner commits from.
6. **After deployment:** check the live pages with the tools in [Platform previews](platform-previews.md).

## Scripts

| Script | Does |
| --- | --- |
| `build-gallery.ts` | Copies the gallery, reads each page's head, copies the images it names, and writes `preview-data.js`, `siteconfig.js` and `proposed-metadata.js`. |
| `render-share-cards.ts` | Renders each card to PNG and JPEG, measures its text, writes `share-cards.js` and `check/share-cards.json`, and copies a card with `publishAs` into the proposed files. |
| `render-icons.ts` | Renders the configured icons, checks their pixel sizes, writes them to the proposed files and writes `site-icons.js`. |
| `build-site-files.ts` | Writes `proposed-files/` and `proposed-files.js`, and dry-runs the IndexNow workflow against a sample push. |
| `check-metadata.ts` | Audits every page's head and the site's files as they are and after the proposal; writes `check/metadata.json` and `metadata-audit.js`. |
| `check-gallery.ts` | Opens every page, mode and theme. Writes `check/report.json`, `proposed-head/`, and with `--screenshots`, `screenshots/`. |
| `run-previews.ts` | Runs the six scripts above in order. |
| `apply-proposals.ts` | Replaces each page's head and writes each proposed file into a repository folder. |
| `test-share-previews.ts` | Runs everything on the bundled fixture site, then the rule tests. |
| `test-metadata-rules.ts` | Tests each audit rule and file builder on small sites, with negative controls. |

Every script takes `--help`. Exit status: 0 passed, 1 a check failed, 2 an error stopped the script, such as refused input or a missing Playwright installation.

## Reading the gallery

- **Top bar:** page, metadata mode (Proposed or Site source), share image (when there are several) and theme.
- **Sections:** each is a collapsible section with status chips: overview and findings, search engines, social networks, messaging and team chat, share image crops, the metadata table, the audit, proposed changes, and checks after deployment.
- **Contents list:** every mockup and file has a status dot: amber needs a look, green is fine.
- **Mockup chips:** "Layout well known" or "Layout approximate", and whether every field fits or which one is cut.
- **What a mockup is:** a rebuild from the page source using local fonts, not a screenshot. A line can break a word earlier or later than the platform does.
- **URL:** `index.html?page=home&meta=proposed&theme=dark&image=main&open=all#mock-discord`. `open` takes `all` or a list of sections. Without it, the browser remembers which sections were left open.

## What the checks prove

- **Failures:**
  - a broken image, a page error or a console error;
  - sideways scrolling at 1480 px, and at 1000, 760 and 390 px with every section open;
  - a share card's text outside the safe square, in X's title band, or over its text limit;
  - an IndexNow dry run that sends the wrong addresses;
  - an icon whose pixel size differs from its configuration;
  - an error in the metadata audit after the proposal.
- **Findings, not failures:** a field a mockup cuts short. Decide those with the owner.
- **Not proven:** how a platform draws the card today. Only the live tools show that.

## Limits

- **Heads one tag per line:** the head writer refuses a line with several tags, or a tag split over lines.
- **Unset tags stay:** a managed tag the proposal does not set is kept as the page has it, and the report lists it.
- **JSON-LD in the body stays:** the head writer replaces JSON-LD blocks in the head only. Move a body block into the head before applying, or the page carries both.
- **No deletions:** apply never deletes. Removing an old image or file is a separate decision for the owner.
- **Line endings:** apply writes LF line endings and says so when a page had CRLF.

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/preview-gallery.md). Written for this skill from the bundled scripts and their tests.
