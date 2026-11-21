# Structured data features

Open when marking up content for a specific Google Search feature, such as products, events, recipes, jobs, videos, reviews or a local business, and checking which properties it requires.

Each feature has required properties; an item without one of them is not eligible for that feature, though it is still valid schema.org. Recommended properties improve the result. The general rules, the site name and the features Google retired are in [Structured data](structured-data.md).

## Features for most sites

| Feature | Type | Required | Notes |
| --- | --- | --- | --- |
| [Article](https://developers.google.com/search/docs/appearance/structured-data/article) | `Article`, `NewsArticle`, `BlogPosting` | None | `headline`, `image`, `datePublished`, `dateModified` and `author` with `name` and `url` are recommended. |
| [Breadcrumb](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb) | `BreadcrumbList` | `itemListElement` of `ListItem`s with `position`, `name` and `item` | The last item may leave out `item`. |
| [Organization](https://developers.google.com/search/docs/appearance/structured-data/organization) | `Organization` or a subtype | None | On the home page, helps Google tell the organization apart from others and can shape its knowledge panel. |
| [Video](https://developers.google.com/search/docs/appearance/structured-data/video) | `VideoObject` | `name`, `thumbnailUrl`, `uploadDate` | Key moments add `Clip` (`name`, `startOffset`, `url`) or a `SeekToAction`; a live stream adds a `BroadcastEvent`. |
| [Image metadata](https://developers.google.com/search/docs/appearance/structured-data/image-license-metadata) | `ImageObject` | `contentUrl`, and one of `creator`, `creditText`, `copyrightNotice` or `license` | `license` makes the image eligible for the Licensable badge; see [Image metadata](image-metadata.md). |
| [Profile page](https://developers.google.com/search/docs/appearance/structured-data/profile-page) | `ProfilePage` | `mainEntity`, a `Person` or `Organization` with `name` | For communities where people or organizations share first-hand perspectives. |
| [Discussion forum](https://developers.google.com/search/docs/appearance/structured-data/discussion-forum) | `DiscussionForumPosting` | `author` with `name`, `datePublished`, and `text`, `image` or `video` | For forum threads; a page with one question and answers uses Q&A instead. |
| [Q&A](https://developers.google.com/search/docs/appearance/structured-data/qapage) | `QAPage` with a `Question` as `mainEntity` | The question's `name` and `answerCount`, and an `acceptedAnswer` or `suggestedAnswer` | For a page where users answer one question. |
| [Paywalled content](https://developers.google.com/search/docs/appearance/structured-data/paywalled-content) | `isAccessibleForFree: false` on the page's `CreativeWork`, with `hasPart` | Each paywalled part's `cssSelector`, a `.class` selector | Tells Google the hidden text is a paywall, not cloaking. Applebot reads the page-level value too; see [Apple platforms](apple-platforms.md). |

## Commerce

| Feature | Type | Required | Notes |
| --- | --- | --- | --- |
| [Product snippet](https://developers.google.com/search/docs/appearance/structured-data/product-snippet) | `Product` | `name`, and one of `review`, `aggregateRating` or `offers` | For pages that review or describe products. |
| [Merchant listing](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing) | `Product` | `name`, `image`, and `offers` with a price | For pages where a shopper can buy the product. Shipping, returns, certifications and 3D models are optional nested parts. |
| [Product variants](https://developers.google.com/search/docs/appearance/structured-data/product-variants) | `ProductGroup` with `hasVariant` | `name` | Each variant is a `Product`; `variesBy` names what changes, such as size or color. |
| [Return policy](https://developers.google.com/search/docs/appearance/structured-data/return-policy) | `MerchantReturnPolicy` under the `Organization` | `applicableCountry`, `returnPolicyCategory` | Shown with the site's products and in knowledge panels. |
| [Shipping policy](https://developers.google.com/search/docs/appearance/structured-data/shipping-policy) | `ShippingService` under the `Organization` | `shippingConditions` | Rates and times by region, weight or order value. |
| [Loyalty program](https://developers.google.com/search/docs/appearance/structured-data/loyalty-program) | `MemberProgram` | `name`, `description`, `hasTiers` | Each tier needs `name` and `hasTierBenefit`. |

## Content types

| Feature | Type | Required | Notes |
| --- | --- | --- | --- |
| [Event](https://developers.google.com/search/docs/appearance/structured-data/event) | `Event` and subtypes | `name`, `startDate`, `location` | A `Place` location needs an `address`. |
| [Recipe](https://developers.google.com/search/docs/appearance/structured-data/recipe) | `Recipe` | `name`, `image` | Ingredients, steps, times and a rating are recommended. |
| [Job posting](https://developers.google.com/search/docs/appearance/structured-data/job-posting) | `JobPosting` | `datePosted`, `description`, `hiringOrganization`, `title`, `jobLocation` | A remote job sets `jobLocationType` to `TELECOMMUTE` and gives `applicantLocationRequirements` instead of a location. |
| [Course list](https://developers.google.com/search/docs/appearance/structured-data/course) | `Course` in an `ItemList` | `name`, `description` | `provider` is recommended. |
| [Movie carousel](https://developers.google.com/search/docs/appearance/structured-data/movie) | `Movie` in an `ItemList` | `name`, `image` | |
| [Software app](https://developers.google.com/search/docs/appearance/structured-data/software-app) | `SoftwareApplication`, `MobileApplication`, `WebApplication`, `VideoGame` | `name`, `offers.price`, and `aggregateRating` or `review` | A free app has a price of 0. |
| [Review snippet](https://developers.google.com/search/docs/appearance/structured-data/review-snippet) | `Review` or `AggregateRating` on a reviewable type | A review's `author`, `itemReviewed` and `reviewRating`; a rating's `ratingValue` and `ratingCount` or `reviewCount` | The author's name must be under 100 characters. |
| [Employer rating](https://developers.google.com/search/docs/appearance/structured-data/employer-rating) | `EmployerAggregateRating` | `itemReviewed`, `ratingCount`, `ratingValue` | |
| [Local business](https://developers.google.com/search/docs/appearance/structured-data/local-business) | `LocalBusiness` and subtypes, such as `Restaurant` | `name`, `address` | Opening hours, `geo` and `priceRange` are recommended. |
| [Carousel](https://developers.google.com/search/docs/appearance/structured-data/carousel) | `ItemList` on a summary page | `itemListElement` | Turns recipes, courses, restaurants or movies into a carousel. A [beta host carousel](https://developers.google.com/search/docs/appearance/structured-data/carousels-beta) shows only in the EEA, Türkiye and South Africa. |
| [Education Q&A](https://developers.google.com/search/docs/appearance/structured-data/education-qa) | `Quiz` | `hasPart` questions, each with `acceptedAnswer`, `eduQuestionType` and `text` | Flashcards for education sites. |
| [Math solver](https://developers.google.com/search/docs/appearance/structured-data/math-solvers) | `MathSolver` with a `SolveMathAction` | `url`, `usageInfo`, `potentialAction` | For sites that solve math problems. |

## Limited or beta

- **[Speakable](https://developers.google.com/search/docs/appearance/structured-data/speakable):** marks the parts of a news article Google Assistant may read aloud; beta, for English content to users in the US.
- **[Book actions](https://developers.google.com/search/docs/appearance/structured-data/book):** limited to book providers with a wide selection of books.
- **[Vacation rental](https://developers.google.com/search/docs/appearance/structured-data/vacation-rental):** limited to sites that meet eligibility criteria.
- **[Fact check](https://developers.google.com/search/docs/appearance/structured-data/factcheck):** Google is phasing out ClaimReview markup.
- **[Dataset](https://developers.google.com/search/docs/appearance/structured-data/dataset):** used by Dataset Search, not Google Search.

## Check it

- **Before deployment:** the bundled [metadata audit](metadata-audit.md) checks every feature above for its required properties, ISO 8601 dates, rating ranges, prices and ISO 4217 currencies, and reports retired types.
- **After deployment:** Google's Rich Results Test and Search Console's rich result reports show what Google read [1].

## Sources

Each feature's name links to its Google Search Central guide, the source of its row.

1. Google Search Central, [Structured data markup that Google Search supports](https://developers.google.com/search/docs/appearance/structured-data/search-gallery)

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/structured-data-features.md). Written for this skill from the primary sources listed above.
