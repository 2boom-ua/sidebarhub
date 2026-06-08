// Sidebar Hub - Chrome/Edge Extension
// Copyright 2boom, 2026

// DOM elements
const select = document.getElementById("siteSelect");
const frame = document.getElementById("frame");
const contentContainer = document.getElementById("contentContainer");
const loadingOverlay = document.getElementById("loadingOverlay");
const errorOverlay = document.getElementById("errorOverlay");
const errorMessage = document.getElementById("errorMessage");
const retryButton = document.getElementById("retryButton");
const newTabBtn = document.getElementById("newTabBtn");
const reloadBtn = document.getElementById("reloadBtn");

// State
let currentUrl = "";
let isConfigMode = false;
let configIframe = null;
let loadTimeout = null;

// Storage keys
const STORAGE_SITES = "userSites";
const STORAGE_LAST_SITE = "lastSite";
const STORAGE_CONFIG_MODE = "isConfigMode";

// Constants
const LOAD_TIMEOUT_MS = 15000;
const SLOW_LOAD_WARNING_MS = 5000;

// ========== LOAD SITES FROM STORAGE ==========
async function loadSitesFromStorage() {
    return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_SITES], (result) => {
            const sites = result[STORAGE_SITES] || [];
            resolve(sites);
        });
    });
}

// ========== SAVE LAST SITE ==========
function saveLastSite(url) {
    if (url && url !== "__config__") {
        chrome.storage.local.set({ [STORAGE_LAST_SITE]: url });
    }
}

// ========== SAVE CONFIG MODE STATE ==========
function saveConfigModeState(isConfig) {
    chrome.storage.local.set({ [STORAGE_CONFIG_MODE]: isConfig });
    isConfigMode = isConfig;
}

// ========== UPDATE BUTTONS STATE ==========
function updateButtonsState() {
    // Update New Tab button
    if (isConfigMode || !currentUrl || currentUrl === "about:blank") {
        newTabBtn.classList.add("disabled");
        newTabBtn.setAttribute("data-tooltip", "");
    } else {
        newTabBtn.classList.remove("disabled");
        newTabBtn.setAttribute("data-tooltip", "Open in new tab");
    }
    
    // Update Reload button
    if (isConfigMode || !currentUrl || currentUrl === "about:blank") {
        reloadBtn.classList.add("disabled");
        reloadBtn.setAttribute("data-tooltip", "");
    } else {
        reloadBtn.classList.remove("disabled");
        reloadBtn.setAttribute("data-tooltip", "Reload");
    }
}

// ========== OPEN CURRENT SITE IN NEW TAB ==========
function openInNewTab() {
    if (isConfigMode) return;
    if (!currentUrl || currentUrl === "about:blank") return;
    if (!currentUrl.startsWith("http://") && !currentUrl.startsWith("https://")) return;
    
    chrome.tabs.create({ url: currentUrl, active: true });
}

// ========== RELOAD IFRAME ==========
function reloadIframe() {
    if (isConfigMode) return;
    if (!currentUrl || currentUrl === "about:blank") return;
    if (!currentUrl.startsWith("http://") && !currentUrl.startsWith("https://")) return;
    
    // Reload by setting same src
    frame.src = currentUrl;
}

// ========== BUILD DROPDOWN ==========
async function buildDropdown() {
    const sites = await loadSitesFromStorage();
    
    select.innerHTML = "";
    
    for (const site of sites) {
        const option = document.createElement("option");
        option.value = site.url;
        option.textContent = site.name;
        select.appendChild(option);
    }
    
    if (sites.length > 0) {
        const separator = document.createElement("option");
        separator.disabled = true;
        separator.textContent = "──────────";
        select.appendChild(separator);
    }
    
    const optionsOption = document.createElement("option");
    optionsOption.value = "__config__";
    optionsOption.textContent = "Options";
    select.appendChild(optionsOption);
    
    return sites;
}

// ========== LOAD URL IN IFRAME ==========
function loadUrlInFrame(url) {
    if (!url) return;
    
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        showError("Invalid URL format");
        updateButtonsState();
        return;
    }
    
    currentUrl = url;
    hideError();
    showLoading();
    updateButtonsState();
    
    let slowLoadWarningTimer = setTimeout(() => {
        const loadingText = document.querySelector(".loading-text");
        if (loadingText && !loadingOverlay.classList.contains("hidden")) {
            loadingText.textContent = "Still loading... This is taking longer than expected";
        }
    }, SLOW_LOAD_WARNING_MS);
    
    loadTimeout = setTimeout(() => {
        clearTimeout(slowLoadWarningTimer);
        if (!loadingOverlay.classList.contains("hidden")) {
            showError("Connection timeout. The server is not responding. Check your internet connection or try again later.");
            updateButtonsState();
        }
    }, LOAD_TIMEOUT_MS);
    
    frame.src = url;
}

// ========== SHOW LOADING ==========
function showLoading() {
    clearTimeout(loadTimeout);
    loadingOverlay.classList.remove("hidden");
    hideError();
}

function hideLoading() {
    loadingOverlay.classList.add("hidden");
    clearTimeout(loadTimeout);
    
    const loadingText = document.querySelector(".loading-text");
    if (loadingText) loadingText.textContent = "Loading...";
}

// ========== SHOW/HIDE ERROR ==========
function showError(message) {
    hideLoading();
    errorMessage.textContent = message;
    errorOverlay.classList.remove("hidden");
}

function hideError() {
    errorOverlay.classList.add("hidden");
}

// ========== IFRAME EVENT HANDLERS ==========
function onFrameLoad() {
    clearTimeout(loadTimeout);
    hideLoading();
    updateButtonsState();
    
    const loadingText = document.querySelector(".loading-text");
    if (loadingText) loadingText.textContent = "Loading...";
    
    if (currentUrl && currentUrl !== "about:blank" && !isConfigMode) {
        saveLastSite(currentUrl);
    }
}

