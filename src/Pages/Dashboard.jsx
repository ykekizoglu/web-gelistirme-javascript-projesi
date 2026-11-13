import React, { useEffect, useRef, useState } from 'react';
import ApplicationForm, { statuses } from '../Components/ApplicationForm';

import { loadApplications, persistChange, storageKey } from '../utils/storage';
import { selectApplications } from '../utils/applications';
import useDialog from '../Components/useDialog';

const statusClass = { Başvuruldu: 'applied', Görüşme: 'interview', Teklif: 'offer', Olumsuz: 'rejected' };
const dateFormat = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Dashboard() {
  const [initial] = useState(() => loadApplications());
  const [applications, setApplications] = useState(initial.applications);
  const [storageError, setStorageError] = useState('');
  const [readError, setReadError] = useState(initial.error);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [filter, setFilter] = useState('Tümü');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    function sync(event) {
      if (event.storageArea !== localStorage || (event.key !== storageKey && event.key !== null)) return;
      const result = loadApplications();
      setApplications(result.applications);
      setReadError(result.error);
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  async function persist(change, successMessage) {
    if (busy.current) return false;
    busy.current = true;
    setSaving(true);
    try {
      const write = () => persistChange(change);
      const result = navigator.locks ? await navigator.locks.request(storageKey, write) : write();
      if (!result.ok) {
        setStorageError(result.error);
        const current = loadApplications();
        setReadError(current.error);
        setApplications(current.applications);
        return false;
      }
      setApplications(result.applications);
      setReadError('');
      setStorageError('');
      setMessage(successMessage);
      return true;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  async function save(values) {
    const record = { ...values, id: editing?.id || crypto.randomUUID() };
    if (await persist({ type: editing ? 'update' : 'add', record }, editing ? 'Başvuru güncellendi.' : 'Yeni başvurun eklendi. Bol şans!')) setFormOpen(false);
  }
  function downloadBackup() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === null) { setStorageError('Yedeklenecek kayıt bulunamadı.'); return; }
      const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'basvuru-defterim-yedek.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setStorageError('Ham kayıtlar da okunamadı. Tarayıcının depolama iznini kontrol et.'); }
  }
  const visible = selectApplications(applications, { filter, search, sort });
  function openForm(item = null) { setStorageError(''); setEditing(item); setFormOpen(true); }
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="./"><span className="brand-icon">b.</span><span>başvuru<br/><strong>defterim</strong></span></a>
      <div className="sidebar-label">ÇALIŞMA ALANIM</div>
      <div className="nav-active"><span>▦</span> Başvurularım <span className="nav-count">{applications.length}</span></div>
      <div className="sidebar-note"><span className="note-drawing">✳</span><h3>Her başvuru,<br/>yeni bir ihtimal.</h3><p>Küçük adımlarını kaydet.<br/>Yolunu daha net gör.</p><div className="note-line"/></div>
      <div className="local-info"><span className="connection-dot"/><div>Senin tarayıcın, senin defterin.<small>Kayıtların bu cihazda saklanır.</small></div></div>
    </aside>
    <main>
      <header className="topbar"><span>KARİYER YOLCULUĞUM</span><span className="personal-label">Kişisel çalışma alanı <span className="avatar">B</span></span></header>
      <div className="content">
        {readError && <section className="error notice" aria-label="Kayıt okuma sorunu"><p role="alert">{readError}</p><button className="button secondary" onClick={downloadBackup}>Ham kayıtları indir</button></section>}
        {storageError && !formOpen && !deleting && <p className="error notice" role="alert">{storageError}</p>}
        <section className="page-heading"><div><div className="eyebrow">BİR SONRAKİ İŞİNE BİR ADIM DAHA</div><h1>Başvurularım<span>.</span></h1><p>Gönder, takip et, önüne bak. Hepsi aynı defterde.</p></div><button data-new-application className="button primary" disabled={!!readError} onClick={() => openForm()}><span className="plus">+</span> Yeni başvuru</button></section>
        <section className="stats" aria-label="Başvuru özeti">{[{ name: 'Toplam başvuru', value: applications.length, icon: '↗', caption: 'Yolculuğundaki tüm adımlar' }, { name: 'Yanıt bekleniyor', value: applications.filter(a => a.status === 'Başvuruldu').length, icon: '◷', caption: 'Henüz süreç devam ediyor' }, { name: 'Görüşme aşamasında', value: applications.filter(a => a.status === 'Görüşme').length, icon: '☏', caption: 'Tanışmak için bir fırsat' }, { name: 'Alınan teklif', value: applications.filter(a => a.status === 'Teklif').length, icon: '✳', caption: 'Güzel haberler burada' }].map((stat, i) => <article className={`stat stat-${i}`} key={stat.name}><div className="stat-top"><span>{stat.name}</span><span className="stat-icon">{stat.icon}</span></div><strong>{String(stat.value).padStart(2, '0')}</strong><small>{stat.caption}</small></article>)}</section>
        <section className="applications-panel" aria-labelledby="list-title">
          <div className="panel-title"><h2 id="list-title">Başvuru defteri <span>{applications.length} kayıt</span></h2><span className="panel-caption">Sıradaki fırsatını burada takip et.</span></div>
          <div className="toolbar"><div className="search-field"><span aria-hidden="true">⌕</span><input aria-label="Şirket veya pozisyon ara" placeholder="Şirket veya pozisyon ara…" value={search} onChange={e => setSearch(e.target.value)}/></div><select aria-label="Başvuruları sırala" value={sort} onChange={e => setSort(e.target.value)}><option value="newest">En yeni başvuru</option><option value="oldest">En eski başvuru</option><option value="company">Şirket adına göre</option></select></div>
          <div className="filters" aria-label="Duruma göre filtrele">{['Tümü', ...statuses].map(status => <button key={status} aria-pressed={filter === status} className={filter === status ? 'selected' : ''} onClick={() => setFilter(status)}>{status}<span>{status === 'Tümü' ? applications.length : applications.filter(a => a.status === status).length}</span></button>)}</div>
          {readError ? <div className="empty-state"><h3>Defterin şu an okunamıyor.</h3><p>Kayıtlarını korumak için yeni başvuru eklemeyi durdurduk. Üstteki düğmeyle ham veriyi yedekleyebilirsin.</p></div> : visible.length ? <div className="table-wrap"><table><thead><tr><th>ŞİRKET / POZİSYON</th><th>BAŞVURU TARİHİ</th><th>DURUM</th><th>İŞLEMLER</th></tr></thead><tbody>{visible.map(item => <tr key={item.id}><td><div className="company-cell"><div className="company-avatar">{item.company.slice(0, 2).toLocaleUpperCase('tr')}</div><div><strong>{item.company}</strong><span>{item.position}</span>{item.note && <p className="record-note" title={item.note}>{item.note}</p>}</div></div></td><td className="date-cell">{dateFormat.format(new Date(`${item.date}T12:00:00`))}</td><td><span className={`status ${statusClass[item.status]}`}><span/> {item.status}</span></td><td><div className="row-actions"><button onClick={() => openForm(item)} aria-label={`${item.company} başvurusunu düzenle`}>Düzenle</button><button className="delete-button" onClick={() => { setStorageError(''); setDeleting(item); }} aria-label={`${item.company} başvurusunu sil`}>Sil</button></div></td></tr>)}</tbody></table></div> : <div className="empty-state"><div className="empty-icon">↗</div><h3>{applications.length ? 'Burada bir başvuru bulamadık.' : 'İlk adım için güzel bir gün.'}</h3><p>{applications.length ? 'Aramanı veya seçtiğin durum filtresini değiştirebilirsin.' : 'İlk başvurunu ekle, kariyer yolculuğunu birlikte toparlayalım.'}</p>{!applications.length && <button className="button secondary" onClick={() => openForm()}>+ İlk başvurumu ekle</button>}{!!applications.length && <button className="button secondary" onClick={() => { setSearch(''); setFilter('Tümü'); }}>Filtreleri temizle</button>}</div>}
          <div className="panel-footer"><span>{visible.length} başvuru gösteriliyor</span><span><span className="connection-dot"/> LocalStorage ile saklanır</span></div>
        </section>
        <p className="feedback" role="status">{message}</p>
        <footer className="page-footer"><span>Başvuru Defterim <span className="footer-dot">•</span> Biraz düzen, biraz cesaret.</span><span>Yeni fırsatlara açık ↗</span></footer>
      </div>
    </main>
    {formOpen && <ApplicationForm saving={saving} storageError={storageError} application={editing} onSave={save} onClose={() => setFormOpen(false)}/>}
    {deleting && <DeleteDialog saving={saving} storageError={storageError} item={deleting} onClose={() => setDeleting(null)} onDelete={async () => { if (await persist({ type: 'delete', id: deleting.id }, 'Başvuru silindi.')) setDeleting(null); }}/>}
  </div>;
}

export function DeleteDialog({ item, onClose, onDelete, storageError, saving }) {
  const cancelButton = useRef(null);
  const dialog = useDialog(cancelButton);
  return <dialog ref={dialog} onCancel={onClose} aria-labelledby="delete-title" className="confirm-box"><h2 id="delete-title">Başvuru silinsin mi?</h2><p><strong>{item.company}</strong> için yaptığın başvuru silinecek. Bu işlemi geri alamazsın.</p>{storageError && <p role="alert" className="error">{storageError}</p>}<div className="modal-actions"><button ref={cancelButton} className="button secondary" onClick={onClose}>Vazgeç</button><button className="button danger" disabled={saving} onClick={onDelete}>Başvuruyu sil</button></div></dialog>;
}
