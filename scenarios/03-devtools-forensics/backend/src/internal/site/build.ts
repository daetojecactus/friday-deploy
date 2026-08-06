import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as esbuild from 'esbuild';

// СПОЙЛЕР. Сборка лендинга при старте бэкенда.
//
// Два бандла, и разница между ними — это утечка 11: app.js минифицирован БЕЗ
// карты исходников, legacy.js выложен вместе с ней. Разделение принципиально:
// будь карта у основного бандла, она развернула бы admin.ts, и утечка 6
// перестала бы существовать как отдельное упражнение.
//
// {{CORP_ORIGIN}} подставляется не здесь, а при отдаче: адрес зависит от Host.

const SITE_DIR = process.env.SITE_DIR ?? '/app/site';

export type SiteBundle = {
  html: string;
  promoHtml: string;
  css: string;
  js: string;
  legacyJs: string;
  legacyMap: string;
  builtAt: string;
};

let bundle: SiteBundle | null = null;

export function getBundle(): SiteBundle {
  if (!bundle) throw new Error('лендинг ещё не собран');
  return bundle;
}

async function bundleOne(entry: string, name: string, withMap: boolean) {
  const result = await esbuild.build({
    entryPoints: [join(SITE_DIR, entry)],
    bundle: true,
    minify: true,
    format: 'iife',
    target: 'es2019',
    sourcemap: withMap ? 'linked' : false,
    sourcesContent: withMap,
    write: false,
    outdir: '/virtual',
    // Имя фиксировано: в Sources команда должна видеть обычный app.js, а не
    // хеш, который меняется на каждой сборке.
    entryNames: name,
  });

  return {
    js: result.outputFiles.find((file) => file.path.endsWith('.js'))?.text ?? '',
    map: result.outputFiles.find((file) => file.path.endsWith('.map'))?.text ?? '',
  };
}

export async function buildSite(): Promise<SiteBundle> {
  const [app, legacy, html, promoHtml, css] = await Promise.all([
    bundleOne('src/main.ts', 'app', false),
    bundleOne('src/legacy/counters.ts', 'legacy', true),
    readFile(join(SITE_DIR, 'index.html'), 'utf8'),
    readFile(join(SITE_DIR, 'promo.html'), 'utf8'),
    readFile(join(SITE_DIR, 'styles.css'), 'utf8'),
  ]);

  bundle = {
    html,
    promoHtml,
    css,
    js: app.js,
    legacyJs: legacy.js,
    legacyMap: legacy.map,
    builtAt: new Date().toISOString(),
  };

  console.log(
    `[site] лендинг собран: app.js ${Math.round(app.js.length / 1024)} КБ, ` +
      `legacy.js ${Math.round(legacy.js.length / 1024)} КБ + карта исходников`,
  );

  return bundle;
}
