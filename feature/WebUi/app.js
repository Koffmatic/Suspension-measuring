// Minimal app mock for local testing
document.addEventListener('DOMContentLoaded', () => {
	const statusEl = document.querySelector('[data-i18n="app.status"]');
	const sessionEl = document.querySelector('[data-i18n="home.session_info"]');
	const sessionHeaderEl = document.querySelector('[data-i18n="home.session"]');

	// add a small live badge in the header
	const header = statusEl?.closest('header');
	let liveBadge = null;
	if (header) {
		liveBadge = document.createElement('div');
		liveBadge.style.fontSize = '0.85rem';
		liveBadge.style.color = '#9CA3AF';
		liveBadge.style.marginLeft = '12px';
		liveBadge.textContent = '';
		header.appendChild(liveBadge);
	}

	async function fetchStatus() {
		try {
			const res = await fetch('/api/status');
			if (!res.ok) throw new Error('status fetch failed');
			const statusResult = await res.json();

			if (statusEl) statusEl.textContent = statusResult.message || statusResult.status || 'Idle';

			if (statusResult.session) {
				// show active session header
				if (sessionHeaderEl) sessionHeaderEl.textContent = (window.I18N && I18N.t) ? I18N.t('session.active') : 'Active session';

				if (sessionEl) {
					// if server reports running env, show test env or firmware
					if (statusResult.env === 'python') {
						sessionEl.textContent = (window.I18N && I18N.t) ? I18N.t('session.testenv') : 'Test environment';
					} else if (statusResult.firmware) {
						sessionEl.textContent = statusResult.firmware;
					} else {
						sessionEl.textContent = `Session: ${statusResult.session}`;
					}
				}
			} else {
				if (sessionHeaderEl) sessionHeaderEl.textContent = (window.I18N && I18N.t) ? I18N.t('home.session') : 'Session';
				if (sessionEl) sessionEl.textContent = (window.I18N && I18N.t) ? I18N.t('home.session.empty') : 'No active session';
			}
		} catch (err) {
			if (statusEl) statusEl.textContent = 'Offline';
			console.error('fetchStatus error', err);
		}
	}

	async function fetchLive() {
		try {
			const res = await fetch('/api/live');
			if (!res.ok) throw new Error('live fetch failed');
			const liveResult = await res.json();
			const sample = Array.isArray(liveResult.live) && liveResult.live.length ? liveResult.live[0] : null;
			if (liveBadge) {
				if (sample && typeof sample.t !== 'undefined') {
					liveBadge.textContent = `Live t=${sample.t}`;
				} else {
					liveBadge.textContent = '';
				}
			}

			// update SAG display from rear pivot value (rr) as percent
			const sagEl = document.getElementById('sag-display');
			if (sagEl) {
				if (sample && typeof sample.rr !== 'undefined') {
					// show one decimal percent
					sagEl.textContent = `${Number(sample.rr).toFixed(1)}%`;
				} else {
					sagEl.textContent = '--%';
				}
			}

		// update marker sag values
		if (sample) {
			['fl','fr','rl','rr'].forEach(id => {
				const value = sample[id];
				if (value !== undefined) {
					const mm = (value / 100 * 160).toFixed(0); // assume 160mm at 100%
					const marker = document.querySelector(`[data-id="${id}"] .sag`);
					if (marker) marker.textContent = `${mm}mm, ${value.toFixed(1)}%`;
				}
			});
		}
	} catch (err) {
		console.error('fetchLive error', err);
	}
	}

	// initial
	fetchStatus();
	fetchLive();

	// periodic
	setInterval(fetchStatus, 5000);
	setInterval(fetchLive, 1000);
});

async function fetchEvents() {
	try {
		const res = await fetch('/api/events');
		if (!res.ok) throw new Error('failed');
		const eventsResult = await res.json();
		const evs = eventsResult.events || [];
		renderEvents(evs);
		if (evs && evs.length) renderCurrentSettings(evs[0]);
		else renderCurrentSettings(null);
	} catch (err) {
		console.error('fetchEvents error', err);
	}
}

