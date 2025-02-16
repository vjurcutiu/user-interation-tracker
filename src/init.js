import { debounce, throttle } from './utils.js';
import { 
  handleUserInteraction, 
  handleMouseMove, 
  handleContextMenu, 
  handleResize,
  handleFormSubmission
} from './listeners.js';
import { 
  captureInitialDomSnapshot, 
  startObservingDom, 
  stopObservingDom, 
  getDomMutations 
} from './domSnapshot.js';

let currentUrl = window.location.href;
let initialDomSnapshot = null;

function monitorUrlChanges() {
  const observer = new MutationObserver(() => {
    const newUrl = window.location.href;
    if (newUrl !== currentUrl) {
      console.log(`URL changed: ${currentUrl} -> ${newUrl}`);
      currentUrl = newUrl;
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

export function attachListeners() {
  document.addEventListener('click', handleUserInteraction);
  document.addEventListener('input', debounce(handleUserInteraction, 300));
  document.addEventListener('scroll', debounce(handleUserInteraction, 500));
  document.addEventListener('keydown', handleUserInteraction);
  document.addEventListener('mousemove', throttle(handleMouseMove, 200));
  document.addEventListener('contextmenu', handleContextMenu);
  
  window.addEventListener('resize', debounce(handleResize, 300));
  document.addEventListener('submit', handleFormSubmission, true);
}

export function detachListeners() {
  document.removeEventListener('click', handleUserInteraction);
  document.removeEventListener('input', handleUserInteraction);
  document.removeEventListener('scroll', handleUserInteraction);
  document.removeEventListener('keydown', handleUserInteraction);
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('contextmenu', handleContextMenu);
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('submit', handleFormSubmission, true);
}

function initialize() {
  console.log('Initializing content script...');
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.error('Extension context is unavailable. Aborting initialization.');
    return;
  }
  
  currentUrl = window.location.href;
  
  // Capture the initial DOM snapshot at the start of the recording.
  initialDomSnapshot = captureInitialDomSnapshot();
  chrome.storage.local.set({ initialDomSnapshot: initialDom });
  console.log('Initial DOM Snapshot captured.');

  // Start observing DOM changes.
  startObservingDom();

  attachListeners();
  monitorUrlChanges();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "start") {
    console.log("Recording started.");
    initialDomSnapshot = captureInitialDomSnapshot();
    console.log('Initial DOM Snapshot captured.');
    startObservingDom();
    attachListeners();
  } else if (message.action === "stop") {
    console.log("Recording stopped.");
    detachListeners();
    stopObservingDom();
    // Optionally, store or export the recorded DOM mutations:
    console.log('Recorded DOM Mutations:', getDomMutations());
  }
});
