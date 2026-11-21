// Runs the whole preview build for a site in order: the gallery, the share cards, the site icons, the site files, the
// metadata audit, then the headless check that also writes the proposed heads. Each step can also be run on its own
// with its script.
import path from 'node:path';
import { buildGallery } from './build-gallery.ts';
import { buildSiteFiles } from './build-site-files.ts';
import { checkGallery } from './check-gallery.ts';
import { checkMetadata } from './check-metadata.ts';
import { renderIcons } from './render-icons.ts';
import { renderShareCards } from './render-share-cards.ts';
import { type Config, isMain, readConfig, required, runCli } from './shared.ts';

const HELP = `Build the gallery, share cards, icons and site files, audit the metadata, then check the gallery and write the proposed heads.
  node scripts/share-previews/run-previews.ts --config <preview.config.json> --out <folder> [--screenshots] [--channel chrome]
Then open <folder>/index.html in a browser, and apply the proposals with apply-proposals.ts once they are approved.`;

export async function runPreviews(config: Config, out: string, options: { channel?: string; screenshots?: boolean } = {}) {
  const steps: Record<string, boolean> = {};
  console.log('== gallery');
  await buildGallery(config, out);
  steps.gallery = true;
  console.log('== share cards');
  steps.cards = (await renderShareCards(config, out, options.channel)).ok;
  console.log('== icons');
  steps.icons = (await renderIcons(config, out, options.channel)).ok;
  console.log('== site files');
  steps.files = (await buildSiteFiles(config, out)).ok;
  console.log('== metadata audit');
  steps.audit = (await checkMetadata(config, out)).ok;
  console.log('== check');
  steps.check = (await checkGallery(config, out, options)).ok;
  const failed = Object.entries(steps).filter(([, ok]) => !ok).map(([name]) => name);
  console.log(failed.length ? `FAILED steps: ${failed.join(', ')}` : `All steps passed. Open ${path.join(out, 'index.html')}`);
  return { ok: !failed.length, steps };
}

if (isMain(import.meta.url)) {
  await runCli(HELP, async options => (await runPreviews(readConfig(required(options, 'config', HELP)), path.resolve(required(options, 'out', HELP)),
    { channel: typeof options.channel === 'string' ? options.channel : undefined, screenshots: options.screenshots === true })).ok);
}