function formatTs(ts) {
	try { return new Date(ts * 1000).toLocaleString(); } catch (e) { return String(ts); }
}

function fmtNum(v) {
	const n = Number(v);
	if (Number.isNaN(n)) return String(v);
	if (Number.isInteger(n)) return String(n);
	return n.toFixed(1);
}

// Application config fetched from server (units, etc.)
let APP_CONFIG = null;
// modal mode: 'event' or 'init'
let EVENT_MODAL_MODE = 'event';

function updateModalForMode(mode) {
	const modal = document.getElementById('event-modal');
	const title = modal?.querySelector('h3');
	const saveBtn = document.getElementById('event-save');
	if (mode === 'init') {
		if (title) title.textContent = (window.I18N && I18N.t) ? I18N.t('events.set_initial') : 'Set initial settings';
		if (saveBtn) saveBtn.textContent = 'Set';
	} else {
		if (title) title.textContent = (window.I18N && I18N.t) ? I18N.t('event.modal.title') : 'Add event';
		if (saveBtn) saveBtn.textContent = 'Save';
	}
}

async function fetchConfig() {
	try {
		const res = await fetch('/api/config');
		if (!res.ok) throw new Error('config fetch failed');
		const configResult = await res.json();
		APP_CONFIG = configResult.config || null;
		populateSettingsForm();
		loadMarkers();
		// re-render events/current settings now that config is available
		try { await fetchEvents(); } catch (e) {}
	} catch (err) {
		console.warn('fetchConfig failed', err);
	}
}

function loadMarkers() {
	const markers = APP_CONFIG && APP_CONFIG.markers ? APP_CONFIG.markers : {};
	['fl','fr','rl','rr'].forEach(id => {
		const pos = markers[id];
		if (pos) {
			const marker = document.querySelector(`[data-id="${id}"]`);
			if (marker) {
				marker.style.left = pos.left;
				marker.style.top = pos.top;
			}
		}
	});
}

// Re-render when translations finish loading (so dynamic strings localize)
document.addEventListener('i18n:loaded', () => {
	try { fetchEvents(); } catch (e) {}
});

async function saveConfig(cfg) {
	try {
		const res = await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config: cfg }) });
		if (!res.ok) throw new Error('save config failed');
		const body = await res.json();
		APP_CONFIG = body.config || APP_CONFIG;
		populateSettingsForm();
		try { await fetchEvents(); } catch (e) {}
		return true;
	} catch (err) {
		console.error('saveConfig error', err);
		return false;
	}
}

function populateSettingsForm() {
	const form = document.getElementById('settings-form');
	if (!form || !APP_CONFIG) return;
	form.elements['front_preload_unit'].value = (APP_CONFIG.front && APP_CONFIG.front.preload_unit) || 'mm';
	form.elements['front_damping_unit'].value = (APP_CONFIG.front && APP_CONFIG.front.damping_unit) || 'clicks';
	form.elements['rl_preload_unit'].value = (APP_CONFIG.rl && APP_CONFIG.rl.preload_unit) || 'mm';
	form.elements['rl_damping_unit'].value = (APP_CONFIG.rl && APP_CONFIG.rl.damping_unit) || 'clicks';
	form.elements['rr_preload_unit'].value = (APP_CONFIG.rr && APP_CONFIG.rr.preload_unit) || 'mm';
	form.elements['rr_damping_unit'].value = (APP_CONFIG.rr && APP_CONFIG.rr.damping_unit) || 'clicks';
}

