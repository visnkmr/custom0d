console.log("Kite Custom Actions Extension - V4 - Improved Selectors");

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
 * Executes a Kite action by simulating the exact hover and click sequence.
 */
async function triggerKiteAction(row, actionType) {
    // 1. Locate the menu button (three dots)
    const menuBtn = row.querySelector(".table-menu-button, .icon-more-vertical");
    if (!menuBtn) {
        console.error("Kite menu button not found in row");
        return;
    }

    // 2. Trigger mouseover on the row and then the menu button
    row.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, view: window }));
    await delay(10);
    menuBtn.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, view: window }));
    await delay(10);

    // 3. Click the menu button to open the dropdown
    menuBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, view: window, cancelable: true }));

    // 4. Wait for the dropdown to appear
    await delay(50);

    // 5. Look for target element using icon classes (more reliable than text)
    let target = null;

    if (actionType === 'Add') {
        target = document.querySelector('[data-label="Add"]');
    } else if (actionType === 'Market depth') {
        // Based on user provided HTML: <span class="icon icon-align-center"></span>Market depth
        target = document.querySelector(".icon-align-center")?.closest("a");
        if (!target) {
            // Fallback search by text
            target = Array.from(document.querySelectorAll('.table-menu-content a')).find(el =>
                (el.innerText || '').toLowerCase().includes("market depth")
            );
        }
    } else if (actionType === 'Chart') {
        // Based on user provided HTML: <span class="icon icon-trending-up"></span> Chart
        target = document.querySelector(".icon-trending-up")?.closest("a");
        if (!target) {
            // Fallback search by text
            target = Array.from(document.querySelectorAll('.table-menu-content a')).find(el =>
                (el.innerText || '').toLowerCase().includes("chart")
            );
        }
    } else if (actionType === 'Breakdown') {
        // Based on user provided HTML: <span class="icon icon-trending-up"></span> Chart
        target = document.querySelector(".icon-console")?.closest("a");
        if (!target) {
            // Fallback search by text
            target = Array.from(document.querySelectorAll('.table-menu-content a')).find(el =>
                (el.innerText || '').toLowerCase().includes("breakdown")
            );
        }
    } else if (actionType === 'Fundamentals') {
        // Based on user provided HTML: <span class="icon icon-trending-up"></span> Chart
        target = document.querySelector('img[alt="Tijori logo"]')?.closest("a");
        if (!target) {
            // Fallback search by text
            target = Array.from(document.querySelectorAll('.table-menu-content a')).find(el =>
                (el.innerText || '').toLowerCase().includes("fundamentals")
            );
        }
    } else if (actionType === 'Technicals') {
        // Based on user provided HTML: <span class="icon icon-trending-up"></span> Chart
        target = document.querySelector('img[alt="Steak logo"]')?.closest("a");
        if (!target) {
            // Fallback search by text
            target = Array.from(document.querySelectorAll('.table-menu-content a')).find(el =>
                (el.innerText || '').toLowerCase().includes("technicals")
            );
        }
    }

    if (target) {
        console.log(`Clicking ${actionType} action`);
        target.click();

        // Final cleanup: move mouse away to allow menu to close if it doesn't automatically
        setTimeout(() => {
            menuBtn.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
        }, 100);
    } else {
        console.warn(`Action "${actionType}" not found in dropdown. Falling back to key simulation.`);
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
 * Updates the custom info badge for a specific row.
 */
function updateRowInfo(row) {
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

    // 1. Check if it's the Holdings Page
    const investedCell = row.querySelector('td[data-label="Invested"]');
    const dayChgCell = row.querySelector('td[data-label="Day chg."]');

    // 2. Check if it's the Positions Page
    const qtyCellPos = row.querySelector('td[data-label="Qty."], td.qty');
    const avgCellPos = row.querySelector('td[data-label="Avg."]');

    // 3. Check if it's the Orders Page
    const qtyCellOrd = row.querySelector('td[data-label="Qty"], td[data-label="Quantity"]');
    const priceCellOrd = row.querySelector('td[data-label="Price"], td[data-label="Avg. Price"]');
    const ltpCellOrd = row.querySelector('td[data-label="LTP"]');

    if (investedCell && dayChgCell) {
        // Holdings Page: Show Day's Profit (Day Change % * Invested)
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
        // Positions Page: Show Total Invested (Qty * Avg)
        const qty = parseFloat(qtyCellPos.textContent.replace(/,/g, '')) || 0;
        const avg = parseFloat(avgCellPos.textContent.replace(/,/g, '')) || 0;
        const invested = qty * avg;

        displayValue = `Invested: ${invested.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        tooltip = `Total Invested = Qty (${qty}) * Avg (${avg.toLocaleString('en-IN')})`;
        foundData = true;
    } else if (qtyCellOrd && priceCellOrd) {
        // Orders Page: Show Locked Margin (Qty * Price, /5 for MIS)
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

        // Add % Diff next to LTP if available
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
 * Calculates total invested and current value for holdings and updates the header.
 */
function updateHoldingsTotalSummary() {
    const isHoldingsPage = window.location.pathname.includes('/holdings') || document.querySelector('.holdings-page');
    if (!isHoldingsPage) return;

    const rows = document.querySelectorAll('.holdings table tbody tr');
    let totalInvested = 0;
    let totalCurrent = 0;

    // Tag-wise totals
    const tagTotals = {};
    AVAILABLE_TAGS.forEach(tag => {
        if (tag !== 'NONE') tagTotals[tag] = { inv: 0, cur: 0 };
    });

    const excludeList = getExcludeList();
    const tagMap = getTagMap();




    rows.forEach(row => {
        const symbol = (row.querySelector('.tradingsymbol') || row.querySelector('.instrument a span') || row.querySelector('.instrument span'))?.textContent.trim();
        const isExcluded = symbol && excludeList.includes(symbol);
        if (isExcluded) {
            row.classList.add('kite-excluded-row');
        } else {
            row.classList.remove('kite-excluded-row');
        }

        const investedCell = row.querySelector('td[data-label="Invested"]');
        const currentValCell = row.querySelector('td[data-label="Cur. val"]');

        if (investedCell && currentValCell) {
            const inv = parseFloat(investedCell.textContent.replace(/,/g, '')) || 0;
            const cur = parseFloat(currentValCell.textContent.replace(/,/g, '')) || 0;

            if (!isExcluded) {
                totalInvested += inv;
                totalCurrent += cur;
            }

            // Add to tag total if a tag is set
            const tag = tagMap[symbol];
            if (tag && tag !== 'NONE' && tagTotals[tag]) {
                tagTotals[tag].inv += inv;
                tagTotals[tag].cur += cur;
            }
        }
    });

    const headerSelectors = ['h3.page-title', '.page-header h3', 'h3'];
    const header = Array.from(document.querySelectorAll(headerSelectors.join(',')))
        .find(h => h.textContent.toUpperCase().includes('HOLDINGS'));



    if (header) {
        let summaryBadge = header.querySelector('.kite-total-summary');
        if (!summaryBadge) {
            summaryBadge = document.createElement('span');
            summaryBadge.className = 'kite-total-summary';
            header.appendChild(summaryBadge);
        }

        let html = `
            <div class="kite-summary-cat">
                <span class="kite-summary-label">TOTAL:</span>
                <span class="kite-summary-val">${totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })} | ${totalCurrent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
        `;

        // Add cats that have values
        Object.entries(tagTotals).forEach(([tag, vals]) => {
            if (vals.inv > 0) {
                html += `
                    <div class="kite-summary-cat">
                        <span class="kite-summary-label">${tag}:</span>
                        <span class="kite-summary-val">${vals.inv.toLocaleString('en-IN', { maximumFractionDigits: 0 })} | ${vals.cur.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                `;
            }
        });

        if (summaryBadge.innerHTML !== html) {
            summaryBadge.innerHTML = html;
        }
    }
}

/**
 * Calculates total margin for open orders and updates the header.
 */
function updateOrdersTotalMargin() {
    const isOrdersPage = window.location.pathname.includes('/orders');
    if (!isOrdersPage) return;

    // Use specific section selector to only get Open Orders
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
}

/**
 * Calculates total invested for all positions and updates the header.
 */
function updatePositionsTotalSummary() {
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
}

function injectActionButtons() {
    const rows = document.querySelectorAll('.holdings table tbody tr, .positions table tbody tr, .orderbook table tbody tr, .orders table tbody tr');

    // 1. Setup Header Summaries (On Load + Hover Refresh)
    const isHoldingsPage = window.location.pathname.includes('/holdings') || document.querySelector('.holdings-page');
    const isPositionsPage = window.location.pathname.includes('/positions') || document.querySelector('.positions-page');
    const isOrdersPage = window.location.pathname.includes('/orders') || document.querySelector('.orders-page');




    const findHeader = (text, selectors) => {
        for (const sel of selectors) {
            const h = Array.from(document.querySelectorAll(sel)).find(el => el.textContent.toUpperCase().includes(text.toUpperCase()));
            if (h) return h;
        }
        return null;
    };

    const headerSelectors = ['h3.page-title', '.page-header h3', 'h3'];

    // Ensure summaries are updated if page is ready
    if (isHoldingsPage) updateHoldingsTotalSummary();
    if (isPositionsPage) updatePositionsTotalSummary();
    if (isOrdersPage) updateOrdersTotalMargin();

    // Attach hover listeners (only once)
    const holdHeader = findHeader('Holdings', headerSelectors);
    if (holdHeader && !holdHeader.dataset.listenerAttached) {
        holdHeader.addEventListener('mouseenter', updateHoldingsTotalSummary);
        holdHeader.dataset.listenerAttached = 'true';
    }

    const posHeader = findHeader('Positions', headerSelectors);
    if (posHeader && !posHeader.dataset.listenerAttached) {
        posHeader.addEventListener('mouseenter', updatePositionsTotalSummary);
        posHeader.dataset.listenerAttached = 'true';
    }

    const ordHeader = findHeader('Open orders', headerSelectors);
    if (ordHeader && !ordHeader.dataset.listenerAttached) {
        ordHeader.addEventListener('mouseenter', updateOrdersTotalMargin);
        ordHeader.dataset.listenerAttached = 'true';
    }

    rows.forEach(row => {
        const instrumentCell = row.querySelector('td.instrument');
        if (!instrumentCell) return;

        // Handle exclusion for holdings (checked separately from action buttons)
        if (isHoldingsPage && !instrumentCell.querySelector('.kite-exclude-btn')) {
            const excludeList = getExcludeList();
            const symbol = (row.querySelector('.tradingsymbol') || row.querySelector('.instrument a span') || row.querySelector('.instrument span'))?.textContent.trim();
            if (symbol) {
                const isExcluded = excludeList.includes(symbol);
                if (isExcluded) row.classList.add('kite-excluded-row');

                const excludeBtn = document.createElement('button');
                excludeBtn.className = `kite-exclude-btn ${isExcluded ? 'excluded' : ''}`;
                excludeBtn.innerHTML = '&#8854;'; // Minus symbol
                excludeBtn.title = isExcluded ? 'Include in calculation' : 'Exclude from calculation';

                excludeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const currentList = getExcludeList();
                    if (currentList.includes(symbol)) {
                        setExcludeList(currentList.filter(s => s !== symbol));
                        excludeBtn.classList.remove('excluded');
                        row.classList.remove('kite-excluded-row');
                    } else {
                        setExcludeList([...currentList, symbol]);
                        excludeBtn.classList.add('excluded');
                        row.classList.add('kite-excluded-row');
                    }
                    updateHoldingsTotalSummary();
                });

                instrumentCell.prepend(excludeBtn);
            }
        }

        // Handle tagging for holdings
        if (isHoldingsPage && !instrumentCell.querySelector('.kite-tag-select')) {
            const tagMap = getTagMap();
            const symbol = (row.querySelector('.tradingsymbol') || row.querySelector('.instrument a span') || row.querySelector('.instrument span'))?.textContent.trim();
            if (symbol) {
                const currentTag = tagMap[symbol] || 'NONE';
                const select = document.createElement('select');
                select.className = 'kite-tag-select';

                AVAILABLE_TAGS.forEach(tag => {
                    const opt = document.createElement('option');
                    opt.value = tag;
                    opt.textContent = tag;
                    if (tag === currentTag) opt.selected = true;
                    select.appendChild(opt);
                });

                select.addEventListener('change', (e) => {
                    const newTag = e.target.value;
                    const currentMap = getTagMap();
                    currentMap[symbol] = newTag;
                    setTagMap(currentMap);
                    updateHoldingsTotalSummary();
                });

                instrumentCell.prepend(select);
            }
        }

        let container = instrumentCell.querySelector(`.${BTN_CONTAINER_CLASS}`);
        if (container) return; // Action buttons already injected

        // Create container and buttons
        container = document.createElement('div');
        container.className = BTN_CONTAINER_CLASS;

        const buyBtn = createActionButton('buy', 'Add', 'Add', row);
        const depthBtn = createActionButton('depth', 'Market Depth', 'Market depth', row);
        const chartBtn = createActionButton('chart', 'Open Chart', 'Chart', row);
        const breakdownBtn = createActionButton('breakdown', 'Open Breakdown', 'Breakdown', row);
        const fundamentalsBtn = createActionButton('fundamentals', 'Open Fundamentals', 'Fundamentals', row);
        const technicalsBtn = createActionButton('technicals', 'Open Technicals', 'Technicals', row);

        container.appendChild(buyBtn);
        container.appendChild(depthBtn);
        container.appendChild(chartBtn);
        container.appendChild(breakdownBtn);
        container.appendChild(fundamentalsBtn);
        container.appendChild(technicalsBtn);

        const target = instrumentCell.querySelector('a.initial, .tradingsymbol');
        if (target) {
            target.appendChild(container);
        } else {
            instrumentCell.appendChild(container);
        }

        // 2. Individual row info: Show on load once
        updateRowInfo(row);

        // 2.5 Extra delay for Orders page (LTP sometimes loads late)
        if (isOrdersPage) {
            setTimeout(() => updateRowInfo(row), 1500);
        }

        // 3. Individual row info: Update value on mouseover
        row.addEventListener('mouseenter', () => updateRowInfo(row));
    });
}

// Observe changes and inject
const observer = new MutationObserver(() => injectActionButtons());
observer.observe(document.body, { childList: true, subtree: true });

injectActionButtons();

// Observe orders notifications count for changes
function observeOrdersNotificationsCount() {
    const span = document.querySelector('.orders-notifications-count .count');
    if (span) {
        let previousValue = span.textContent || span.innerText;
        const spanObserver = new MutationObserver(() => {
            const currentValue = span.textContent || span.innerText;
            if (currentValue !== previousValue) {
                console.log(`Orders notifications count changed: ${previousValue} -> ${currentValue}`);
                chrome.runtime.sendMessage({ action: 'notify', value: currentValue, type: 'orders_count' });
                previousValue = currentValue;
            }
        });
        spanObserver.observe(span, { childList: true, subtree: true, characterData: true });
    } else {
        // If not found, observe body for when it appears
        const bodyObserver = new MutationObserver(() => {
            const span = document.querySelector('.orders-notifications-count .count');
            if (span) {
                bodyObserver.disconnect();
                observeOrdersNotificationsCount();
            }
        });
        bodyObserver.observe(document.body, { childList: true, subtree: true });
    }
}

observeOrdersNotificationsCount();
