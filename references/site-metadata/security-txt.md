# security.txt

Open when publishing a site's vulnerability disclosure contact file, or renewing it before it expires.

## Place and form

- **Place:** `/.well-known/security.txt`, served as `text/plain` over HTTPS [1].
- **Comments:** lines starting with `#` [1].
- **Signing:** the file may be signed with an OpenPGP cleartext signature [1].

## Fields

- **`Contact`** is required. It can appear more than once, and each value is an `https:`, `mailto:` or `tel:` URI [1]. A web form for private vulnerability reports, such as a code host's, is an `https:` contact with no email address.
- **`Expires`** is required, exactly once. It should be less than a year ahead; renew it before then [1].
- **Optional:** `Policy`, `Preferred-Languages`, `Canonical` (the file's own address), `Encryption`, `Acknowledgments` and `Hiring` [1].

## Example

```text
# Report security issues privately through either contact.
Contact: mailto:security@example.com
Contact: https://example.com/security/report
Expires: 2027-11-01T00:00:00Z
Preferred-Languages: en
Canonical: https://example.com/.well-known/security.txt
Policy: https://example.com/security/policy
```

## Publishing it

- **GitHub Pages:** a site built with Jekyll can leave out folders whose names start with a dot. An empty `.nojekyll` file at the publishing root turns Jekyll off, so `.well-known` is published [2].
- **Confirm it:** fetch the live address after deployment.
- **Bundled scripts:** the [preview scripts](preview-gallery.md) propose this file from the `securityTxt` settings in [Preview configuration](preview-config.md).

## Sources

1. IETF, [RFC 9116: A File Format to Aid in Security Vulnerability Disclosure](https://www.rfc-editor.org/rfc/rfc9116)
2. GitHub Docs, [About GitHub Pages and Jekyll](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/about-github-pages-and-jekyll); [About GitHub Pages: static site generators](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages#static-site-generators)

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/security-txt.md). Written for this skill from the primary sources listed above.