// Attach settings form handlers
document.addEventListener('DOMContentLoaded', () => {
	const settingsForm = document.getElementById('settings-form');
	const resetBtn = document.getElementById('settings-reset');
	if (settingsForm) {
		settingsForm.addEventListener('submit', async (ev) => {
			ev.preventDefault();
			const form = new FormData(settingsForm);
			const cfg = {
				front: { preload_unit: form.get('front_preload_unit'), damping_unit: form.get('front_damping_unit') },
				rl: { preload_unit: form.get('rl_preload_unit'), damping_unit: form.get('rl_damping_unit') },
				rr: { preload_unit: form.get('rr_preload_unit'), damping_unit: form.get('rr_damping_unit') }
			};
			const ok = await saveConfig(cfg);
			if (ok) alert((window.I18N && I18N.t) ? I18N.t('settings.saved') : 'Settings saved');
		});
	}
	if (resetBtn) resetBtn.addEventListener('click', () => {
		if (!confirm('Reset settings to defaults?')) return;
		const defaults = { front: { preload_unit: 'mm', damping_unit: 'clicks' }, rl: { preload_unit: 'mm', damping_unit: 'clicks' }, rr: { preload_unit: 'mm', damping_unit: 'clicks' } };
		saveConfig(defaults);
	});
});

const FIELD_ABBR = {
	preload: 'PRE',
	comp_fast: 'HSC',
	comp_slow: 'LSC',
	rebound: 'Rebound'
};

function renderEvents(events) {
	const listEl = document.getElementById('event-list');
	if (!listEl) return;
	listEl.innerHTML = '';
	if (!events || events.length === 0) {
		listEl.innerHTML = '<p class="text-sm text-gray-400">No events yet.</p>';
		return;
	}

	// events are newest-first. For delta calculation, compare each event to the next (older) event.
	for (let i = 0; i < events.length; i++) {
		const ev = events[i];
		const prev = (i + 1 < events.length) ? events[i + 1] : null;
		const el = createEventElement(ev, prev);
		listEl.appendChild(el);
	}
}

// fetch events on load
document.addEventListener('DOMContentLoaded', () => {
	fetchEvents();
});

// --- overlay interactions: show pointer and allow placing markers ---
document.addEventListener('DOMContentLoaded', () => {
	const container = document.getElementById('vehicle-container');
	const overlay = document.getElementById('overlay');
	const pointer = document.getElementById('pointer-display');
	const markers = Array.from(document.querySelectorAll('.marker'));

	if (!container || !overlay) return;

	// markers loaded from config in fetchConfig

	let selectedMarker = null;

	function percentFromEvent(e) {
		const rect = overlay.getBoundingClientRect();
		const x = (e.clientX - rect.left) / rect.width * 100;
		const y = (e.clientY - rect.top) / rect.height * 100;
		return {x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y))};
	}

	overlay.addEventListener('mousemove', e => {
		const p = percentFromEvent(e);
		pointer.textContent = `${Math.round(p.x)}%, ${Math.round(p.y)}%`;
	});

	// click marker to select
	markers.forEach(m => {
		m.addEventListener('click', ev => {
			ev.stopPropagation();
			if (selectedMarker) selectedMarker.style.outline = '';
			selectedMarker = m;
			selectedMarker.style.outline = '2px solid #60A5FA';
		});
	});

	// click overlay to move selected marker
	overlay.addEventListener('click', e => {
		if (!selectedMarker) return;
		const p = percentFromEvent(e);
		selectedMarker.style.left = p.x + '%';
		selectedMarker.style.top = p.y + '%';
		const id = selectedMarker.getAttribute('data-id');
		// save to config
		const cfg = Object.assign({}, APP_CONFIG || {}, { markers: Object.assign({}, (APP_CONFIG || {}).markers || {}, { [id]: { left: selectedMarker.style.left, top: selectedMarker.style.top } }) });
		saveConfig(cfg);
	});

	// double-click overlay to deselect
	overlay.addEventListener('dblclick', () => {
		if (selectedMarker) selectedMarker.style.outline = '';
		selectedMarker = null;
	});

});

