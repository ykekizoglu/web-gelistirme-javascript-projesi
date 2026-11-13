export const storageKey = 'basvuru-defterim-v1';
export const statuses = ['Başvuruldu', 'Görüşme', 'Teklif', 'Olumsuz'];

export function validRecord(item) {
  if (!item || typeof item.id !== 'string' || !item.id.trim() || typeof item.company !== 'string' || typeof item.position !== 'string' || typeof item.note !== 'string' || typeof item.date !== 'string') return false;
  if (!item.company.trim() || !item.position.trim() || item.company.length > 80 || item.position.length > 100 || item.note.length > 1000) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date) || item.date < '2000-01-01' || item.date > '2100-12-31') return false;
  const parsed = new Date(`${item.date}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === item.date && statuses.includes(item.status);
}

export function loadApplications(storage) {
  // sayfa yenilenince başvurular gitmesin diye buradan alıyorum
  try {
    const saved = JSON.parse((storage ?? localStorage).getItem(storageKey) ?? '[]');
    if (!Array.isArray(saved) || !saved.every(validRecord) || new Set(saved.map(item => item.id)).size !== saved.length) throw new Error();
    return { applications: saved, error: '' };
  } catch {
    return { applications: [], error: 'Kayıtlar okunamadı. Tarayıcı depolama ayarlarını kontrol et; mevcut kayıtların üzerine yazılmadı.' };
  }
}

export function applyChange(applications, change) {
  const exists = applications.some(item => item.id === change.record?.id);
  if (change.type === 'add' && validRecord(change.record) && !exists) return [...applications, change.record];
  if (change.type === 'update' && validRecord(change.record) && exists) return applications.map(item => item.id === change.record.id ? change.record : item);
  if (change.type === 'delete' && typeof change.id === 'string' && applications.some(item => item.id === change.id)) return applications.filter(item => item.id !== change.id);
  throw new Error('Kayıt değişmiş veya silinmiş olabilir. Formu kapatıp listeyi kontrol et. Alanların geçerli olduğundan da emin ol.');
}

export function persistChange(change, storage) {
  // diğer sekmede eklenen kayıtları ezmemek için listeyi tekrar okuyorum
  const current = loadApplications(storage);
  if (current.error) return { ok: false, ...current };
  let next;
  try { next = applyChange(current.applications, change); }
  catch (error) { return { ok: false, applications: current.applications, error: error.message }; }
  try {
    (storage ?? localStorage).setItem(storageKey, JSON.stringify(next));
    return { ok: true, applications: next, error: '' };
  } catch {
    return { ok: false, applications: current.applications, error: 'Kaydedilemedi. Tarayıcı depolaması dolu veya erişime kapalı olabilir.' };
  }
}
