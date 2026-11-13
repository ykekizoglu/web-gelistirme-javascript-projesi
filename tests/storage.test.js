import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApplications, validRecord, persistChange, storageKey } from '../src/utils/storage.js';
const record = { id: 'test', company: 'İstanbul Yazılım', position: 'Frontend', note: '', date: '2026-11-13', status: 'Başvuruldu' };
function memory(value = null) {
  return { value, writes: 0, getItem(key) { assert.equal(key, storageKey); return this.value; }, setItem(key, value) { assert.equal(key, storageKey); this.writes++; this.value = value; } };
}
test('ilk açılış ve Türkçe kayıtlar geri okunur', () => {
  assert.deepEqual(loadApplications(memory()), { applications: [], error: '' });
  assert.deepEqual(loadApplications(memory(JSON.stringify([record]))), { applications: [record], error: '' });
});
test('bozuk JSON, yanlış yapı, boş veri ve eksik alan reddedilir', () => {
  for (const value of ['{', '', '{}', 'null', '[null]', JSON.stringify([{ ...record, company: null }])]) assert.ok(loadApplications(memory(value)).error);
});
test('geçersiz tarih ve durum reddedilir, artık yıl kabul edilir', () => {
  for (const date of ['2026-99-99', '2026-02-30', '2026-02-29', '', null, '1999-12-31', '2101-01-01']) assert.equal(validRecord({ ...record, date }), false);
  assert.equal(validRecord({ ...record, date: '2028-02-29' }), true);
  assert.equal(validRecord({ ...record, status: 'Bilinmiyor' }), false);
});
test('boş alan ve uzunluk sınırları yazarken de korunur', () => {
  for (const patch of [{ id: '' }, { company: ' ' }, { position: '\t' }, { company: 'x'.repeat(81) }, { position: 'x'.repeat(101) }, { note: 'x'.repeat(1001) }]) {
    const store = memory();
    assert.equal(persistChange({ type: 'add', record: { ...record, ...patch } }, store).ok, false);
    assert.equal(store.writes, 0);
  }
  assert.equal(validRecord({ ...record, company: 'x'.repeat(80), position: 'x'.repeat(100), note: 'x'.repeat(1000) }), true);
});
test('yinelenen kimlik hem okurken hem eklerken reddedilir', () => {
  assert.ok(loadApplications(memory(JSON.stringify([record, record]))).error);
  const store = memory(JSON.stringify([record]));
  assert.equal(persistChange({ type: 'add', record }, store).ok, false);
  assert.equal(store.writes, 0);
});
test('okuma hatasında gerçek yazma işlemi engellenir, ham veri korunur', () => {
  const store = memory('{bozuk');
  assert.equal(persistChange({ type: 'add', record }, store).ok, false);
  assert.equal(store.writes, 0);
  assert.equal(store.value, '{bozuk');
});
test('erişim engellendiğinde yazma yapılmaz', () => {
  const store = { getItem() { throw new Error('engelli'); }, setItem() { assert.fail('yazmamalı'); } };
  assert.ok(loadApplications(store).error);
  assert.equal(persistChange({ type: 'add', record }, store).ok, false);
});
test('setItem hatası başarı olarak dönmez', () => {
  const store = memory();
  store.setItem = () => { throw new Error('dolu'); };
  const result = persistChange({ type: 'add', record }, store);
  assert.equal(result.ok, false);
  assert.match(result.error, /Kaydedilemedi/);
  assert.deepEqual(result.applications, []);
});
test('her değişiklikten önce güncel veri okunur, diğer sekmenin kaydı korunur', () => {
  const store = memory();
  assert.equal(persistChange({ type: 'add', record }, store).ok, true);
  const other = { ...record, id: 'other', company: 'Diğer sekme' };
  store.value = JSON.stringify([record, other]);
  assert.equal(persistChange({ type: 'update', record: { ...record, status: 'Görüşme' } }, store).ok, true);
  assert.deepEqual(loadApplications(store).applications, [{ ...record, status: 'Görüşme' }, other]);
  assert.equal(persistChange({ type: 'delete', id: record.id }, store).ok, true);
  assert.deepEqual(loadApplications(store).applications, [other]);
  assert.equal(persistChange({ type: 'add', record }, store).ok, true);
  assert.equal(loadApplications(store).applications.length, 2);
});
test('başka sekmede silinmiş kayıt geri oluşturulmaz', () => {
  const store = memory();
  assert.equal(persistChange({ type: 'update', record }, store).ok, false);
  assert.equal(store.writes, 0);
});
test('LocalStorage bulunmaması ortamdan bağımsız test edilir', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('kullanılamıyor'); } });
    assert.ok(loadApplications().error);
    assert.equal(persistChange({ type: 'add', record }).ok, false);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});