// --- simple client-side router + mobile menu ---
document.addEventListener('DOMContentLoaded', () => {
	const links = Array.from(document.querySelectorAll('.nav-link'));
	const mobileLinks = Array.from(document.querySelectorAll('.mobile-link'));
	const pages = Array.from(document.querySelectorAll('.page'));
	const mobileBtn = document.getElementById('mobile-menu-button');
	const mobileMenu = document.getElementById('mobile-menu');

	function showPage(name) {
		pages.forEach(p => p.classList.toggle('hidden', p.id !== 'page-' + name));

		// update active classes on desktop links
		links.forEach(l => {
			const route = l.getAttribute('data-route');
			if (route === name) l.classList.add('bg-gray-950/50', 'text-white');
			else l.classList.remove('bg-gray-950/50', 'text-white');
		});

		// close mobile menu if open
		if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
			mobileMenu.classList.add('hidden');
			if (mobileBtn) mobileBtn.setAttribute('aria-expanded', 'false');
		}
	}

	// attach handlers
	links.concat(mobileLinks).forEach(a => {
		a.addEventListener('click', ev => {
			ev.preventDefault();
			const route = a.getAttribute('data-route') || 'home';
			showPage(route);
			// update hash
			try { history.pushState(null, '', '#/' + route); } catch (e) {}
		});
	});

	if (mobileBtn && mobileMenu) {
		mobileBtn.addEventListener('click', () => {
			const hidden = mobileMenu.classList.toggle('hidden');
			mobileBtn.setAttribute('aria-expanded', String(!hidden));
		});
	}

	// initial route from hash
	const initial = (location.hash || '#/home').replace('#/', '');
	showPage(initial || 'home');
	window.addEventListener('popstate', () => {
		const route = (location.hash || '#/home').replace('#/', '');
		showPage(route || 'home');
	});
});

// --- Event modal logic ---
function openModal() {
	const modal = document.getElementById('event-modal');
	if (modal) modal.classList.remove('hidden');
	// populate current values in spans
	const current = window.CURRENT_SETTINGS || {};
	['fl','fr','rl','rr'].forEach(id => {
		const spring = current[id] || {};
		const fields = ['preload', 'comp_slow', 'comp_fast', 'rebound'];
		fields.forEach(field => {
			const span = document.getElementById(`${id}-${field}-current`);
			if (span) {
				let display = '';
				if (spring[field] !== undefined) {
					display = fmtNum(spring[field]);
					// add unit
					try {
						const cfg = APP_CONFIG || {};
						let grp = (id === 'fl' || id === 'fr') ? 'front' : (id === 'rl' ? 'rl' : 'rr');
						if (field === 'preload') {
							const unit = cfg[grp] && cfg[grp].preload_unit ? cfg[grp].preload_unit : 'mm';
							const ulabel = (window.I18N && I18N.t) ? I18N.t('unit.' + (unit === 'mm' ? 'mm' : unit)) : unit;
							display += ` ${ulabel}`;
						} else {
							const unit = cfg[grp] && cfg[grp].damping_unit ? cfg[grp].damping_unit : 'clicks';
							const ulabel = (window.I18N && I18N.t) ? I18N.t('unit.' + (unit === 'mm' ? 'mm' : unit)) : unit;
							display += ` ${ulabel}`;
						}
					} catch (e) {}
					display = ` (${display})`;
				}
				span.textContent = display;
			}
		});
	});
	// clear inputs
	const form = document.getElementById('event-form');
	const notesCount = document.getElementById('notes-count');
	if (form) {
		['fl','fr','rl','rr'].forEach(id => {
			form.elements[`${id}_preload`].value = '';
			form.elements[`${id}_comp_slow`].value = '';
			form.elements[`${id}_comp_fast`].value = '';
			form.elements[`${id}_rebound`].value = '';
		});
		form.elements['notes'].value = '';
		if (notesCount) notesCount.textContent = '0/160';
	}
}

