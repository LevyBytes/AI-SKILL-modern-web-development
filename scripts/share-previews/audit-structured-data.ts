// Structured data rules of the metadata audit: JSON-LD syntax and vocabulary, the properties each Google Search
// feature requires, types Google no longer shows, and values in the wrong format. A missing required property makes
// the item ineligible for its feature, which is a warning: the data can still be valid schema.org. A value in the
// wrong format is an error. Sources: Google's structured data feature guides and Search Central changelog.
import { type Report, absolute, ISO_DATE } from './audit-common.ts';

type Node = Record<string, any>;
// LocalBusiness and its most used schema.org subtypes; Google's local business feature reads any of them.
const LOCAL_BUSINESS = ['LocalBusiness', 'Restaurant', 'FoodEstablishment', 'CafeOrCoffeeShop', 'Bakery', 'BarOrPub', 'Store', 'ClothingStore', 'GroceryStore',
  'Hotel', 'LodgingBusiness', 'Dentist', 'MedicalBusiness', 'MedicalClinic', 'Physician', 'AutomotiveBusiness', 'AutoRepair', 'ProfessionalService', 'LegalService',
  'FinancialService', 'HealthAndBeautyBusiness', 'HomeAndConstructionBusiness', 'SportsActivityLocation', 'EntertainmentBusiness', 'ChildCare', 'RealEstateAgent'];
const types = (node: Node): string[] => [].concat(node?.['@type'] ?? []);
const is = (node: Node, list: string[]) => types(node).some(t => list.includes(t));

// Every node in the page's JSON-LD: top-level nodes, @graph members and nested objects, with @id references resolved.
function collect(blocks: any[]) {
  const nodes: Node[] = [];
  const top: Node[] = [];
  const byId = new Map<string, Node>();
  const walk = (value: any, depth: number) => {
    if (Array.isArray(value)) { value.forEach(v => walk(v, depth)); return; }
    if (!value || typeof value !== 'object') return;
    if (value['@type']) { nodes.push(value); if (depth === 0) top.push(value); }
    if (value['@id'] && Object.keys(value).length > 1) byId.set(value['@id'], value);
    for (const [key, child] of Object.entries(value)) if (key !== '@context') walk(child, key === '@graph' ? depth : depth + 1);
  };
  for (const block of blocks) walk(block, 0);
  return { nodes, top, byId };
}

