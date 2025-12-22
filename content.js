console.log("Kite Custom Actions Extension - Refined Logic");

const BTN_CONTAINER_CLASS = 'kite-action-btns';

const ICONS = {
    buy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    chart: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20v-6"></path></svg>`,
    depth: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`
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

    // 2. Trigger mouseover on the menu button to "wake up" the row/dropdown logic
    menuBtn.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, view: window }));
    await delay(20);

    // 3. Click the menu button to open the dropdown
    menuBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, view: window, cancelable: true }));

    // 4. Wait for the dropdown to appear in the DOM
    await delay(30);

    // 5. Find the target action element
    let target = null;

    // Look in the entire document since Kite often appends menus to the body
    const dropdown = document.querySelector(".table-menu-content, .context-menu, .dropdown");
    const searchScope = dropdown ? [dropdown] : [document.body];

    if (actionType === 'Add') {
        // "Add" is a special data-label in the toolbar
        target = document.querySelector('[data-label="Add"]');
    } else if (actionType === 'Market depth') {
        // Search for the text "Market depth"
        target = Array.from(document.querySelectorAll('a, span, li')).find(el =>
            (el.innerText || '').toLowerCase().includes("market depth")
        );
    } else if (actionType === 'Chart') {
        // Search for the text "Chart"
        target = Array.from(document.querySelectorAll('a, span, li')).find(el =>
            (el.innerText || '').toLowerCase().includes("chart")
        );
    }

    if (target) {
        console.log(`Triggering Kite action: ${actionType}`);
        target.click();
    } else {
        console.warn(`Action element for "${actionType}" not found. Trying fallback.`);
        // Fallback to keyboard shortcuts (last resort)
        row.click();
        const key = actionType === 'Add' ? 'b' : (actionType === 'Chart' ? 'c' : 'd');
        document.dispatchEvent(new KeyboardEvent('keydown', { key, keyCode: key.toUpperCase().charCodeAt(0), bubbles: true }));
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
    // Target both Holdings and Positions tables
    const rows = document.querySelectorAll('.holdings table tbody tr, .positions table tbody tr');

    rows.forEach(row => {
        const instrumentCell = row.querySelector('td.instrument');
        if (!instrumentCell || instrumentCell.querySelector(`.${BTN_CONTAINER_CLASS}`)) return;

        const container = document.createElement('div');
        container.className = BTN_CONTAINER_CLASS;

        // Create buttons
        const buyBtn = createActionButton('buy', 'Add to Basket (Buy)', 'Add', row);
        const depthBtn = createActionButton('depth', 'Market Depth', 'Market depth', row);
        const chartBtn = createActionButton('chart', 'Open Chart', 'Chart', row);

        container.appendChild(buyBtn);
        container.appendChild(depthBtn);
        container.appendChild(chartBtn);

        // Append to the instrument link or cell
        const target = instrumentCell.querySelector('a.initial, .tradingsymbol');
        if (target) {
            target.appendChild(container);
        } else {
            instrumentCell.appendChild(container);
        }
    });
}

// Observe changes to handle dynamic content (AJAX loading/navigation)
const observer = new MutationObserver(() => injectActionButtons());
observer.observe(document.body, { childList: true, subtree: true });

// Run immediately
injectActionButtons();
