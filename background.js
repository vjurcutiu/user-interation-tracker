chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const { interactionData, domSnapshot } = message;
  
    console.log('Interaction:', interactionData);
    console.log('DOM Snapshot:', domSnapshot);
  
    // Optionally store the data
    chrome.storage.local.get({ records: [] }, (result) => {
      const records = result.records;
      records.push({ interactionData, domSnapshot });
      chrome.storage.local.set({ records });
    });
  
    sendResponse({ status: 'success' });
  });
  