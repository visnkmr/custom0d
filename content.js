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
    }else if (actionType === 'Breakdown') {
        // Based on user provided HTML: <span class="icon icon-trending-up"></span> Chart
        target = document.querySelector(".icon-console")?.closest("a");
        if (!target) {
            // Fallback search by text
            target = Array.from(document.querySelectorAll('.table-menu-content a')).find(el =>
                (el.innerText || '').toLowerCase().includes("breakdown")
            );
        }
    }else if (actionType === 'Fundamentals') {
        // Based on user provided HTML: <span class="icon icon-trending-up"></span> Chart
        target = document.querySelector('img[alt="Tijori logo"]')?.closest("a");
        if (!target) {
            // Fallback search by text
            target = Array.from(document.querySelectorAll('.table-menu-content a')).find(el =>
                (el.innerText || '').toLowerCase().includes("fundamentals")
            );
        }
    }else if (actionType === 'Technicals') {
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

function injectActionButtons() {
    const rows = document.querySelectorAll('.holdings table tbody tr, .positions table tbody tr');

    rows.forEach(row => {
        const instrumentCell = row.querySelector('td.instrument');
        if (!instrumentCell || instrumentCell.querySelector(`.${BTN_CONTAINER_CLASS}`)) return;

        const container = document.createElement('div');
        container.className = BTN_CONTAINER_CLASS;

        const buyBtn = createActionButton('buy', 'Add to Basket (Buy)', 'Add', row);
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
    });
}

// Observe changes and inject
const observer = new MutationObserver(() => injectActionButtons());
observer.observe(document.body, { childList: true, subtree: true });

injectActionButtons();
