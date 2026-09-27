#!/usr/bin/env node
// Valida manifest.json, els fitxers _locales/*/messages.json, i que tots els
// fitxers que el manifest referencia existeixin. Pensat per córrer tant en
// local (`node scripts/validate-extension.js`) com des d'una GitHub Action.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const LOCALES_DIR = path.join(ROOT, "_locales");

let errors = 0;

function fail(message) {
  console.error(`✗ ${message}`);
  errors++;
}

function ok(message) {
  console.log(`✓ ${message}`);
}

function readJson(filePath, label) {
  const raw = fs.readFileSync(filePath, "utf8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    fail(`${label} no és JSON vàlid: ${err.message}`);
    return null;
  }
}

// 1. manifest.json és JSON vàlid
const manifestPath = path.join(ROOT, "manifest.json");
const manifest = readJson(manifestPath, "manifest.json");
if (manifest) {
  ok("manifest.json és JSON vàlid");

  // 2. Camps obligatoris presents
  for (const field of ["manifest_version", "name", "version", "default_locale"]) {
    if (!manifest[field]) fail(`manifest.json: falta el camp obligatori "${field}"`);
  }
  if (!errors) ok("manifest.json té els camps obligatoris");

  // 3. Tots els fitxers que el manifest referencia existeixen
  const referenced = [];
  const icons = manifest.icons || {};
  const actionIcons = (manifest.action && manifest.action.default_icon) || {};
  for (const iconMap of [icons, actionIcons]) {
    for (const iconPath of Object.values(iconMap)) referenced.push(iconPath);
  }
  if (manifest.action && manifest.action.default_popup) {
    referenced.push(manifest.action.default_popup);
  }
  if (manifest.background && manifest.background.service_worker) {
    referenced.push(manifest.background.service_worker);
  }
  for (const contentScript of manifest.content_scripts || []) {
    for (const file of [...(contentScript.js || []), ...(contentScript.css || [])]) {
      referenced.push(file);
    }
  }

  let missingFiles = 0;
  for (const relPath of referenced) {
    const abs = path.join(ROOT, relPath);
    if (!fs.existsSync(abs)) {
      fail(`manifest.json referencia "${relPath}" però el fitxer no existeix`);
      missingFiles++;
    }
  }
  if (referenced.length && !missingFiles) {
    ok(`tots els fitxers referenciats pel manifest existeixen (${referenced.length})`);
  }

  // 4. default_locale té una carpeta a _locales
  if (manifest.default_locale) {
    const defaultLocaleDir = path.join(LOCALES_DIR, manifest.default_locale);
    if (!fs.existsSync(defaultLocaleDir)) {
      fail(`default_locale "${manifest.default_locale}" no té carpeta a _locales/`);
    }
  }
}

// 5. Tots els _locales/*/messages.json són JSON vàlids i tenen les mateixes claus
if (fs.existsSync(LOCALES_DIR)) {
  const locales = fs.readdirSync(LOCALES_DIR).filter((entry) =>
    fs.statSync(path.join(LOCALES_DIR, entry)).isDirectory(),
  );

  if (locales.length === 0) {
    fail("_locales/ existeix però no conté cap carpeta d'idioma");
  }

  const keysByLocale = {};
  for (const locale of locales) {
    const messagesPath = path.join(LOCALES_DIR, locale, "messages.json");
    if (!fs.existsSync(messagesPath)) {
      fail(`_locales/${locale}/messages.json no existeix`);
      continue;
    }
    const messages = readJson(messagesPath, `_locales/${locale}/messages.json`);
    if (messages) keysByLocale[locale] = Object.keys(messages).sort();
  }

  const validLocales = Object.keys(keysByLocale);
  if (validLocales.length) {
    ok(`${validLocales.length} fitxer(s) de _locales són JSON vàlids (${validLocales.join(", ")})`);
  }

  // Comparem les claus de cada idioma contra la unió de totes les claus
  const allKeys = new Set();
  for (const keys of Object.values(keysByLocale)) keys.forEach((k) => allKeys.add(k));

  let keyMismatch = false;
  for (const locale of validLocales) {
    const keys = new Set(keysByLocale[locale]);
    const missing = [...allKeys].filter((k) => !keys.has(k));
    if (missing.length) {
      fail(`_locales/${locale}/messages.json li falten claus: ${missing.join(", ")}`);
      keyMismatch = true;
    }
  }
  if (validLocales.length && !keyMismatch) {
    ok(`totes les claus de traducció coincideixen entre idiomes (${allKeys.size} claus)`);
  }
} else {
  fail("no s'ha trobat la carpeta _locales/");
}

console.log("");
if (errors > 0) {
  console.error(`${errors} error(s) trobats.`);
  process.exit(1);
} else {
  console.log("Tot correcte.");
  process.exit(0);
}