function closeModal() {
	const modal = document.getElementById('event-modal');
	if (modal) modal.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
	const btnAdd = document.getElementById('btn-add-event');
	const modal = document.getElementById('event-modal');
	const modalClose = document.getElementById('event-modal-close');
	const eventForm = document.getElementById('event-form');
	const notes = eventForm?.querySelector('textarea[name="notes"]');
	const notesCount = document.getElementById('notes-count');

	if (btnAdd) btnAdd.addEventListener('click', () => { EVENT_MODAL_MODE = 'event'; updateModalForMode('event'); openModal(); });
	if (modalClose) modalClose.addEventListener('click', closeModal);

	// Reset SAG button (sends a reset event)
	const btnResetSAG = document.getElementById('btn-reset-sag');
	if (btnResetSAG) {
		btnResetSAG.addEventListener('click', async () => {
			try {
				const payload = { type: 'reset_sag', ts: Math.floor(Date.now() / 1000) };
				const res = await fetch('/api/event', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
				if (!res.ok) throw new Error('reset failed');
				try { await fetchEvents(); } catch (e) {}
				alert('SAG reset recorded');
			} catch (err) {
				console.error('Reset SAG error', err);
				alert('Failed to reset SAG');
			}
		});
	}
	if (eventForm) {
		// notes counter
		if (notes && notesCount) {
			notes.addEventListener('input', () => {
				notesCount.textContent = `${notes.value.length}/160`;
			});
		}

		eventForm.addEventListener('submit', async (ev) => {
			ev.preventDefault();
			const form = new FormData(eventForm);
			const payload = { springs: {}, notes: form.get('notes') || '' };

			['fl','fr','rl','rr'].forEach(id => {
				payload.springs[id] = {
					preload: parseFloat(form.get(`${id}_preload`) || 0),
					comp_slow: parseFloat(form.get(`${id}_comp_slow`) || 0),
					comp_fast: parseFloat(form.get(`${id}_comp_fast`) || 0),
					rebound: parseFloat(form.get(`${id}_rebound`) || 0)
				};
			});

			try {
				if (EVENT_MODAL_MODE === 'init') {
					// save as persistent initial config (does not create an event)
					const cfg = { initial: { springs: payload.springs, notes: payload.notes } };
					const ok = await saveConfig(Object.assign({}, APP_CONFIG || {}, cfg));
					closeModal();
					if (!ok) throw new Error('save initial config failed');
					alert('Initial settings saved');
				} else {
					const res = await fetch('/api/event', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(payload)
					});
					if (!res.ok) throw new Error('event post failed');
					const body = await res.json();
					closeModal();
					console.info('Event saved', body);
					// Refresh events (to compute deltas reliably relative to previous events)
					try { await fetchEvents(); } catch (e) { }
				}
			} catch (err) {
				console.error('Event save error', err);
				alert('Failed to save');
			}
		});
	}
});

