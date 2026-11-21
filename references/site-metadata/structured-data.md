# Structured data

Open when choosing JSON-LD for a site's name, an application, its publisher, breadcrumbs or page dates, or when deciding which rich results still apply.

Every Google Search feature with the properties it requires is in [Structured data features](structured-data-features.md). The bundled metadata audit checks both; see [Metadata audit](metadata-audit.md).

## Rules that apply to every type

- **Match the visible page:** markup must describe content a reader can see on the page. Marking up ratings, reviews or prices the page does not show breaks Google's guidelines and can lose rich result eligibility [1]. Bing asks for the same [2].
- **JSON-LD:** a `<script type="application/ld+json">` block is the format Google recommends, and it can sit in the head or the body [1]. One `@graph` can hold several nodes; give each an `@id` (for example `https://example.com/#website`) and refer to it from the others.
- **No special markup for AI answers:** Google lists no additional requirements for AI Overviews and AI Mode; they draw on indexed pages that are eligible to show a snippet [3].

## Types that fit a small site

| Type | Use | Notes |
| --- | --- | --- |
| `WebSite` on the home page | The site name Google shows above the result | Set `name`, `alternateName` and `url`. Google also reads `og:site_name`, the title and the headings, so use the same name in each [4]. |
| `WebApplication` or `SoftwareApplication` | Describes an app | The software app rich result needs `name`, `offers.price` (0 for a free app) and a rating or a review [5]. Without real ratings on the page there is no rich result; keep the node for its description, and never add ratings the page does not show. |
| `Offer` | The price | `price` "0" with `priceCurrency` states a free app [5, 6]. |
| `Person` or `Organization` | Who publishes the site | Organization markup has no required properties and helps Google tell who runs a site [7]. A person publishing under their own name or brand is a `Person`. Link it as `publisher` and `author`. |
| `sameAs` | The same thing elsewhere | A source repository or an official profile [6]. |
| `about` | What the page is about | For example the `Place` a tide table covers, with its encyclopedia page as `sameAs`. No search feature depends on it [6]. |
| `BreadcrumbList` | The path above a page | Google still shows breadcrumbs on desktop. On phones it has shown only the domain since January 2025, and the markup needs no change [8]. |
| `WebPage` with `dateModified` | When the page last changed | Use the last-updated date the page shows [9], not a build time. A policy's effective date is that date only when the text changed on it. |

## Features that are gone

- **Sitelinks search box:** retired in November 2024 [10].
- **HowTo:** removed in 2023, when FAQ results were limited to authoritative government and health sites [11].
- **FAQ:** no longer shown in Google Search from 7 May 2026 [12].
- **Types announced in June 2025 [13]:** course info, estimated salary, learning video, special announcement and vehicle listing were removed in September 2025. ClaimReview is being phased out. Book actions stayed, limited to book providers [12].
- **Practice problems and Dataset:** practice problem results were removed, and Dataset markup now serves only Dataset Search, not Google Search [12].
- **Effect:** do not add these for search features. The markup is still valid schema.org.

## A home page graph

```json
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": "https://example.com/#website", "url": "https://example.com/",
      "name": "Example Tide Tables", "alternateName": ["Tide Tables"], "inLanguage": "en",
      "publisher": { "@id": "https://example.com/#publisher" } },
    { "@type": "WebApplication", "@id": "https://example.com/#application", "url": "https://example.com/",
      "name": "Example Tide Tables", "applicationCategory": "UtilitiesApplication",
      "isAccessibleForFree": true, "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "isPartOf": { "@id": "https://example.com/#website" }, "publisher": { "@id": "https://example.com/#publisher" } },
    { "@type": "Person", "@id": "https://example.com/#publisher", "name": "Example Publisher",
      "url": "https://example.com/about.html" }
  ]
}
```

## Check it

- **Google:** the Rich Results Test shows the rich results a page can get, and Search Console's URL Inspection shows what Google indexed [1].
- **Vocabulary:** the Schema Markup Validator checks any schema.org type, including ones Google does not use [6].

## Sources

1. Google Search Central, [General structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies); [Introduction to structured data markup](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
2. Bing, [Webmaster Guidelines](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a)
3. Google Search Central, [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
4. Google Search Central, [Provide a site name to Google Search](https://developers.google.com/search/docs/appearance/site-names)
5. Google Search Central, [Software app (SoftwareApplication) structured data](https://developers.google.com/search/docs/appearance/structured-data/software-app)
6. schema.org, [WebApplication](https://schema.org/WebApplication), [Offer](https://schema.org/Offer), [sameAs](https://schema.org/sameAs), [about](https://schema.org/about); [Schema Markup Validator](https://validator.schema.org/)
7. Google Search Central, [Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization)
8. Google Search Central blog (2025), [Simplifying the visible URL element on mobile search results](https://developers.google.com/search/blog/2025/01/simplifying-breadcrumbs)
9. Google Search Central, [Influence the byline date in Google Search](https://developers.google.com/search/docs/appearance/publication-dates)
10. Google Search Central blog (2024), [Farewell, sitelinks search box](https://developers.google.com/search/blog/2024/10/sitelinks-search-box)
11. Google Search Central blog (2023), [Changes to HowTo and FAQ rich results](https://developers.google.com/search/blog/2023/08/howto-faq-changes)
12. Google Search Central, [Latest Google Search documentation updates](https://developers.google.com/search/updates)
13. Google Search Central blog (2025), [Simplifying the search results page](https://developers.google.com/search/blog/2025/06/simplifying-search-results)

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/structured-data.md). Written for this skill from the primary sources listed above.
