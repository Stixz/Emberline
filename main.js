const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const bundledConfigPath = path.join(__dirname, 'config.json');
const bundledIconPath = path.join(__dirname, 'build', 'icon.ico');

function getWindowIconPath() {
  return fs.existsSync(bundledIconPath) ? bundledIconPath : undefined;
}

function createDefaultConfig() {
  return {
    apps: [],
    theme: 'dark',
    customColors: {
      primary: '#60a5fa',
      secondary: '#a78bfa',
      background: '#1e293b',
      surface: '#334155',
      text: '#e2e8f0',
      textSecondary: '#94a3b8'
    }
  };
}

function normalizeConfig(inputConfig) {
  const base = createDefaultConfig();
  const safeConfig = inputConfig && typeof inputConfig === 'object' ? inputConfig : {};
  const apps = Array.isArray(safeConfig.apps) ? safeConfig.apps : [];

  return {
    apps: apps
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        name: typeof item.name === 'string' ? item.name.trim() : '',
        url: typeof item.url === 'string' ? item.url.trim() : '',
        icon: typeof item.icon === 'string' ? item.icon.trim() : '',
        description: typeof item.description === 'string' ? item.description.trim() : '',
        category: typeof item.category === 'string' ? item.category.trim() : ''
      }))
      .filter((item) => item.name && item.url && item.icon && item.description && item.category),
    theme: ['dark', 'light', 'ocean', 'sunset', 'forest', 'neon', 'rose', 'midnight', 'cyberpunk', 'retro', 'nord', 'dracula', 'solarized', 'glass', 'lavender', 'coffee', 'arctic', 'custom'].includes(safeConfig.theme) ? safeConfig.theme : base.theme,
    customColors: {
      ...base.customColors,
      ...(safeConfig.customColors || {})
    }
  };
}

function getUserConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function ensureUserConfigFile() {
  const userConfigPath = getUserConfigPath();
  const userConfigDir = path.dirname(userConfigPath);

  if (!fs.existsSync(userConfigDir)) {
    fs.mkdirSync(userConfigDir, { recursive: true });
  }

  if (fs.existsSync(userConfigPath)) {
    return userConfigPath;
  }

  let startingConfig = createDefaultConfig();

  try {
    if (fs.existsSync(bundledConfigPath)) {
      const bundledConfig = JSON.parse(fs.readFileSync(bundledConfigPath, 'utf8'));
      startingConfig = normalizeConfig(bundledConfig);
    }
  } catch (error) {
    console.error('Error reading bundled config:', error);
  }

  fs.writeFileSync(userConfigPath, JSON.stringify(startingConfig, null, 2));
  return userConfigPath;
}

function loadConfig() {
  try {
    const configPath = ensureUserConfigFile();
    const configData = fs.readFileSync(configPath, 'utf8');
    return normalizeConfig(JSON.parse(configData));
  } catch (error) {
    console.error('Error loading config:', error);
    return createDefaultConfig();
  }
}

function saveConfig(config) {
  try {
    const configPath = ensureUserConfigFile();
    const normalizedConfig = normalizeConfig(config);
    fs.writeFileSync(configPath, JSON.stringify(normalizedConfig, null, 2));
    return { ok: true, config: normalizedConfig };
  } catch (error) {
    console.error('Error saving config:', error);
    return { ok: false, error: 'Unable to save settings to disk.' };
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    frame: false,
    icon: getWindowIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  ensureUserConfigFile();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('get-config', () => loadConfig());
ipcMain.handle('save-config', (event, config) => saveConfig(config));
ipcMain.on('open-app', (event, url) => {
  openAppWindow(url);
});

ipcMain.on('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('close-window', () => {
  if (mainWindow) mainWindow.close();
});

function openAppWindow(url) {
  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return;
    }
  } catch (error) {
    console.error('Invalid app URL:', url, error);
    shell.beep();
    return;
  }

  let appWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1e293b',
      symbolColor: '#e2e8f0',
      height: 36
    },
    icon: getWindowIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'app-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  appWindow.loadURL(url).catch((error) => {
    console.error('Failed to load app URL:', url, error);
    shell.beep();
  });

  appWindow.setMenuBarVisibility(false);

  appWindow.on('closed', () => {
    appWindow = null;
  });
}
