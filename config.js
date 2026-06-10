// Sidebar Hub - Chrome/Edge Extension
// Copyright 2boom, 2026

// DOM elements
const siteNameInput = document.getElementById("siteName");
const siteUrlInput = document.getElementById("siteUrl");
const addBtn = document.getElementById("addBtn");
const sitesContainer = document.getElementById("sitesContainer");
const closeBtn = document.getElementById("closeBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const fileInput = document.getElementById("fileInput");

// Modal elements
const modal = document.getElementById("confirmModal");
const modalMessage = document.getElementById("modalMessage");
const modalConfirm = document.getElementById("modalConfirm");
const modalCancel = document.getElementById("modalCancel");

// Storage key
const STORAGE_SITES = "userSites";
const STORAGE_LAST_SITE = "lastSite";

// State
let sites = [];
let dragStartIndex = null;

// ========== LOAD SITES ==========
async function loadSites() {
    return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_SITES], (result) => {
            sites = result[STORAGE_SITES] || [];
            resolve(sites);
        });
    });
}

// ========== SAVE SITES ==========
function saveSites() {
    chrome.storage.local.set({ [STORAGE_SITES]: sites });
    renderSitesList();
    notifyParent();
}

// ========== NOTIFY PARENT ==========
function notifyParent() {
    window.parent.postMessage({
        type: "sitesUpdated",
        data: { sites }
    }, "*");
}

// ========== CLOSE CONFIG ==========
function closeConfig() {
    window.parent.postMessage({
        type: "closeConfig",
        data: { sites, lastUrl: localStorage.getItem("lastSelectedUrl") }
    }, "*");
}

// ========== SHOW TOAST ==========
function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// ========== SHOW MODAL ==========
function showModal(message, onConfirm) {
    modalMessage.textContent = message;
    modal.classList.add("active");
    
    const confirmHandler = () => {
        modal.classList.remove("active");
        modalConfirm.removeEventListener("click", confirmHandler);
        modalCancel.removeEventListener("click", cancelHandler);
        onConfirm();
    };
    
    const cancelHandler = () => {
        modal.classList.remove("active");
        modalConfirm.removeEventListener("click", confirmHandler);
        modalCancel.removeEventListener("click", cancelHandler);
    };
    
    modalConfirm.addEventListener("click", confirmHandler);
    modalCancel.addEventListener("click", cancelHandler);
}

// ========== VALIDATE URL ==========
function isValidUrl(url) {
    return url.startsWith("http://") || url.startsWith("https://");
}

// ========== ADD SITE ==========
function addSite() {
    const name = siteNameInput.value.trim();
    let url = siteUrlInput.value.trim();
    
    if (!name) {
        showToast("Please enter site name");
        return;
    }
    
    if (!url) {
        showToast("Please enter URL");
        return;
    }
    
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
    }
    
    if (!isValidUrl(url)) {
        showToast("URL must start with http:// or https://");
        return;
    }
    
    if (sites.some(s => s.url === url)) {
        showToast("This URL already exists");
        return;
    }
    
    sites.push({ name, url });
    saveSites();
    
    siteNameInput.value = "";
    siteUrlInput.value = "";
    
    showToast(`Added: ${name}`);
}

// ========== EDIT SITE ==========
function editSite(index) {
    const site = sites[index];
    
    siteNameInput.value = site.name;
    siteUrlInput.value = site.url;
    
    document.querySelector(".add-form").scrollIntoView({ behavior: "smooth" });
    
    const originalBtnText = addBtn.textContent;
    addBtn.textContent = "Update";
    
    const updateHandler = () => {
        const newName = siteNameInput.value.trim();
        let newUrl = siteUrlInput.value.trim();
        
        if (!newName) {
            showToast("Please enter site name");
            return;
        }
        
        if (!newUrl) {
            showToast("Please enter URL");
            return;
        }
        
        if (!newUrl.startsWith("http://") && !newUrl.startsWith("https://")) {
            newUrl = "https://" + newUrl;
        }
        
        if (!isValidUrl(newUrl)) {
            showToast("URL must start with http:// or https://");
            return;
        }
        
        if (sites.some((s, i) => i !== index && s.url === newUrl)) {
            showToast("This URL already exists");
            return;
        }
        
        sites[index] = { name: newName, url: newUrl };
        saveSites();
        
        siteNameInput.value = "";
        siteUrlInput.value = "";
        
        addBtn.textContent = originalBtnText;
        addBtn.removeEventListener("click", updateHandler);
        addBtn.addEventListener("click", addSite);
        
        showToast(`Updated: ${newName}`);
    };
    
    addBtn.removeEventListener("click", addSite);
    addBtn.addEventListener("click", updateHandler);
}

// ========== DELETE SITE ==========
function deleteSite(index) {
    showModal(`Delete "${sites[index].name}"?`, () => {
        const deletedName = sites[index].name;
        sites.splice(index, 1);
        saveSites();
        showToast(`Deleted: ${deletedName}`);
        
        if (sites.length === 0) {
            window.parent.postMessage({
                type: "sitesUpdated",
                data: { sites: [] }
            }, "*");
        }
    });
}

// ========== CLEAR ALL SITES ==========
function clearAllSites() {
    if (sites.length === 0) {
        showToast("No sites to delete");
        return;
    }
    
    showModal(`Delete ALL ${sites.length} sites? This cannot be undone.`, () => {
        sites = [];
        saveSites();
        showToast("All sites deleted");
        
        window.parent.postMessage({
            type: "sitesUpdated",
            data: { sites: [] }
        }, "*");
    });
}