export function auditStructuredData(blocks: any[], page: { url: string; isHome: boolean; siteUrl: string }, add: Report) {
  const S = 'structured data';
  if (!blocks.length) { add('info', S, 'No JSON-LD on this page.'); return; }
  for (const block of blocks) {
    const context = JSON.stringify(block['@context'] ?? '');
    if (!/schema\.org/.test(context)) add('error', S, 'A JSON-LD block has no schema.org `@context`, so its types mean nothing to search engines.');
  }
  const { nodes, top, byId } = collect(blocks);
  const deref = (value: any) => (value && typeof value === 'object' && value['@id'] && Object.keys(value).length === 1 ? byId.get(value['@id']) ?? value : value);
  const get = (node: Node, path: string): any[] => path.split('.').reduce<any[]>((values, key) => values.flatMap(v => [].concat(deref(v)?.[key] ?? [])).map(deref).filter(v => v !== undefined && v !== null && v !== ''), [node]);
  const has = (node: Node, path: string) => get(node, path).length > 0;
  const label = (node: Node) => `\`${types(node).join('/')}\`${node.name ? ` "${String(node.name).slice(0, 40)}"` : ''}`;
  const need = (node: Node, feature: string, paths: string[], oneOf: string[][] = []) => {
    const missing = paths.filter(p => !has(node, p));
    for (const group of oneOf) if (!group.some(p => has(node, p))) missing.push(group.join(' or '));
    if (missing.length) add('warn', S, `${label(node)} is not eligible for Google's ${feature}: it needs ${missing.map(m => `\`${m}\``).join(', ')}.`);
    else add('ok', S, `${label(node)} has every property Google's ${feature} requires.`);
  };
  for (const block of blocks) for (const node of [].concat(block['@graph'] ?? block)) if (!types(node).length) add('error', S, 'A top-level JSON-LD node has no `@type`.');
  for (const node of nodes) {
    for (const key of ['datePublished', 'dateModified', 'uploadDate', 'startDate', 'endDate', 'datePosted', 'validThrough', 'dateCreated']) {
      for (const value of [].concat(node[key] ?? [])) if (typeof value === 'string' && !ISO_DATE.test(value)) add('error', S, `${label(node)}: \`${key}\` \`${value}\` is not an ISO 8601 date.`);
    }
    for (const rating of [node].filter(n => is(n, ['Rating', 'AggregateRating', 'EmployerAggregateRating']))) {
      const value = Number(rating.ratingValue);
      const best = Number(rating.bestRating ?? 5);
      const worst = Number(rating.worstRating ?? 1);
      if (rating.ratingValue !== undefined && (Number.isNaN(value) || value > best || value < worst)) add('error', S, `${label(rating)}: \`ratingValue\` ${rating.ratingValue} is outside ${worst} to ${best}.`);
    }
    for (const offer of [node].filter(n => is(n, ['Offer']))) {
      if (offer.price !== undefined && Number.isNaN(Number(String(offer.price).replace(/,/g, '')))) add('error', S, `Offer price \`${offer.price}\` is not a number; give the currency in \`priceCurrency\`.`);
      if (offer.priceCurrency && !/^[A-Z]{3}$/.test(offer.priceCurrency)) add('error', S, `\`priceCurrency\` \`${offer.priceCurrency}\` is not an ISO 4217 code.`);
    }
  }
  for (const node of nodes) {
    const t = types(node);
    if (is(node, ['Article', 'NewsArticle', 'BlogPosting'])) {
      for (const name of get(node, 'author.name')) if (/^(by|posted by)\b/i.test(name)) add('warn', S, `${label(node)}: \`author.name\` "${name}" should hold only the name.`);
      if (!has(node, 'datePublished')) add('info', S, `${label(node)}: Google recommends \`datePublished\` with a time zone.`);
      add('ok', S, `${label(node)}: Google's article features have no required properties; \`author\`, \`datePublished\`, \`dateModified\`, \`headline\` and \`image\` are recommended.`);
    } else if (is(node, ['BreadcrumbList'])) {
      const items = [].concat(node.itemListElement ?? []).map(deref);
      if (!items.length) need(node, 'breadcrumb', ['itemListElement']);
      items.forEach((item: Node, index: number) => {
        const missing = ['position', 'name'].filter(k => item?.[k] === undefined);
        if (!item?.item && index < items.length - 1) missing.push('item');
        if (missing.length) add('warn', S, `Breadcrumb item ${index + 1} needs ${missing.map(m => `\`${m}\``).join(', ')}; only the last item may leave out \`item\`.`);
        if (item?.position !== undefined && Number(item.position) !== index + 1) add('warn', S, `Breadcrumb item ${index + 1} has position ${item.position}; positions count from 1 in order.`);
      });
      if (items.length) add('ok', S, `Breadcrumb trail of ${items.length} items.`);
    } else if (is(node, ['Event', 'MusicEvent', 'TheaterEvent', 'SportsEvent', 'Festival', 'BusinessEvent', 'EducationEvent', 'ExhibitionEvent', 'ComedyEvent', 'DanceEvent', 'FoodEvent', 'LiteraryEvent', 'SocialEvent'])) {
      need(node, 'event results', ['name', 'startDate', 'location']);
      for (const place of get(node, 'location')) if (is(place, ['Place']) && !place.address) add('warn', S, `${label(node)}: the Place in \`location\` needs an \`address\`.`);
    } else if (is(node, ['JobPosting'])) {
      const remote = node.jobLocationType === 'TELECOMMUTE';
      need(node, 'job posting', ['datePosted', 'description', 'hiringOrganization', 'title', ...(remote ? ['applicantLocationRequirements'] : ['jobLocation'])]);
    } else if (is(node, ['Recipe'])) {
      need(node, 'recipe results', ['name', 'image']);
    } else if (is(node, ['VideoObject'])) {
      need(node, 'video results', ['name', 'thumbnailUrl', 'uploadDate']);
    } else if (is(node, ['SoftwareApplication', 'MobileApplication', 'WebApplication', 'VideoGame'])) {
      need(node, 'software app rich result', ['name', 'offers.price'], [['aggregateRating', 'review']]);
    } else if (is(node, ['Product'])) {
      need(node, 'product snippet', ['name'], [['review', 'aggregateRating', 'offers']]);
      if (has(node, 'offers')) need(node, 'merchant listing', ['name', 'image'], [['offers.price', 'offers.priceSpecification.price', 'offers.lowPrice']]);
    } else if (is(node, ['ProductGroup'])) {
      need(node, 'product variants', ['name']);
    } else if (is(node, ['ProfilePage'])) {
      need(node, 'profile page', ['mainEntity.name']);
    } else if (is(node, ['QAPage'])) {
      const question = get(node, 'mainEntity')[0];
      if (!question) need(node, 'Q&A', ['mainEntity']);
      else need(question, 'Q&A', ['name', 'answerCount'], [['acceptedAnswer', 'suggestedAnswer']]);
    } else if (is(node, ['DiscussionForumPosting', 'SocialMediaPosting'])) {
      need(node, 'discussion forum', ['author.name', 'datePublished'], [['text', 'image', 'video']]);
    } else if (is(node, ['EmployerAggregateRating'])) {
      need(node, 'employer rating', ['itemReviewed', 'ratingCount', 'ratingValue']);
    } else if (is(node, ['Review']) && !nodes.some(parent => parent !== node && [].concat(parent.review ?? []).includes(node))) {
      need(node, 'review snippet', ['author', 'itemReviewed', 'reviewRating.ratingValue']);
      for (const name of get(node, 'author.name')) if (String(name).length >= 100) add('warn', S, 'Review `author.name` must be under 100 characters.');
    } else if (is(node, ['AggregateRating']) && !nodes.some(parent => parent !== node && deref(parent.aggregateRating) === node)) {
      need(node, 'review snippet', ['itemReviewed', 'ratingValue'], [['ratingCount', 'reviewCount']]);
    } else if (is(node, ['Course']) && !node.hasCourseInstance) {
      need(node, 'course list', ['name', 'description']);
    } else if (is(node, ['Movie'])) {
      need(node, 'movie carousel', ['name', 'image']);
    } else if (is(node, LOCAL_BUSINESS)) {
      need(node, 'local business', ['name', 'address']);
    } else if (is(node, ['ImageObject']) && (node.license || node.creditText || node.copyrightNotice || node.acquireLicensePage)) {
      need(node, 'image metadata', [], [['contentUrl', 'url'], ['creator', 'creditText', 'copyrightNotice', 'license']]);
    } else if (is(node, ['MerchantReturnPolicy'])) {
      need(node, 'return policy', ['applicableCountry', 'returnPolicyCategory']);
    } else if (is(node, ['MemberProgram'])) {
      need(node, 'loyalty program', ['name', 'description', 'hasTiers']);
    } else if (is(node, ['ShippingService'])) {
      need(node, 'shipping policy', ['shippingConditions']);
    } else if (is(node, ['ItemList']) && top.includes(node)) {
      need(node, 'carousel', ['itemListElement']);
    } else if (is(node, ['Dataset'])) {
      add('info', S, `${label(node)}: Google uses Dataset markup only for Dataset Search, not Google Search.`);
    } else if (is(node, ['FAQPage'])) {
      add('info', S, 'FAQPage: Google stopped showing FAQ rich results on 7 May 2026. The markup does no harm; Google ignores it.');
    } else if (is(node, ['HowTo'])) {
      add('info', S, 'HowTo: Google no longer shows how-to rich results.');
    } else if (is(node, ['SpecialAnnouncement', 'Occupation', 'OccupationAggregationByEmployer', 'Car', 'Vehicle'])) {
      const feature = is(node, ['SpecialAnnouncement']) ? 'special announcement' : is(node, ['Car', 'Vehicle']) ? 'vehicle listing' : 'estimated salary';
      add('info', S, `\`${t.join('/')}\`: Google no longer shows its ${feature} feature, retired in 2025.`);
    } else if (is(node, ['ClaimReview'])) {
      add('info', S, 'ClaimReview: Google is phasing out fact check rich results.');
    } else if (is(node, ['Book'])) {
      add('info', S, 'Book actions are limited to book providers with a wide selection.');
    } else if (is(node, ['VacationRental'])) {
      add('info', S, 'Vacation rental results are limited to eligible sites.');
    } else if (is(node, ['WebSite'])) {
      if (node.potentialAction && [].concat(node.potentialAction).some((a: Node) => is(a, ['SearchAction']))) add('info', S, 'WebSite `potentialAction` SearchAction fed the sitelinks search box, which Google no longer shows.');
      if (!node.name) add('warn', S, 'The WebSite node has no `name`; Google takes the site name from it.');
      else if (page.isHome) add('ok', S, `Site name for Google: "${node.name}"${node.alternateName ? `, alternates ${[].concat(node.alternateName).map(n => `"${n}"`).join(', ')}` : ''}.`);
      else add('info', S, 'A WebSite node on an inner page; Google reads the site name from the home page only.');
      if (page.isHome && node.url && node.url !== page.siteUrl) add('warn', S, `The WebSite \`url\` ${node.url} is not the home page (${page.siteUrl}).`);
    } else if (is(node, ['Organization']) && node.logo) {
      if (!absolute(typeof node.logo === 'string' ? node.logo : node.logo.url ?? node.logo.contentUrl ?? '')) add('warn', S, `${label(node)}: \`logo\` should be an absolute URL.`);
    }
    if (node.speakable && !get(node, 'speakable.cssSelector').length && !get(node, 'speakable.xPath').length) add('warn', S, `${label(node)}: \`speakable\` needs \`cssSelector\` or \`xPath\`.`);
    if (node.isAccessibleForFree === false || node.isAccessibleForFree === 'False') {
      const parts = [].concat(node.hasPart ?? []).map(deref);
      if (!parts.some((p: Node) => p?.cssSelector)) add('warn', S, `${label(node)}: paywalled content needs \`hasPart\` with \`isAccessibleForFree: false\` and a \`cssSelector\` for the paywalled section.`);
      add('info', S, 'Applebot reads page-level `isAccessibleForFree: false` and then keeps the content out of Apple\'s AI answers; it does not read section-level `hasPart`.');
    }
  }
  const unresolved = new Set<string>();
  const findRefs = (value: any) => {
    if (Array.isArray(value)) { value.forEach(findRefs); return; }
    if (!value || typeof value !== 'object') return;
    if (value['@id'] && Object.keys(value).length === 1 && !byId.has(value['@id'])) unresolved.add(value['@id']);
    for (const [key, child] of Object.entries(value)) if (key !== '@context') findRefs(child);
  };
  blocks.forEach(findRefs);
  for (const id of unresolved) add('info', S, `\`${id}\` is referenced but not defined on this page; readers that do not follow references see only the address.`);
}