function createEventElement(ev, prev) {
	const item = document.createElement('div');
	item.className = 'bg-gray-900 rounded p-3';
	const header = document.createElement('div');
	header.className = 'flex justify-between items-center mb-2';
	const ts = document.createElement('div');
	ts.className = 'text-xs text-gray-400';
	ts.textContent = formatTs(ev.ts);
	header.appendChild(ts);
	item.appendChild(header);

	// compute deltas relative to prev (older event). If no prev, show absolute values.
	const changes = [];
	const springs = ev.data && ev.data.springs ? ev.data.springs : {};
	Object.keys(springs).forEach(part => {
		const vals = springs[part];
		const parts = [];
		Object.keys(vals).forEach(k => {
			const cur = Number(vals[k] || 0);
			const prevVal = prev && prev.data && prev.data.springs && prev.data.springs[part] ? Number(prev.data.springs[part][k] || 0) : null;
			let show = false;
			let out = '';
			if (prevVal !== null) {
				const delta = cur - prevVal;
				if (delta !== 0) {
					show = true;
					out = (delta > 0 ? '+' : '') + fmtNum(delta);
				}
			} else {
				// no previous value: show absolute if non-zero
				if (cur !== 0) {
					show = true;
					out = fmtNum(cur);
				}
			}
			if (show) {
				const ab = FIELD_ABBR[k] || k;
				parts.push(`${ab}${out.startsWith('+') || out.startsWith('-') ? ':' : ':'}${out}`.replace(':', ' '));
			}
		});
		if (parts.length) {
			changes.push(`${part.toUpperCase()}: ${parts.join(' ')}`);
		}
	});

	if (changes.length) {
		const cdiv = document.createElement('div');
		cdiv.className = 'text-sm text-gray-200 mb-2';
		cdiv.textContent = changes.join(' | ');
		item.appendChild(cdiv);
	}

	if (ev.data && ev.data.notes) {
		const notes = document.createElement('div');
		notes.className = 'text-sm text-gray-400 mb-2';
		notes.textContent = ev.data.notes;
		item.appendChild(notes);
	}

	// comments feed
	const commentsWrap = document.createElement('div');
	commentsWrap.className = 'mt-2';
	const commentsList = document.createElement('div');
	commentsList.className = 'space-y-1 mb-2';
	const existing = ev.comments || [];
	existing.forEach(c => {
		const row = document.createElement('div');
		row.className = 'text-xs text-gray-400';
		row.textContent = `${formatTs(c.ts)} — ${c.text}`;
		commentsList.appendChild(row);
	});
	commentsWrap.appendChild(commentsList);

	// add comment input
	const commentForm = document.createElement('div');
	commentForm.className = 'flex items-center space-x-2';
	const input = document.createElement('input');
	input.type = 'text';
	input.placeholder = 'Add comment...';
	input.className = 'flex-1 rounded bg-gray-700 px-2 py-1 text-sm';
	const btn = document.createElement('button');
	btn.className = 'rounded bg-indigo-600 px-2 py-1 text-sm text-white';
	btn.textContent = 'Post';
	commentForm.appendChild(input);
	commentForm.appendChild(btn);
	commentsWrap.appendChild(commentForm);
	item.appendChild(commentsWrap);

	// post comment handler
	btn.addEventListener('click', async () => {
		const txt = input.value.trim();
		if (!txt) return;
		try {
			const res = await fetch('/api/event/comment', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ event_ts: ev.ts, comment: txt })
			});
			if (!res.ok) throw new Error('comment failed');
			const body = await res.json();
			const saved = body.event;
			// update UI: append new comment to commentsList
			const c = saved.comments ? saved.comments[saved.comments.length - 1] : null;
			if (c) {
				const row = document.createElement('div');
				row.className = 'text-xs text-gray-400';
				row.textContent = `${formatTs(c.ts)} — ${c.text}`;
				commentsList.appendChild(row);
			}
			input.value = '';
		} catch (err) {
			console.error('comment error', err);
			alert('Failed to post comment');
		}
	});

	return item;
}

function prependEvent(ev) {
	const listEl = document.getElementById('event-list');
	if (!listEl) return;
	// ensure placeholder removed
	if (listEl.children.length === 1 && listEl.children[0].textContent.includes('No events')) {
		listEl.innerHTML = '';
	}
	// we now refresh the whole list to compute deltas correctly
	try { fetchEvents(); } catch (e) {}
}

