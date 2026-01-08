console.log("Kite Custom Actions Extension - V5 - Performance Optimized");

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

/**
 * Throttles function calls to prevent main thread blocking
 */
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

/**
 * Debounces function calls
 */
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
 * Executes a Kite action by simulating the exact hover and click sequence.
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
 * Updates row info with requestIdleCallback or setTimeout to prevent blocking
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

    let infoBadge = container.querySelector('.kite-pnl-info');

    let displayValue = '';
    let isPositive = true;
    let tooltip = '';
    let foundData = false;
    let badgeClass = 'kite-pnl-info';

    const investedCell = row.querySelector('td[data-label="Invested"]');
    const dayChgCell = row.querySelector('td[data-label="Day chg."]');
    const qtyCellPos = row.querySelector('td[data-label="Qty."], td.qty');
    const avgCellPos = row.querySelector('td[data-label="Avg."]');
    const qtyCellOrd = row.querySelector('td[data-label="Qty"], td[data-label="Quantity"]');
    const priceCellOrd = row.querySelector('td[data-label="Price"], td[data-label="Avg. Price"]');
    const ltpCellOrd = row.querySelector('td[data-label="LTP"]');

    if (investedCell && dayChgCell) {
        const invested = parseFloat(investedCell.textContent.replace(/,/g, '')) || 0;
        const dayChgText = dayChgCell.textContent.replace(/%|,/g, '').trim();
        const dayChgPct = parseFloat(dayChgText) || 0;
        const dayProfit = (invested * dayChgPct) / 100;

        isPositive = dayProfit >= 0;
        displayValue = `Day P: ${isPositive ? '+' : ''}${dayProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        tooltip = `Day Profit = Invested (${invested.toLocaleString('en-IN')}) * Day Chg (${dayChgPct}%)`;
        badgeClass += isPositive ? ' text-green' : ' text-red';
        foundData = true;
    } else if (qtyCellPos && avgCellPos && !priceCellOrd) {
        const qty = parseFloat(qtyCellPos.textContent.replace(/,/g, '')) || 0;
        const avg = parseFloat(avgCellPos.textContent.replace(/,/g, '')) || 0;
        const invested = qty * avg;

        displayValue = `Invested: ${invested.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        tooltip = `Total Invested = Qty (${qty}) * Avg (${avg.toLocaleString('en-IN')})`;
        foundData = true;
    } else if (qtyCellOrd && priceCellOrd) {
        const qtyText = qtyCellOrd.textContent.split('/')[1] || qtyCellOrd.textContent.split('/')[0];
        const qty = parseFloat(qtyText.replace(/,/g, '')) || 0;
        const price = parseFloat(priceCellOrd.textContent.replace(/,/g, '')) || 0;

        const productCell = row.querySelector('td[data-label="Product"]');
        const isMIS = productCell && productCell.textContent.toLowerCase().includes('mis');
        const marginMultiplier = isMIS ? 0.2 : 1.0;
        const margin = qty * price * marginMultiplier;

        displayValue = `Margin: ${margin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        tooltip = `Locked Margin = Qty (${qty}) * Price (${price.toLocaleString('en-IN')}) ${isMIS ? '/ 5 (MIS)' : '(CNC)'}`;
        foundData = true;

        if (ltpCellOrd) {
            const ltp = parseFloat(ltpCellOrd.textContent.replace(/,/g, '')) || 0;
            if (ltp > 0 && price > 0) {
                const diffPct = ((ltp - price) / price) * 100;
                let diffSpan = ltpCellOrd.querySelector('.kite-ltp-diff');
                if (!diffSpan) {
                    diffSpan = document.createElement('span');
                    ltpCellOrd.appendChild(diffSpan);
                }
                const isPos = diffPct >= 0;
                diffSpan.className = `kite-ltp-diff ${isPos ? 'text-green' : 'text-red'}`;
                diffSpan.textContent = `${isPos ? '+' : ''}${diffPct.toFixed(2)}%`;
            }
        }
    }

    if (foundData) {
        if (!infoBadge) {
            infoBadge = document.createElement('span');
            container.prepend(infoBadge);
        }
        infoBadge.textContent = displayValue;
        infoBadge.className = badgeClass;
        infoBadge.title = tooltip;
    }
}

/**
 * Optimized Summary calculation
 */
const updateHoldingsTotalSummary = debounce(() => {
    const isHoldingsPage = window.location.pathname.includes('/holdings') || document.querySelector('.holdings-page');
    if (!isHoldingsPage) return;

    if (window.requestIdleCallback) {
        window.requestIdleCallback(() => processHoldingsSummary());
    } else {
        setTimeout(() => processHoldingsSummary(), 100);
    }
}, 500);

function processHoldingsSummary() {
    const rows = document.querySelectorAll('.holdings table tbody tr');
    if (rows.length === 0) return;

    let totalInvested = 0, totalCurrent = 0, totalDayP = 0;
    const tagTotals = {};
    AVAILABLE_TAGS.forEach(tag => {
        if (tag !== 'NONE') tagTotals[tag] = { inv: 0, cur: 0, dayP: 0 };
    });

    const excludeList = getExcludeList();
    const tagMap = getTagMap();

    rows.forEach(row => {
        const symbol = (row.querySelector('.tradingsymbol') || row.querySelector('.instrument a span') || row.querySelector('.instrument span'))?.textContent.trim();
        const isExcluded = symbol && excludeList.includes(symbol);

        if (isExcluded) row.classList.add('kite-excluded-row');
        else row.classList.remove('kite-excluded-row');

        const investedCell = row.querySelector('td[data-label="Invested"]');
        const currentValCell = row.querySelector('td[data-label="Cur. val"]');
        const dayChangeCell = row.querySelector('td[data-label="Day chg."]');

        if (investedCell && currentValCell) {
            const inv = parseFloat(investedCell.textContent.replace(/,/g, '')) || 0;
            const cur = parseFloat(currentValCell.textContent.replace(/,/g, '')) || 0;
            const dayChgPct = dayChangeCell ? parseFloat(dayChangeCell.textContent.replace(/%|,/g, '')) || 0 : 0;
            const rowDayP = (inv * dayChgPct) / 100;

            if (!isExcluded) {
                totalInvested += inv;
                totalCurrent += cur;
                totalDayP += rowDayP;
            }

            const tag = tagMap[symbol];
            if (tag && tag !== 'NONE' && tagTotals[tag]) {
                tagTotals[tag].inv += inv;
                tagTotals[tag].cur += cur;
                tagTotals[tag].dayP += rowDayP;
            }
        }
    });

    const header = Array.from(document.querySelectorAll('h3.page-title, .page-header h3, h3'))
        .find(h => h.textContent.toUpperCase().includes('HOLDINGS'));

    if (header) {
        let summaryBadge = header.querySelector('.kite-total-summary');
        if (!summaryBadge) {
            summaryBadge = document.createElement('span');
            summaryBadge.className = 'kite-total-summary';
            header.appendChild(summaryBadge);
        }

        const formatMoney = (val) => val.toLocaleString('en-IN', { maximumFractionDigits: 0 });
        const formatPnl = (val) => {
            const isPos = val >= 0;
            return `<span class="kite-summary-pnl ${isPos ? 'text-green' : 'text-red'}">${isPos ? '+' : ''}${formatMoney(val)}</span>`;
        };

        let html = `
            <div class="kite-summary-cat">
                <span class="kite-summary-label">TOTAL</span>
                <span class="kite-summary-val">
                    <span>${formatMoney(totalInvested)}</span> / <span>${formatMoney(totalCurrent)}</span>
                    ${formatPnl(totalDayP)}
                </span>
            </div>
        `;

        Object.entries(tagTotals).forEach(([tag, vals]) => {
            if (vals.inv > 0) {
                html += `
                    <div class="kite-summary-cat">
                        <span class="kite-summary-label">${tag}</span>
                        <span class="kite-summary-val">
                            <span>${formatMoney(vals.inv)}</span> / <span>${formatMoney(vals.cur)}</span>
                            ${formatPnl(vals.dayP)}
                        </span>
                    </div>
                `;
            }
        });

        if (summaryBadge.innerHTML !== html) {
            summaryBadge.innerHTML = html;
        }
    }
}

const updateOrdersTotalMargin = debounce(() => {
    const isOrdersPage = window.location.pathname.includes('/orders');
    if (!isOrdersPage) return;

    const openOrdersTable = document.querySelector('.orders table');
    if (!openOrdersTable) return;

    const rows = openOrdersTable.querySelectorAll('tbody tr');
    let totalMargin = 0;

    rows.forEach(row => {
        const qtyCell = row.querySelector('td[data-label="Qty"]');
        const priceCell = row.querySelector('td[data-label="Price"]');
        const productCell = row.querySelector('td[data-label="Product"]');

        if (qtyCell && priceCell) {
            const qtyText = qtyCell.textContent.split('/')[1] || qtyCell.textContent.split('/')[0];
            const qty = parseFloat(qtyText.replace(/,/g, '')) || 0;
            const price = parseFloat(priceCell.textContent.replace(/,/g, '')) || 0;
            const isMIS = productCell && productCell.textContent.toLowerCase().includes('mis');
            const marginMultiplier = isMIS ? 0.2 : 1.0;
            totalMargin += (qty * price * marginMultiplier);
        }
    });

    const header = Array.from(document.querySelectorAll('h3.page-title.small')).find(h => h.textContent.includes('Open orders'));
    if (header) {
        let summaryBadge = header.querySelector('.kite-total-summary');
        if (!summaryBadge) {
            summaryBadge = document.createElement('span');
            summaryBadge.className = 'kite-total-summary';
            header.appendChild(summaryBadge);
        }
        summaryBadge.textContent = `Total Margin: ${totalMargin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
}, 500);

const updatePositionsTotalSummary = debounce(() => {
    const isPositionsPage = window.location.pathname.includes('/positions');
    if (!isPositionsPage) return;

    const rows = document.querySelectorAll('.positions table tbody tr');
    let totalInvested = 0;

    rows.forEach(row => {
        const qtyCell = row.querySelector('td[data-label="Qty."], td.qty');
        const avgCell = row.querySelector('td[data-label="Avg."]');
        if (qtyCell && avgCell) {
            const qty = parseFloat(qtyCell.textContent.replace(/,/g, '')) || 0;
            const avg = parseFloat(avgCell.textContent.replace(/,/g, '')) || 0;
            totalInvested += (qty * avg);
        }
    });

    const header = Array.from(document.querySelectorAll('h3.page-title.small')).find(h => h.textContent.includes('Positions'));
    if (header) {
        let summaryBadge = header.querySelector('.kite-total-summary');
        if (!summaryBadge) {
            summaryBadge = document.createElement('span');
            summaryBadge.className = 'kite-total-summary';
            header.appendChild(summaryBadge);
        }
        summaryBadge.textContent = `Total Invested: ${totalInvested.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
}, 500);

/**
 * Main Injection logic throttled and pushed to idle periods
 */
const injectActionButtons = throttle(() => {
    if (window.requestIdleCallback) {
        window.requestIdleCallback(() => processInjection());
    } else {
        setTimeout(() => processInjection(), 0);
    }
}, 200);

function processInjection() {
    const isHoldingsPage = window.location.pathname.includes('/holdings') || document.querySelector('.holdings-page');
    const isPositionsPage = window.location.pathname.includes('/positions') || document.querySelector('.positions-page');
    const isOrdersPage = window.location.pathname.includes('/orders') || document.querySelector('.orders-page');

    if (isHoldingsPage) updateHoldingsTotalSummary();
    if (isPositionsPage) updatePositionsTotalSummary();
    if (isOrdersPage) updateOrdersTotalMargin();

    const rows = document.querySelectorAll('.holdings table tbody tr, .positions table tbody tr, .orderbook table tbody tr, .orders table tbody tr');

    rows.forEach(row => {
        const instrumentCell = row.querySelector('td.instrument');
        if (!instrumentCell) return;

        // Exclusion toggle
        if (isHoldingsPage && !instrumentCell.querySelector('.kite-exclude-btn')) {
            const symbol = (row.querySelector('.tradingsymbol') || row.querySelector('.instrument a span') || row.querySelector('.instrument span'))?.textContent.trim();
            if (symbol) {
                const excludeList = getExcludeList();
                const isExcluded = excludeList.includes(symbol);
                if (isExcluded) row.classList.add('kite-excluded-row');

                const excludeBtn = document.createElement('button');
                excludeBtn.className = `kite-exclude-btn ${isExcluded ? 'excluded' : ''}`;
                excludeBtn.innerHTML = '&#8854;';
                excludeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const currentList = getExcludeList();
                    if (currentList.includes(symbol)) {
                        setExcludeList(currentList.filter(s => s !== symbol));
                        excludeBtn.classList.remove('excluded');
                    } else {
                        setExcludeList([...currentList, symbol]);
                        excludeBtn.classList.add('excluded');
                    }
                    updateHoldingsTotalSummary();
                });
                instrumentCell.prepend(excludeBtn);
            }
        }

        // Tagging
        if (isHoldingsPage && !instrumentCell.querySelector('.kite-tag-select')) {
            const symbol = (row.querySelector('.tradingsymbol') || row.querySelector('.instrument a span') || row.querySelector('.instrument span'))?.textContent.trim();
            if (symbol) {
                const tagMap = getTagMap();
                const currentTag = tagMap[symbol] || 'NONE';
                const select = document.createElement('select');
                select.className = 'kite-tag-select';
                AVAILABLE_TAGS.forEach(tag => {
                    const opt = document.createElement('option');
                    opt.value = tag; opt.textContent = tag;
                    if (tag === currentTag) opt.selected = true;
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

        // Action Buttons
        if (!instrumentCell.querySelector(`.${BTN_CONTAINER_CLASS}`)) {
            const container = document.createElement('div');
            container.className = BTN_CONTAINER_CLASS;
            container.appendChild(createActionButton('buy', 'Add', 'Add', row));
            container.appendChild(createActionButton('depth', 'Market Depth', 'Market depth', row));
            container.appendChild(createActionButton('chart', 'Open Chart', 'Chart', row));
            container.appendChild(createActionButton('breakdown', 'Open Breakdown', 'Breakdown', row));
            container.appendChild(createActionButton('fundamentals', 'Open Fundamentals', 'Fundamentals', row));
            container.appendChild(createActionButton('technicals', 'Open Technicals', 'Technicals', row));

            const target = instrumentCell.querySelector('a.initial, .tradingsymbol');
            if (target) target.appendChild(container);
            else instrumentCell.appendChild(container);

            updateRowInfo(row);
        }
    });
}

// Global Observers with limited scope
const observer = new MutationObserver(debounce(() => {
    injectActionButtons();
}, 100));

observer.observe(document.body, { childList: true, subtree: true });

// Initial load after complete page load
window.addEventListener('load', () => {
    setTimeout(injectActionButtons, 1000);
});

// Orders notification count observer
function observeOrdersNotificationsCount() {
    const span = document.querySelector('.orders-notifications-count .count');
    if (span) {
        let previousValue = span.textContent || span.innerText;
        new MutationObserver(() => {
            const currentValue = span.textContent || span.innerText;
            if (currentValue !== previousValue) {
                chrome.runtime.sendMessage({ action: 'notify', value: currentValue, type: 'orders_count' });
                previousValue = currentValue;
            }
        }).observe(span, { childList: true, subtree: true, characterData: true });
    }
}

observeOrdersNotificationsCount();
