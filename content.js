console.log("Kite Custom Actions Extension - V7 - Hybrid Optimized");

const BTN_CONTAINER_CLASS = 'kite-action-btns';

const ICONS = {
    buy: `<span>A</span>`,
    chart: `<span>C</span>`,
    depth: `<span>MD</span>`,
    breakdown: `<span>B</span>`,
    fundamentals: `<span>F</span>`,
    technicals: `<span>T</span>`
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const EXCLUDE_STORAGE_KEY = 'kite_excluded_instruments';

function getExcludeList() {
    try {
        return JSON.parse(localStorage.getItem(EXCLUDE_STORAGE_KEY)) || [];
    } catch (e) {
        return [];
    }
}

function setExcludeList(list) {
    localStorage.setItem(EXCLUDE_STORAGE_KEY, JSON.stringify(list));
}

const TAG_STORAGE_KEY = 'kite_instrument_tags';
const AVAILABLE_TAGS = ['NONE', 'MF', 'BOND', 'SGB', 'EQUITY', 'INVIT'];

function getTagMap() {
    try {
        return JSON.parse(localStorage.getItem(TAG_STORAGE_KEY)) || {};
    } catch (e) {
        return {};
    }
}

function setTagMap(map) {
    localStorage.setItem(TAG_STORAGE_KEY, JSON.stringify(map));
}

function throttle(func, limit) {
    let inThrottle;
    return function () {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

function debounce(func, wait) {
    let timeout;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

/**
 * Executes a Kite action (BUY, CHART, etc)
 */
async function triggerKiteAction(row, actionType) {
    const menuBtn = row.querySelector(".table-menu-button, .icon-more-vertical");
    if (!menuBtn) return;

    row.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, view: window }));
    await delay(10);
    menuBtn.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, view: window }));
    await delay(10);
    menuBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, view: window, cancelable: true }));

    await delay(50);
    let target = null;

    if (actionType === 'Add') {
        target = document.querySelector('[data-label="Add"]');
    } else if (actionType === 'Market depth') {
        target = document.querySelector(".icon-align-center")?.closest("a");
        if (!target) {
            target = Array.from(document.querySelectorAll('.table-menu-content a')).find(el =>
                (el.innerText || '').toLowerCase().includes("market depth")
            );
        }
    } else if (actionType === 'Chart') {
        target = document.querySelector(".icon-trending-up")?.closest("a");
        if (!target) {
            target = Array.from(document.querySelectorAll('.table-menu-content a')).find(el =>
                (el.innerText || '').toLowerCase().includes("chart")
            );
        }
    } else if (actionType === 'Breakdown') {
        target = document.querySelector(".icon-console")?.closest("a");
        if (!target) {
            target = Array.from(document.querySelectorAll('.table-menu-content a')).find(el =>
                (el.innerText || '').toLowerCase().includes("breakdown")
            );
        }
    } else if (actionType === 'Fundamentals') {
        target = document.querySelector('img[alt="Tijori logo"]')?.closest("a");
        if (!target) {
            target = Array.from(document.querySelectorAll('.table-menu-content a')).find(el =>
                (el.innerText || '').toLowerCase().includes("fundamentals")
            );
        }
    } else if (actionType === 'Technicals') {
        target = document.querySelector('img[alt="Steak logo"]')?.closest("a");
        if (!target) {
            target = Array.from(document.querySelectorAll('.table-menu-content a')).find(el =>
                (el.innerText || '').toLowerCase().includes("technicals")
            );
        }
    }

    if (target) {
        target.click();
        setTimeout(() => {
            menuBtn.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
        }, 100);
    } else {
        row.click();
        const key = actionType === 'Add' ? 'b' : (actionType === 'Chart' ? 'c' : 'd');
        const keyCode = actionType === 'Add' ? 66 : (actionType === 'Chart' ? 67 : 68);
        document.dispatchEvent(new KeyboardEvent('keydown', { key, keyCode, bubbles: true }));
    }
}

function createActionButton(type, title, actionType, row) {
    const btn = document.createElement('button');
    btn.className = `kite-btn btn-${type}`;
    btn.title = title;
    btn.innerHTML = ICONS[type];
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        triggerKiteAction(row, actionType);
    });
    return btn;
}

/**
 * Updates row info (Day P for Holdings, Invested for Positions, Margin for Orders)
 */
function updateRowInfo(row) {
    if (window.requestIdleCallback) {
        window.requestIdleCallback(() => processRowInfo(row));
    } else {
        setTimeout(() => processRowInfo(row), 0);
    }
}

