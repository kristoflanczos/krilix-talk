const { app, BrowserWindow, Tray, Menu, nativeImage, shell, ipcMain, Notification, session } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

let mainWindow;
let tray;
let isQuitting = false;

const isDev = !app.isPackaged;
const devUrl = process.env.ELECTRON_RENDERER_URL || "http://localhost:5173";
const APP_URL = process.env.KRILIX_APP_URL || "https://krilixtalk.netlify.app";
const statePath = path.join(app.getPath("userData"), "desktop-state.json");

const defaultState = {
  closeToTray: true,
  nativeNotifications: true,
  launchAtLogin: false,
  bounds: {
    width: 1280,
    height: 820,
  },
};

function readState() {
  try {
    return { ...defaultState, ...JSON.parse(fs.readFileSync(statePath, "utf8")) };
  } catch {
    return defaultState;
  }
}

function writeState(nextState) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify({ ...readState(), ...nextState }, null, 2));
}

function assetPath(...parts) {
  return isDev
    ? path.join(__dirname, "..", "public", ...parts)
    : path.join(process.resourcesPath, "app.asar", "dist", ...parts);
}

function showMainWindow() {
  if (!mainWindow) return;
  mainWindow.show();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

function updateTrayMenu() {
  if (!tray) return;

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Megnyitás", click: showMainWindow },
      { label: "Elrejtés", click: () => mainWindow?.hide() },
      {
        label: "Frissítés / újraindítás",
        click: () => {
          app.relaunch();
          app.exit(0);
        },
      },
      { type: "separator" },
      {
        label: "Kilépés",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ])
  );
}

async function clearWebCache() {
  try {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearStorageData({
      storages: ["appcache", "cachestorage", "shadercache", "serviceworkers"],
    });
  } catch (error) {
    console.error("Cache törlési hiba:", error);
  }
}

async function createWindow() {
  Menu.setApplicationMenu(null);
  await clearWebCache();

  const state = readState();
  app.setLoginItemSettings({ openAtLogin: Boolean(state.launchAtLogin) });

  mainWindow = new BrowserWindow({
    width: state.bounds?.width || 1280,
    height: state.bounds?.height || 820,
    x: state.bounds?.x,
    y: state.bounds?.y,
    minWidth: 360,
    minHeight: 620,
    show: false,
    backgroundColor: "#071121",
    title: "Krilix Talk",
    icon: assetPath("pwa-256x256.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  mainWindow.on("resize", () => {
    if (!mainWindow?.isMaximized()) writeState({ bounds: mainWindow.getBounds() });
  });

  mainWindow.on("move", () => {
    if (!mainWindow?.isMaximized()) writeState({ bounds: mainWindow.getBounds() });
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error("Krilix betöltési hiba:", errorCode, errorDescription);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("close", (event) => {
    if (!isQuitting && readState().closeToTray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  if (isDev) {
    await mainWindow.loadURL(devUrl);
  } else {
    await mainWindow.loadURL(`${APP_URL}?desktop=1&v=${app.getVersion()}&t=${Date.now()}`);
  }
}

function createTray() {
  const icon = nativeImage.createFromPath(assetPath("pwa-192x192.png"));
  tray = new Tray(icon);
  tray.setToolTip("Krilix Talk");
  updateTrayMenu();
  tray.on("double-click", showMainWindow);
}

ipcMain.handle("krilix:getDesktopState", () => {
  const state = readState();
  return {
    ...state,
    version: app.getVersion(),
    isPackaged: app.isPackaged,
    appUrl: isDev ? devUrl : APP_URL,
  };
});

ipcMain.handle("krilix:setDesktopState", (_event, patch) => {
  const nextState = { ...readState(), ...patch };
  writeState(nextState);

  if (Object.prototype.hasOwnProperty.call(patch, "launchAtLogin")) {
    app.setLoginItemSettings({ openAtLogin: Boolean(patch.launchAtLogin) });
  }

  updateTrayMenu();
  return nextState;
});

ipcMain.handle("krilix:showNotification", (_event, payload = {}) => {
  if (!readState().nativeNotifications || !Notification.isSupported()) return false;

  const notification = new Notification({
    title: payload.title || "Krilix Talk",
    body: payload.body || "Új üzeneted érkezett.",
    icon: assetPath("pwa-192x192.png"),
  });

  notification.on("click", showMainWindow);
  notification.show();
  return true;
});

ipcMain.handle("krilix:restart", () => {
  app.relaunch();
  app.exit(0);
});

ipcMain.handle("krilix:quit", () => {
  isQuitting = true;
  app.quit();
});

app.whenReady().then(async () => {
  await createWindow();
  createTray();

  app.on("activate", showMainWindow);
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  // Windows/Linux alatt trayben maradunk.
});
