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

    // Check if it's the Holdings Page
    const investedCell = row.querySelector('td[data-label="Invested"]');
    const dayChgCell = row.querySelector('td[data-label="Day chg."]');

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
    } else {
        // Positions Page: Show Total Invested (Qty * Avg)
        const qtyCell = row.querySelector('td[data-label="Qty."], td.qty');
        const avgCell = row.querySelector('td[data-label="Avg."]');

        if (qtyCell && avgCell) {
            const qty = parseFloat(qtyCell.textContent.replace(/,/g, '')) || 0;
            const avg = parseFloat(avgCell.textContent.replace(/,/g, '')) || 0;
            const invested = qty * avg;

            displayValue = `Invested: ${invested.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
            tooltip = `Total Invested = Qty (${qty}) * Avg (${avg.toLocaleString('en-IN')})`;
            foundData = true; // No green/red class for pure invested value
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
    const rows = document.querySelectorAll('.holdings table tbody tr, .positions table tbody tr, .orderbook table tbody tr');

    // 1. Setup Positions Header Summary (On Load + Hover Refresh)
    const isPositionsPage = window.location.pathname.includes('/positions');
    const header = Array.from(document.querySelectorAll('h3.page-title.small')).find(h => h.textContent.includes('Positions'));

    if (isPositionsPage && header && !header.dataset.listenerAttached) {
        // Initial delayed calculation to ensure page is "completely loaded"
        setTimeout(updatePositionsTotalSummary, 1500);

        // Refresh only on hover
        header.addEventListener('mouseenter', updatePositionsTotalSummary);
        header.dataset.listenerAttached = 'true';
    }

    rows.forEach(row => {
        const instrumentCell = row.querySelector('td.instrument');
        if (!instrumentCell) return;

        let container = instrumentCell.querySelector(`.${BTN_CONTAINER_CLASS}`);
        if (container) return; // Already injected

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
