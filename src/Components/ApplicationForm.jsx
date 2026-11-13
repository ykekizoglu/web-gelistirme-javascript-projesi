import React, { useRef, useState } from 'react';
import useDialog from './useDialog';
import { statuses, validRecord } from '../utils/storage';

export { statuses };
const emptyForm = { company: '', position: '', date: '', status: 'Başvuruldu', note: '' };
export function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function ApplicationForm({ application, onSave, onClose, storageError, saving }) {
  const companyInput = useRef(null);
  const dialog = useDialog(companyInput);
  const startedOutside = useRef(false);
  const [form, setForm] = useState(application || { ...emptyForm, date: today() });
  const [error, setError] = useState('');
  function update(event) { setForm({ ...form, [event.target.name]: event.target.value }); }
  function submit(event) {
    event.preventDefault();
    if (!form.company.trim() || !form.position.trim()) {
      setError('Şirket ve pozisyon alanlarını doldurman gerekiyor.');
      return;
    }
    const values = { ...form, company: form.company.trim(), position: form.position.trim(), note: form.note.trim() };
    if (!validRecord({ ...values, id: application?.id || 'new' })) {
      setError('Alanları kontrol et: şirket en fazla 80, pozisyon 100, not 1000 karakter olmalı. Geçerli bir tarih ve durum seçmelisin.');
      return;
    }
    onSave(values);
  }
  function outside(event) {
    const rect = dialog.current.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  }
  return <dialog ref={dialog} onCancel={onClose}
    onMouseDown={event => { startedOutside.current = event.target === dialog.current && outside(event); }}
    onClick={event => {
      if (startedOutside.current && event.target === dialog.current && outside(event)) onClose();
      startedOutside.current = false;
    }} aria-labelledby="form-title">
    <form onSubmit={submit}>
      <div className="modal-heading"><div><span className="eyebrow">BİR SONRAKİ ADIM</span><h2 id="form-title">{application ? 'Başvuruyu düzenle' : 'Yeni bir başlangıç.'}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Kapat">×</button></div>
      <label>Şirket adı<input ref={companyInput} name="company" value={form.company} onChange={update} placeholder="Örn. Trendyol" required maxLength={80}/></label>
      <label>Pozisyon<input name="position" value={form.position} onChange={update} placeholder="Örn. Frontend Developer" required maxLength={100}/></label>
      <div className="form-row"><label>Başvuru tarihi<input type="date" name="date" value={form.date} onChange={update} required min="2000-01-01" max="2100-12-31"/></label><label>Durum<select name="status" value={form.status} onChange={update}>{statuses.map(status => <option key={status}>{status}</option>)}</select></label></div>
      <label>Not <span className="muted">(isteğe bağlı)</span><textarea name="note" value={form.note} onChange={update} placeholder="İlan bağlantısı, görüşme detayları, aklında kalanlar…" rows={3} maxLength={1000}/></label>
      {storageError && <p role="alert" className="error">{storageError}</p>}
      {error && <p role="alert" className="error">{error}</p>}
      <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Vazgeç</button><button className="button primary" type="submit" disabled={saving}>{application ? 'Değişiklikleri kaydet' : 'Başvuruyu kaydet'} <span>↗</span></button></div>
    </form>
  </dialog>;
}
