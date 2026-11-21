# Well-known files

Open when publishing a file under `/.well-known/`, choosing which ones a site needs, or making a static host serve them at the right address with the right content type.

## The rules every one shares

- **At the root only:** a well-known URI is `/.well-known/<name>` at the top of the origin's path; `/docs/.well-known/<name>` is not one [1]. A site served from a subfolder, such as a project page on a shared host, cannot publish them; the host's owner controls them.
- **One origin:** each file speaks for the whole origin it is served from [1], so each subdomain needs its own, as Apple states for its file [3].
- **The registry:** IANA lists registered names and the specification for each [2]. Some files that platforms read, such as Apple's `apple-app-site-association`, are not registered there [2, 3].
- **Write access:** a well-known file represents the entire origin, so control who can change it [1].

## Files a site may publish

| Path | Purpose | Format and rules |
| --- | --- | --- |
| `security.txt` | Where to report a vulnerability | Text fields with an `Expires` date; see [security.txt](security-txt.md). |
| `change-password` | Sends password managers to the site's change-password form | A 302, 303 or 307 redirect to the form, or, if the host cannot redirect, an HTML page with a meta refresh. The form itself must not live at this URL [4]. |
| `gpc.json` | States whether the site honors Global Privacy Control | A JSON object served as `application/json`, such as `{"gpc": true, "lastUpdate": "2026-11-21"}` [5]. |
| `tdmrep.json` | Reserves or allows text and data mining rights | A JSON array of rules with `location` and `tdm-reservation`, and an optional `tdm-policy` URL [6]; see [AI usage preferences](ai-usage-preferences.md). |
| `traffic-advice` | Asks prefetch proxies to send less or no traffic | A JSON array of entries with `user_agent` (such as `prefetch-proxy`), `disallow` and `fraction` (0 to 1), served as `application/trafficadvice+json` [7]. |
| `apple-app-site-association` | Universal links, shared web credentials and App Clips for Apple apps | JSON with no file extension, over https with no redirects [3]; see [Native app links](native-app-links.md). |
| `assetlinks.json` | Android App Links | A JSON array of statements naming the app's package and signing certificate [8]; see [Native app links](native-app-links.md). |
| `atproto-did` | Uses the domain as a Bluesky handle | The account's DID alone, as `text/plain` [9]; see [Identity and verification](identity-and-verification.md). |
| `ard.json` | Lists a site's tools and resources for AI agents | A proposal; see [Agent discovery files](agent-discovery-files.md). |

Files at the root, not under `/.well-known/`, include robots.txt and sitemaps ([Crawl files](crawl-files.md)), `llms.txt` ([Agent discovery files](agent-discovery-files.md)) and `ads.txt` ([ads.txt](ads-txt.md)).

## On a static host

- **Dot folders can be skipped:** Jekyll, which GitHub Pages can run, does not build files or folders whose names start with `.`, so `.well-known` is left out unless the configuration's `include` setting lists it [10, 11].
- **Content types:** `atproto-did` must be served as `text/plain` [9], `gpc.json` as `application/json` [5] and `traffic-advice` as `application/trafficadvice+json` [7]. A static host may give a file without an extension a generic type, so set the type where the host allows it.
- **Redirects are not files:** a static host that cannot send a redirect can serve `change-password` as an HTML page with a meta refresh, which the specification allows [4].
- **Check the response, not the repository:** request each URL from the deployed site and read its status and `Content-Type`.

## In the bundled scripts

- **Writing them:** `siteFiles` in the [preview configuration](preview-config.md) can write `security.txt`, `tdmrep.json`, `gpc.json`, `apple-app-site-association` and `assetlinks.json`, each at its path in the site's repository.
- **Checking them:** the [metadata audit](metadata-audit.md) reads every file under `.well-known/` against the rules above, reports names it does not know, reports an error when the site is not at the root of its host, and warns when a Jekyll `_config.yml` would leave `.well-known` out.

## Sources

1. IETF, [RFC 8615: Well-Known Uniform Resource Identifiers (URIs)](https://www.rfc-editor.org/rfc/rfc8615)
2. IANA, [Well-Known URIs](https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml)
3. Apple Developer Documentation, [Supporting associated domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains)
4. W3C, [A Well-Known URL for Changing Passwords](https://w3c.github.io/webappsec-change-password-url/)
5. W3C Privacy Community Group, [Global Privacy Control](https://privacycg.github.io/gpc-spec/)
6. W3C Community Group report, [TDM Reservation Protocol (TDMRep)](https://www.w3.org/community/reports/tdmrep/CG-FINAL-tdmrep-20240202/)
7. [Traffic Advice](https://buettner.github.io/private-prefetch-proxy/traffic-advice.html)
8. Android Developers, [Configure website associations and dynamic rules](https://developer.android.com/training/app-links/configure-assetlinks)
9. AT Protocol, [Handle](https://atproto.com/specs/handle)
10. GitHub Docs, [About GitHub Pages and Jekyll](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/about-github-pages-and-jekyll)
11. Jekyll, [Configuration options](https://jekyllrb.com/docs/configuration/options/)

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/well-known-files.md). Written for this skill from the primary sources listed above.
