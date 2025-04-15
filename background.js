// List of blocked websites
let blockedSites = [];

// 🔁 Śledzenie przeładowanych tabów
const reloadedTabs = new Set();

// Inicjalizacja danych z pamięci
chrome.storage.sync.get("blockedSites", (data) => {
  if (data.blockedSites && Array.isArray(data.blockedSites)) {
    blockedSites = data.blockedSites.map(s => s.toLowerCase());
  }
});

// 🔄 Nasłuch na zmiany w pamięci (dynamiczne odświeżenie listy)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.blockedSites) {
    blockedSites = changes.blockedSites.newValue.map(s => s.toLowerCase());
  }
});

// 🧠 Listener do "soft reload" tylko raz
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === 'complete' &&
    tab.url &&
    !reloadedTabs.has(tabId) &&
    tab.url.startsWith('http')
  ) {
    const url = new URL(tab.url);
    const hostname = url.hostname.replace(/^www\./, '').toLowerCase();

    if (blockedSites.includes(hostname)) {
      // 🔒 Zabezpieczenie: zapamiętaj, że przeładowałeś
      reloadedTabs.add(tabId);

      // 🔁 Wymuś reload (tylko raz)
      chrome.tabs.reload(tabId);

      // 🕒 Po 10 sekundach odblokuj możliwość reloadu
      setTimeout(() => {
        reloadedTabs.delete(tabId);
      }, 10000);
    }
  }
});

// Update blocking rules
async function updateRules() {
  const ruleIdsToRemove = blockedSites.map((_, i) => i + 1);
  const newRules = blockedSites.map((site, i) => ({
    id: i + 1,
    priority: 1,
    action: { type: "block" },
    condition: {
      domains: [site.replace(/^(\*:\/\/)?(www\.)?/, '')],
      resourceTypes: ["main_frame"]
    }
  }));

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ruleIdsToRemove,
      addRules: newRules
    });

    console.log("✅ Reguły zaktualizowane:", newRules);
  } catch (err) {
    console.error("❌ Błąd aktualizacji reguł:", err);
  }
}

// Inicjalizacja reguł przy starcie
chrome.runtime.onInstalled.addListener(() => {
  init();
});

chrome.runtime.onStartup.addListener(() => {
  init();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const site = request.site?.trim().toLowerCase();

  if (request.action === "addSite" && site) {
    if (!blockedSites.includes(site)) {
      blockedSites.push(site);
      chrome.storage.local.set({ blockedSites }); // nie awaitujemy
      updateRules(); // w tle
    }
    sendResponse({ success: true });

  } else if (request.action === "removeSite" && site) {
    blockedSites = blockedSites.filter(s => s !== site);
    chrome.storage.local.set({ blockedSites });
    updateRules();
    sendResponse({ success: true });

  } else if (request.action === "getSites") {
    sendResponse({ sites: blockedSites });
  }

  return true; // keep port open for async response
});

async function init() {
  const stored = await chrome.storage.local.get("blockedSites");
  if (Array.isArray(stored.blockedSites)) {
    blockedSites = stored.blockedSites;
    await updateRules();
  }
}