// List of blocked websites
let blockedSites = [];

// 🔁 Śledzenie przeładowanych tabów
const reloadedTabs = new Set();

// Inicjalizacja danych z pamięci
chrome.storage.local.get("blockedSites", (data) => {
  if (data.blockedSites && Array.isArray(data.blockedSites)) {
    blockedSites = data.blockedSites.map(s => s.toLowerCase());
    updateRules(); // Aktualizuj reguły po załadowaniu danych
  }
});

// 🔄 Nasłuch na zmiany w pamięci (dynamiczne odświeżenie listy)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.blockedSites) {
    blockedSites = changes.blockedSites.newValue.map(s => s.toLowerCase());
    updateRules(); // Aktualizuj reguły po zmianie danych
  }
});

// 🧠 Nasłuch na próby nawigacji
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId === 0) { // Tylko główna ramka
    const url = new URL(details.url);
    const hostname = url.hostname.replace(/^www\./, '').toLowerCase();

    if (blockedSites.includes(hostname)) {
      // Anuluj nawigację
      chrome.tabs.update(details.tabId, {
        url: chrome.runtime.getURL('blocked.html')
      });
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
      urlFilter: `*://${site.replace(/^www\./, '')}/*`,
      resourceTypes: ["main_frame", "sub_frame"]
    }
  }));

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ruleIdsToRemove,
      addRules: newRules
    });

    // Zapisz aktualną listę do storage po każdej aktualizacji reguł
    await chrome.storage.local.set({ blockedSites });
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
      updateRules(); // updateRules() już zapisuje do storage
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, message: "Site already blocked" });
    }

  } else if (request.action === "removeSite" && site) {
    blockedSites = blockedSites.filter(s => s !== site);
    updateRules(); // updateRules() już zapisuje do storage
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