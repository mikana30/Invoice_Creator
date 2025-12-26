/**
 * Update Checker for Invoice Creator
 * Checks GitHub Releases for new versions
 */

// Configure this with your GitHub repository
const GITHUB_OWNER = 'mikana30';
const GITHUB_REPO = 'Invoice_Creator';
const RELEASES_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

/**
 * Compare semantic versions
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1, v2) {
  const parts1 = v1.replace(/^v/, '').split('.').map(Number);
  const parts2 = v2.replace(/^v/, '').split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;

    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }

  return 0;
}

/**
 * Check for updates from GitHub Releases
 * @param {string} currentVersion - Current app version (e.g., "1.0.0")
 * @returns {Promise<object>} Update info
 */
async function checkForUpdates(currentVersion) {
  try {
    const response = await fetch(RELEASES_URL, {
      headers: {
        'User-Agent': 'InvoiceCreator-UpdateChecker',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No releases yet
        return { available: false, reason: 'no_releases' };
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const release = await response.json();
    const latestVersion = release.tag_name.replace(/^v/, '');

    // Compare versions
    if (compareVersions(latestVersion, currentVersion) > 0) {
      // Find Windows installer asset
      const windowsAsset = release.assets.find(asset =>
        asset.name.endsWith('.exe') ||
        asset.name.endsWith('.msi') ||
        asset.name.includes('win') && asset.name.endsWith('.zip')
      );

      return {
        available: true,
        currentVersion,
        latestVersion,
        releaseNotes: release.body,
        releaseName: release.name,
        releaseUrl: release.html_url,
        downloadUrl: windowsAsset ? windowsAsset.browser_download_url : release.html_url,
        publishedAt: release.published_at
      };
    }

    return {
      available: false,
      currentVersion,
      latestVersion,
      reason: 'up_to_date'
    };

  } catch (error) {
    console.error('Update check failed:', error);
    return {
      available: false,
      error: error.message
    };
  }
}

/**
 * Get dismissed versions from storage
 */
function getDismissedVersions() {
  try {
    const Store = require('electron-store');
    const store = new Store();
    return store.get('dismissedVersions', []);
  } catch {
    return [];
  }
}

/**
 * Dismiss a version (user chose to skip it)
 */
function dismissVersion(version) {
  try {
    const Store = require('electron-store');
    const store = new Store();
    const dismissed = store.get('dismissedVersions', []);
    if (!dismissed.includes(version)) {
      dismissed.push(version);
      store.set('dismissedVersions', dismissed);
    }
  } catch (error) {
    console.error('Failed to dismiss version:', error);
  }
}

/**
 * Set reminder for later (remind in 24 hours)
 */
function remindLater() {
  try {
    const Store = require('electron-store');
    const store = new Store();
    store.set('updateRemindAfter', Date.now() + 24 * 60 * 60 * 1000);
  } catch (error) {
    console.error('Failed to set reminder:', error);
  }
}

/**
 * Check if we should show update notification
 */
function shouldShowUpdate(version) {
  try {
    const Store = require('electron-store');
    const store = new Store();

    // Check if version was dismissed
    const dismissed = store.get('dismissedVersions', []);
    if (dismissed.includes(version)) {
      return false;
    }

    // Check if reminder is still active
    const remindAfter = store.get('updateRemindAfter', 0);
    if (Date.now() < remindAfter) {
      return false;
    }

    return true;
  } catch {
    return true;
  }
}

module.exports = {
  checkForUpdates,
  compareVersions,
  getDismissedVersions,
  dismissVersion,
  remindLater,
  shouldShowUpdate
};