function onFrameError() {
    clearTimeout(loadTimeout);
    hideLoading();
    updateButtonsState();
    
    let errorMsg = "Failed to load the page.";
    
    setTimeout(() => {
        try {
            const iframeDoc = frame.contentDocument;
            if (!iframeDoc || iframeDoc.title?.includes("404") || iframeDoc.body?.innerText?.includes("not found")) {
                errorMsg = "Page not found (404). The website may have moved or is unavailable.";
            }
        } catch (e) {
            errorMsg = "This site cannot be displayed in the sidebar because it blocks embedding (X-Frame-Options). You can open it in a new tab instead.";
        }
        showError(errorMsg);
    }, 100);
}

function retryLoad() {
    if (currentUrl && !isConfigMode) {
        loadUrlInFrame(currentUrl);
    }
}

// ========== SHOW IFRAME WITH SITE ==========
function showIframe(url) {
    if (configIframe) {
        configIframe.remove();
        configIframe = null;
    }
    
    frame.style.display = "block";
    isConfigMode = false;
    saveConfigModeState(false);
    
    loadUrlInFrame(url);
    select.value = url;
    updateButtonsState();
}

// ========== SHOW CONFIGURATOR ==========
function showConfigurator() {
    frame.style.display = "none";
    frame.src = "about:blank";
    hideLoading();
    hideError();
    
    if (configIframe) {
        configIframe.remove();
        configIframe = null;
    }
    
    configIframe = document.createElement("iframe");
    configIframe.src = "config.html";
    configIframe.style.width = "100%";
    configIframe.style.height = "100%";
    configIframe.style.border = "none";
    configIframe.style.background = "var(--bg-body)";
    configIframe.className = "config-view";
    
    contentContainer.appendChild(configIframe);
    isConfigMode = true;
    saveConfigModeState(true);
    
    select.value = "__config__";
    updateButtonsState();
    
    window.addEventListener("message", handleConfigMessage);
}

// ========== HANDLE MESSAGES FROM CONFIG ==========
function handleConfigMessage(event) {
    if (event.source !== configIframe?.contentWindow) return;
    
    const { type, data } = event.data;
    
    switch (type) {
        case "sitesUpdated":
            buildDropdown();
            break;
            
        case "closeConfig":
            const sites = data?.sites || [];
            if (sites.length > 0) {
                const lastUrl = data?.lastUrl || sites[0]?.url;
                if (lastUrl) {
                    closeConfigAndShowSite(lastUrl);
                }
            } else {
                buildDropdown();
            }
            break;
            
        case "configLoaded":
            loadSitesFromStorage().then((sites) => {
                configIframe?.contentWindow.postMessage({
                    type: "initConfig",
                    data: { sites }
                }, "*");
            });
            break;
    }
}

// ========== CLOSE CONFIG AND SHOW SITE ==========
async function closeConfigAndShowSite(siteUrl) {
    window.removeEventListener("message", handleConfigMessage);
    
    if (configIframe) {
        configIframe.remove();
        configIframe = null;
    }
    
    frame.style.display = "block";
    
    if (siteUrl) {
        const sites = await loadSitesFromStorage();
        const siteExists = sites.some(s => s.url === siteUrl);
        
        if (siteExists) {
            loadUrlInFrame(siteUrl);
            select.value = siteUrl;
        } else if (sites.length > 0) {
            loadUrlInFrame(sites[0].url);
            select.value = sites[0].url;
        }
    }
    
    isConfigMode = false;
    saveConfigModeState(false);
    updateButtonsState();
    window.addEventListener("message", handleConfigMessage);
}

// ========== EVENT LISTENERS ==========
select.addEventListener("change", async () => {
    const selectedValue = select.value;
    
    if (selectedValue === "__config__") {
        if (!isConfigMode) {
            showConfigurator();
        }
    } else {
        if (isConfigMode) {
            await closeConfigAndShowSite(selectedValue);
        } else {
            loadUrlInFrame(selectedValue);
        }
    }
});

newTabBtn.addEventListener("click", () => {
    if (!newTabBtn.classList.contains("disabled")) {
        openInNewTab();
    }
});

reloadBtn.addEventListener("click", () => {
    if (!reloadBtn.classList.contains("disabled")) {
        reloadIframe();
    }
});

retryButton.addEventListener("click", () => {
    retryLoad();
});

window.addEventListener("online", () => {
    hideError();
    if (!isConfigMode && frame.src === "about:blank") {
        retryLoad();
    }
    updateButtonsState();
});

window.addEventListener("offline", () => {
    if (!isConfigMode) {
        showError("No internet connection. Please check your network and try again.");
    }
    updateButtonsState();
});

frame.addEventListener("load", onFrameLoad);
frame.addEventListener("error", onFrameError);

// ========== RESTORE STATE ON LOAD ==========
async function restoreState() {
    const sites = await buildDropdown();
    
    chrome.storage.local.get([STORAGE_CONFIG_MODE, STORAGE_LAST_SITE], async (result) => {
        const wasConfigMode = result[STORAGE_CONFIG_MODE] || false;
        const lastSite = result[STORAGE_LAST_SITE];
        const currentSites = await loadSitesFromStorage();
        
        if (currentSites.length === 0) {
            showConfigurator();
        } else if (wasConfigMode) {
            showConfigurator();
        } else if (lastSite && currentSites.some(s => s.url === lastSite)) {
            showIframe(lastSite);
        } else {
            showIframe(currentSites[0].url);
        }
    });
}

// ========== INIT ==========
restoreState();