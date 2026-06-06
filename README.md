# Sidebar Hub

A lightweight Chrome/Edge extension that lets you open your favorite websites in the browser's built-in side panel — keeping them accessible without taking up a tab.

![Manifest Version](https://img.shields.io/badge/Manifest-v3-blue)
![License](https://img.shields.io/badge/license-Copyright%202boom%202026-lightgrey)

---

## Features

- **Quick access** — load any website directly in the browser side panel
- **Custom site list** — add, edit, and delete sites via the built-in Options manager
- **Persistent state** — remembers the last visited site and restores it on reopen
- **Loading feedback** — spinner overlay with slow-load warnings and a timeout message
- **Error handling** — detects blocked embedding (X-Frame-Options), timeouts, and offline state
- **Dark mode** — automatically follows your system theme
- **No external dependencies** — pure HTML/CSS/JS, uses only the Chrome Extensions API

---

## Installation

### From source (Developer Mode)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/your-username/sidebar-hub.git
   ```

2. Open Chrome or Edge and go to the extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`

3. Enable **Developer mode** (toggle in the top-right corner).

4. Click **Load unpacked** and select the project folder.

5. The Sidebar Hub icon will appear in your toolbar. Click it to open the side panel.

---

## Usage

1. Click the **Sidebar Hub** toolbar icon to open the side panel.
2. On first launch, the **Options** screen opens automatically — add your first site.
3. Enter a **Site Name** and **URL**, then click **Add Site**.
4. Use the dropdown at the top of the panel to switch between your saved sites.
5. Select **Options** from the dropdown at any time to manage your site list.

### Managing Sites

| Action | How |
|--------|-----|
| Add a site | Enter name + URL in the Options form and click **Add Site** |
| Edit a site | Click **Edit** next to any site — the form pre-fills for updating |
| Delete a site | Click **Delete** next to any site and confirm |
| Delete all sites | Click **Delete All Sites** at the bottom of Options and confirm |

---

## File Structure

```
sidebar-hub/
├── manifest.json       # Extension manifest (MV3)
├── background.js       # Service worker — sets side panel behavior on install
├── sidepanel.html      # Main side panel UI
├── sidepanel.js        # Side panel logic (dropdown, iframe, state management)
├── config.html         # Options/site manager UI
├── config.js           # Options logic (add/edit/delete sites)
└── icons/
    ├── icon-16.png
    ├── icon-32.png
    ├── icon-48.png
    └── icon-128.png
```

---

## Permissions

| Permission | Reason |
|------------|--------|
| `sidePanel` | Required to use the Chrome Side Panel API |
| `storage` | Saves your site list and last visited site locally |
| `https://*/*`, `http://*/*` | Allows loading any website in the iframe |

All data is stored locally using `chrome.storage.local`. Nothing is sent to any server.

---

## Known Limitations

- **Some sites block embedding** — websites that set `X-Frame-Options: DENY` or `SAMEORIGIN` cannot be displayed inside the side panel iframe. The extension will show an error message in this case.
- **No drag-to-reorder** — site order in the list currently follows insertion order.

---

## Browser Compatibility

| Browser | Supported |
|---------|-----------|
| Chrome 114+ | ✅ |
| Edge 114+ | ✅ |
| Firefox | ❌ (no Side Panel API) |
| Safari | ❌ (no Side Panel API) |

---

## License

Copyright © 2boom, 2026. All rights reserved.
