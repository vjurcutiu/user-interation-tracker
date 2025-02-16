let recording = false;

function showNotification(title, message) {
  chrome.notifications.create('', {
    type: 'basic',
    iconUrl: 'icon.png', // Make sure you have an icon.png in your extension folder
    title: title,
    message: message,
  });
}

// Function to export recorded data as a JSON file
function exportRecording() {
  // Retrieve stored interaction data, initial DOM snapshot, and DOM mutations
  chrome.storage.local.get({ 
    records: [], 
    initialDomSnapshot: '', 
    domMutations: [] 
  }, (result) => {
    const exportData = {
      interactions: result.records,
      initialDomSnapshot: result.initialDomSnapshot,
      domMutations: result.domMutations
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
      url: url,
      filename: `recording-${Date.now()}.json`,
      conflictAction: 'uniquify'
    }, (downloadId) => {
      console.log('Download started with ID:', downloadId);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      
      // Optionally clear stored data
      chrome.storage.local.set({ records: [], initialDomSnapshot: '', domMutations: [] });
    });
  });
}

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-recording") {
    recording = !recording;
    console.log(`Recording ${recording ? "started" : "stopped"}.`);

    // Show a notification for visual feedback
    showNotification(
      recording ? "Recording Started" : "Recording Stopped",
      recording ? "User interaction recording has started." : "User interaction recording has stopped."
    );

    // Query the active tab and send a message to the content script to start/stop recording.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: recording ? "start" : "stop" });
      }
    });

    // If recording just stopped, automatically export the recording.
    if (!recording) {
      exportRecording();
    }
  }
});

// Existing message listener for receiving interaction data
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { interactionData, domSnapshot } = message;
  console.log('Interaction:', interactionData);
  console.log('DOM Snapshot:', domSnapshot);

  // Optionally store the data in chrome.storage
  chrome.storage.local.get({ records: [] }, (result) => {
    const records = result.records;
    records.push({ interactionData, domSnapshot });
    chrome.storage.local.set({ records });
  });

  sendResponse({ status: 'success' });
});
