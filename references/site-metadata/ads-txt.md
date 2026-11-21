# ads.txt

Open when a site shows ads through advertising systems and must list which sellers may sell its ad space, when a site with no ads should say so, or when the developer website named in an app's store listing must list the app's sellers.

ads.txt (Authorized Digital Sellers) is an IAB Tech Lab standard, now at version 1.1. Ad buyers read it to refuse inventory from sellers the site did not authorize [1, 2].

## Where it goes

- **Path:** `/ads.txt` on the host the declarations apply to, over HTTPS where possible; buyers prefer HTTPS data when both exist [1].
- **Subdomains:** post it on the root domain and on any subdomain as needed, or point to a subdomain's file with a `SUBDOMAIN=` line in the root domain's file [1].
- **Content type:** `text/plain`, ideally `text/plain; charset=utf-8`. Any other content type is an error and the file is ignored [1].
- **Redirects:** buyers follow redirects within the same root domain, and at most one hop to another domain [1].
- **Caching:** without cache headers, buyers keep the file for 7 days [1].
- **A missing file:** a 404 tells buyers there are no declarations, so they may treat every seller as authorized [1].

## The records

The example follows the specification's own [1]:

```text
# Sellers authorized for example.com's ad space.
greenadexchange.com, 12345, DIRECT, d75815a79
silverssp.com, 9675, RESELLER, f496211
blueadexchange.com, XF436, DIRECT
CONTACT=ads@example.com
OWNERDOMAIN=example.com
```

| Field | Content [1] |
| --- | --- |
| 1, required | The advertising system's canonical domain. |
| 2, required | The site's account ID in that system, the same value its bid requests carry. |
| 3, required | `DIRECT` when the publisher controls the account, `RESELLER` when another party resells the space. |
| 4, optional | The advertising system's ID at a certification authority, such as its TAG ID. |

- **Comments:** lines starting with `#` [1].
- **Variables:** `CONTACT` (a person or form for the file's owner), `SUBDOMAIN`, `INVENTORYPARTNERDOMAIN`, `OWNERDOMAIN` (the business that owns the site, matching its sellers.json entries) and `MANAGERDOMAIN` (an exclusive monetization partner), each as `NAME=value` [1].

## A site with no ads

Publish one placeholder record, so buyers can tell a deliberate "no sellers" from an error page [1]:

```text
placeholder.example.com, placeholder, DIRECT, placeholder
```

An empty file used to mean the same thing; that form is deprecated and consumers ignore it after 1 March 2020 [1].

## app-ads.txt for apps

- **What it covers:** ad space inside apps distributed through app stores [3].
- **Where:** the app store listing's developer website. Verifiers derive the file's location from that URL, so the listing must have one [3].
- **Format:** the same as ads.txt, in a separate file named `app-ads.txt`, except that `SUBDOMAIN` is unused and ignored [3].
- **No sellers:** the same placeholder record [3].

## In the bundled scripts

- **Writing it:** `siteFiles.adsTxt` and `siteFiles.appAdsTxt` in the [preview configuration](preview-config.md) take `records` as `[domain, account ID, relationship, certification ID]`, or `noSellers: true` for the placeholder, plus `contact`, `ownerDomain`, `managerDomain`, `inventoryPartnerDomain` and, for ads.txt only, `subdomains`. Malformed records are refused.
- **Checking it:** the [metadata audit](metadata-audit.md) checks every line's fields, relationships and variables, an empty file and a site served below the root of its host. It cannot see the content type a host sends, so request the deployed file and check it is `text/plain`.

## Sources

1. IAB Tech Lab, [ads.txt Specification Version 1.1](https://github.com/InteractiveAdvertisingBureau/Supply-Chain-Validation/blob/main/ads.txt%20v1.1.md)
2. IAB Tech Lab, [Authorized Digital Sellers with ads.txt and app-ads.txt](https://iabtechlab.com/ads-txt/)
3. IAB Tech Lab, [app-ads.txt](https://github.com/InteractiveAdvertisingBureau/Supply-Chain-Validation/blob/main/app-ads.txt.md)

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/ads-txt.md). Written for this skill from the primary sources listed above.