// ========== EXPORT SITES ==========
function exportSites() {
    if (sites.length === 0) {
        showToast("No sites to export");
        return;
    }
    
    const exportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        sites: sites
    };
    
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `sidebar-hub-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`Exported ${sites.length} sites`);
}

// ========== IMPORT SITES ==========
function importSites(file) {
    const reader = new FileReader();
    
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            
            if (!data.sites || !Array.isArray(data.sites)) {
                showToast("Invalid backup file: missing sites array");
                return;
            }
            
            let validSites = true;
            for (const site of data.sites) {
                if (!site.name || !site.url) {
                    validSites = false;
                    break;
                }
                if (!isValidUrl(site.url)) {
                    validSites = false;
                    break;
                }
            }
            
            if (!validSites) {
                showToast("Invalid backup file: each site must have name and valid URL");
                return;
            }
            
            const newSites = data.sites;
            
            showModal(`Import will replace your current ${sites.length} sites with ${newSites.length} sites. Are you sure?`, () => {
                sites = newSites;
                saveSites();
                showToast(`Imported ${sites.length} sites`);
                
                if (sites.length === 0) {
                    window.parent.postMessage({
                        type: "sitesUpdated",
                        data: { sites: [] }
                    }, "*");
                }
            });
            
        } catch (e) {
            showToast("Invalid backup file: not a valid JSON");
        }
    };
    
    reader.onerror = () => {
        showToast("Error reading file");
    };
    
    reader.readAsText(file);
}

// ========== HANDLE IMPORT BUTTON CLICK ==========
function onImportClick() {
    fileInput.click();
}

// ========== HANDLE FILE SELECTION ==========
function onFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith(".json")) {
        showToast("Please select a JSON file");
        return;
    }
    
    importSites(file);
    fileInput.value = "";
}

// ========== DRAG & DROP ==========
function onDragStart(event, index) {
    dragStartIndex = index;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", index);
}

function onDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
}

function onDrop(event, dropIndex) {
    event.preventDefault();
    
    if (dragStartIndex === null || dragStartIndex === dropIndex) return;
    
    const item = sites[dragStartIndex];
    sites.splice(dragStartIndex, 1);
    sites.splice(dropIndex, 0, item);
    
    dragStartIndex = null;
    saveSites();
}

function onDragEnd() {
    dragStartIndex = null;
}

// ========== RENDER SITES LIST ==========
function renderSitesList() {
    if (sites.length === 0) {
        sitesContainer.innerHTML = `<div class="empty-message">No sites yet. Add your first site above.</div>`;
        return;
    }
    
    sitesContainer.innerHTML = "";
    
    sites.forEach((site, index) => {
        const siteDiv = document.createElement("div");
        siteDiv.className = "site-item";
        siteDiv.setAttribute("data-index", index);
        
        // Drag handle
        const dragHandle = document.createElement("div");
        dragHandle.className = "drag-handle";
        dragHandle.setAttribute("draggable", "true");
        dragHandle.setAttribute("data-index", index);
        dragHandle.innerHTML = `<img src="icons/handle.svg" alt="drag">`;
        
        dragHandle.addEventListener("dragstart", (e) => onDragStart(e, index));
        dragHandle.addEventListener("dragend", onDragEnd);
        
        // Site info
        const siteInfo = document.createElement("div");
        siteInfo.className = "site-info";
        siteInfo.innerHTML = `
            <div class="site-name">${escapeHtml(site.name)}</div>
            <div class="site-url">${escapeHtml(site.url)}</div>
        `;
        
        // Action buttons
        const siteActions = document.createElement("div");
        siteActions.className = "site-actions";
        siteActions.innerHTML = `
            <button class="edit-btn" data-index="${index}">Edit</button>
            <button class="delete-btn" data-index="${index}">Delete</button>
        `;
        
        siteDiv.appendChild(dragHandle);
        siteDiv.appendChild(siteInfo);
        siteDiv.appendChild(siteActions);
        
        // Drag & drop events on the whole item
        siteDiv.addEventListener("dragover", onDragOver);
        siteDiv.addEventListener("drop", (e) => onDrop(e, index));
        
        sitesContainer.appendChild(siteDiv);
    });
    
    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", () => editSite(parseInt(btn.dataset.index)));
    });
    
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", () => deleteSite(parseInt(btn.dataset.index)));
    });
}

// ========== ESCAPE HTML ==========
function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// ========== INITIALIZE ==========
async function init() {
    await loadSites();
    renderSitesList();
    
    window.addEventListener("message", (event) => {
        if (event.data.type === "initConfig") {
            const parentSites = event.data.data.sites;
            if (parentSites && parentSites.length > 0) {
                sites = parentSites;
                renderSitesList();
            }
        }
    });
    
    window.parent.postMessage({ type: "configLoaded" }, "*");
}

// ========== EVENT LISTENERS ==========
addBtn.addEventListener("click", addSite);
closeBtn.addEventListener("click", closeConfig);
clearAllBtn.addEventListener("click", clearAllSites);
exportBtn.addEventListener("click", exportSites);
importBtn.addEventListener("click", onImportClick);
fileInput.addEventListener("change", onFileSelected);

siteNameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addSite();
});
siteUrlInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addSite();
});

init();