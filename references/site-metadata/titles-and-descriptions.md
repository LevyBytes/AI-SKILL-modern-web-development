# Titles and descriptions

Open when writing the title and description that search results and link cards show, or reviewing them before a release.

## Titles

- **Describe the page:** Google builds title links mainly from `<title>`. It can rewrite titles that are vague, repeated across pages, overlong or stuffed with keywords [1]. Say what the page is in a full phrase, such as "Tide table privacy policy", rather than a label like "Home" or "Legal".
- **The brand, once:** Google accepts the site name at the start or end of `<title>`, set off by a delimiter [1]. Meta asks for `og:title` without it [2]. Where every surface already shows the site name or domain, a suffix only repeats it.

## Descriptions

Each point below rests on its own source. Their order, from what the page offers to the objections it answers, is a writing choice rather than a measured finding. Use only the points that are true of the product.

1. **Name things concretely.** Customer service agents who used concrete words raised satisfaction and purchases in field data [3]. That study covers service conversations; applied to a description, it means naming the specific thing, such as the records a tool saves, rather than a category word.
2. **Show the cause of ownership.** People feel they own what they control and know intimately [4]. Digital goods weaken that feeling [5], and felt ownership raises how much people value a thing [6]. When the result stays under the reader's control, say where it lives: "saves a file to your device" gives the cause; "a file you own" only asserts it.
3. **Say when it is free.** People value a free product beyond its price difference from a paid one [7].
4. **Answer a known objection.** Being forced to create an account is a common reason shoppers give for abandoning a checkout [8]. When no account is needed, "No sign-up" answers it.
5. **Raise privacy only when it is already in question.** When privacy information is shown, people choose the more private option, and some pay more for it [9]. Raising privacy unprompted can make people warier [10]. A tool that reads a personal account has already raised the question, so answering it helps.
6. **Affirm before negating.** A negation is easily remembered as its opposite unless an affirmative frame is present [11]. Put the affirmative claim ("on your device") before the negatives ("no upload, no tracking").

## Length and cuts

- **No fixed limit:** Google cuts titles and snippets to fit the device, and can replace the description with page text that matches the query better [12].
- **Put the strongest claims first:** narrow feeds and chat bubbles cut the description early, so the order decides what survives. The [preview gallery](preview-gallery.md) shows which mockups cut which field.
- **Search words in the description:** a description built from the words people search for gives Google the least reason to substitute other text [12].

## Checks before release

- **Grammar of product words:** a noun used as a verb is a common slip, such as "Backup your files" for "Back up your files". The gallery's `textChecks` setting flags patterns like this on every page; see [Preview configuration](preview-config.md).
- **Every page:** each page gets its own title and description; Google treats repeated ones as a reason to rewrite [1, 12].
- **Visible name:** the name in the markup and tags should match the name the page shows, or Google may choose another [13].
- **Claims the page supports:** describe only what the site does now. A description that promises a feature that does not exist misleads readers, and the same claim in structured data breaks Google's guidelines [14].

## Sources

1. Google Search Central, [Influencing your title links in search results](https://developers.google.com/search/docs/appearance/title-link)
2. Meta for Developers, [A Guide to Sharing for Webmasters](https://developers.facebook.com/documentation/sharing/webmasters)
3. Packard and Berger (2021), [How concrete language shapes customer satisfaction](https://doi.org/10.1093/jcr/ucaa038), Journal of Consumer Research 47(5)
4. Pierce, Kostova and Dirks (2001), [Toward a theory of psychological ownership in organizations](https://doi.org/10.5465/amr.2001.4378028), Academy of Management Review 26(2)
5. Morewedge, Monga, Palmatier, Shu and Small (2021), [Evolution of consumption: a psychological ownership framework](https://doi.org/10.1177/0022242920957007), Journal of Marketing 85(1)
6. Peck and Shu (2009), [The effect of mere touch on perceived ownership](https://doi.org/10.1086/598614), Journal of Consumer Research 36(3)
7. Shampanier, Mazar and Ariely (2007), [Zero as a special price: the true value of free products](https://doi.org/10.1287/mksc.1060.0254), Marketing Science 26(6)
8. Baymard Institute, [Cart abandonment rate statistics](https://baymard.com/blog/cart-abandonment-rate-statistics) (the institute's own checkout survey)
9. Tsai, Egelman, Cranor and Acquisti (2011), [The effect of online privacy information on purchasing behavior](https://doi.org/10.1287/isre.1090.0260), Information Systems Research 22(2)
10. Marreiros, Tonin, Vlassopoulos and Schraefel (2017), ["Now that you mention it": a survey experiment on information, inattention and online privacy](https://doi.org/10.1016/j.jebo.2017.03.024), Journal of Economic Behavior and Organization 140
11. Mayo, Schul and Burnstein (2004), ["I am not guilty" vs "I am innocent": successful negation may depend on the schema used for its encoding](https://pluto.huji.ac.il/~mschul/yaacov_schul_files/2004-mayo&schul&burnstein-neg.pdf), Journal of Experimental Social Psychology 40
12. Google Search Central, [Control your snippets in search results](https://developers.google.com/search/docs/appearance/snippet)
13. Google Search Central, [Provide a site name to Google Search](https://developers.google.com/search/docs/appearance/site-names)
14. Google Search Central, [General structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/titles-and-descriptions.md). Written for this skill from the primary sources listed above.
