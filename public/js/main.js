let currentCourseId = null;

function openModal(id, code, currentStatus, notes = '') {
  currentCourseId = id;
  document.getElementById('modal-code').textContent = code;
  document.getElementById('modal-notes').value = notes;

  // Select the current status radio
  const radios = document.querySelectorAll('input[name="modal-status"]');
  radios.forEach(r => {
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
  if (!selected) {
    alert('Please select a status.');
    return;
  }

  const status = selected.value;
  const notes  = document.getElementById('modal-notes').value;

  try {
    const res = await fetch(`/courses/${currentCourseId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes })
    });

    const data = await res.json();
    if (data.success) {
      // Update badge in the table row without full reload
      const row = document.getElementById(`row-${currentCourseId}`);
      if (row) {
        const badge = row.querySelector('.status-badge');
        if (badge) {
          badge.textContent = status;
          badge.className = `status-badge status-${status.toLowerCase().replace(' ', '-')}`;
        }
      }
      // Also update active cards if present
      closeModal();
      showToast(`Status updated to "${status}"`);
    }
  } catch (err) {
    alert('Failed to update. Please try again.');
  }
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'flash flash-success';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// Close modal on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// Auto-dismiss flash messages
setTimeout(() => {
  document.querySelectorAll('.flash').forEach(el => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.5s';
    setTimeout(() => el.remove(), 500);
  });
}, 4000);
