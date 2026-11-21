# Identity and verification

Open when linking a site to its owner's social profiles, crediting an author in fediverse link previews, using a domain as a Bluesky handle, or proving site ownership to Google, Bing, Pinterest or Meta.

## Linking profiles with rel="me"

A `rel="me"` link from a site to a profile, matched by the profile linking back to the site, shows that both belong to the same owner. Mastodon checks the pair and marks the link as verified on the profile [1].

```html
<link rel="me" href="https://social.example.com/@username">
```

- **Both directions:** the Mastodon profile lists the site's https address, and the site links back to the profile with `rel="me"` on an `<a>` or `<link>` [1].
- **https only:** Mastodon ignores http links in the profile [1].
- **The exact URL:** the `href` must equal the profile's URL [1].
- **In the served HTML:** the link must be in the response without running JavaScript, not inside an iframe, and the response under 1 MB [1].
- **When it checks:** when the profile is saved, and the check can take some time [1].

## Author credit in fediverse previews

- **The tag:** `<meta name="fediverse:creator" content="@username@social.example.com">` in the head of each article [1].
- **The allow list:** the author adds the site's domain to "Websites allowed to credit you" in their Mastodon settings, so other sites cannot claim them [1].
- **Effect:** when the article is shared on Mastodon and across the fediverse, the preview credits and links the author's account [1].

## A domain as a Bluesky handle

A Bluesky handle is a DNS hostname, such as `example.com`, that resolves to the account's permanent DID [2].

| Method | Set up [2] |
| --- | --- |
| DNS TXT (preferred) | A TXT record on `_atproto.example.com` with the value `did=` followed by the DID, such as `did=did:plc:ewvi7nxzyoun6zhxrhs64oiz`. Only one valid record may exist. |
| HTTPS | `https://example.com/.well-known/atproto-did` returns the DID alone as `text/plain` with a 2xx status. HTTPS on port 443 is required; redirects are allowed. |

- **Static hosts:** the HTTPS method needs a file under `/.well-known/`, which a static host must be set up to publish; see [Well-known files](well-known-files.md). DNS needs no file.
- **Conflicts:** if the two methods return different DIDs, the DNS result is preferred [2].

## Proving site ownership

| Service | Methods | Keep it in place? |
| --- | --- | --- |
| Google Search Console [3] | An HTML file at the root, a `<meta>` tag in the home page's head, Google Analytics or Tag Manager code, or a DNS record. Only DNS verifies a Domain property, which covers every subdomain and protocol. | Yes: Search Console checks periodically, and removing the file or tag loses verification. |
| Bing Webmaster Tools [4] | Import from Google Search Console, a `BingSiteAuth.xml` file at the root, a `<meta>` tag in the default page's head, or a DNS CNAME (automatic through Domain Connect). | Its documentation does not say. |
| Pinterest [5] | A `<meta>` tag, an HTML file at the root, a DNS TXT record, or a Google Merchant Center link. | No: the tag or file can go once the site is claimed. |
| Meta Business Manager [6] | An HTML file at the web root, or a DNS TXT record. Verification decides who may edit how the domain's links appear on Meta's apps. | Its documentation does not say. |

- **Tokens are personal:** Google ties each file and tag to one user, so removing an old owner's token removes that owner's verification [3].
- **Reachable without signing in:** the file or the home page must be public, and Google needs the tag within the first 2 MB of the page [3].
- **Copy the service's own text:** each service gives an exact tag name and value; paste it unchanged into the head.
- **DNS when possible:** a DNS record survives redesigns and covers every page, and it is the only way to verify a whole domain at Google [3].

## In the bundled scripts

- **Proposing tags:** verification tags, `rel="me"` links and `fediverse:creator` go in a page's `extraTags`; see [Preview configuration](preview-config.md).
- **Checking them:** the [metadata audit](metadata-audit.md) reports verification meta tags and files, checks that `rel="me"` links use https and that `fediverse:creator` has the `@user@server` form, and validates `/.well-known/atproto-did`.

## Sources

1. Mastodon documentation, [Setting up your profile](https://docs.joinmastodon.org/user/profile/)
2. AT Protocol, [Handle](https://atproto.com/specs/handle)
3. Google Search Console Help, [Verify your site ownership](https://support.google.com/webmasters/answer/9008080?hl=en)
4. Bing Webmaster Tools, [Add and verify site](https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b)
5. Pinterest Help, [Claim your website](https://help.pinterest.com/en/business/article/claim-your-website)
6. Meta for Developers, [Domain verification](https://developers.facebook.com/docs/sharing/domain-verification/)

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/identity-and-verification.md). Written for this skill from the primary sources listed above.
