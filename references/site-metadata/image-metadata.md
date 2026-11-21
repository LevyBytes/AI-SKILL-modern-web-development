# Image metadata

Open when embedding credit, copyright and license details in a site's images, marking images made with AI, deciding whether to keep or strip metadata, or reading what C2PA Content Credentials do on the web.

## Rights details Google Images reads

Google takes image rights details from either JSON-LD on the page or IPTC photo metadata embedded in the file. One of the two is enough; when both exist and disagree, the structured data wins [1].

- **Structured data:** marks one use of an image on one page, so each page that shows the image needs its own markup [1].
- **Embedded IPTC metadata:** travels with the file from page to page, so it is written once per image [1].

| What | JSON-LD property [1] | IPTC field [1, 2] | XMP property [2] |
| --- | --- | --- | --- |
| Who made it | `creator` (a Person or Organization) | Creator | `dc:creator` (an ordered list) |
| Who is credited | `creditText` | Credit Line | `photoshop:Credit` |
| Who owns the copyright | `copyrightNotice` | Copyright Notice | `dc:rights` (a language alternative) |
| The license | `license` (a URL) | Web Statement of Rights | `xmpRights:WebStatement` |
| Where to license it | `acquireLicensePage` (a URL) | Licensor URL | `plus:LicensorURL` inside a `plus:Licensor` entry |
| How it was made | none | Digital Source Type | `Iptc4xmpExt:DigitalSourceType` |

- **The JSON-LD minimum:** an `ImageObject` with `contentUrl` and at least one of `creator`, `creditText`, `copyrightNotice` or `license`; the other three then become recommended [1]. The markup itself is in [Structured data features](structured-data-features.md).
- **The Licensable badge:** needs `license` in structured data, or the Web Statement of Rights in IPTC metadata; add the licensing page as well when there is one [1].
- **The Licensor URL** belongs to a Licensor entry, not to the image directly [1].

## Images made with AI

- **Digital Source Type** names how an image was made, as a URI from IPTC's Digital Source Type NewsCodes [2]. Google reads four values [1]:
  - `trainedAlgorithmicMedia`: created by a model trained on sampled content.
  - `compositeSynthetic`: a composite with at least one synthetic element.
  - `algorithmicMedia`: created purely by an algorithm with no training data, such as a formula.
  - `compositeWithTrainedAlgorithmicMedia`: trained algorithmic media combined with other media, as in inpainting or outpainting.
- **The full URI** is `http://cv.iptc.org/newscodes/digitalsourcetype/` followed by the value [2].
- **Data mining:** IPTC's Data Mining property (`plus:DataMining`) states a prohibition or permission for data mining, such as AI training, using a value from the PLUS vocabulary. Regional law can overrule it, and its absence grants nothing [2]. For a site-wide preference, see [AI usage preferences](ai-usage-preferences.md).

## C2PA Content Credentials

- **What they are:** a C2PA manifest is a signed record of where a file came from and how it changed, bound to the file by a cryptographic hash. The current specification is version 2.5 [3].
- **In Google Search:** "About this image" may show how an image was made or whether it was edited with AI tools, when the signer (usually an app, a camera or a service) uses C2PA 2.1 or later and signs with a certificate from a Certification Authority on the C2PA Trust List [1]. Google's ad systems are also starting to read it [4].
- **Where it lives in a file:** JPEG APP11 segments, a PNG `caBX` chunk before the image data, a WebP `C2PA` chunk, or the metadata element of an SVG [3].
- **Outside the file:** a manifest store served as `application/c2pa`. An image that has XMP can point to it with `dcterms:provenance`, and a server can send `Link: <...>; rel="c2pa-manifest"`. An embedded manifest wins over a remote one [3].
- **For a page itself:** one `<script type="application/c2pa">` or one `<link rel="c2pa-manifest" href="..." type="application/c2pa">` in the head, never more than one [3].
- **Editing breaks the signature:** resizing, compressing or rewriting the file's metadata changes its hash, so publish the signed file as the signer produced it, or have the editing tool sign a new manifest [3].
- **Durable credentials:** an invisible watermark or a fingerprint (a soft binding) can find a manifest again in a repository after the file has lost it [3].

## Keep or strip

- **Keep the rights fields:** removing metadata saves bytes, but it may be illegal in some jurisdictions. Google recommends keeping at least the creator, credit line and copyright notice [1].
- **Strip location:** IPTC and Exif metadata can hold the GPS latitude, longitude and altitude where a photo was taken [2], and anyone who downloads the file can read it. Remove it unless the place is meant to be public.
- **Check the published file:** an image optimizer or CDN in the pipeline can rewrite the file, so read the metadata back from the deployed image, not the source.

## In the bundled scripts

- **Writing it:** `imageMetadata` on a share card in the [preview configuration](preview-config.md) embeds the creator, credit line, copyright notice, web statement, licensor URL and digital source type as XMP in the rendered PNG or JPEG, then reads them back.
- **Checking it:** the [metadata audit](metadata-audit.md) reads XMP, IPTC, Exif GPS and C2PA from each share image, and the C2PA associations in each page's head.

## Sources

1. Google Search Central, [Image metadata in Google Images](https://developers.google.com/search/docs/appearance/structured-data/image-license-metadata)
2. IPTC, [IPTC Photo Metadata Standard 2025.1](https://www.iptc.org/std/photometadata/specification/IPTC-PhotoMetadata)
3. C2PA, [C2PA Technical Specification 2.5](https://spec.c2pa.org/specifications/specifications/2.5/specs/C2PA_Specification.html)
4. Google (2024), [How we're increasing transparency for gen AI content with the C2PA](https://blog.google/innovation-and-ai/products/google-gen-ai-content-transparency-c2pa/)

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/image-metadata.md). Written for this skill from the primary sources listed above.
