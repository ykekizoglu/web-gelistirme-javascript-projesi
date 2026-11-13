import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('hata ekranları gerçek bileşenlerden üretilir', async t => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    const { default: Dashboard, DeleteDialog } = await server.ssrLoadModule('/src/Pages/Dashboard.jsx');
    const { default: ApplicationForm } = await server.ssrLoadModule('/src/Components/ApplicationForm.jsx');
    await t.test('bozuk veride üst uyarı, yedek düğmesi ve ekleme engeli', () => {
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => '{bozuk' } });
      const html = renderToStaticMarkup(React.createElement(Dashboard));
      assert.ok(html.indexOf('Kayıtlar okunamadı') < html.indexOf('page-heading'));
      assert.match(html, /Ham kayıtları indir/);
      assert.match(html, /Defterin şu an okunamıyor/);
      assert.match(html, /data-new-application="true"[^>]*disabled=""/);
      assert.doesNotMatch(html, /İlk adım için güzel bir gün|İlk başvurumu ekle/);
    });
    await t.test('silme hatası dialog içinde alert olarak bulunur', () => {
      const html = renderToStaticMarkup(React.createElement(DeleteDialog, { item: { company:'Test' }, storageError:'Kaydedilemedi. TEST' }));
      assert.match(html, /<dialog[\s\S]*role="alert"[^>]*>Kaydedilemedi\. TEST[\s\S]*<\/dialog>/);
    });
    await t.test('form kaydetme hatası dialog içinde bulunur', () => {
      const html = renderToStaticMarkup(React.createElement(ApplicationForm, { storageError:'Kaydedilemedi. TEST' }));
      assert.match(html, /<dialog[\s\S]*role="alert"[^>]*>Kaydedilemedi\. TEST[\s\S]*<\/dialog>/);
    });
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
    await server.close();
  }
});
