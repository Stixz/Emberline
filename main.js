const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const bundledConfigPath = path.join(__dirname, 'config.json');
const bundledIconPath = path.join(__dirname, 'build', 'icon.ico');

function getWindowIconPath() {
  return fs.existsSync(bundledIconPath) ? bundledIconPath : undefined;
}

function getWindowStateFilePath() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadWindowState() {
  try {
    const stateFilePath = getWindowStateFilePath();
    if (fs.existsSync(stateFilePath)) {
      const state = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
      // Validate the bounds are reasonable before returning
      if (state.bounds && typeof state.bounds === 'object') {
        return state;
      }
    }
  } catch (error) {
    console.error('Error loading window state:', error);
  }
  return null;
}

function saveWindowState(bounds, isMaximized) {
  try {
    const stateFilePath = getWindowStateFilePath();
    const state = { bounds, isMaximized };
    fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Error saving window state:', error);
  }
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
        category: typeof item.category === 'string' ? item.category.trim() : '',
        hidden: Boolean(item.hidden)
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
  const savedState = loadWindowState();
  const windowOptions = {
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
  };

  // Apply saved bounds if available
  if (savedState && savedState.bounds) {
    windowOptions.x = savedState.bounds.x;
    windowOptions.y = savedState.bounds.y;
    windowOptions.width = savedState.bounds.width;
    windowOptions.height = savedState.bounds.height;
  }

  mainWindow = new BrowserWindow(windowOptions);

  // Restore maximized state if it was maximized before
  if (savedState && savedState.isMaximized) {
    mainWindow.maximize();
  }

  mainWindow.loadFile('index.html');
  mainWindow.setMenuBarVisibility(false);

  // Save window state when it moves, resizes, or closes
  mainWindow.on('moved', () => {
    saveWindowState(mainWindow.getBounds(), mainWindow.isMaximized());
  });

  mainWindow.on('resized', () => {
    saveWindowState(mainWindow.getBounds(), mainWindow.isMaximized());
  });

  mainWindow.on('maximize', () => {
    saveWindowState(mainWindow.getBounds(), true);
  });

  mainWindow.on('unmaximize', () => {
    saveWindowState(mainWindow.getBounds(), false);
  });

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
ipcMain.on('open-app', (event, url, appName, colors) => {
  openAppWindow(url, appName, colors);
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

function openAppWindow(url, appName, colors) {
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
    frame: true,
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

  // BEHAVIOR: THEMED TOOLBAR INJECTION
  if (colors && typeof colors === 'object') {
    const safeColors = {
      primary: typeof colors.primary === 'string' ? colors.primary : '#60a5fa',
      background: typeof colors.background === 'string' ? colors.background : '#1e293b',
      text: typeof colors.text === 'string' ? colors.text : '#e2e8f0',
      surface: typeof colors.surface === 'string' ? colors.surface : '#334155'
    };
    const safeName = typeof appName === 'string' ? appName.replace(/[<>"'&]/g, '') : '';

    appWindow.webContents.on('did-finish-load', () => {
      // Inject themed top bar
      appWindow.webContents.insertCSS(`
        #emberline-toolbar {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          height: 38px !important;
          background: ${safeColors.background} !important;
          border-bottom: 2px solid ${safeColors.primary} !important;
          z-index: 2147483647 !important;
          display: flex !important;
          align-items: center !important;
          padding: 0 14px !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
          font-size: 12px !important;
          color: ${safeColors.text} !important;
          gap: 8px !important;
          pointer-events: none !important;
          box-sizing: border-box !important;
        }
        #emberline-toolbar .ember-dot {
          width: 8px !important;
          height: 8px !important;
          border-radius: 50% !important;
          background: ${safeColors.primary} !important;
          flex-shrink: 0 !important;
        }
        #emberline-toolbar .ember-label {
          opacity: 0.5 !important;
          font-size: 11px !important;
          letter-spacing: 0.04em !important;
        }
        #emberline-toolbar .ember-name {
          font-weight: 600 !important;
          opacity: 0.9 !important;
        }
        html { padding-top: 38px !important; }
      `).catch(() => {});

      appWindow.webContents.executeJavaScript(`
        (function() {
          if (document.getElementById('emberline-toolbar')) return;
          const bar = document.createElement('div');
          bar.id = 'emberline-toolbar';
          bar.innerHTML =
            '<span class="ember-dot"></span>' +
            '<span class="ember-label">Emberline Works —</span>' +
            '<span class="ember-name">${safeName}</span>';
          document.body.insertBefore(bar, document.body.firstChild);
        })();
      `).catch(() => {});
    });
  }

  appWindow.setMenuBarVisibility(false);

  appWindow.on('closed', () => {
    appWindow = null;
  });
}