function renderCurrentSettings(ev) {
	const homeEl = document.getElementById('current-settings-home-content');
	const eventsEl = document.getElementById('current-settings-events-content');
	if (!homeEl && !eventsEl) return;
	// prefer persisted APP_CONFIG.initial if available
	if ((!ev || !ev.data || !ev.data.springs) && APP_CONFIG && APP_CONFIG.initial && APP_CONFIG.initial.springs) {
		ev = { ts: 'init', data: APP_CONFIG.initial };
	}
	if (!ev || !ev.data || !ev.data.springs) {
		// show a call-to-action to set initial settings
		const label = (window.I18N && I18N.t) ? I18N.t('events.set_initial') : 'Set initial settings';
		const btn = document.createElement('button');
		btn.className = 'rounded-md bg-indigo-600 px-3 py-2 text-sm text-white';
		btn.textContent = label;
		btn.addEventListener('click', () => {
			// open modal in init mode
			EVENT_MODAL_MODE = 'init';
			updateModalForMode('init');
			openModal();
		});
		if (homeEl) { homeEl.innerHTML = ''; homeEl.appendChild(btn); }
		if (eventsEl) {
			const btn2 = document.createElement('button');
			btn2.className = btn.className;
			btn2.textContent = btn.textContent;
			btn2.addEventListener('click', () => {
				EVENT_MODAL_MODE = 'init';
				updateModalForMode('init');
				openModal();
			});
			eventsEl.innerHTML = '';
			eventsEl.appendChild(btn2);
		}
		return;
	}
	const springs = ev.data.springs;
	window.CURRENT_SETTINGS = springs; // store for modal
	// build a readable table: rows=FL/FR/RL/RR, cols=Preload, HSC (fast), LSC (slow), Rebound
	function makeTable() {
		const tbl = document.createElement('table');
		tbl.className = 'min-w-full text-sm text-left';
		const thead = document.createElement('thead');
		const hrow = document.createElement('tr');
		['','preload','comp_fast','comp_slow','rebound'].forEach(k => {
			const th = document.createElement('th');
			th.className = 'px-2 py-1 text-xs text-gray-400';
			if (k === '') th.textContent = '';
			else {
				const key = (k === 'preload') ? 'field.preload' : (k === 'comp_fast' ? 'field.comp_fast' : (k === 'comp_slow' ? 'field.comp_slow' : 'field.rebound'));
				const base = window.I18N ? I18N.t(key) : key;
				const ab = FIELD_ABBR[k] || k;

				// determine unit to display in header if consistent across groups
				let unitLabel = '';
				try {
					const cfg = APP_CONFIG || {};
					const groups = ['front','rl','rr'];
					const unitKey = (k === 'preload') ? 'preload_unit' : 'damping_unit';
					const units = groups.map(g => (cfg[g] && cfg[g][unitKey]) || null);
					const allSame = units.every(u => u === units[0] && u !== null);
					if (allSame) {
						const u = units[0] || 'mm';
						unitLabel = window.I18N ? I18N.t('unit.' + (u === 'mm' ? 'mm' : u)) : u;
					}
				} catch (e) {}

				th.textContent = unitLabel ? `${base} (${ab}) — ${unitLabel}` : `${base} (${ab})`;
			}
			hrow.appendChild(th);
		});
		thead.appendChild(hrow);
		tbl.appendChild(thead);

		const tbody = document.createElement('tbody');
		['fl','fr','rl','rr'].forEach(s => {
			const tr = document.createElement('tr');
			tr.className = 'odd:bg-gray-800/50';
			const nameTd = document.createElement('td');
			nameTd.className = 'px-2 py-1 text-gray-200 font-medium';
			const mlabel = window.I18N ? I18N.t('marker.' + s) : s.toUpperCase();
			// show full name only (no abbreviation in parentheses)
			nameTd.textContent = mlabel;
			tr.appendChild(nameTd);
			const vals = springs[s] || {};
			const order = ['preload','comp_fast','comp_slow','rebound'];
			order.forEach(k => {
				const td = document.createElement('td');
				td.className = 'px-2 py-1 text-gray-300';
				let display = fmtNum(vals[k] || 0);
				try {
					const cfg = APP_CONFIG || {};
					let grp = (s === 'fl' || s === 'fr') ? 'front' : (s === 'rl' ? 'rl' : 'rr');
					if (k === 'preload') {
						const unit = cfg[grp] && cfg[grp].preload_unit ? cfg[grp].preload_unit : 'mm';
					const ulabel = window.I18N ? I18N.t('unit.' + (unit === 'mm' ? 'mm' : unit)) : unit;
					display += ` ${ulabel}`;
				} else {
					const unit = cfg[grp] && cfg[grp].damping_unit ? cfg[grp].damping_unit : 'clicks';
					const ulabel = window.I18N ? I18N.t('unit.' + (unit === 'mm' ? 'mm' : unit)) : unit;
						display += ` ${ulabel}`;
					}
				} catch (e) {}
				td.textContent = display;
				tr.appendChild(td);
			});
			tbody.appendChild(tr);
		});
		tbl.appendChild(tbody);
		return tbl;
	}

	const table = makeTable();
	if (homeEl) {
		homeEl.innerHTML = '';
		homeEl.appendChild(table.cloneNode(true));
	}
	if (eventsEl) {
		eventsEl.innerHTML = '';
		eventsEl.appendChild(table);
	}
}

// wire cancel button for modal
document.addEventListener('DOMContentLoaded', () => {
	const evCancel = document.getElementById('event-cancel');
	const modal = document.getElementById('event-modal');
	if (evCancel && modal) evCancel.addEventListener('click', () => modal.classList.add('hidden'));
});
