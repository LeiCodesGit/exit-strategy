let currentCourseId = null;

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


function showError(msg) {
  const t = document.createElement('div');
  t.className   = 'flash flash-error';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.5s'; }, 4000);
  setTimeout(() => t.remove(), 4500);
}

async function saveStatus() {
  if (!currentCourseId) return;
  const selected = document.querySelector('input[name="modal-status"]:checked');
  if (!selected) { alert('Please select a status.'); return; }
  const status = selected.value;
  const notes  = document.getElementById('modal-notes').value;

  try {
    const res  = await fetch(`/courses/${currentCourseId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes })
    });

    if (!res.ok) throw new Error('Server error');

    const data = await res.json();

    if (data.prereqError) {
      closeModal();
      showError(`⚠ Cannot set to Taking — the following prerequisites are not yet completed: ${data.missing}`);
      return;
    }

    if (data.success) {
      updateBadgeInRow(currentCourseId, status);
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
  document.getElementById('edit-status').value      = status || 'Future';
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

function updateBadgeInRow(id, status) {
  const row = document.getElementById(`row-${id}`);
  if (!row) return;
  const badge = row.querySelector('.status-badge');
  if (badge) {
    badge.textContent = status;
    badge.className   = `status-badge status-${status.toLowerCase().replace(' ', '-')}`;
  }
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className   = 'flash flash-success';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.5s'; }, 2500);
  setTimeout(() => t.remove(), 3000);
}

// Progress bar
const fill = document.getElementById('prog-fill');
if (fill) fill.style.width = (fill.dataset.width || 0) + '%';

// Close modals on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeEdit(); }
});

// Auto-dismiss flash messages
setTimeout(() => {
  document.querySelectorAll('.flash').forEach(el => {
    el.style.opacity    = '0';
    el.style.transition = 'opacity 0.5s';
    setTimeout(() => el.remove(), 500);
  });
}, 4000);
