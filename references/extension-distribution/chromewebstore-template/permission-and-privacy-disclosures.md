[Complete example](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/skills-src/chrome-extensions/references/webstore/chromewebstore-template.md#L9-L178). Related sections: [Chromewebstore template](overview.md) · [Version history and review](version-history-and-review.md).
```markdown
## Permissions Justification

<!-- Every permission in manifest.json needs a justification. The review team reads these.
     Be specific about WHY the permission is needed and WHAT user-facing feature uses it.
     "Required for functionality" will be rejected. -->

| Permission | Type | Justification |
|------------|------|---------------|
| | permissions | |
| | host_permissions | |

<!-- Type is either "permissions" or "host_permissions" -->


## Privacy & Data Use

<!-- These map to the CWS data use disclosure form. Be exhaustive and accurate —
     mismatches between what you declare and what the code does cause rejection. -->

### Data Collection

**Does the extension collect user data?** Yes / No

<!-- If Yes, fill in the table below. If No, skip to the certification. -->

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | | | | |
| Health info | | | | |
| Financial info | | | | |
| Authentication info | | | | |
| Personal communications | | | | |
| Location | | | | |
| Web history | | | | |
| User activity | | | | |
| Website content | | | | |

### Data Use Certification
<!-- Check all that apply: -->
- [ ] Data is NOT sold to third parties
- [ ] Data is NOT used for purposes unrelated to the extension's core functionality
- [ ] Data is NOT used for creditworthiness or lending purposes


## Privacy Policy

**Privacy Policy URL** [REQUIRED]

<!-- Host this at a publicly accessible URL. GitHub Pages, your website, or a
     Notion page all work. See references/webstore/privacy-policy.md for a template. -->


## Distribution

**Visibility**: Public / Unlisted / Private
**Regions**: All regions / [List specific regions]

## Developer Info

**Publisher Name** [REQUIRED]

**Contact Email** [REQUIRED]
<!-- Displayed publicly on the store listing. -->

**Support URL / Email** [RECOMMENDED]
<!-- Where users go for help. Can be a GitHub Issues page, email, or support site. -->

**Homepage URL** [RECOMMENDED]


```

GoogleChrome Modern Web Guidance contributors. [Original document](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/skills-src/chrome-extensions/references/webstore/chromewebstore-template.md#L81-L150). [Upstream licensing terms](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/README.md#license). Reorganized for this edition.
