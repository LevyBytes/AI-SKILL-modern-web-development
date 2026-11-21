# Open Graph

Open when choosing an `og:type` and its properties, giving several images or a video, or reading how platforms treat the `og:` tags beyond the four basic ones.

Open Graph tags use `property`, not `name`: `<meta property="og:title" content="...">` [1]. Which platform shows which tag is in [Platform previews](platform-previews.md); the everyday set is in [Head tags](head-tags.md).

## Required and optional properties

| Property | Meaning [1] |
| --- | --- |
| `og:title`, `og:type`, `og:image`, `og:url` | Required for every object. `og:url` is the canonical URL, so give the same address as the canonical link. |
| `og:description` | One or two sentences. |
| `og:site_name` | The larger site the object belongs to. |
| `og:locale`, `og:locale:alternate` | `language_TERRITORY`, default `en_US`; the alternates list the other locales of the page. |
| `og:determiner` | The word before the title in a sentence: `a`, `an`, `the`, empty or `auto`. |
| `og:audio`, `og:video` | A sound or video file that goes with the object. |

## Images, videos and arrays

- **Image properties:** `og:image:url` (the same as `og:image`), `og:image:secure_url`, `og:image:type`, `og:image:width`, `og:image:height` and `og:image:alt`. A page that gives `og:image` should give `og:image:alt`, a description of the image, not a caption [1].
- **Video properties:** `og:video` takes the same structured properties as an image; `og:audio` takes `url`, `secure_url` and `type` [1].
- **Several values:** repeat the tag. Each structured property belongs to the root tag above it, and a new root tag starts the next item, so write each image's width and height right after its `og:image` [1].
- **First wins:** when values conflict, the first tag from the top is preferred, so put the preferred image first [1].

## Types

| `og:type` | Extra properties [1] |
| --- | --- |
| `website` | None. A page without a type is treated as `website`. |
| `article` | `article:published_time`, `modified_time`, `expiration_time` (ISO 8601), `article:author` (profile URLs), `article:section`, `article:tag`. |
| `book` | `book:author`, `book:isbn`, `book:release_date`, `book:tag`. |
| `profile` | `profile:first_name`, `last_name`, `username`, `gender`. |
| `video.movie`, `video.episode`, `video.tv_show`, `video.other` | `video:actor` (with `:role`), `director`, `writer`, `duration` (seconds), `release_date`, `tag`; an episode adds `video:series`. |
| `music.song`, `music.album`, `music.playlist`, `music.radio_station` | `music:duration`, `album`, `musician`, `song` with `:disc` and `:track`, `release_date`, `creator`. |
| `payment.link` | A beta type for payment links: description, currency (ISO 4217), amount, expiry, status, ID and success URL. |

- **Custom types** are prefixed names in a namespace declared with `prefix` on the head, such as `my_namespace:type` [1].
- **Article dates for search:** Google's byline date guidance works from the visible date and structured data; see [Structured data](structured-data.md).

## Video in link cards

- **Discord:** plays an inline video when `og:type` is `video` or `video.*` (or `twitter:card` is `player`) and `og:video` points straight at an MP4, WebM or QuickTime file; `og:image` becomes the preview frame and the description is dropped [2].
- **Apple Messages:** downloads and autoplays a direct media file named in `og:video` or `twitter:player:stream`; a streamed file such as HLS plays on tap, and a video that needs embedding HTML does not play inline [3].
- **Only for pages about the video:** on Discord the inline player replaces the description [2], so keep video types and `player` cards to pages whose subject is the video.

## Reading the protocol

- **Namespaces:** the `og:` prefix needs no declaration for the global types; the protocol's RDF schema is at `ogp.me/ns` [1].
- **Values:** booleans are `true`, `false`, `1` or `0`; dates are ISO 8601; integers and floats are plain numbers [1].
- **The audit:** the bundled [metadata audit](metadata-audit.md) checks the four required properties, known types, article properties and dates, `og:url` against the canonical address, repeated single-value tags, `name=` used instead of `property=`, and Discord's size limits.

## Sources

1. [The Open Graph protocol](https://ogp.me/)
2. Discord Developer Documentation, [Link previews](https://docs.discord.com/developers/link-previews/overview)
3. Apple, [TN3156: Create rich previews for Messages](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages)

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/open-graph.md). Written for this skill from the primary sources listed above.
