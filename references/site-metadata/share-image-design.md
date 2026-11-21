# Share image design

Open when composing a share image (`og:image`) that must read at a glance and survive every platform's crop.

## Frame

- **Size:** 1200 × 630 px (1.91:1) meets the image limits of Facebook, LinkedIn, X and WhatsApp at once. It also meets Google Discover's large-image rule (at least 1200 px wide and more than 300,000 pixels) [16] and Apple's 900 px minimum for Messages [17]. Each platform's limits are in [Platform previews](platform-previews.md).
- **Safe square:** keep every word inside the center square, x 285 to 915, because Google's phone thumbnail, Teams and Reddit crop from the center.
- **X's title band:** keep the bottom-left clear (about x 0 to 760, y 545 to 630), where X lays the page title over the image. That layout is observed, not documented.
- **Still:** use a still image, because cards do not animate reliably. If the design reuses an animation, render one fixed frame on a fake clock so every render is the same.
- **File:** JPEG at quality 90 is about a quarter of a PNG's size for gradient and photographic artwork. Check it stays under WhatsApp's 600 KB.

## First impressions

- **Judged in 50 ms:** people judge a design's visual appeal within 50 ms, and those judgments match the ones they make after looking longer [1].
- **Simple and familiar wins:** low visual complexity and a familiar (prototypical) layout are judged most appealing at the first glance [2]. Visual complexity weighs more than colorfulness in that judgment [3].
- **One glance is typical:** most ads get a single eye fixation. Typical ads still get their product and brand across within 100 ms [4].
- **Each element has a job:** the picture catches attention whatever its size; text catches it in proportion to its size; the brand passes attention on to the rest [5].
- **Clutter against structure:** many edges, colors and objects lower attention to the brand and liking of the ad. A deliberate, structured arrangement raises attention and comprehension [6].
- **For the card:** one mark, the name in the largest type, one short line, and nothing else competing for the first glance.

## Composition

- **Touching shapes join the word:** elements close together are seen as one group, and a shape that shares an edge with a letter reads as part of it (figure and ground) [7]. Background shapes should run well clear of letters or off the image's edge, not stop a few pixels short of the text.
- **Quiet behind the text:** the contrast of the background behind text predicts reading performance more strongly than the text's own contrast does [8]. Put text on a plain or gently graded field.
- **Point cues at the message:** a gaze in an ad steers where readers look [9], and a face looking toward a banner's message raises attention to it and memory of it [10]. A streak left by a moving point reads as its direction of travel [11]. Point trails, arrows and gazes at the title, not off into a corner.
- **Left to right reads as forward:** left-to-right readers picture actions running left to right [12], and judge the same action as stronger and faster when it runs that way [13]. Put the visual weight and the source of any motion on the left.

## Text in the image

- **Keep it short:** Meta reports that images with less than 20% text perform better [14]. Apple advises against text in link images, because they are drawn at many sizes, and notes that text in tags reaches VoiceOver users [15, 17]. Google asks Discover images not to be text-heavy or a generic logo [16].
- **Large type, few words:** a name and one short line, in large type, meet both. The card script measures how much of the image is text on every render.
- **The rest in tags:** put longer claims in `og:description`, where every platform can show or cut them as it fits.

## The bundled template and checks

- **Template:** `assets/share-preview-card/card.html` is a 1200 × 630 card with an eyebrow, a two-line title, a tagline and a faint background logo. Its URL parameters set the text, logo and colors.
- **Your own template:** mark each text element with `data-share-text`, and the checks measure it.
- **What the card script checks** (`scripts/share-previews/render-share-cards.ts`):
  - every rendered line of marked text sits inside the safe square;
  - no line enters X's title band;
  - the share of the image covered by text, which is reported and fails only above a configured limit.
- **Rights metadata:** a card's `imageMetadata` writes the IPTC fields Google Images reads (creator, credit, copyright, rights statement) into the file as XMP; see [Image metadata](image-metadata.md).
- **Settings:** see [Preview configuration](preview-config.md).

## Sources

1. Lindgaard, Fernandes, Dudek and Brown (2006), [Attention web designers: You have 50 milliseconds to make a good first impression!](https://doi.org/10.1080/01449290500330448), Behaviour & Information Technology 25(2)
2. Tuch, Presslaber, Stöcklin, Opwis and Bargas-Avila (2012), [The role of visual complexity and prototypicality regarding first impression of websites](https://research.google/pubs/pub38315/), International Journal of Human-Computer Studies 70(11)
3. Reinecke, Yeh, Miratrix, Mardiko, Zhao, Liu and Gajos (2013), [Predicting users' first impressions of website aesthetics with a quantification of perceived visual complexity and colorfulness](https://kgajos.seas.harvard.edu/papers/reinecke13aesthetics.pdf), CHI 2013
4. Pieters and Wedel (2012), [Ad gist: ad communication in a single eye fixation](https://doi.org/10.1287/mksc.1110.0673), Marketing Science 31(1)
5. Pieters and Wedel (2004), [Attention capture and transfer in advertising: brand, pictorial, and text-size effects](https://doi.org/10.1509/jmkg.68.2.36.27794), Journal of Marketing 68(2)
6. Pieters, Wedel and Batra (2010), [The stopping power of advertising: measures and effects of visual complexity](https://doi.org/10.1509/jmkg.74.5.048), Journal of Marketing 74(5)
7. Wagemans, Elder, Kubovy, Palmer, Peterson, Singh and von der Heydt (2012), [A century of Gestalt psychology in visual perception: I. Perceptual grouping and figure-ground organization](https://pmc.ncbi.nlm.nih.gov/articles/PMC3482144/), Psychological Bulletin 138(6)
8. Scharff, Ahumada and Hill (1999), [Discriminability measures for predicting readability](https://laurenscharff.com/research/spie99.html), Human Vision and Electronic Imaging IV, SPIE 3644
9. Hutton and Nolte (2011), [The effect of gaze cues on attention to print advertisements](https://doi.org/10.1002/acp.1763), Applied Cognitive Psychology 25(6)
10. Sajjacholapunt and Ball (2014), [The influence of banner advertisements on attention and memory: human faces with averted gaze can enhance advertising effectiveness](https://doi.org/10.3389/fpsyg.2014.00166), Frontiers in Psychology 5
11. Geisler (1999), [Motion streaks provide a spatial code for motion direction](https://doi.org/10.1038/21886), Nature 400
12. Maass and Russo (2003), [Directional bias in the mental representation of spatial events: nature or culture?](https://doi.org/10.1111/1467-9280.14421), Psychological Science 14(4)
13. Maass, Pagani and Berta (2007), [How beautiful is the goal and how violent is the fistfight? Spatial bias in the interpretation of human behavior](https://doi.org/10.1521/soco.2007.25.6.833), Social Cognition 25(6)
14. Meta Business Help Center, [About text in ad images](https://www.facebook.com/business/help/980593475366490)
15. Apple, [Ensuring beautiful rich links](https://developer.apple.com/videos/play/tech-talks/205/)
16. Google Search Central, [Discover and your website](https://developers.google.com/search/docs/appearance/google-discover)
17. Apple, [TN3156: Create rich previews for Messages](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages)

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/share-image-design.md). Written for this skill from the primary sources listed above.
