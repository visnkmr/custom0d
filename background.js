chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'notify') {
        const title = message.type === 'orders_count' ? 'Zerodha order status changed' : 'Value Changed';
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            title: title,
            message: `New value: ${message.value}`
        });
    }
});