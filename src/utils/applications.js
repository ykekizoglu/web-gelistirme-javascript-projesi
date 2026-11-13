export function normalizeSearch(value) {
  return value.trim().toLocaleLowerCase('tr').replaceAll('ı', 'i');
}

export function selectApplications(applications, { filter = 'Tümü', search = '', sort = 'newest' } = {}) {
  const query = normalizeSearch(search);
  return applications.filter(item => (filter === 'Tümü' || item.status === filter) && normalizeSearch(`${item.company} ${item.position}`).includes(query)).sort((a, b) => sort === 'company' ? a.company.localeCompare(b.company, 'tr') : sort === 'oldest' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));
}
