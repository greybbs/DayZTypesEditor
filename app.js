(function () {
	'use strict';

	const FLAG_IDS = {
		count_in_cargo: 'flagCargo',
		count_in_hoarder: 'flagHoarder',
		count_in_map: 'flagMap',
		count_in_player: 'flagPlayer',
		crafted: 'flagCrafted',
		deloot: 'flagDeloot'
	};

	let types = [];
	let selectedIndex = -1;
	let categoriesSet = new Set();
	let duplicateGroups = [];
	let selectedIndices = new Set();
	let contextMenuTargetIndex = -1;
	let massAddNamesList = [];
	let massAddDuplicateChoices = {};
	let sortCol = '';
	let sortDir = 1;

	const $ = (id) => document.getElementById(id);
	const fileInput = $('fileInput');
	const importXmlInput = $('importXmlInput');
	const exportBtn = $('exportBtn');
	const toolsBtn = $('toolsBtn');
	const toolsMenu = $('toolsMenu');
	const validateBtn = $('validateBtn');
	const searchInput = $('searchInput');
	const categoryFilter = $('categoryFilter');
	const tableBody = $('tableBody');
	const typesTable = $('typesTable');
	const tableWrap = $('tableWrap');
	const emptyState = $('emptyState');
	const editorModal = $('editorModal');
	const editorForm = $('editorForm');
	const closeEditor = $('closeEditor');
	const formErrors = $('formErrors');
	const typeCount = $('typeCount');
	const errorCount = $('errorCount');
	const revertBtn = $('revertBtn');
	const duplicatesBtn = $('duplicatesBtn');
	const duplicatesModal = $('duplicatesModal');
	const duplicatesList = $('duplicatesList');
	const closeDuplicatesModal = $('closeDuplicatesModal');
	const closeDuplicatesBtn = $('closeDuplicatesBtn');
	const applyDuplicatesBtn = $('applyDuplicatesBtn');
	const errorsModal = $('errorsModal');
	const errorsList = $('errorsList');
	const errorsHint = $('errorsHint');
	const closeErrorsModal = $('closeErrorsModal');
	const closeErrorsBtn = $('closeErrorsBtn');
	const fixAllErrorsBtn = $('fixAllErrorsBtn');
	const bulkBar = $('bulkBar');
	const bulkCount = $('bulkCount');
	const bulkEditBtn = $('bulkEditBtn');
	const bulkClearBtn = $('bulkClearBtn');
	const selectAllCheckbox = $('selectAllCheckbox');
	const bulkModal = $('bulkModal');
	const closeBulkModal = $('closeBulkModal');
	const cancelBulkBtn = $('cancelBulkBtn');
	const applyBulkBtn = $('applyBulkBtn');
	const contextMenu = $('contextMenu');
	const contextRemoveSpawn = $('contextRemoveSpawn');
	const contextDelete = $('contextDelete');
	const contextBulkEdit = $('contextBulkEdit');
	const massAddOpenBtn = $('massAddOpenBtn');
	const massAddSourceModal = $('massAddSourceModal');
	const massAddSourceFile = $('massAddSourceFile');
	const massAddSourcePaste = $('massAddSourcePaste');
	const massAddSourceContinueBtn = $('massAddSourceContinueBtn');
	const closeMassAddSourceModal = $('closeMassAddSourceModal');
	const massAddSourceCancelBtn = $('massAddSourceCancelBtn');
	const addSingleTypeBtn = $('addSingleTypeBtn');
	const massAddModal = $('massAddModal');
	const massAddNames = $('massAddNames');
	const closeMassAddModal = $('closeMassAddModal');
	const cancelMassAddBtn = $('cancelMassAddBtn');
	const applyMassAddBtn = $('applyMassAddBtn');
	const singleAddModal = $('singleAddModal');
	const singleAddText = $('singleAddText');
	const singleAddPreview = $('singleAddPreview');
	const closeSingleAddModal = $('closeSingleAddModal');
	const cancelSingleAddBtn = $('cancelSingleAddBtn');
	const applySingleAddBtn = $('applySingleAddBtn');
	const scrollToBottomBtn = $('scrollToBottomBtn');
	const massAddDuplicatesSection = $('massAddDuplicatesSection');
	const massAddDuplicatesList = $('massAddDuplicatesList');

	const numberFields = [
		'fieldNominal', 'fieldLifetime', 'fieldRestock', 'fieldMin',
		'fieldQuantmin', 'fieldQuantmax', 'fieldCost'
	];
	const fieldIds = {
		name: 'fieldName',
		nominal: 'fieldNominal',
		lifetime: 'fieldLifetime',
		restock: 'fieldRestock',
		min: 'fieldMin',
		quantmin: 'fieldQuantmin',
		quantmax: 'fieldQuantmax',
		cost: 'fieldCost',
		category: 'fieldCategory',
		tags: 'fieldTags',
		usage: 'fieldUsage',
		value: 'fieldValue'
	};
	const valueTierCheckboxes = Array.from(document.querySelectorAll('.value-tier'));
	const tagCheckboxes = Array.from(document.querySelectorAll('.tag-option'));
	const categoryOptions = Array.from(document.querySelectorAll('.category-option'));
	const usageCheckboxes = Array.from(document.querySelectorAll('.usage-option'));
	let vanillaTypesMap = null;

	function syncValueTiersFromTextarea() {
		const valueEl = $(fieldIds.value);
		if (!valueEl || !valueTierCheckboxes.length) return;
		const current = new Set(
			valueEl.value.split(/\n/).map(s => s.trim()).filter(Boolean)
		);
		valueTierCheckboxes.forEach(cb => {
			cb.checked = current.has(cb.value);
		});
	}

	function syncTextareaFromValueTiers() {
		const valueEl = $(fieldIds.value);
		if (!valueEl || !valueTierCheckboxes.length) return;
		const selected = valueTierCheckboxes
			.filter(cb => cb.checked)
			.map(cb => cb.value);
		valueEl.value = selected.join('\n');
	}

	valueTierCheckboxes.forEach(cb => {
		cb.addEventListener('change', syncTextareaFromValueTiers);
	});

	function syncTagsFromTextarea() {
		const tagsEl = $(fieldIds.tags);
		if (!tagsEl || !tagCheckboxes.length) return;
		const current = new Set(
			tagsEl.value.split(/\n/).map(s => s.trim()).filter(Boolean)
		);
		tagCheckboxes.forEach(cb => {
			cb.checked = current.has(cb.value);
		});
	}

	function syncTextareaFromTags() {
		const tagsEl = $(fieldIds.tags);
		if (!tagsEl || !tagCheckboxes.length) return;
		const selected = tagCheckboxes
			.filter(cb => cb.checked)
			.map(cb => cb.value);
		tagsEl.value = selected.join('\n');
	}

	tagCheckboxes.forEach(cb => {
		cb.addEventListener('change', syncTextareaFromTags);
	});

	function syncUsageFromTextarea() {
		const usageEl = $(fieldIds.usage);
		if (!usageEl || !usageCheckboxes.length) return;
		const current = new Set(
			usageEl.value.split(/\n/).map(s => s.trim()).filter(Boolean)
		);
		usageCheckboxes.forEach(cb => {
			cb.checked = current.has(cb.value);
		});
	}

	function syncTextareaFromUsage() {
		const usageEl = $(fieldIds.usage);
		if (!usageEl || !usageCheckboxes.length) return;
		const selected = usageCheckboxes
			.filter(cb => cb.checked)
			.map(cb => cb.value);
		usageEl.value = selected.join('\n');
	}

	usageCheckboxes.forEach(cb => {
		cb.addEventListener('change', syncTextareaFromUsage);
	});

	function normalizeTypeForCompare(t) {
		const normFlags = {};
		const srcFlags = t.flags || {};
		['count_in_cargo','count_in_hoarder','count_in_map','count_in_player','crafted','deloot'].forEach(k => {
			normFlags[k] = (srcFlags[k] || '0').toString();
		});
		const normalizeArr = (arr) => (arr || []).map(v => String(v || '').trim()).filter(Boolean).sort();
		return {
			nominal: String(t.nominal ?? '').trim(),
			lifetime: String(t.lifetime ?? '').trim(),
			restock: String(t.restock ?? '').trim(),
			min: String(t.min ?? '').trim(),
			quantmin: String(t.quantmin ?? '').trim(),
			quantmax: String(t.quantmax ?? '').trim(),
			cost: String(t.cost ?? '').trim(),
			flags: normFlags,
			category: String(t.category ?? '').trim(),
			tags: normalizeArr(t.tags),
			usage: normalizeArr(t.usage),
			value: normalizeArr(t.value)
		};
	}

	function typesEqualForCompare(a, b) {
		const na = normalizeTypeForCompare(a);
		const nb = normalizeTypeForCompare(b);
		const keys = ['nominal','lifetime','restock','min','quantmin','quantmax','cost','category'];
		for (const k of keys) {
			if (na[k] !== nb[k]) return false;
		}
		const flagKeys = ['count_in_cargo','count_in_hoarder','count_in_map','count_in_player','crafted','deloot'];
		for (const fk of flagKeys) {
			if (na.flags[fk] !== nb.flags[fk]) return false;
		}
		const arrKeys = ['tags','usage','value'];
		for (const ak of arrKeys) {
			const va = na[ak];
			const vb = nb[ak];
			if (va.length !== vb.length) return false;
			for (let i = 0; i < va.length; i++) {
				if (va[i] !== vb[i]) return false;
			}
		}
		return true;
	}

	function diffSummaryForVanilla(a, b) {
		const na = normalizeTypeForCompare(a);
		const nb = normalizeTypeForCompare(b);
		const changed = [];
		const keys = ['nominal','lifetime','restock','min','quantmin','quantmax','cost','category'];
		keys.forEach(k => {
			if (na[k] !== nb[k]) changed.push(k);
		});
		const flagKeys = ['count_in_cargo','count_in_hoarder','count_in_map','count_in_player','crafted','deloot'];
		flagKeys.forEach(fk => {
			if (na.flags[fk] !== nb.flags[fk]) changed.push('flags.' + fk);
		});
		const arrKeys = ['tags','usage','value'];
		arrKeys.forEach(ak => {
			const va = na[ak];
			const vb = nb[ak];
			if (va.length !== vb.length) changed.push(ak);
			else {
				for (let i = 0; i < va.length; i++) {
					if (va[i] !== vb[i]) {
						changed.push(ak);
						break;
					}
				}
			}
		});
		if (!changed.length) return '';
		return 'Отличается от vanilla в полях: ' + changed.join(', ');
	}

	function syncCategoryFromInput() {
		const catEl = $(fieldIds.category);
		if (!catEl || !categoryOptions.length) return;
		const current = (catEl.value || '').trim();
		categoryOptions.forEach(opt => {
			opt.checked = opt.value === current;
		});
	}

	function syncInputFromCategory() {
		const catEl = $(fieldIds.category);
		if (!catEl || !categoryOptions.length) return;
		const selected = categoryOptions.find(opt => opt.checked);
		catEl.value = selected ? selected.value : '';
	}

	categoryOptions.forEach(opt => {
		opt.addEventListener('change', syncInputFromCategory);
	});

	function parseTypeNode(typeEl) {
		const name = typeEl.getAttribute('name') || '';
		const getText = (tag) => {
			const el = typeEl.querySelector(tag);
			return el ? el.textContent.trim() : '';
		};
		const flagsEl = typeEl.querySelector('flags');
		const flags = {
			count_in_cargo: '0',
			count_in_hoarder: '0',
			count_in_map: '0',
			count_in_player: '0',
			crafted: '0',
			deloot: '0'
		};
		if (flagsEl) {
			['count_in_cargo', 'count_in_hoarder', 'count_in_map', 'count_in_player', 'crafted', 'deloot'].forEach(k => {
				if (flagsEl.getAttribute(k) !== undefined) flags[k] = flagsEl.getAttribute(k) || '0';
			});
		}
		const categoryEl = typeEl.querySelector('category');
		const category = categoryEl ? (categoryEl.getAttribute('name') || '') : '';
		const tagEls = typeEl.querySelectorAll('tag');
		const tags = Array.from(tagEls).map(t => t.getAttribute('name') || '').filter(Boolean);
		const usageEls = typeEl.querySelectorAll('usage');
		const usage = Array.from(usageEls).map(u => u.getAttribute('name') || '').filter(Boolean);
		const valueEls = typeEl.querySelectorAll('value');
		const value = Array.from(valueEls).map(v => v.getAttribute('name') || '').filter(Boolean);

		return {
			name,
			nominal: getText('nominal'),
			lifetime: getText('lifetime'),
			restock: getText('restock'),
			min: getText('min'),
			quantmin: getText('quantmin'),
			quantmax: getText('quantmax'),
			cost: getText('cost'),
			flags,
			category,
			tags,
			usage,
			value
		};
	}

	function parseXml(xmlString) {
		const parser = new DOMParser();
		const doc = parser.parseFromString(xmlString, 'text/xml');
		const parseError = doc.querySelector('parsererror');
		if (parseError) {
			throw new Error('Ошибка парсинга XML: ' + parseError.textContent);
		}
		const typesRoot = doc.querySelector('types');
		if (!typesRoot) throw new Error('Корневой элемент <types> не найден.');
		const typeEls = typesRoot.querySelectorAll(':scope > type');
		const result = [];
		const cats = new Set();
		typeEls.forEach(el => {
			const t = parseTypeNode(el);
			result.push(t);
			if (t.category) cats.add(t.category);
		});
		return { types: result, categories: Array.from(cats).sort() };
	}

	function validateType(t) {
		const err = [];
		const num = (key, min, max) => {
			const v = String(t[key] ?? '').trim();
			const n = parseInt(v, 10);
			if (v === '') err.push(`${key}: обязательно`);
			else if (isNaN(n)) err.push(`${key}: должно быть числом`);
			else if (min !== undefined && n < min) err.push(`${key}: минимум ${min}`);
			else if (max !== undefined && n > max) err.push(`${key}: максимум ${max}`);
		};
		num('nominal', 0);
		num('lifetime', 0);
		num('restock', 0);
		num('min', 0);
		num('quantmin', -1);
		num('quantmax', -1);
		num('cost', 0);

		const qmin = parseInt(t.quantmin, 10);
		const qmax = parseInt(t.quantmax, 10);
		if (!isNaN(qmin) && !isNaN(qmax) && qmin !== -1 && qmax !== -1 && qmax < qmin) {
			err.push('quantmax не может быть меньше quantmin');
		}

		Object.keys(t.flags).forEach(k => {
			const v = t.flags[k];
			if (v !== '0' && v !== '1') err.push(`flags.${k}: допустимы только 0 или 1`);
		});

		return err;
	}

	function loadTypes(newTypes, newCategories) {
		types = newTypes;
		categoriesSet = new Set(newCategories || []);
		types.forEach(t => { if (t.category) categoriesSet.add(t.category); });
		selectedIndex = -1;
		selectedIndices.clear();
		renderCategoryFilter();
		renderTable();
		renderStats();
		updateBulkBar();
		editorModal.classList.add('hidden');
		exportBtn.disabled = types.length === 0;
		duplicatesBtn.disabled = types.length === 0;
		const importXmlLabel = $('importXmlLabel');
		if (importXmlLabel) importXmlLabel.classList.toggle('disabled', types.length === 0);
		emptyState.style.display = types.length ? 'none' : 'block';
		if (typesTable) typesTable.classList.toggle('hidden', types.length === 0);
		fillCategoryDatalist();
	}

	function renderCategoryFilter() {
		const savedCat = categoryFilter.value;
		const opts = ['<option value="">Категория: все</option>'];
		Array.from(categoriesSet).sort().forEach(c => {
			opts.push(`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`);
		});
		categoryFilter.innerHTML = opts.join('');
		if (savedCat && Array.from(categoriesSet).includes(savedCat)) categoryFilter.value = savedCat;
	}

	function escapeHtml(s) {
		const div = document.createElement('div');
		div.textContent = s;
		return div.innerHTML;
	}

	function getFilteredTypes() {
		const q = searchInput.value.trim().toLowerCase();
		const cat = categoryFilter.value;
		let result = types
			.map((t, i) => ({ t, i }))
			.filter(({ t }) => {
				if (q && !t.name.toLowerCase().includes(q)) return false;
				if (cat && t.category !== cat) return false;
				return true;
			});
		if (sortCol) {
			const dir = sortDir;
			const key = sortCol;
			result = result.slice().sort((a, b) => {
				let va, vb;
				if (key === 'flags') { va = flagsShort(a.t); vb = flagsShort(b.t); }
				else if (key === 'category') { va = String(a.t.category ?? ''); vb = String(b.t.category ?? ''); }
				else if (key === 'usage') { va = (a.t.usage || []).slice().sort().join(','); vb = (b.t.usage || []).slice().sort().join(','); }
				else if (key === 'value') { va = (a.t.value || []).slice().sort().join(','); vb = (b.t.value || []).slice().sort().join(','); }
				else { va = String((a.t[key] ?? '')); vb = String((b.t[key] ?? '')); }
				const numA = parseFloat(va), numB = parseFloat(vb);
				const isNum = !isNaN(numA) && !isNaN(numB) && va !== '' && vb !== '';
				let cmp;
				if (isNum) cmp = numA < numB ? -1 : numA > numB ? 1 : 0;
				else cmp = va.localeCompare(vb, undefined, { numeric: true });
				return dir * cmp;
			});
		}
		return result;
	}

	function flagsShort(t) {
		const f = t.flags || {};
		return ['count_in_cargo', 'count_in_hoarder', 'count_in_map', 'count_in_player', 'crafted', 'deloot']
			.map(k => f[k] === '1' ? '1' : '0').join('');
	}

	function updateBulkBar() {
		if (selectedIndices.size > 0) {
			bulkBar.classList.remove('hidden');
			bulkCount.textContent = 'Выбрано: ' + selectedIndices.size;
		} else {
			bulkBar.classList.add('hidden');
		}
		if (selectAllCheckbox) selectAllCheckbox.checked = types.length > 0 && getFilteredTypes().every(({ t }) => selectedIndices.has(types.indexOf(t)));
	}

	function makeDataRow(t, globalIndex, err, isSelected) {
			const tr = document.createElement('tr');
			let cls = '';
			let title = '';
			if (globalIndex === selectedIndex) cls += ' active';
			if (err.length) cls += ' has-error';
			if (isSelected) cls += ' selected';
			if (vanillaTypesMap && t.name) {
				const vanilla = vanillaTypesMap.get((t.name || '').trim());
				if (!vanilla) {
					cls += ' row-custom';
					title = 'Тип отсутствует в vanilla types.xml';
				} else if (!typesEqualForCompare(t, vanilla)) {
					cls += ' row-modified';
					title = diffSummaryForVanilla(t, vanilla);
				}
			}
			tr.className = cls.trim();
			if (title) tr.title = title;
			tr.dataset.index = String(globalIndex);
			const cb = document.createElement('td');
			cb.className = 'td-checkbox';
			const input = document.createElement('input');
			input.type = 'checkbox';
			input.className = 'row-select';
			input.checked = isSelected;
			input.dataset.index = String(globalIndex);
			input.addEventListener('click', (e) => { e.stopPropagation(); });
			input.addEventListener('change', () => {
				if (input.checked) selectedIndices.add(globalIndex); else selectedIndices.delete(globalIndex);
				tr.classList.toggle('selected', selectedIndices.has(globalIndex));
				updateBulkBar();
			});
			cb.appendChild(input);
			tr.appendChild(cb);
			const tdName = document.createElement('td');
			tdName.className = 'type-name';
			tdName.title = t.name;
			tdName.textContent = t.name;
			tr.appendChild(tdName);
			['nominal','lifetime','restock','min','quantmin','quantmax','cost'].forEach(k => { const c = document.createElement('td'); c.className = 'td-narrow'; c.textContent = t[k] ?? ''; tr.appendChild(c); });
			const tdFlags = document.createElement('td');
			tdFlags.className = 'td-narrow';
			tdFlags.textContent = flagsShort(t);
			tr.appendChild(tdFlags);
			const tdCat = document.createElement('td');
			tdCat.className = 'td-category';
			tdCat.textContent = t.category || '';
			tr.appendChild(tdCat);
			const tdUsage = document.createElement('td');
			tdUsage.className = 'td-wide td-usage';
			tdUsage.title = (t.usage || []).join(', ');
			tdUsage.textContent = (t.usage || []).join(', ');
			tr.appendChild(tdUsage);
			const tdValue = document.createElement('td');
			tdValue.className = 'td-wide';
			tdValue.title = (t.value || []).join(', ');
			tdValue.textContent = (t.value || []).join(', ');
			tr.appendChild(tdValue);
			tr.addEventListener('click', (e) => {
				if (e.target.type === 'checkbox') return;
				selectType(parseInt(tr.dataset.index, 10));
			});
			tr.addEventListener('contextmenu', (e) => {
				if (e.target.type === 'checkbox') return;
				e.preventDefault();
				showContextMenu(e.clientX, e.clientY, globalIndex);
			});
			return tr;
		}

	function renderTable() {
		const filtered = getFilteredTypes();
		typeCount.textContent = `${filtered.length} из ${types.length} типов`;

		if (types.length === 0) {
			emptyState.style.display = 'block';
			typesTable.classList.add('hidden');
			updateScrollButton();
			return;
		}
		emptyState.style.display = 'none';
		typesTable.classList.remove('hidden');

		const fragment = document.createDocumentFragment();
		filtered.forEach(({ t }) => {
			const err = validateType(t);
			const globalIndex = types.indexOf(t);
			const isSelected = selectedIndices.has(globalIndex);
			fragment.appendChild(makeDataRow(t, globalIndex, err, isSelected));
		});
		tableBody.innerHTML = '';
		tableBody.appendChild(fragment);
		updateBulkBar();
		updateScrollButton();
	}

	function showContextMenu(x, y, rowIndex) {
		contextMenuTargetIndex = rowIndex;
		contextMenu.style.left = x + 'px';
		contextMenu.style.top = y + 'px';
		if (contextBulkEdit) {
			// Кнопка массового изменения только когда выбрано больше одного элемента
			contextBulkEdit.classList.toggle('hidden', selectedIndices.size <= 1);
		}
		contextMenu.classList.remove('hidden');
	}

	function hideContextMenu() {
		contextMenu.classList.add('hidden');
	}

	function deleteTypes(indices) {
		const sorted = Array.from(indices).sort((a, b) => b - a);
		sorted.forEach(idx => types.splice(idx, 1));
		selectedIndices.clear();
		renderCategoryFilter();
		renderTable();
		renderStats();
		fillCategoryDatalist();
		updateBulkBar();
		showToast('Удалено: ' + sorted.length, 'success');
	}

	contextRemoveSpawn.addEventListener('click', () => {
		hideContextMenu();
		const indices = selectedIndices.size > 0 ? selectedIndices : (contextMenuTargetIndex >= 0 ? new Set([contextMenuTargetIndex]) : new Set());
		indices.forEach(idx => {
			const t = types[idx];
			if (t) { t.min = '0'; t.nominal = '0'; }
		});
		renderTable();
		renderStats();
		if (indices.size > 0) showToast('Убрано из спавна: ' + indices.size, 'success');
	});
	contextDelete.addEventListener('click', () => {
		hideContextMenu();
		if (selectedIndices.size > 0) {
			deleteTypes(selectedIndices);
		} else if (contextMenuTargetIndex >= 0) {
			deleteTypes(new Set([contextMenuTargetIndex]));
		}
	});

	if (contextBulkEdit) {
		contextBulkEdit.addEventListener('click', () => {
			hideContextMenu();
			if (selectedIndices.size > 1) {
				bulkEditBtn.click();
			}
		});
	}

	document.addEventListener('click', () => hideContextMenu());
	contextMenu.addEventListener('click', (e) => e.stopPropagation());

	bulkClearBtn.addEventListener('click', () => {
		selectedIndices.clear();
		updateBulkBar();
		renderTable();
	});

	bulkEditBtn.addEventListener('click', () => {
		if (selectedIndices.size === 0) return;
		$('bulkApplyNominal').checked = false;
		$('bulkApplyMin').checked = false;
		$('bulkApplyLifetime').checked = false;
		$('bulkApplyCategory').checked = false;
		$('bulkApplyUsage').checked = false;
		$('bulkApplyValue').checked = false;
		$('bulkNominal').value = '';
		$('bulkMin').value = '';
		$('bulkLifetime').value = '';
		$('bulkCategory').value = '';
		$('bulkUsage').value = '';
		$('bulkValue').value = '';
		const list = $('bulkCategoryList');
		list.innerHTML = '';
		Array.from(categoriesSet).sort().forEach(c => {
			const opt = document.createElement('option');
			opt.value = c;
			list.appendChild(opt);
		});
		bulkModal.classList.remove('hidden');
	});

	function applyBulkEdit() {
		const applyNominal = $('bulkApplyNominal').checked;
		const applyMin = $('bulkApplyMin').checked;
		const applyLifetime = $('bulkApplyLifetime').checked;
		const applyCategory = $('bulkApplyCategory').checked;
		const applyUsage = $('bulkApplyUsage').checked;
		const applyValue = $('bulkApplyValue').checked;
		if (!applyNominal && !applyMin && !applyLifetime && !applyCategory && !applyUsage && !applyValue) {
			showToast('Отметьте хотя бы одно поле.', 'error');
			return;
		}
		const nominal = $('bulkNominal').value.trim();
		const min = $('bulkMin').value.trim();
		const lifetime = $('bulkLifetime').value.trim();
		const category = $('bulkCategory').value.trim();
		const usage = $('bulkUsage').value.split(/\n/).map(s => s.trim()).filter(Boolean);
		const value = $('bulkValue').value.split(/\n/).map(s => s.trim()).filter(Boolean);
		let count = 0;
		selectedIndices.forEach(idx => {
			const t = types[idx];
			if (!t) return;
			if (applyNominal && nominal !== '') t.nominal = nominal;
			if (applyMin && min !== '') t.min = min;
			if (applyLifetime && lifetime !== '') t.lifetime = lifetime;
			if (applyCategory) t.category = category;
			if (applyUsage) t.usage = usage.slice();
			if (applyValue) t.value = value.slice();
			if (t.category) categoriesSet.add(t.category);
			count++;
		});
		bulkModal.classList.add('hidden');
		renderCategoryFilter();
		renderTable();
		renderStats();
		fillCategoryDatalist();
		updateBulkBar();
		showToast('Изменено типов: ' + count, 'success');
	}

	closeBulkModal.addEventListener('click', () => bulkModal.classList.add('hidden'));
	cancelBulkBtn.addEventListener('click', () => bulkModal.classList.add('hidden'));
	applyBulkBtn.addEventListener('click', applyBulkEdit);
	bulkModal.addEventListener('click', (e) => {
		if (e.target === bulkModal) bulkModal.classList.add('hidden');
	});

	if (selectAllCheckbox) {
		selectAllCheckbox.addEventListener('click', (e) => e.stopPropagation());
		selectAllCheckbox.addEventListener('change', () => {
			const filtered = getFilteredTypes();
			if (selectAllCheckbox.checked) filtered.forEach(({ t }) => selectedIndices.add(types.indexOf(t)));
			else filtered.forEach(({ t }) => selectedIndices.delete(types.indexOf(t)));
			updateBulkBar();
			renderTable();
		});
	}

	function renderStats() {
		let errTotal = 0;
		types.forEach(t => { errTotal += validateType(t).length; });
		errorCount.textContent = errTotal + ' ошибок';
		errorCount.classList.toggle('hidden', errTotal === 0);
	}

	function selectType(index, options) {
		selectedIndex = index;
		tableBody.querySelectorAll('tr').forEach(tr => tr.classList.toggle('active', parseInt(tr.dataset.index, 10) === index));
		const t = types[index];
		if (!t) return;
		editorModal.classList.remove('hidden');
		const fillWithDefaults = options && options.fillWithDefaults;
		const src = fillWithDefaults ? DEFAULT_TYPE : t;
		const clearDefaultHighlight = (el) => { if (el) el.classList.remove('field-default-filled'); };
		$(fieldIds.name).value = t.name || '';
		numberFields.forEach(id => {
			const f = $(id);
			if (!f) return;
			const key = f.dataset.field;
			f.value = (fillWithDefaults ? src[key] : t[key]) ?? '';
			f.classList.toggle('field-default-filled', fillWithDefaults);
			if (fillWithDefaults) f.oninput = () => { clearDefaultHighlight(f); f.oninput = null; };
		});
		const catEl = $(fieldIds.category);
		if (catEl) {
			catEl.value = fillWithDefaults ? (src.category || '') : (t.category || '');
			catEl.classList.toggle('field-default-filled', fillWithDefaults);
			if (fillWithDefaults) catEl.oninput = () => { clearDefaultHighlight(catEl); catEl.oninput = null; };
			syncCategoryFromInput();
		}
		const tagsEl = $(fieldIds.tags);
		if (tagsEl) {
			tagsEl.value = fillWithDefaults ? (src.tags || []).join('\n') : (t.tags || []).join('\n');
			tagsEl.classList.toggle('field-default-filled', fillWithDefaults);
			if (fillWithDefaults) tagsEl.oninput = () => { clearDefaultHighlight(tagsEl); tagsEl.oninput = null; };
			syncTagsFromTextarea();
		}
		const usageEl = $(fieldIds.usage);
		if (usageEl) {
			usageEl.value = fillWithDefaults ? (src.usage || []).join('\n') : (t.usage || []).join('\n');
			usageEl.classList.toggle('field-default-filled', fillWithDefaults);
			if (fillWithDefaults) usageEl.oninput = () => { clearDefaultHighlight(usageEl); usageEl.oninput = null; };
			syncUsageFromTextarea();
		}
		const valueEl = $(fieldIds.value);
		if (valueEl) {
			valueEl.value = fillWithDefaults ? (src.value || []).join('\n') : (t.value || []).join('\n');
			valueEl.classList.toggle('field-default-filled', fillWithDefaults);
			if (fillWithDefaults) valueEl.oninput = () => { clearDefaultHighlight(valueEl); valueEl.oninput = null; };
			// Обновляем чекбоксы тиров по текущему значению
			syncValueTiersFromTextarea();
		}
		Object.keys(FLAG_IDS).forEach(flagKey => {
			const cb = $(FLAG_IDS[flagKey]);
			if (cb) {
				cb.checked = (fillWithDefaults ? src.flags[flagKey] : t.flags[flagKey]) === '1';
				const label = cb.closest('label');
				if (label) {
					label.classList.toggle('field-default-filled', fillWithDefaults);
					if (fillWithDefaults) cb.onchange = () => { clearDefaultHighlight(label); cb.onchange = null; };
				}
			}
		});
		formErrors.classList.add('empty');
		formErrors.textContent = '';
	}

	function closeEditorPanel() {
		selectedIndex = -1;
		tableBody.querySelectorAll('tr.active').forEach(tr => tr.classList.remove('active'));
		editorModal.classList.add('hidden');
	}

	function collectFormData() {
		const t = types[selectedIndex];
		if (!t) return null;
		const data = { ...t };
		data.name = $(fieldIds.name).value.trim();
		numberFields.forEach(id => {
			const f = $(id);
			if (f && f.dataset.field) data[f.dataset.field] = f.value.trim();
		});
		data.category = $(fieldIds.category).value.trim();
		data.tags = $(fieldIds.tags).value.split(/\n/).map(s => s.trim()).filter(Boolean);
		data.usage = $(fieldIds.usage).value.split(/\n/).map(s => s.trim()).filter(Boolean);
		data.value = $(fieldIds.value).value.split(/\n/).map(s => s.trim()).filter(Boolean);
		Object.keys(FLAG_IDS).forEach(flagKey => {
			const cb = $(FLAG_IDS[flagKey]);
			data.flags = data.flags || {};
			data.flags[flagKey] = cb && cb.checked ? '1' : '0';
		});
		return data;
	}

	function applyFormToType() {
		const data = collectFormData();
		if (!data || selectedIndex < 0) return;
		types[selectedIndex] = data;
		if (data.category) categoriesSet.add(data.category);
		renderCategoryFilter();
		renderTable();
		renderStats();
		formErrors.classList.add('empty');
		formErrors.textContent = '';
		showToast('Сохранено.', 'success');
		closeEditorPanel();
	}

	function showFormErrors(errors) {
		formErrors.classList.remove('empty');
		formErrors.textContent = errors.join('\n');
	}

	editorForm.addEventListener('submit', (e) => {
		e.preventDefault();
		const data = collectFormData();
		if (!data) return;
		const err = validateType(data);
		if (err.length) {
			showFormErrors(err);
			return;
		}
		applyFormToType();
	});

	closeEditor.addEventListener('click', closeEditorPanel);
	editorModal.addEventListener('click', (e) => {
		if (e.target === editorModal) closeEditorPanel();
	});
	revertBtn.addEventListener('click', (e) => {
		e.preventDefault();
		closeEditorPanel();
	});

	searchInput.addEventListener('input', () => renderTable());
	categoryFilter.addEventListener('change', () => renderTable());

	typesTable.addEventListener('click', (e) => {
		const th = e.target.closest('th.sortable');
		if (!th || !th.dataset.sort) return;
		const col = th.dataset.sort;
		if (sortCol === col) sortDir = -sortDir; else { sortCol = col; sortDir = 1; }
		typesTable.querySelectorAll('th.sortable').forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
		th.classList.add(sortDir === 1 ? 'sort-asc' : 'sort-desc');
		renderTable();
	});

	function openMassAddParamsModal(allNames) {
		if (allNames.length === 0) {
			showToast('Нет имён для добавления.', 'error');
			return;
		}
		const newNames = allNames.filter(n => !types.some(t => t.name === n));
		const duplicateNames = allNames.filter(n => types.some(t => t.name === n));
		massAddNamesList = newNames;
		massAddDuplicateChoices = {};
		duplicateNames.forEach(n => { massAddDuplicateChoices[n] = 'keep'; });
		massAddNames.innerHTML = massAddNamesList.map(n => '<span>' + escapeHtml(n) + '</span>').join('');
		$('massAddHint').textContent = 'Новых: ' + massAddNamesList.length + (duplicateNames.length ? ', дубликатов: ' + duplicateNames.length : '') + '. Настройте параметры спавна.';
		if (duplicateNames.length > 0) {
			massAddDuplicatesSection.classList.remove('hidden');
			massAddDuplicatesList.innerHTML = '';
			duplicateNames.forEach(name => {
				const div = document.createElement('div');
				div.className = 'mass-add-duplicate-item';
				div.innerHTML = '<span class="dup-name">' + escapeHtml(name) + '</span><div class="dup-actions"><button type="button" class="btn btn-outline dup-action active" data-action="keep">Оставить существующий</button><button type="button" class="btn btn-outline dup-action" data-action="replace">Заменить</button></div>';
				div.querySelectorAll('.dup-action').forEach(btn => {
					btn.addEventListener('click', () => {
						div.querySelectorAll('.dup-action').forEach(b => b.classList.remove('active'));
						btn.classList.add('active');
						massAddDuplicateChoices[name] = btn.dataset.action;
					});
				});
				massAddDuplicatesList.appendChild(div);
			});
		} else {
			massAddDuplicatesSection.classList.add('hidden');
		}
		$('massAddNominal').value = DEFAULT_TYPE.nominal;
		$('massAddLifetime').value = DEFAULT_TYPE.lifetime;
		$('massAddRestock').value = DEFAULT_TYPE.restock;
		$('massAddMin').value = DEFAULT_TYPE.min;
		$('massAddQuantmin').value = DEFAULT_TYPE.quantmin;
		$('massAddQuantmax').value = DEFAULT_TYPE.quantmax;
		$('massAddCost').value = DEFAULT_TYPE.cost;
		['massAddFlagCargo','massAddFlagHoarder','massAddFlagMap','massAddFlagPlayer','massAddFlagCrafted','massAddFlagDeloot'].forEach(id => {
			const cb = $(id);
			if (cb) cb.checked = DEFAULT_TYPE.flags[cb.dataset.flag] === '1';
		});
		$('massAddCategory').value = '';
		$('massAddUsage').value = '';
		$('massAddValue').value = '';
		const list = $('massAddCategoryList');
		list.innerHTML = '';
		Array.from(categoriesSet).sort().forEach(c => {
			const opt = document.createElement('option');
			opt.value = c;
			list.appendChild(opt);
		});
		massAddSourceModal.classList.add('hidden');
		massAddModal.classList.remove('hidden');
	}

	massAddOpenBtn.addEventListener('click', () => {
		massAddSourceFile.value = '';
		massAddSourcePaste.value = '';
		massAddSourceModal.classList.remove('hidden');
	});

	closeMassAddSourceModal.addEventListener('click', () => massAddSourceModal.classList.add('hidden'));
	massAddSourceCancelBtn.addEventListener('click', () => massAddSourceModal.classList.add('hidden'));
	massAddSourceModal.addEventListener('click', (e) => { if (e.target === massAddSourceModal) massAddSourceModal.classList.add('hidden'); });

	massAddSourceContinueBtn.addEventListener('click', () => {
		const file = massAddSourceFile.files[0];
		const pasteText = massAddSourcePaste.value.trim();
		if (file) {
			const reader = new FileReader();
			reader.onload = () => {
				const allNames = parseConfigTypeTxt(reader.result);
				openMassAddParamsModal(allNames);
			};
			reader.readAsText(file, 'UTF-8');
			return;
		}
		if (pasteText) {
			const allNames = parseConfigTypeTxt(pasteText);
			openMassAddParamsModal(allNames);
			return;
		}
		showToast('Загрузите файл или вставьте список class name.', 'error');
	});

	massAddSourceFile.addEventListener('change', () => {
		// Можно оставить выбор файла; по кнопке «Продолжить» прочитаем
	});

	closeMassAddModal.addEventListener('click', () => massAddModal.classList.add('hidden'));
	cancelMassAddBtn.addEventListener('click', () => massAddModal.classList.add('hidden'));
	massAddModal.addEventListener('click', (e) => { if (e.target === massAddModal) massAddModal.classList.add('hidden'); });
	applyMassAddBtn.addEventListener('click', () => {
		const nominal = $('massAddNominal').value.trim() || DEFAULT_TYPE.nominal;
		const lifetime = $('massAddLifetime').value.trim() || DEFAULT_TYPE.lifetime;
		const restock = $('massAddRestock').value.trim() || DEFAULT_TYPE.restock;
		const min = $('massAddMin').value.trim() || DEFAULT_TYPE.min;
		const quantmin = $('massAddQuantmin').value.trim() || DEFAULT_TYPE.quantmin;
		const quantmax = $('massAddQuantmax').value.trim() || DEFAULT_TYPE.quantmax;
		const cost = $('massAddCost').value.trim() || DEFAULT_TYPE.cost;
		const category = $('massAddCategory').value.trim();
		const usage = $('massAddUsage').value.split(/\n/).map(s => s.trim()).filter(Boolean);
		const value = $('massAddValue').value.split(/\n/).map(s => s.trim()).filter(Boolean);
		const flags = {
			count_in_cargo: $('massAddFlagCargo').checked ? '1' : '0',
			count_in_hoarder: $('massAddFlagHoarder').checked ? '1' : '0',
			count_in_map: $('massAddFlagMap').checked ? '1' : '0',
			count_in_player: $('massAddFlagPlayer').checked ? '1' : '0',
			crafted: $('massAddFlagCrafted').checked ? '1' : '0',
			deloot: $('massAddFlagDeloot').checked ? '1' : '0'
		};
		let added = 0;
		let replaced = 0;
		massAddNamesList.forEach(name => {
			types.push({ name, nominal, lifetime, restock, min, quantmin, quantmax, cost, flags, category, usage: [...usage], value: [...value] });
			if (category) categoriesSet.add(category);
			added++;
		});
		Object.keys(massAddDuplicateChoices).forEach(name => {
			if (massAddDuplicateChoices[name] === 'replace') {
				const idx = types.findIndex(t => t.name === name);
				if (idx >= 0) {
					types[idx] = { name, nominal, lifetime, restock, min, quantmin, quantmax, cost, flags, category, usage: [...usage], value: [...value] };
					if (category) categoriesSet.add(category);
					replaced++;
				}
			}
		});
		massAddModal.classList.add('hidden');
		renderCategoryFilter();
		renderTable();
		renderStats();
		fillCategoryDatalist();
		exportBtn.disabled = false;
		duplicatesBtn.disabled = false;
		const msg = added ? 'Добавлено: ' + added + (replaced ? ', заменено: ' + replaced : '') : (replaced ? 'Заменено: ' + replaced : '');
		showToast(msg || 'Изменений нет.', 'success');
	});

	addSingleTypeBtn.addEventListener('click', () => {
		singleAddText.value = '';
		singleAddPreview.textContent = '';
		singleAddModal.classList.remove('hidden');
	});

	singleAddText.addEventListener('input', () => {
		const names = parseConfigTypeTxt(singleAddText.value);
		singleAddPreview.textContent = names.length ? 'Найден тип: ' + names.join(', ') : '';
	});

	closeSingleAddModal.addEventListener('click', () => singleAddModal.classList.add('hidden'));
	cancelSingleAddBtn.addEventListener('click', () => singleAddModal.classList.add('hidden'));
	singleAddModal.addEventListener('click', (e) => { if (e.target === singleAddModal) singleAddModal.classList.add('hidden'); });
	applySingleAddBtn.addEventListener('click', () => {
		const names = parseConfigTypeTxt(singleAddText.value);
		if (names.length === 0) {
			showToast('Config-Type не найден в тексте.', 'error');
			return;
		}
		const name = names[0];
		if (types.some(t => t.name === name)) {
			showToast('Тип "' + name + '" уже существует.', 'error');
			return;
		}
		types.push(createTypeFromDefaults(name));
		singleAddModal.classList.add('hidden');
		renderCategoryFilter();
		renderTable();
		renderStats();
		fillCategoryDatalist();
		exportBtn.disabled = false;
		duplicatesBtn.disabled = false;
		showToast('Добавлен тип: ' + name, 'success');
	});

	function updateScrollButton() {
		if (!scrollToBottomBtn) return;
		const tableAtBottom = tableWrap && tableWrap.scrollHeight > tableWrap.clientHeight && (tableWrap.scrollTop + tableWrap.clientHeight >= tableWrap.scrollHeight - 5);
		const pageAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 10;
		const atBottom = tableAtBottom || pageAtBottom;
		scrollToBottomBtn.textContent = atBottom ? '↑' : '↓';
		scrollToBottomBtn.title = atBottom ? 'Прокрутить вверх' : 'Прокрутить вниз';
	}
	if (scrollToBottomBtn) {
		scrollToBottomBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			const tableAtBottom = tableWrap && tableWrap.scrollHeight > tableWrap.clientHeight && (tableWrap.scrollTop + tableWrap.clientHeight >= tableWrap.scrollHeight - 5);
			const pageAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 10;
			const atBottom = tableAtBottom || pageAtBottom;
			if (atBottom) {
				if (tableWrap && tableWrap.scrollHeight > tableWrap.clientHeight) tableWrap.scrollTop = 0;
				window.scrollTo({ top: 0, behavior: 'smooth' });
			} else {
				if (tableWrap && tableWrap.scrollHeight > tableWrap.clientHeight) tableWrap.scrollTop = tableWrap.scrollHeight;
				window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
			}
			setTimeout(updateScrollButton, 350);
		});
		if (tableWrap) tableWrap.addEventListener('scroll', updateScrollButton);
		window.addEventListener('scroll', updateScrollButton);
		updateScrollButton();
	}

	fileInput.addEventListener('change', () => {
		const file = fileInput.files[0];
		if (!file) return;
		showToast('Загрузка и разбор XML...', '');
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const { types: newTypes, categories } = parseXml(reader.result);
				loadTypes(newTypes, categories);
				showToast(`Загружено ${newTypes.length} типов.`, 'success');
			} catch (err) {
				showToast(err.message, 'error');
			}
		};
		reader.readAsText(file, 'UTF-8');
		fileInput.value = '';
	});

	if (importXmlInput) {
		importXmlInput.addEventListener('change', () => {
			const file = importXmlInput.files[0];
			if (!file) return;
			showToast('Импорт XML...', '');
			const reader = new FileReader();
			reader.onload = () => {
				try {
					const { types: newTypes, categories } = parseXml(reader.result);
					if (!types.length) {
						loadTypes(newTypes, categories);
						showToast(`Импортировано ${newTypes.length} типов.`, 'success');
					} else {
						let added = 0;
						let skipped = 0;
						const existingNames = new Set(types.map(t => (t.name || '').trim()));
						newTypes.forEach(t => {
							const name = (t.name || '').trim();
							if (!name || existingNames.has(name)) {
								skipped++;
								return;
							}
							types.push(t);
							existingNames.add(name);
							if (t.category) categoriesSet.add(t.category);
							added++;
						});
						if (added) {
							renderCategoryFilter();
							renderTable();
							renderStats();
							fillCategoryDatalist();
							exportBtn.disabled = false;
							duplicatesBtn.disabled = false;
						}
						showToast(`Импортировано новых: ${added}, дубликатов: ${skipped}`, added ? 'success' : 'error');
					}
				} catch (err) {
					showToast(err.message, 'error');
				}
			};
			reader.readAsText(file, 'UTF-8');
			importXmlInput.value = '';
		});
	}

	if (toolsBtn && toolsMenu) {
		toolsBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			toolsMenu.classList.toggle('hidden');
		});
		document.addEventListener('click', () => {
			toolsMenu.classList.add('hidden');
		});
		toolsMenu.addEventListener('click', (e) => e.stopPropagation());
	}

	const vanillaXmlInput = $('vanillaXmlInput');
	if (vanillaXmlInput) {
		vanillaXmlInput.addEventListener('change', () => {
			const file = vanillaXmlInput.files[0];
			if (!file) return;
			if (!types.length) {
				showToast('Сначала загрузите ваш types.xml.', 'error');
				vanillaXmlInput.value = '';
				return;
			}
			showToast('Загрузка vanilla types...', '');
			const reader = new FileReader();
			reader.onload = () => {
				try {
					const { types: vanillaTypes } = parseXml(reader.result);
					const map = new Map();
					vanillaTypes.forEach(t => {
						const name = (t.name || '').trim();
						if (!name) return;
						if (!map.has(name)) map.set(name, t);
					});
					vanillaTypesMap = map;
					renderTable();
					showToast(`Vanilla types загружен, найдено ${vanillaTypesMap.size} типов.`, 'success');
				} catch (err) {
					showToast(err.message, 'error');
				}
			};
			reader.readAsText(file, 'UTF-8');
			vanillaXmlInput.value = '';
		});
	}

	function buildXml() {
		const lines = [
			'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
			'<types>'
		];
		types.forEach(t => {
			lines.push('\t<type name="' + escapeXmlAttr(t.name) + '">');
			lines.push('\t\t<nominal>' + escapeXmlText(t.nominal) + '</nominal>');
			lines.push('\t\t<lifetime>' + escapeXmlText(t.lifetime) + '</lifetime>');
			lines.push('\t\t<restock>' + escapeXmlText(t.restock) + '</restock>');
			lines.push('\t\t<min>' + escapeXmlText(t.min) + '</min>');
			lines.push('\t\t<quantmin>' + escapeXmlText(t.quantmin) + '</quantmin>');
			lines.push('\t\t<quantmax>' + escapeXmlText(t.quantmax) + '</quantmax>');
			lines.push('\t\t<cost>' + escapeXmlText(t.cost) + '</cost>');
			const f = t.flags || {};
			lines.push('\t\t<flags count_in_cargo="' + (f.count_in_cargo || '0') + '" count_in_hoarder="' + (f.count_in_hoarder || '0') + '" count_in_map="' + (f.count_in_map || '0') + '" count_in_player="' + (f.count_in_player || '0') + '" crafted="' + (f.crafted || '0') + '" deloot="' + (f.deloot || '0') + '" />');
			if (String(t.category || '').trim()) lines.push('\t\t<category name="' + escapeXmlAttr(t.category) + '" />');
			(t.tags || []).filter(tag => String(tag || '').trim()).forEach(tag => {
				lines.push('\t\t<tag name="' + escapeXmlAttr(tag) + '" />');
			});
			(t.usage || []).filter(u => String(u || '').trim()).forEach(u => lines.push('\t\t<usage name="' + escapeXmlAttr(u) + '" />'));
			(t.value || []).filter(v => String(v || '').trim()).forEach(v => lines.push('\t\t<value name="' + escapeXmlAttr(v) + '" />'));
			lines.push('\t</type>');
		});
		lines.push('</types>');
		return lines.join('\n');
	}

	function escapeXmlAttr(s) {
		return String(s)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}
	const DEFAULT_TYPE = {
		nominal: '0',
		lifetime: '3888000',
		restock: '1800',
		min: '0',
		quantmin: '-1',
		quantmax: '-1',
		cost: '100',
		flags: { count_in_cargo: '0', count_in_hoarder: '0', count_in_map: '1', count_in_player: '0', crafted: '0', deloot: '0' },
		category: '',
		tags: [],
		usage: [],
		value: []
	};

	function parseConfigTypeTxt(text) {
		const names = [];
		const re = /Config-Type:\s*(.+)/g;
		let m;
		while ((m = re.exec(text)) !== null) {
			const name = m[1].trim();
			if (name) names.push(name);
		}
		if (names.length > 0) return [...new Set(names)];
		// Просто список class name (по одному на строку)
		text.split(/\n/).forEach(line => {
			const name = line.trim();
			if (name) names.push(name);
		});
		return [...new Set(names)];
	}

	function createTypeFromDefaults(name) {
		return {
			name,
			nominal: DEFAULT_TYPE.nominal,
			lifetime: DEFAULT_TYPE.lifetime,
			restock: DEFAULT_TYPE.restock,
			min: DEFAULT_TYPE.min,
			quantmin: DEFAULT_TYPE.quantmin,
			quantmax: DEFAULT_TYPE.quantmax,
			cost: DEFAULT_TYPE.cost,
			flags: { ...DEFAULT_TYPE.flags },
			category: DEFAULT_TYPE.category,
			tags: [...DEFAULT_TYPE.tags],
			usage: [...DEFAULT_TYPE.usage],
			value: [...DEFAULT_TYPE.value]
		};
	}

	function escapeXmlText(s) {
		return String(s)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
	}

	exportBtn.addEventListener('click', () => {
		const blob = new Blob([buildXml()], { type: 'application/xml; charset=utf-8' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = 'types.xml';
		a.click();
		URL.revokeObjectURL(a.href);
		showToast('Файл сохранён.', 'success');
	});

	function openErrorsModal() {
		const byType = [];
		let total = 0;
		types.forEach((t, i) => {
			const err = validateType(t);
			if (err.length) {
				total += err.length;
				byType.push({ name: t.name, index: i, errors: err });
			}
		});
		if (byType.length === 0) {
			errorsHint.textContent = 'Ошибок не найдено.';
			errorsList.innerHTML = '';
			if (fixAllErrorsBtn) fixAllErrorsBtn.style.display = 'none';
		} else {
			errorsHint.textContent = `Найдено ${total} ошибок в ${byType.length} типах. Клик — открыть редактор с подставленными значениями по умолчанию, нажмите «Сохранить» для применения.`;
			const fragment = document.createDocumentFragment();
			byType.forEach(({ name, index, errors }) => {
				const div = document.createElement('div');
				div.className = 'error-group';
				div.dataset.index = String(index);
				div.innerHTML = '<span class="error-group-name">' + escapeHtml(name) + '</span><div class="error-group-errors">' + escapeHtml(errors.join('; ')) + '</div>';
				div.addEventListener('click', () => {
					errorsModal.classList.add('hidden');
					selectType(index, { fillWithDefaults: true });
				});
				fragment.appendChild(div);
			});
			errorsList.innerHTML = '';
			errorsList.appendChild(fragment);
			if (fixAllErrorsBtn) fixAllErrorsBtn.style.display = '';
		}
		errorsModal.classList.remove('hidden');
	}

	function fixAllErrors() {
		const errorIndices = [];
		types.forEach((t, i) => {
			const err = validateType(t);
			if (err.length) errorIndices.push(i);
		});
		if (errorIndices.length === 0) {
			showToast('Ошибок не найдено.', 'error');
			return;
		}
		errorIndices.forEach(idx => {
			const t = types[idx];
			if (!t) return;
			t.nominal = DEFAULT_TYPE.nominal;
			t.lifetime = DEFAULT_TYPE.lifetime;
			t.restock = DEFAULT_TYPE.restock;
			t.min = DEFAULT_TYPE.min;
			t.quantmin = DEFAULT_TYPE.quantmin;
			t.quantmax = DEFAULT_TYPE.quantmax;
			t.cost = DEFAULT_TYPE.cost;
			t.flags = { ...DEFAULT_TYPE.flags };
			if (!DEFAULT_TYPE.category) t.category = '';
			if (DEFAULT_TYPE.usage.length === 0) t.usage = [];
			if (DEFAULT_TYPE.value.length === 0) t.value = [];
		});
		renderCategoryFilter();
		renderTable();
		renderStats();
		openErrorsModal();
		showToast('Исправлено типов: ' + errorIndices.length, 'success');
	}

	validateBtn.addEventListener('click', () => {
		if (!types.length) {
			showToast('Нет загруженных типов.', 'error');
			return;
		}
		openErrorsModal();
		renderStats();
	});

	errorCount.addEventListener('click', () => {
		if (types.length && !errorCount.classList.contains('hidden')) openErrorsModal();
	});
	errorCount.style.cursor = 'pointer';
	errorCount.title = 'Показать ошибки';

	closeErrorsModal.addEventListener('click', () => errorsModal.classList.add('hidden'));
	closeErrorsBtn.addEventListener('click', () => errorsModal.classList.add('hidden'));
	if (fixAllErrorsBtn) fixAllErrorsBtn.addEventListener('click', fixAllErrors);
	errorsModal.addEventListener('click', (e) => {
		if (e.target === errorsModal) errorsModal.classList.add('hidden');
	});

	function findDuplicateGroups() {
		const byName = new Map();
		types.forEach((t, i) => {
			const name = (t.name || '').trim();
			if (!name) return;
			if (!byName.has(name)) byName.set(name, []);
			byName.get(name).push(i);
		});
		const groups = [];
		byName.forEach((indices, name) => {
			if (indices.length > 1) groups.push({ name, indices });
		});
		return groups;
	}

	function entrySummary(t) {
		const parts = ['nominal=' + t.nominal, 'cat=' + (t.category || '')];
		if ((t.usage || []).length) parts.push('usage=' + t.usage.join(','));
		if ((t.value || []).length) parts.push('value=' + t.value.join(','));
		return parts.join(' | ');
	}

	function openDuplicatesModal() {
		duplicateGroups = findDuplicateGroups();
		const hint = $('duplicatesHint');
		if (duplicateGroups.length === 0) {
			hint.textContent = 'Дубликатов по type name не найдено.';
			duplicatesList.innerHTML = '';
			applyDuplicatesBtn.style.display = 'none';
		} else {
			hint.textContent = 'Выберите для каждой группы запись «Оставить», остальные будут удалены по кнопке.';
			applyDuplicatesBtn.style.display = '';
			const fragment = document.createDocumentFragment();
			duplicateGroups.forEach((group, gIdx) => {
				const wrap = document.createElement('div');
				wrap.className = 'duplicate-group';
				wrap.innerHTML = '<div class="duplicate-group-title">' + escapeHtml(group.name) + ' <span class="hint">(' + group.indices.length + ' шт.)</span></div><div class="duplicate-entries" data-group="' + gIdx + '"></div>';
				const entriesEl = wrap.querySelector('.duplicate-entries');
				group.indices.forEach((idx, pos) => {
					const t = types[idx];
					const entry = document.createElement('div');
					entry.className = 'duplicate-entry';
					entry.dataset.index = String(idx);
					const radioId = 'dup_keep_' + gIdx + '_' + pos;
					entry.innerHTML =
						'<label><input type="radio" name="dup_keep_' + gIdx + '" value="' + idx + '" ' + (pos === 0 ? 'checked' : '') + ' id="' + radioId + '"> Оставить</label>' +
						'<span class="duplicate-entry-summary" title="' + escapeHtml(entrySummary(t)) + '">' + escapeHtml(entrySummary(t)) + '</span>' +
						'<button type="button" class="btn btn-outline btn-remove" data-index="' + idx + '" data-group="' + gIdx + '">Удалить</button>';
					entriesEl.appendChild(entry);
				});
				fragment.appendChild(wrap);
			});
			duplicatesList.innerHTML = '';
			duplicatesList.appendChild(fragment);
			duplicatesList.querySelectorAll('.btn-remove').forEach(btn => {
				btn.addEventListener('click', () => {
					const groupIdx = parseInt(btn.dataset.group, 10);
					const indexToRemove = parseInt(btn.dataset.index, 10);
					const group = duplicateGroups[groupIdx];
					const keepRadio = duplicatesList.querySelector('input[name="dup_keep_' + groupIdx + '"]:checked');
					if (keepRadio && parseInt(keepRadio.value, 10) === indexToRemove) {
						showToast('Сначала выберите «Оставить» для другой записи.', 'error');
						return;
					}
					types.splice(indexToRemove, 1);
					duplicateGroups = findDuplicateGroups();
					openDuplicatesModal();
					renderTable();
					renderStats();
					renderCategoryFilter();
					fillCategoryDatalist();
					showToast('Запись удалена.', 'success');
				});
			});
		}
		duplicatesModal.classList.remove('hidden');
	}

	function applyDuplicatesRemoval() {
		const indicesToRemove = [];
		duplicateGroups.forEach((group, gIdx) => {
			const checked = duplicatesList.querySelector('input[name="dup_keep_' + gIdx + '"]:checked');
			const keepIndex = checked ? parseInt(checked.value, 10) : group.indices[0];
			group.indices.forEach(idx => {
				if (idx !== keepIndex) indicesToRemove.push(idx);
			});
		});
		indicesToRemove.sort((a, b) => b - a);
		indicesToRemove.forEach(idx => types.splice(idx, 1));
		duplicateGroups = [];
		duplicatesModal.classList.add('hidden');
		renderCategoryFilter();
		renderTable();
		renderStats();
		fillCategoryDatalist();
		showToast('Удалено дубликатов: ' + indicesToRemove.length, 'success');
	}

	duplicatesBtn.addEventListener('click', () => {
		if (!types.length) return;
		openDuplicatesModal();
	});
	closeDuplicatesModal.addEventListener('click', () => duplicatesModal.classList.add('hidden'));
	closeDuplicatesBtn.addEventListener('click', () => duplicatesModal.classList.add('hidden'));
	applyDuplicatesBtn.addEventListener('click', applyDuplicatesRemoval);
	duplicatesModal.addEventListener('click', (e) => {
		if (e.target === duplicatesModal) duplicatesModal.classList.add('hidden');
	});

	function showToast(message, type) {
		const existing = document.querySelector('.toast');
		if (existing) existing.remove();
		const el = document.createElement('div');
		el.className = 'toast ' + (type || '');
		el.textContent = message;
		document.body.appendChild(el);
		setTimeout(() => el.remove(), 4000);
	}

	function fillCategoryDatalist() {
		const list = $('categoryList');
		if (!list) return;
		list.innerHTML = '';
		Array.from(categoriesSet).sort().forEach(c => {
			const opt = document.createElement('option');
			opt.value = c;
			list.appendChild(opt);
		});
	}
})();
