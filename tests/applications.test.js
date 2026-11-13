import test from 'node:test';
import assert from 'node:assert/strict';
import { selectApplications } from '../src/utils/applications.js';
const records = [
  { id: '1', company: 'IBM Türk', position: 'Frontend Intern', date: '2026-11-13', status: 'Başvuruldu' },
  { id: '2', company: 'İstanbul Yazılım', position: 'IT destek', date: '2026-11-01', status: 'Görüşme' },
  { id: '3', company: 'Zeta', position: 'Developer', date: '2026-11-05', status: 'Teklif' },
];
test('ASCII I, Türkçe İ ve ı aramaları eşleşir', () => {
  for (const query of ['ibm', 'intern', '  ibm  ']) assert.equal(selectApplications(records, { search: query })[0].id, '1');
  for (const query of ['ISTANBUL', 'istanbul', 'ıstanbul', 'it destek']) assert.equal(selectApplications(records, { search: query })[0].id, '2');
});
test('kenar boşlukları yok sayılır, yalnız boşluk tüm listeyi verir', () => {
  assert.equal(selectApplications(records, { search: ' zeta  ' })[0].id, '3');
  assert.equal(selectApplications(records, { search: '  ' }).length, 3);
});
test('durum filtresi ve arama birlikte çalışır', () => {
  assert.deepEqual(selectApplications(records, { filter: 'Teklif', search: 'zeta' }).map(item => item.id), ['3']);
  assert.equal(selectApplications(records, { filter: 'Görüşme', search: 'zeta' }).length, 0);
});
test('tarihe göre iki yönde sıralar, orijinal listeyi değiştirmez', () => {
  assert.deepEqual(selectApplications(records).map(item => item.id), ['1','3','2']);
  assert.deepEqual(selectApplications(records, { sort: 'oldest' }).map(item => item.id), ['2','3','1']);
  assert.deepEqual(records.map(item => item.id), ['1','2','3']);
});
test('Türkçe alfabetik sıralama uygulanır', () => {
  const names = ['Şirket', 'Örnek', 'Çınar', 'İzmir', 'Işık', 'Sarı', 'Ceviz', 'Oda'];
  assert.deepEqual(selectApplications(names.map(company => ({ company, position: '', date:'2026-01-01' })), { sort:'company' }).map(item => item.company), ['Ceviz','Çınar','Işık','İzmir','Oda','Örnek','Sarı','Şirket']);
});
