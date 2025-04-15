document.addEventListener('DOMContentLoaded', function() {
  const siteInput = document.getElementById('siteInput');
  const addButton = document.getElementById('addButton');
  const blockedSitesList = document.getElementById('blockedSitesList');

  // Load and display blocked sites
  loadBlockedSites();

  // Add new site to block list
  addButton.addEventListener('click', async function() {
    const site = siteInput.value.trim();
    if (site) {
      try {
        const response = await chrome.runtime.sendMessage({ action: "addSite", site: site });
        if (response && response.success) {
          await loadBlockedSites();
          siteInput.value = '';
        } else {
          console.error('Failed to add site');
        }
      } catch (error) {
        console.error('Error adding site:', error);
      }
    }
  });

  // Load blocked sites from storage and display them
  async function loadBlockedSites() {
    try {
      const response = await chrome.runtime.sendMessage({ action: "getSites" });
      if (response && response.sites) {
        blockedSitesList.innerHTML = '';
        response.sites.forEach(function(site) {
          const li = document.createElement('li');
          
          const icon = document.createElement('div');
          icon.className = 'site-icon';
          
          const name = document.createElement('span');
          name.className = 'site-name';
          name.textContent = site;
          
          const status = document.createElement('span');
          status.className = 'status';
          status.textContent = 'BLOCKED';
          
          const removeBtn = document.createElement('button');
          removeBtn.className = 'remove-btn';
          removeBtn.textContent = 'Remove';
          removeBtn.addEventListener('click', async function() {
            try {
              const removeResponse = await chrome.runtime.sendMessage({ action: "removeSite", site: site });
              if (removeResponse && removeResponse.success) {
                await loadBlockedSites();
              } else {
                console.error('Failed to remove site');
              }
            } catch (error) {
              console.error('Error removing site:', error);
            }
          });
          
          li.appendChild(icon);
          li.appendChild(name);
          li.appendChild(status);
          li.appendChild(removeBtn);
          blockedSitesList.appendChild(li);
        });
      }
    } catch (error) {
      console.error('Error loading blocked sites:', error);
    }
  }
});