function processRowInfo(row) {
    const instrumentCell = row.querySelector('td.instrument');
    if (!instrumentCell) return;

    let container = instrumentCell.querySelector(`.${BTN_CONTAINER_CLASS}`);
    if (!container) return;

    const investedCell = row.querySelector('td[data-label="Invested"]');
    const dayChgCell = row.querySelector('td[data-label="Day chg."]');
    const qtyCellPos = row.querySelector('td[data-label="Qty."], td.qty');
    const avgCellPos = row.querySelector('td[data-label="Avg."]');
    const qtyCellOrd = row.querySelector('td[data-label="Qty"], td[data-label="Quantity"]');
    const priceCellOrd = row.querySelector('td[data-label="Price"], td[data-label="Avg. Price"]');
    const ltpCellOrd = row.querySelector('td[data-label="LTP"]');

    let infoBadge = container.querySelector('.kite-pnl-info');

    if (investedCell && dayChgCell) {
        // Holdings: Day P
        const invested = parseFloat(investedCell.textContent.replace(/,/g, '')) || 0;
        const dayChgPct = parseFloat(dayChgCell.textContent.replace(/%|,/g, '')) || 0;
        const dayProfit = (invested * dayChgPct) / 100;
        const isPositive = dayProfit >= 0;

        if (!infoBadge) { infoBadge = document.createElement('span'); container.prepend(infoBadge); }
        infoBadge.textContent = `Day P: ${isPositive ? '+' : ''}${dayProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        infoBadge.className = `kite-pnl-info ${isPositive ? 'text-green' : 'text-red'}`;
    } else if (qtyCellPos && avgCellPos && !priceCellOrd) {
        // Positions: Invested
        const qty = parseFloat(qtyCellPos.textContent.replace(/,/g, '')) || 0;
        const avg = parseFloat(avgCellPos.textContent.replace(/,/g, '')) || 0;
        const invested = qty * avg;
        if (!infoBadge) { infoBadge = document.createElement('span'); container.prepend(infoBadge); }
        infoBadge.textContent = `Invested: ${invested.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
        infoBadge.className = `kite-pnl-info`;
    } else if (qtyCellOrd && priceCellOrd) {
        // Orders: Margin
        const qtyText = qtyCellOrd.textContent.split('/')[1] || qtyCellOrd.textContent.split('/')[0];
        const qty = parseFloat(qtyText.replace(/,/g, '')) || 0;
        const price = parseFloat(priceCellOrd.textContent.replace(/,/g, '')) || 0;
        const isMIS = row.querySelector('td[data-label="Product"]')?.textContent.toLowerCase().includes('mis');
        const margin = qty * price * (isMIS ? 0.2 : 1.0);

        if (!infoBadge) { infoBadge = document.createElement('span'); container.prepend(infoBadge); }
        infoBadge.textContent = `Margin: ${margin.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
        infoBadge.className = `kite-pnl-info`;

        if (ltpCellOrd) {
            const ltp = parseFloat(ltpCellOrd.textContent.replace(/,/g, '')) || 0;
            if (ltp > 0 && price > 0) {
                const diffPct = ((ltp - price) / price) * 100;
                let diffSpan = ltpCellOrd.querySelector('.kite-ltp-diff');
                if (!diffSpan) { diffSpan = document.createElement('span'); ltpCellOrd.appendChild(diffSpan); }
                const isPos = diffPct >= 0;
                diffSpan.className = `kite-ltp-diff ${isPos ? 'text-green' : 'text-red'}`;
                diffSpan.textContent = `${isPos ? '+' : ''}${diffPct.toFixed(2)}%`;
            }
        }
    }
}

/**
 * Optimized Summary for Holdings
 */
const updateHoldingsTotalSummary = debounce(() => {
    const isHoldingsPage = window.location.pathname.includes('/holdings') || document.querySelector('.holdings-page');
    if (!isHoldingsPage) return;
    if (window.requestIdleCallback) window.requestIdleCallback(() => processHoldingsSummary());
    else setTimeout(() => processHoldingsSummary(), 100);
}, 500);

function processHoldingsSummary() {
    const rows = document.querySelectorAll('.holdings table tbody tr');
    if (rows.length === 0) return;

    let totalInvested = 0, totalCurrent = 0, totalDayP = 0;
    const tagTotals = {};
    AVAILABLE_TAGS.forEach(tag => { if (tag !== 'NONE') tagTotals[tag] = { inv: 0, cur: 0, dayP: 0 }; });

    const excludeList = getExcludeList();
    const tagMap = getTagMap();

    rows.forEach(row => {
        const symbol = (row.querySelector('.tradingsymbol') || row.querySelector('.instrument a span') || row.querySelector('.instrument span'))?.textContent.trim();
        const isExcluded = symbol && excludeList.includes(symbol);
        if (isExcluded) row.classList.add('kite-excluded-row'); else row.classList.remove('kite-excluded-row');

        const investedCell = row.querySelector('td[data-label="Invested"]');
        const currentValCell = row.querySelector('td[data-label="Cur. val"]');
        const dayChangeCell = row.querySelector('td[data-label="Day chg."]');

        if (investedCell && currentValCell) {
            const inv = parseFloat(investedCell.textContent.replace(/,/g, '')) || 0;
            const cur = parseFloat(currentValCell.textContent.replace(/,/g, '')) || 0;
            const dayChgPct = dayChangeCell ? parseFloat(dayChangeCell.textContent.replace(/%|,/g, '')) || 0 : 0;
            const rowDayP = (inv * dayChgPct) / 100;

            if (!isExcluded) { totalInvested += inv; totalCurrent += cur; totalDayP += rowDayP; }

            const tag = tagMap[symbol];
            if (tag && tag !== 'NONE' && tagTotals[tag]) { tagTotals[tag].inv += inv; tagTotals[tag].cur += cur; tagTotals[tag].dayP += rowDayP; }
        }
    });

    const header = Array.from(document.querySelectorAll('h3.page-title, .page-header h3, h3')).find(h => h.textContent.toUpperCase().includes('HOLDINGS'));
    if (header) {
        let summaryBadge = header.querySelector('.kite-total-summary');
        if (!summaryBadge) { summaryBadge = document.createElement('span'); summaryBadge.className = 'kite-total-summary'; header.appendChild(summaryBadge); }

        const formatMoney = (val) => val.toLocaleString('en-IN', { maximumFractionDigits: 0 });
        const formatPnl = (val) => {
            const isPos = val >= 0;
            return `<span class="kite-summary-pnl ${isPos ? 'text-green' : 'text-red'}">${isPos ? '+' : ''}${formatMoney(val)}</span>`;
        };

        let html = `<div class="kite-summary-cat"><span class="kite-summary-label">TOTAL</span><span class="kite-summary-val"><span>${formatMoney(totalInvested)}</span> / <span>${formatMoney(totalCurrent)}</span> ${formatPnl(totalDayP)}</span></div>`;
        Object.entries(tagTotals).forEach(([tag, vals]) => {
            if (vals.inv > 0) html += `<div class="kite-summary-cat"><span class="kite-summary-label">${tag}</span><span class="kite-summary-val"><span>${formatMoney(vals.inv)}</span> / <span>${formatMoney(vals.cur)}</span> ${formatPnl(vals.dayP)}</span></div>`;
        });
        if (summaryBadge.innerHTML !== html) summaryBadge.innerHTML = html;
    }
}

/**
 * Margin Summary for Orders
 */
const updateOrdersTotalMargin = debounce(() => {
    const isOrdersPage = window.location.pathname.includes('/orders');
    if (!isOrdersPage) return;
    const table = document.querySelector('.orders table');
    if (!table) return;

    let totalMargin = 0;
    table.querySelectorAll('tbody tr').forEach(row => {
        const qtyCell = row.querySelector('td[data-label="Qty"]');
        const priceCell = row.querySelector('td[data-label="Price"]');
        if (qtyCell && priceCell) {
            const qty = parseFloat((qtyCell.textContent.split('/')[1] || qtyCell.textContent.split('/')[0]).replace(/,/g, '')) || 0;
            const price = parseFloat(priceCell.textContent.replace(/,/g, '')) || 0;
            const isMIS = row.querySelector('td[data-label="Product"]')?.textContent.toLowerCase().includes('mis');
            totalMargin += (qty * price * (isMIS ? 0.2 : 1.0));
        }
    });

    const header = Array.from(document.querySelectorAll('h3.page-title, h3')).find(h => h.textContent.includes('Open orders'));
    if (header) {
        let badge = header.querySelector('.kite-total-summary');
        if (!badge) { badge = document.createElement('span'); badge.className = 'kite-total-summary'; header.appendChild(badge); }
        badge.innerHTML = `<div class="kite-summary-cat"><span class="kite-summary-label">TOTAL MARGIN</span><span class="kite-summary-val">${totalMargin.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span></div>`;
    }
}, 500);

/**
 * Invested Summary for Positions
 */
const updatePositionsTotalSummary = debounce(() => {
    const isPositionsPage = window.location.pathname.includes('/positions');
    if (!isPositionsPage) return;

    let totalInvested = 0;
    document.querySelectorAll('.positions table tbody tr').forEach(row => {
        const qty = parseFloat((row.querySelector('td[data-label="Qty."], td.qty')?.textContent || '0').replace(/,/g, '')) || 0;
        const avg = parseFloat((row.querySelector('td[data-label="Avg."]')?.textContent || '0').replace(/,/g, '')) || 0;
        totalInvested += (qty * avg);
    });

    const header = Array.from(document.querySelectorAll('h3.page-title, h3')).find(h => h.textContent.includes('Positions'));
    if (header) {
        let badge = header.querySelector('.kite-total-summary');
        if (!badge) { badge = document.createElement('span'); badge.className = 'kite-total-summary'; header.appendChild(badge); }
        badge.innerHTML = `<div class="kite-summary-cat"><span class="kite-summary-label">TOTAL INVESTED</span><span class="kite-summary-val">${totalInvested.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span></div>`;
    }
}, 500);

const injectActionButtons = throttle(() => {
    if (window.requestIdleCallback) window.requestIdleCallback(() => processInjection());
    else setTimeout(() => processInjection(), 0);
}, 200);

function processInjection() {
    const isHoldingsPage = window.location.pathname.includes('/holdings') || document.querySelector('.holdings-page');
    const isPositionsPage = window.location.pathname.includes('/positions') || document.querySelector('.positions-page');
    const isOrdersPage = window.location.pathname.includes('/orders') || document.querySelector('.orders-page');

    if (isHoldingsPage) updateHoldingsTotalSummary();
    else if (isPositionsPage) updatePositionsTotalSummary();
    else if (isOrdersPage) updateOrdersTotalMargin();

    const rows = document.querySelectorAll('.holdings table tbody tr, .positions table tbody tr, .orderbook table tbody tr, .orders table tbody tr');

    rows.forEach(row => {
        const instrumentCell = row.querySelector('td.instrument');
        if (!instrumentCell) return;

        if (isHoldingsPage) {
            const symbol = (row.querySelector('.tradingsymbol') || row.querySelector('.instrument a span') || row.querySelector('.instrument span'))?.textContent.trim();
            if (symbol) {
                if (!instrumentCell.querySelector('.kite-exclude-btn')) {
                    const excludeList = getExcludeList();
                    const isExcluded = excludeList.includes(symbol);
                    if (isExcluded) row.classList.add('kite-excluded-row');
                    const excludeBtn = document.createElement('button');
                    excludeBtn.className = `kite-exclude-btn ${isExcluded ? 'excluded' : ''}`;
                    excludeBtn.innerHTML = '&#8854;';
                    excludeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const currentList = getExcludeList();
                        if (currentList.includes(symbol)) { setExcludeList(currentList.filter(s => s !== symbol)); excludeBtn.classList.remove('excluded'); }
                        else { setExcludeList([...currentList, symbol]); excludeBtn.classList.add('excluded'); }
                        updateHoldingsTotalSummary();
                    });
                    instrumentCell.prepend(excludeBtn);
                }
                if (!instrumentCell.querySelector('.kite-tag-select')) {
                    const tagMap = getTagMap();
                    const select = document.createElement('select');
                    select.className = 'kite-tag-select';
                    AVAILABLE_TAGS.forEach(tag => {
                        const opt = document.createElement('option');
                        opt.value = tag; opt.textContent = tag;
                        if (tag === (tagMap[symbol] || 'NONE')) opt.selected = true;
                        select.appendChild(opt);
                    });
                    select.addEventListener('change', (e) => {
                        const currentMap = getTagMap();
                        currentMap[symbol] = e.target.value;
                        setTagMap(currentMap);
                        updateHoldingsTotalSummary();
                    });
                    instrumentCell.prepend(select);
                }
            }
        }

        if (!instrumentCell.querySelector(`.${BTN_CONTAINER_CLASS}`)) {
            const container = document.createElement('div');
            container.className = BTN_CONTAINER_CLASS;
            [['buy', 'Add'], ['depth', 'Market depth'], ['chart', 'Chart'], ['breakdown', 'Breakdown'], ['fundamentals', 'Fundamentals'], ['technicals', 'Technicals']]
                .forEach(([type, action]) => container.appendChild(createActionButton(type, action, action, row)));
            const target = instrumentCell.querySelector('a.initial, .tradingsymbol');
            if (target) target.appendChild(container); else instrumentCell.appendChild(container);
            updateRowInfo(row);
        }
    });
}

const observer = new MutationObserver(debounce(() => injectActionButtons(), 200));
observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener('load', () => setTimeout(injectActionButtons, 1000));
