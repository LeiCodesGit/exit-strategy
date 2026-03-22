let currentCourseId = null;
let pendingWaiver = null; // { id, status, notes }

function showError(msg) {
  const t = document.createElement('div');
  t.className   = 'flash flash-error';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.5s'; }, 4000);
  setTimeout(() => t.remove(), 4500);
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className   = 'flash flash-success';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.5s'; }, 2500);
  setTimeout(() => t.remove(), 3000);
}

function openModal(id, code, currentStatus, notes = '') {
  currentCourseId = id;
  document.getElementById('modal-code').textContent = code;
  document.getElementById('modal-notes').value = notes;
  document.querySelectorAll('input[name="modal-status"]').forEach(r => {
    r.checked = r.value === currentStatus;
  });
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  currentCourseId = null;
}

async function saveStatus() {
  if (!currentCourseId) return;
  const selected = document.querySelector('input[name="modal-status"]:checked');
  if (!selected) { alert('Please select a status.'); return; }
  const status = selected.value;
  const notes  = document.getElementById('modal-notes').value;
  const savedId = currentCourseId;

  try {
    const res = await fetch(`/courses/${savedId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes })
    });

    if (!res.ok) throw new Error('Server error');
    const data = await res.json();

    if (data.prereqError) {
      closeModal();
      openWaiver(savedId, status, notes, data.missing);
      return;
    }

    if (data.success) {
      updateBadgeInRow(savedId, status);
      closeModal();
      showToast(`Status updated to "${status}"`);
    }
  } catch (err) {
    console.error(err);
    showError('Failed to update. Please try again.');
  }
}

function openEdit(id, code, name, units, year, term, status, prereq, notes) {
  currentCourseId = id;
  document.getElementById('edit-code').textContent  = code;
  document.getElementById('edit-name').value        = name || '';
  document.getElementById('edit-units').value       = units || 0;
  document.getElementById('edit-year').value        = year || '1st Year';
  document.getElementById('edit-term').value        = term || '1st';
  document.getElementById('edit-status').value      = status || 'To Take';
  document.getElementById('edit-prereq').value      = prereq || '';
  document.getElementById('edit-notes').value       = notes || '';
  document.getElementById('edit-overlay').classList.add('open');
}

function closeEdit() {
  document.getElementById('edit-overlay').classList.remove('open');
  currentCourseId = null;
}

async function saveEdit() {
  if (!currentCourseId) return;
  const body = {
    name:          document.getElementById('edit-name').value,
    units:         document.getElementById('edit-units').value,
    yearLevel:     document.getElementById('edit-year').value,
    term:          document.getElementById('edit-term').value,
    status:        document.getElementById('edit-status').value,
    prerequisites: document.getElementById('edit-prereq').value,
    notes:         document.getElementById('edit-notes').value,
  };
  try {
    const res  = await fetch(`/courses/${currentCourseId}/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      closeEdit();
      showToast('Course updated!');
      setTimeout(() => location.reload(), 800);
    }
  } catch (err) { alert('Failed to save. Please try again.'); }
}

async function deleteCourse() {
  if (!currentCourseId) return;
  if (!confirm('Delete this course? This cannot be undone.')) return;
  try {
    const res  = await fetch(`/courses/${currentCourseId}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (data.success) {
      const row = document.getElementById(`row-${currentCourseId}`);
      if (row) row.remove();
      closeEdit();
      showToast('Course deleted.');
    }
  } catch (err) { alert('Failed to delete. Please try again.'); }
}

function openWaiver(id, status, notes, missing) {
  pendingWaiver = { id, status, notes };
  const el = document.getElementById('waiver-missing');
  if (el) el.textContent = `Missing prerequisites: ${missing}`;
  document.getElementById('waiver-overlay').classList.add('open');
}

function closeWaiver() {
  document.getElementById('waiver-overlay').classList.remove('open');
  pendingWaiver = null;
}

async function confirmWaiver() {
  if (!pendingWaiver) return;
  const { id, status, notes } = pendingWaiver;
  closeWaiver();
  try {
    const res = await fetch(`/courses/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes, waiver: true, waiverReason: 'Student confirmed waiver' })
    });
    const data = await res.json();
    if (data.success) {
      updateBadgeInRow(id, status);
      showToast(`Waiver applied — status set to "${status}"`);
    }
  } catch (err) {
    showError('Waiver failed. Please try again.');
  }
}

const ACTIVE_STATUSES = new Set(['Taking', 'Pending', 'Retake', 'Remedial']);

function updateBadgeInRow(id, status) {
  const row = document.getElementById(`row-${id}`);
  if (!row) return;

  const isDashboard = !!document.querySelector('.stats-grid');

  if (isDashboard && !ACTIVE_STATUSES.has(status)) {
    // Row is no longer active — remove it and reload to update stats
    row.style.transition = 'opacity 0.3s';
    row.style.opacity = '0';
    setTimeout(() => location.reload(), 350);
    return;
  }

  const badge = row.querySelector('.status-badge');
  if (badge) {
    badge.textContent = status;
    badge.className   = `status-badge status-${status.toLowerCase().replace(' ', '-')}`;
  }

  if (isDashboard && ACTIVE_STATUSES.has(status)) {
    // Stats may have changed — reload after toast
    setTimeout(() => location.reload(), 1200);
  }
}

const fill = document.getElementById('prog-fill');
if (fill) fill.style.width = (fill.dataset.width || 0) + '%';

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeEdit(); closeWaiver(); }
});

setTimeout(() => {
  document.querySelectorAll('.flash').forEach(el => {
    el.style.opacity    = '0';
    el.style.transition = 'opacity 0.5s';
    setTimeout(() => el.remove(), 500);
  });
}, 4000);
