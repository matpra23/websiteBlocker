// List of blocked websites
const blockedSites = ["facebook.com", "instagram.com"];

// Update blocking rules
async function updateRules() {
  const rules = [];
  let ruleId = 1;

  // First, remove all existing rules
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: Array.from({length: 1000}, (_, i) => i + 1)
  });

  // Add rules for blocked sites
  for (const pattern of blockedSites) {
    rules.push({
      id: ruleId++,
      priority: 1,
      action: { type: "block" },
      condition: {
        urlFilter: pattern,
        resourceTypes: ["main_frame", "sub_frame"]
      }
    });
  }

  // Add new rules
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: rules
  });
}

// Initialize rules when extension starts
updateRules();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "addSite") {
    const site = request.site.trim().toLowerCase();
    if (!blockedSites.includes(site)) {
      blockedSites.push(site);
      saveBlockedSites();
    }
  } else if (request.action === "removeSite") {
    const site = request.site.trim().toLowerCase();
    blockedSites = blockedSites.filter(s => s !== site);
    saveBlockedSites();
  } else if (request.action === "getSites") {
    sendResponse({ sites: blockedSites });
  }
  return true;
});

// Save blocked sites to storage
async function saveBlockedSites() {
  try {
    await chrome.storage.sync.set({ blockedSites: blockedSites });
    await updateRules();
  } catch (error) {
    console.error('Error saving sites:', error);
  }
}

async function init() {
  const stored = await chrome.storage.sync.get("blockedSites");
  if (stored.blockedSites && Array.isArray(stored.blockedSites)) {
    blockedSites.length = 0;
    blockedSites.push(...stored.blockedSites);
  }
  await updateRules();
}

init();