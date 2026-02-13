(function () {
	'use strict';

	let config = null;
	let flatProducts = [];
	let selectedIndex = -1;
	let selectedIndices = new Set();
	let contextMenuTargetIndex = -1;
	let sortCol = '';
	let sortDir = 1;

	const $ = (id) => document.getElementById(id);

	function parseProduct(str, categoryName) {
		const parts = (str || '').split(',');
		return {
			categoryName,
			raw: str,
			className: parts[0] || '',
			coefficient: parts[1] ?? '',
			maxStock: parts[2] ?? '',
			tradeQuantity: parts[3] ?? '',
			buyPrice: parts[4] ?? '',
			sellPrice: parts[5] ?? ''
		};
	}

	function productToStr(p) {
		return [p.className, p.coefficient, p.maxStock, p.tradeQuantity, p.buyPrice, p.sellPrice].join(',');
	}

	function flattenConfig(cfg) {
		const result = [];
		(cfg.TraderCategories || []).forEach(cat => {
			(cat.Products || []).forEach(raw => {
				result.push({
					...parseProduct(raw, cat.CategoryName),
					catIndex: config.TraderCategories.indexOf(cat),
					prodIndex: cat.Products.indexOf(raw)
				});
			});
		});
		return result;
	}

	function getFilteredProducts() {
		const q = ($('tpSearchInput').value || '').trim().toLowerCase();
		const cat = ($('tpCategoryFilter').value || '').trim();
		let list = flatProducts.filter(p => {
			if (q && !(p.className || '').toLowerCase().includes(q)) return false;
			if (cat && p.categoryName !== cat) return false;
			return true;
		});
		if (sortCol) {
			const dir = sortDir;
			const key = sortCol;
			list = list.slice().sort((a, b) => {
				let va = a[key] ?? '', vb = b[key] ?? '';
				const na = parseFloat(va), nb = parseFloat(vb);
				const numSort = !isNaN(na) && !isNaN(nb);
				let cmp = numSort ? (na < nb ? -1 : na > nb ? 1 : 0) : String(va).localeCompare(String(vb), undefined, { numeric: true });
				return dir * cmp;
			});
		}
		return list;
	}

	function renderCategoryFilter() {
		const sel = $('tpCategoryFilter');
		if (!sel) return;
		const cats = [...new Set(flatProducts.map(p => p.categoryName).filter(Boolean))].sort();
		const saved = sel.value;
		sel.innerHTML = '<option value="">Категория: все</option>' + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
		if (cats.includes(saved)) sel.value = saved;
	}

	function escapeHtml(s) {
		const div = document.createElement('div');
		div.textContent = String(s ?? '');
		return div.innerHTML;
	}

	function renderTable() {
		const filtered = getFilteredProducts();
		const tbody = $('tpTableBody');
		const table = $('tpTable');
		const empty = $('tpEmptyState');
		if (!tbody || !config) return;
		table.classList.toggle('hidden', flatProducts.length === 0);
		empty.style.display = flatProducts.length ? 'none' : 'block';
		tbody.innerHTML = '';
		filtered.forEach((p, i) => {
			const globalIdx = flatProducts.indexOf(p);
			const row = document.createElement('tr');
			row.dataset.index = String(globalIdx);
			row.dataset.filteredIndex = String(i);
			const isSelected = selectedIndices.has(globalIdx);
			if (isSelected) row.classList.add('active');
			row.innerHTML = `
				<td class="td-checkbox"><input type="checkbox" class="tp-row-cb" data-index="${globalIdx}"></td>
				<td>${escapeHtml(p.categoryName)}</td>
				<td class="td-mono">${escapeHtml(p.className)}</td>
				<td>${escapeHtml(p.coefficient)}</td>
				<td>${escapeHtml(p.maxStock)}</td>
				<td>${escapeHtml(p.tradeQuantity)}</td>
				<td>${escapeHtml(p.buyPrice)}</td>
				<td>${escapeHtml(p.sellPrice)}</td>
			`;
			row.querySelector('.tp-row-cb').checked = isSelected;
			row.querySelector('.tp-row-cb').addEventListener('change', (e) => {
				e.stopPropagation();
				if (e.target.checked) selectedIndices.add(globalIdx);
				else selectedIndices.delete(globalIdx);
				renderTable();
			});
			row.addEventListener('click', (e) => {
				if (e.target.type === 'checkbox') return;
				selectedIndex = globalIdx;
				$('tpTableBody').querySelectorAll('tr').forEach(tr => tr.classList.remove('active'));
				row.classList.add('active');
				$('tpEditorModal').classList.remove('hidden');
				fillEditorForm(flatProducts[globalIdx]);
			});
			row.addEventListener('contextmenu', (e) => {
				e.preventDefault();
				contextMenuTargetIndex = globalIdx;
				const menu = $('tpContextMenu');
				menu.style.left = e.clientX + 'px';
				menu.style.top = e.clientY + 'px';
				menu.classList.remove('hidden');
				const delSel = $('tpContextDeleteSelected');
				const editSel = $('tpContextEditSelected');
				const sep = $('tpContextSep');
				const showBulk = selectedIndices.size > 0;
				if (delSel) delSel.style.display = showBulk ? '' : 'none';
				if (editSel) editSel.style.display = showBulk ? '' : 'none';
				if (sep) sep.style.display = showBulk ? '' : 'none';
			});
			tbody.appendChild(row);
		});
		const selAll = $('tpSelectAll');
		if (selAll) {
			const filtered = getFilteredProducts();
			const allSelected = filtered.length > 0 && filtered.every(p => selectedIndices.has(flatProducts.indexOf(p)));
			const someSelected = filtered.some(p => selectedIndices.has(flatProducts.indexOf(p)));
			selAll.checked = allSelected;
			selAll.indeterminate = someSelected && !allSelected;
		}
		updateStats();
	}

	function fillEditorForm(p) {
		$('tpEditCategory').value = p.categoryName || '';
		$('tpEditClassName').value = p.className || '';
		$('tpEditMinStock').value = p.coefficient ?? '';
		$('tpEditMaxStock').value = p.maxStock ?? '';
		$('tpEditHealth').value = p.tradeQuantity ?? '';
		$('tpEditBuyPrice').value = p.buyPrice ?? '';
		$('tpEditSellPrice').value = p.sellPrice ?? '';
	}

	function fillCategorySelects() {
		const cats = (config.TraderCategories || []).map(c => c.CategoryName);
		const opts = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
		const optsWithEmpty = '<option value="">— Выберите —</option>' + opts;
		['tpEditCategory', 'tpAddCategory', 'tpMassAddCategory', 'tpBulkEditCategory'].forEach(id => {
			const el = $(id);
			if (el) el.innerHTML = optsWithEmpty;
		});
		const editSel = $('tpEditCatSelect');
		if (editSel) editSel.innerHTML = opts;
	}

	function updateProductInConfig(catIndex, prodIndex, newRaw) {
		config.TraderCategories[catIndex].Products[prodIndex] = newRaw;
		const p = flatProducts.find(x => x.catIndex === catIndex && x.prodIndex === prodIndex);
		if (p) {
			const parsed = parseProduct(newRaw, config.TraderCategories[catIndex].CategoryName);
			Object.assign(p, parsed);
			p.raw = newRaw;
		}
		flatProducts = flattenConfig(config);
	}

	function validateProduct(p) {
		const errs = [];
		const sellNum = parseFloat(String(p.sellPrice ?? '').trim());
		const buyNum = parseFloat(String(p.buyPrice ?? '').trim());
		const sellValid = !isNaN(sellNum) && sellNum !== -1;
		const buyValid = !isNaN(buyNum) && buyNum !== -1;
		if (sellValid && buyValid && sellNum > buyNum) {
			errs.push('Цена продажи (' + p.sellPrice + ') выше цены покупки (' + p.buyPrice + ')');
		}
		return errs;
	}

	function collectValidationErrors() {
		const byProduct = [];
		flatProducts.forEach((p, i) => {
			const errs = validateProduct(p);
			if (errs.length) byProduct.push({ product: p, index: i, errors: errs });
		});
		return byProduct;
	}

	function openErrorsModal() {
		const errors = collectValidationErrors();
		const total = errors.reduce((s, e) => s + e.errors.length, 0);
		const hint = $('tpErrorsHint');
		const list = $('tpErrorsList');
		if (!hint || !list) return;
		if (errors.length === 0) {
			hint.textContent = 'Ошибок не найдено.';
			list.innerHTML = '';
		} else {
			hint.textContent = 'Найдено ' + total + ' ошибок в ' + errors.length + ' продуктах. Цена продажи не должна быть выше цены покупки.';
			const fragment = document.createDocumentFragment();
			errors.forEach(({ product, index, errors: errs }) => {
				const div = document.createElement('div');
				div.className = 'error-group';
				div.dataset.index = String(index);
				div.innerHTML = '<span class="error-group-name">' + escapeHtml(product.className) + ' (' + escapeHtml(product.categoryName) + ')</span><div class="error-group-errors">' + escapeHtml(errs.join('; ')) + '</div>';
				div.addEventListener('click', () => {
					$('tpErrorsModal').classList.add('hidden');
					selectedIndex = index;
					$('tpEditorModal').classList.remove('hidden');
					fillEditorForm(flatProducts[index]);
				});
				fragment.appendChild(div);
			});
			list.innerHTML = '';
			list.appendChild(fragment);
		}
		$('tpErrorsModal').classList.remove('hidden');
	}

	function updateStats() {
		const c = $('tpProductCount');
		if (c) c.textContent = flatProducts.length + ' продуктов';
		const selCount = $('tpSelectedCount');
		if (selCount) {
			selCount.textContent = selectedIndices.size + ' выделено';
			selCount.classList.toggle('hidden', selectedIndices.size === 0);
		}
		const errCount = $('tpErrorCount');
		if (errCount) {
			const errors = collectValidationErrors();
			const total = errors.reduce((s, e) => s + e.errors.length, 0);
			errCount.textContent = total + ' ошибок';
			errCount.classList.toggle('hidden', total === 0);
		}
		const dupBtn = $('tpDuplicatesBtn');
		if (dupBtn) dupBtn.disabled = flatProducts.length === 0;
		const compareBtn = $('tpCompareTypesBtn');
		if (compareBtn) compareBtn.disabled = flatProducts.length === 0;
	}

	function syncSettingsToConfig() {
		if (!config) return;
		config.Version = ($('tpVersion').value || '').trim() || config.Version;
		config.EnableAutoCalculation = $('tpEnableAutoCalc').checked ? 1 : 0;
		config.EnableAutoDestockAtRestart = $('tpEnableAutoDestock').checked ? 1 : 0;
		config.EnableDefaultTraderStock = $('tpEnableDefaultStock').checked ? 1 : 0;
	}

	function loadConfig(jsonStr) {
		try {
			config = JSON.parse(jsonStr);
		} catch (e) {
			alert('Ошибка парсинга JSON: ' + e.message);
			return false;
		}
		if (!config.TraderCategories) config.TraderCategories = [];
		flatProducts = flattenConfig(config);
		$('tpVersion').value = config.Version || '';
		$('tpEnableAutoCalc').checked = config.EnableAutoCalculation === 1;
		$('tpEnableAutoDestock').checked = config.EnableAutoDestockAtRestart === 1;
		$('tpEnableDefaultStock').checked = config.EnableDefaultTraderStock === 1;
		const settingsBar = document.querySelector('.tp-settings-bar');
		if (settingsBar) settingsBar.style.display = 'flex';
		fillCategorySelects();
		renderCategoryFilter();
		renderTable();
		$('tpExportBtn').disabled = false;
		return true;
	}

	function buildJson() {
		syncSettingsToConfig();
		return JSON.stringify(config, null, 4);
	}

	function showToast(msg, type) {
		const existing = document.querySelector('.toast');
		if (existing) existing.remove();
		const toast = document.createElement('div');
		toast.className = 'toast ' + (type || '');
		toast.textContent = msg;
		document.body.appendChild(toast);
		setTimeout(() => toast.remove(), 4000);
	}

	$('tpFileInput').addEventListener('change', function () {
		const file = this.files[0];
		if (!file) return;
		const r = new FileReader();
		r.onload = () => {
			if (loadConfig(r.result)) showToast('Файл загружен.', 'success');
			this.value = '';
		};
		r.readAsText(file, 'UTF-8');
		this.value = '';
	});

	$('tpExportBtn').addEventListener('click', () => {
		if (!config) return;
		const blob = new Blob([buildJson()], { type: 'application/json' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = 'TraderPlusPriceConfig.json';
		a.click();
		URL.revokeObjectURL(a.href);
		showToast('Файл сохранён.', 'success');
	});

	$('tpSelectAll')?.addEventListener('change', (e) => {
		const checked = e.target.checked;
		const filtered = getFilteredProducts();
		if (checked) {
			filtered.forEach(p => selectedIndices.add(flatProducts.indexOf(p)));
		} else {
			filtered.forEach(p => selectedIndices.delete(flatProducts.indexOf(p)));
		}
		renderTable();
	});

	function clearSelection() {
		selectedIndices.clear();
		const selAll = $('tpSelectAll');
		if (selAll) selAll.checked = false;
	}

	$('tpSearchInput').addEventListener('input', () => {
		clearSelection();
		renderTable();
	});
	$('tpCategoryFilter').addEventListener('change', () => {
		clearSelection();
		renderTable();
	});

	$('tpTable')?.addEventListener('click', (e) => {
		const th = e.target.closest('th.sortable');
		if (!th) return;
		const col = th.dataset.sort;
		if (sortCol === col) sortDir = -sortDir;
		else { sortCol = col; sortDir = 1; }
		$('tpTable').querySelectorAll('th.sortable').forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
		th.classList.add(sortDir === 1 ? 'sort-asc' : 'sort-desc');
		renderTable();
	});

	function validatePriceFields(buyPrice, sellPrice) {
		const sellNum = parseFloat(String(sellPrice ?? '').trim());
		const buyNum = parseFloat(String(buyPrice ?? '').trim());
		const sellValid = !isNaN(sellNum) && sellNum !== -1;
		const buyValid = !isNaN(buyNum) && buyNum !== -1;
		return !(sellValid && buyValid && sellNum > buyNum);
	}

	$('tpEditorForm').addEventListener('submit', (e) => {
		e.preventDefault();
		if (selectedIndex < 0 || !flatProducts[selectedIndex]) return;
		const p = flatProducts[selectedIndex];
		const newCat = ($('tpEditCategory').value || '').trim();
		const newClassName = ($('tpEditClassName').value || '').trim();
		if (!newClassName) {
			showToast('ClassName не может быть пустым.', 'error');
			return;
		}
		const buyPrice = $('tpEditBuyPrice').value;
		const sellPrice = $('tpEditSellPrice').value;
		if (!validatePriceFields(buyPrice, sellPrice)) {
			showToast('Цена продажи не должна быть выше цены покупки.', 'error');
			return;
		}
		const newRaw = [newClassName, $('tpEditMinStock').value, $('tpEditMaxStock').value, $('tpEditHealth').value, buyPrice, sellPrice].join(',');
		if (newCat !== p.categoryName) {
			const catIdx = config.TraderCategories.findIndex(c => c.CategoryName === newCat);
			if (catIdx < 0) {
				showToast('Категория не найдена.', 'error');
				return;
			}
			config.TraderCategories[p.catIndex].Products.splice(p.prodIndex, 1);
			config.TraderCategories[catIdx].Products.push(newRaw);
		} else {
			config.TraderCategories[p.catIndex].Products[p.prodIndex] = newRaw;
		}
		flatProducts = flattenConfig(config);
		fillCategorySelects();
		renderCategoryFilter();
		renderTable();
		$('tpEditorModal').classList.add('hidden');
		showToast('Сохранено.', 'success');
	});

	$('tpCloseEditor').addEventListener('click', () => $('tpEditorModal').classList.add('hidden'));
	$('tpCancelEdit').addEventListener('click', () => $('tpEditorModal').classList.add('hidden'));
	$('tpEditorModal').addEventListener('click', (e) => { if (e.target.id === 'tpEditorModal') $('tpEditorModal').classList.add('hidden'); });

	$('tpAddProductForm').addEventListener('submit', (e) => {
		e.preventDefault();
		const catName = ($('tpAddCategory').value || '').trim();
		const className = ($('tpAddClassName').value || '').trim();
		if (!className) {
			showToast('ClassName не может быть пустым.', 'error');
			return;
		}
		if (!catName) {
			showToast('Выберите категорию.', 'error');
			return;
		}
		const buyPrice = $('tpAddBuyPrice').value;
		const sellPrice = $('tpAddSellPrice').value;
		if (!validatePriceFields(buyPrice, sellPrice)) {
			showToast('Цена продажи не должна быть выше цены покупки.', 'error');
			return;
		}
		const cat = config.TraderCategories.find(c => c.CategoryName === catName);
		if (!cat) {
			showToast('Категория не найдена.', 'error');
			return;
		}
		const raw = [className, $('tpAddMinStock').value, $('tpAddMaxStock').value, $('tpAddHealth').value, buyPrice, sellPrice].join(',');
		cat.Products.push(raw);
		flatProducts = flattenConfig(config);
		fillCategorySelects();
		renderCategoryFilter();
		renderTable();
		$('tpAddProductModal').classList.add('hidden');
		$('tpAddClassName').value = '';
		showToast('Продукт добавлен.', 'success');
	});

	$('tpCloseAddModal').addEventListener('click', () => $('tpAddProductModal').classList.add('hidden'));
	$('tpCancelAdd').addEventListener('click', () => $('tpAddProductModal').classList.add('hidden'));
	$('tpAddProductModal').addEventListener('click', (e) => { if (e.target.id === 'tpAddProductModal') $('tpAddProductModal').classList.add('hidden'); });

	$('tpAddCategoryForm').addEventListener('submit', (e) => {
		e.preventDefault();
		const name = ($('tpAddCategoryName').value || '').trim();
		if (!name) {
			showToast('Введите название категории.', 'error');
			return;
		}
		config.TraderCategories.push({ CategoryName: name, Products: [] });
		flatProducts = flattenConfig(config);
		fillCategorySelects();
		renderCategoryFilter();
		$('tpAddCategoryModal').classList.add('hidden');
		$('tpAddCategoryName').value = '';
		showToast('Категория добавлена.', 'success');
	});

	$('tpCloseAddCatModal').addEventListener('click', () => $('tpAddCategoryModal').classList.add('hidden'));
	$('tpCancelAddCat').addEventListener('click', () => $('tpAddCategoryModal').classList.add('hidden'));
	$('tpAddCategoryModal').addEventListener('click', (e) => { if (e.target.id === 'tpAddCategoryModal') $('tpAddCategoryModal').classList.add('hidden'); });

	$('tpContextEdit').addEventListener('click', () => {
		$('tpContextMenu').classList.add('hidden');
		if (contextMenuTargetIndex >= 0 && flatProducts[contextMenuTargetIndex]) {
			selectedIndex = contextMenuTargetIndex;
			$('tpEditorModal').classList.remove('hidden');
			fillEditorForm(flatProducts[contextMenuTargetIndex]);
		}
	});

	$('tpContextDelete').addEventListener('click', () => {
		$('tpContextMenu').classList.add('hidden');
		if (contextMenuTargetIndex >= 0 && flatProducts[contextMenuTargetIndex]) {
			const p = flatProducts[contextMenuTargetIndex];
			config.TraderCategories[p.catIndex].Products.splice(p.prodIndex, 1);
			flatProducts = flattenConfig(config);
			fillCategorySelects();
			renderCategoryFilter();
			renderTable();
			showToast('Продукт удалён.', 'success');
		}
	});

	$('tpContextDeleteSelected').addEventListener('click', () => {
		$('tpContextMenu').classList.add('hidden');
		if (selectedIndices.size === 0) return;
		const toDelete = Array.from(selectedIndices).map(idx => flatProducts[idx]).filter(Boolean);
		toDelete.sort((a, b) => a.catIndex !== b.catIndex ? a.catIndex - b.catIndex : b.prodIndex - a.prodIndex);
		toDelete.forEach(p => config.TraderCategories[p.catIndex].Products.splice(p.prodIndex, 1));
		clearSelection();
		flatProducts = flattenConfig(config);
		fillCategorySelects();
		renderCategoryFilter();
		renderTable();
		showToast('Удалено: ' + toDelete.length, 'success');
	});

	$('tpContextEditSelected').addEventListener('click', () => {
		$('tpContextMenu').classList.add('hidden');
		if (selectedIndices.size === 0) {
			showToast('Выберите продукты.', 'error');
			return;
		}
		fillCategorySelects();
		$('tpBulkApplyCategory').checked = false;
		$('tpBulkApplyMinStock').checked = false;
		$('tpBulkApplyMaxStock').checked = false;
		$('tpBulkApplyHealth').checked = false;
		$('tpBulkApplySellPrice').checked = false;
		$('tpBulkApplyBuyPrice').checked = false;
		$('tpBulkMinStock').value = '';
		$('tpBulkMaxStock').value = '';
		$('tpBulkHealth').value = '';
		$('tpBulkSellPrice').value = '';
		$('tpBulkBuyPrice').value = '';
		$('tpBulkEditModal').classList.remove('hidden');
	});

	$('tpApplyBulkEditBtn')?.addEventListener('click', () => {
		const applyCat = $('tpBulkApplyCategory').checked;
		const applyMin = $('tpBulkApplyMinStock').checked;
		const applyMax = $('tpBulkApplyMaxStock').checked;
		const applyHealth = $('tpBulkApplyHealth').checked;
		const applySell = $('tpBulkApplySellPrice').checked;
		const applyBuy = $('tpBulkApplyBuyPrice').checked;
		if (!applyCat && !applyMin && !applyMax && !applyHealth && !applySell && !applyBuy) {
			showToast('Отметьте хотя бы одно поле.', 'error');
			return;
		}
		const newCatName = ($('tpBulkEditCategory').value || '').trim();
		if (applyCat && !newCatName) {
			showToast('Выберите категорию для переноса.', 'error');
			return;
		}
		const newCat = applyCat ? config.TraderCategories.find(c => c.CategoryName === newCatName) : null;
		if (applyCat && !newCat) {
			showToast('Категория не найдена.', 'error');
			return;
		}
		const toEdit = Array.from(selectedIndices).map(idx => flatProducts[idx]).filter(Boolean);
		const newRawList = toEdit.map(p => {
			const parts = (p.raw || '').split(',');
			const className = parts[0] || '';
			let coefficient = parts[1] ?? '';
			let maxStock = parts[2] ?? '';
			let tradeQuantity = parts[3] ?? '';
			let buyPrice = parts[4] ?? '';
			let sellPrice = parts[5] ?? '';
			if (applyMin) coefficient = $('tpBulkMinStock').value;
			if (applyMax) maxStock = $('tpBulkMaxStock').value;
			if (applyHealth) tradeQuantity = $('tpBulkHealth').value;
			if (applyBuy) buyPrice = $('tpBulkBuyPrice').value;
			if (applySell) sellPrice = $('tpBulkSellPrice').value;
			return [className, coefficient, maxStock, tradeQuantity, buyPrice, sellPrice].join(',');
		});
		if (applyCat) {
			toEdit.sort((a, b) => a.catIndex !== b.catIndex ? a.catIndex - b.catIndex : b.prodIndex - a.prodIndex);
			toEdit.forEach(p => config.TraderCategories[p.catIndex].Products.splice(p.prodIndex, 1));
			newRawList.forEach(raw => newCat.Products.push(raw));
		} else {
			toEdit.forEach((p, i) => {
				config.TraderCategories[p.catIndex].Products[p.prodIndex] = newRawList[i];
			});
		}
		flatProducts = flattenConfig(config);
		clearSelection();
		fillCategorySelects();
		renderCategoryFilter();
		renderTable();
		$('tpBulkEditModal').classList.add('hidden');
		showToast('Изменено: ' + toEdit.length, 'success');
	});

	$('tpCloseBulkEditModal')?.addEventListener('click', () => $('tpBulkEditModal').classList.add('hidden'));
	$('tpCancelBulkEditBtn')?.addEventListener('click', () => $('tpBulkEditModal').classList.add('hidden'));
	$('tpBulkEditModal')?.addEventListener('click', (e) => { if (e.target.id === 'tpBulkEditModal') $('tpBulkEditModal').classList.add('hidden'); });

	// Инструменты: dropdown + валидация
	const tpToolsBtn = $('tpToolsBtn');
	const tpToolsMenu = $('tpToolsMenu');
	if (tpToolsBtn && tpToolsMenu) {
		tpToolsBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			tpToolsMenu.classList.toggle('hidden');
		});
		document.addEventListener('click', () => tpToolsMenu.classList.add('hidden'));
		tpToolsMenu.addEventListener('click', (e) => e.stopPropagation());
	}

	$('tpValidateBtn')?.addEventListener('click', () => {
		$('tpToolsMenu')?.classList.add('hidden');
		if (!config) {
			showToast('Сначала загрузите файл.', 'error');
			return;
		}
		openErrorsModal();
		updateStats();
	});

	$('tpCloseErrorsModal')?.addEventListener('click', () => $('tpErrorsModal')?.classList.add('hidden'));
	$('tpCloseErrorsBtn')?.addEventListener('click', () => $('tpErrorsModal')?.classList.add('hidden'));
	$('tpErrorsModal')?.addEventListener('click', (e) => {
		if (e.target.id === 'tpErrorsModal') $('tpErrorsModal')?.classList.add('hidden');
	});

	const tpErrorCount = $('tpErrorCount');
	if (tpErrorCount) {
		tpErrorCount.addEventListener('click', () => {
			if (config && flatProducts.length && !tpErrorCount.classList.contains('hidden')) openErrorsModal();
		});
		tpErrorCount.style.cursor = 'pointer';
		tpErrorCount.title = 'Показать ошибки';
	}

	function findDuplicateGroups() {
		const byName = new Map();
		flatProducts.forEach((p, i) => {
			const name = (p.className || '').trim();
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

	function productSummary(p) {
		return p.categoryName + ' | ' + [p.coefficient, p.maxStock, p.tradeQuantity, p.buyPrice, p.sellPrice].join(',');
	}

	let tpDuplicateGroups = [];

	function openDuplicatesModal() {
		tpDuplicateGroups = findDuplicateGroups();
		const hint = $('tpDuplicatesHint');
		const list = $('tpDuplicatesList');
		const applyBtn = $('tpApplyDuplicatesBtn');
		if (!hint || !list) return;
		if (tpDuplicateGroups.length === 0) {
			hint.textContent = 'Дубликатов по classname не найдено.';
			list.innerHTML = '';
			if (applyBtn) applyBtn.style.display = 'none';
		} else {
			hint.textContent = 'Выберите для каждой группы запись «Оставить», остальные можно удалить.';
			if (applyBtn) applyBtn.style.display = '';
			const fragment = document.createDocumentFragment();
			tpDuplicateGroups.forEach((group, gIdx) => {
				const wrap = document.createElement('div');
				wrap.className = 'duplicate-group';
				wrap.innerHTML = '<div class="duplicate-group-title">' + escapeHtml(group.name) + ' <span class="hint">(' + group.indices.length + ' шт.)</span></div><div class="duplicate-entries" data-group="' + gIdx + '"></div>';
				const entriesEl = wrap.querySelector('.duplicate-entries');
				group.indices.forEach((idx, pos) => {
					const p = flatProducts[idx];
					const entry = document.createElement('div');
					entry.className = 'duplicate-entry';
					entry.dataset.index = String(idx);
					const radioId = 'tp_dup_keep_' + gIdx + '_' + pos;
					entry.innerHTML =
						'<label><input type="radio" name="tp_dup_keep_' + gIdx + '" value="' + idx + '" ' + (pos === 0 ? 'checked' : '') + ' id="' + radioId + '"> Оставить</label>' +
						'<span class="duplicate-entry-summary" title="' + escapeHtml(productSummary(p)) + '">' + escapeHtml(productSummary(p)) + '</span>' +
						'<button type="button" class="btn btn-outline btn-remove" data-index="' + idx + '" data-group="' + gIdx + '">Удалить</button>';
					entriesEl.appendChild(entry);
				});
				fragment.appendChild(wrap);
			});
			list.innerHTML = '';
			list.appendChild(fragment);
			list.querySelectorAll('.btn-remove').forEach(btn => {
				btn.addEventListener('click', () => {
					const groupIdx = parseInt(btn.dataset.group, 10);
					const indexToRemove = parseInt(btn.dataset.index, 10);
					const group = tpDuplicateGroups[groupIdx];
					const keepRadio = list.querySelector('input[name="tp_dup_keep_' + groupIdx + '"]:checked');
					if (keepRadio && parseInt(keepRadio.value, 10) === indexToRemove) {
						showToast('Сначала выберите «Оставить» для другой записи.', 'error');
						return;
					}
					const prod = flatProducts[indexToRemove];
					config.TraderCategories[prod.catIndex].Products.splice(prod.prodIndex, 1);
					flatProducts = flattenConfig(config);
					tpDuplicateGroups = findDuplicateGroups();
					fillCategorySelects();
					renderCategoryFilter();
					renderTable();
					openDuplicatesModal();
					showToast('Продукт удалён.', 'success');
				});
			});
		}
		$('tpDuplicatesModal')?.classList.remove('hidden');
	}

	function applyDuplicatesRemoval() {
		const toRemove = [];
		tpDuplicateGroups.forEach((group, gIdx) => {
			const checked = $('tpDuplicatesList')?.querySelector('input[name="tp_dup_keep_' + gIdx + '"]:checked');
			const keepIndex = checked ? parseInt(checked.value, 10) : group.indices[0];
			group.indices.forEach(idx => {
				if (idx !== keepIndex) toRemove.push(flatProducts[idx]);
			});
		});
		toRemove.sort((a, b) => a.catIndex !== b.catIndex ? a.catIndex - b.catIndex : b.prodIndex - a.prodIndex);
		toRemove.forEach(p => config.TraderCategories[p.catIndex].Products.splice(p.prodIndex, 1));
		tpDuplicateGroups = [];
		flatProducts = flattenConfig(config);
		clearSelection();
		fillCategorySelects();
		renderCategoryFilter();
		renderTable();
		$('tpDuplicatesModal')?.classList.add('hidden');
		showToast('Удалено дубликатов: ' + toRemove.length, 'success');
	}

	$('tpDuplicatesBtn')?.addEventListener('click', () => {
		$('tpToolsMenu')?.classList.add('hidden');
		if (!config || !flatProducts.length) return;
		openDuplicatesModal();
	});
	$('tpCloseDuplicatesModal')?.addEventListener('click', () => $('tpDuplicatesModal')?.classList.add('hidden'));
	$('tpCloseDuplicatesBtn')?.addEventListener('click', () => $('tpDuplicatesModal')?.classList.add('hidden'));
	$('tpApplyDuplicatesBtn')?.addEventListener('click', applyDuplicatesRemoval);
	$('tpDuplicatesModal')?.addEventListener('click', (e) => {
		if (e.target.id === 'tpDuplicatesModal') $('tpDuplicatesModal')?.classList.add('hidden');
	});

	// Сверка с types
	function parseTypesXml(xmlStr) {
		const parser = new DOMParser();
		const doc = parser.parseFromString(xmlStr, 'text/xml');
		const err = doc.querySelector('parsererror');
		if (err) throw new Error('Ошибка парсинга XML: ' + err.textContent);
		const root = doc.querySelector('types');
		if (!root) throw new Error('Элемент <types> не найден.');
		const result = [];
		root.querySelectorAll(':scope > type').forEach(el => {
			const name = (el.getAttribute('name') || '').trim();
			const nominalEl = el.querySelector('nominal');
			const nominal = nominalEl ? nominalEl.textContent.trim() : '';
			result.push({ name, nominal });
		});
		return result;
	}

	function runCompareWithTypes(typesData, variant) {
		const tpClassNames = [...new Set(flatProducts.map(p => (p.className || '').trim()).filter(Boolean))];
		const typesByName = new Map();
		typesData.forEach(t => typesByName.set(t.name, t));
		let result = [];
		if (variant === '1') {
			result = tpClassNames.filter(cn => !typesByName.has(cn)).sort();
		} else if (variant === '2') {
			const typesNominalGt0 = typesData.filter(t => {
				const n = parseInt(t.nominal, 10);
				return !isNaN(n) && n > 0;
			});
			const tpSet = new Set(tpClassNames);
			result = typesNominalGt0.filter(t => !tpSet.has(t.name)).map(t => t.name).sort();
		}
		return result;
	}

	$('tpCompareTypesBtn')?.addEventListener('click', () => {
		$('tpToolsMenu')?.classList.add('hidden');
		if (!config || !flatProducts.length) {
			showToast('Сначала загрузите TraderPlus JSON.', 'error');
			return;
		}
		$('tpCompareTypesFile').value = '';
		$('tpCompareTypesFileName').textContent = '';
		$('tpCompareResult').value = '';
		$('tpCompareTypesModal')?.classList.remove('hidden');
	});

	$('tpCompareTypesFile')?.addEventListener('change', function () {
		const f = this.files[0];
		$('tpCompareTypesFileName').textContent = f ? f.name : '';
	});

	$('tpRunCompareBtn')?.addEventListener('click', () => {
		const fileInput = $('tpCompareTypesFile');
		const file = fileInput?.files?.[0];
		if (!file) {
			showToast('Выберите файл types.xml.', 'error');
			return;
		}
		const variant = document.querySelector('input[name="tpCompareVariant"]:checked')?.value || '1';
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const typesData = parseTypesXml(reader.result);
				const classnames = runCompareWithTypes(typesData, variant);
				$('tpCompareResult').value = classnames.join('\n');
				showToast('Проверка выполнена. Найдено: ' + classnames.length, 'success');
			} catch (e) {
				showToast(e.message || 'Ошибка', 'error');
			}
		};
		reader.readAsText(file, 'UTF-8');
	});

	$('tpCopyCompareResult')?.addEventListener('click', () => {
		const ta = $('tpCompareResult');
		if (!ta || !ta.value) {
			showToast('Нет данных для копирования.', 'error');
			return;
		}
		ta.select();
		document.execCommand('copy');
		showToast('Скопировано в буфер обмена.', 'success');
	});

	$('tpCloseCompareTypesModal')?.addEventListener('click', () => $('tpCompareTypesModal')?.classList.add('hidden'));
	$('tpCloseCompareTypesBtn')?.addEventListener('click', () => $('tpCompareTypesModal')?.classList.add('hidden'));
	$('tpCompareTypesModal')?.addEventListener('click', (e) => {
		if (e.target.id === 'tpCompareTypesModal') $('tpCompareTypesModal')?.classList.add('hidden');
	});

	document.addEventListener('click', () => $('tpContextMenu')?.classList.add('hidden'));
	$('tpContextMenu')?.addEventListener('click', (e) => e.stopPropagation());

	function updateScrollButton() {
		const btn = $('tpScrollBtn');
		const wrap = $('tpTableWrap');
		if (!btn) return;
		const tableAtBottom = wrap && wrap.scrollHeight > wrap.clientHeight && (wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 5);
		const pageAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 10;
		const atBottom = tableAtBottom || pageAtBottom;
		btn.textContent = atBottom ? '↑' : '↓';
		btn.title = atBottom ? 'Прокрутить вверх' : 'Прокрутить вниз';
	}
	if ($('tpScrollBtn')) {
		$('tpScrollBtn').addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			const wrap = $('tpTableWrap');
			const tableAtBottom = wrap && wrap.scrollHeight > wrap.clientHeight && (wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 5);
			const pageAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 10;
			const atBottom = tableAtBottom || pageAtBottom;
			if (atBottom) {
				if (wrap && wrap.scrollHeight > wrap.clientHeight) wrap.scrollTop = 0;
				window.scrollTo({ top: 0, behavior: 'smooth' });
			} else {
				if (wrap && wrap.scrollHeight > wrap.clientHeight) wrap.scrollTop = wrap.scrollHeight;
				window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
			}
			setTimeout(updateScrollButton, 350);
		});
		const wrap = $('tpTableWrap');
		if (wrap) wrap.addEventListener('scroll', updateScrollButton);
		window.addEventListener('scroll', updateScrollButton);
		updateScrollButton();
	}

	$('tpAddProductBtn')?.addEventListener('click', () => {
		if (!config) { showToast('Сначала загрузите файл.', 'error'); return; }
		fillCategorySelects();
		$('tpAddProductModal').classList.remove('hidden');
		$('tpAddClassName').value = '';
		$('tpAddMinStock').value = '1';
		$('tpAddMaxStock').value = '-1';
		$('tpAddHealth').value = '-1';
		$('tpAddSellPrice').value = '-1';
		$('tpAddBuyPrice').value = '100';
	});

	$('tpAddCategoryBtn')?.addEventListener('click', () => {
		if (!config) { showToast('Сначала загрузите файл.', 'error'); return; }
		$('tpAddCategoryModal').classList.remove('hidden');
		$('tpAddCategoryName').value = '';
	});

	$('tpEditCategoryBtn')?.addEventListener('click', () => {
		if (!config) { showToast('Сначала загрузите файл.', 'error'); return; }
		fillCategorySelects();
		const sel = $('tpEditCatSelect');
		const current = $('tpCategoryFilter').value;
		if (sel && current) sel.value = current;
		$('tpEditCatNewName').value = sel?.value || '';
		$('tpEditCategoryModal').classList.remove('hidden');
	});

	$('tpEditCatSelect')?.addEventListener('change', () => {
		$('tpEditCatNewName').value = $('tpEditCatSelect').value || '';
	});

	$('tpEditCategoryForm')?.addEventListener('submit', (e) => {
		e.preventDefault();
		const oldName = ($('tpEditCatSelect').value || '').trim();
		const newName = ($('tpEditCatNewName').value || '').trim();
		if (!oldName || !newName) {
			showToast('Выберите категорию и введите новое название.', 'error');
			return;
		}
		const cat = config.TraderCategories.find(c => c.CategoryName === oldName);
		if (!cat) {
			showToast('Категория не найдена.', 'error');
			return;
		}
		if (config.TraderCategories.some(c => c.CategoryName === newName && c !== cat)) {
			showToast('Категория с таким названием уже существует.', 'error');
			return;
		}
		cat.CategoryName = newName;
		flatProducts = flattenConfig(config);
		fillCategorySelects();
		renderCategoryFilter();
		renderTable();
		$('tpEditCategoryModal').classList.add('hidden');
		showToast('Категория переименована.', 'success');
	});

	$('tpCloseEditCatModal')?.addEventListener('click', () => $('tpEditCategoryModal').classList.add('hidden'));
	$('tpCancelEditCat')?.addEventListener('click', () => $('tpEditCategoryModal').classList.add('hidden'));
	$('tpEditCategoryModal')?.addEventListener('click', (e) => { if (e.target.id === 'tpEditCategoryModal') $('tpEditCategoryModal').classList.add('hidden'); });

	$('tpMassAddBtn')?.addEventListener('click', () => {
		if (!config) { showToast('Сначала загрузите файл.', 'error'); return; }
		fillCategorySelects();
		$('tpMassAddText').value = '';
		$('tpMassAddMinStock').value = '1';
		$('tpMassAddMaxStock').value = '-1';
		$('tpMassAddHealth').value = '-1';
		$('tpMassAddSellPrice').value = '-1';
		$('tpMassAddBuyPrice').value = '100';
		$('tpMassAddModal').classList.remove('hidden');
	});

	$('tpApplyMassAddBtn')?.addEventListener('click', () => {
		const catName = ($('tpMassAddCategory').value || '').trim();
		const text = ($('tpMassAddText').value || '').trim();
		if (!catName) {
			showToast('Выберите категорию.', 'error');
			return;
		}
		const names = text.split(/\n/).map(s => s.trim()).filter(Boolean);
		if (!names.length) {
			showToast('Введите хотя бы один class name.', 'error');
			return;
		}
		const cat = config.TraderCategories.find(c => c.CategoryName === catName);
		if (!cat) {
			showToast('Категория не найдена.', 'error');
			return;
		}
		const coefficient = $('tpMassAddMinStock').value || '1';
		const maxStock = $('tpMassAddMaxStock').value || '-1';
		const tradeQuantity = $('tpMassAddHealth').value || '-1';
		const buyPrice = $('tpMassAddBuyPrice').value || '100';
		const sellPrice = $('tpMassAddSellPrice').value || '-1';
		let added = 0;
		names.forEach(className => {
			const raw = [className, coefficient, maxStock, tradeQuantity, buyPrice, sellPrice].join(',');
			cat.Products.push(raw);
			added++;
		});
		flatProducts = flattenConfig(config);
		clearSelection();
		fillCategorySelects();
		renderCategoryFilter();
		renderTable();
		$('tpMassAddModal').classList.add('hidden');
		showToast('Добавлено продуктов: ' + added, 'success');
	});

	$('tpCloseMassAddModal')?.addEventListener('click', () => $('tpMassAddModal').classList.add('hidden'));
	$('tpCancelMassAddBtn')?.addEventListener('click', () => $('tpMassAddModal').classList.add('hidden'));
	$('tpMassAddModal')?.addEventListener('click', (e) => { if (e.target.id === 'tpMassAddModal') $('tpMassAddModal').classList.add('hidden'); });

	// Показать предупреждение при загрузке страницы
	const tpWarningModal = $('tpWarningModal');
	if (tpWarningModal) {
		const hideWarning = () => tpWarningModal.classList.add('hidden');
		tpWarningModal.classList.remove('hidden');
		$('tpWarningOkBtn')?.addEventListener('click', hideWarning);
		$('tpCloseWarningModal')?.addEventListener('click', hideWarning);
		tpWarningModal.addEventListener('click', (e) => {
			if (e.target.id === 'tpWarningModal') hideWarning();
		});
	}

})();
