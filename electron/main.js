/**
 * Invoice Creator - Desktop Application
 * Copyright (c) 2025 Blue Line Scannables
 * All Rights Reserved. Proprietary and Confidential.
 *
 * NOTICE: This software is protected by copyright law and international treaties.
 * Unauthorized reproduction, distribution, or use of this software is strictly
 * prohibited and may result in severe civil and criminal penalties.
 *
 * Build: BLS-IC-7X9K2M4P | Version: 1.2.3
 * Fingerprint: 0x424C532D49432D323032352D37583946
 */
const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');

// Software ownership verification
const _appId = Buffer.from('424c532d494e564f4943452d4352454154', 'hex').toString();

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (process.platform === 'win32') {
  try {
    if (require('electron-squirrel-startup')) app.quit();
  } catch (e) {
    // Module not available
  }
}

let mainWindow;
let licenseWindow;
let backendProcess;
let backendPort;

const isDev = process.env.NODE_ENV === 'development';

// Get available port
function getAvailablePort(startPort = 3001) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(getAvailablePort(startPort + 1));
    });
  });
}

// Start the Express backend
async function startBackend(port) {
  const backendPath = isDev
    ? path.join(__dirname, '..', 'backend', 'index.js')
    : path.join(process.resourcesPath, 'backend', 'index.js');

  // Set environment variables for backend
  const env = {
    ...process.env,
    PORT: port.toString(),
    ELECTRON_USER_DATA: app.getPath('userData'),
    NODE_ENV: isDev ? 'development' : 'production'
  };

  return new Promise((resolve, reject) => {
    const nodePath = process.execPath;

    // In production, use bundled node from Electron
    // In development, use system node
    const nodeExecutable = isDev ? 'node' : process.execPath;
    const args = isDev ? [backendPath] : [backendPath];

    if (!isDev) {
      // In production, we need to run the backend script with Node
      args.unshift(backendPath);
      backendProcess = spawn(process.execPath, ['--no-warnings', backendPath], {
        env,
        cwd: path.dirname(backendPath),
        stdio: ['ignore', 'pipe', 'pipe']
      });
    } else {
      backendProcess = spawn('node', [backendPath], {
        env,
        cwd: path.dirname(backendPath),
        stdio: ['ignore', 'pipe', 'pipe']
      });
    }

    backendProcess.stdout.on('data', (data) => {
      console.log(`Backend: ${data}`);
      if (data.toString().includes('Server is running')) {
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend Error: ${data}`);
    });

    backendProcess.on('error', (err) => {
      console.error('Failed to start backend:', err);
      reject(err);
    });

    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
    });

    // Timeout fallback - resolve after 3 seconds even if no message
    setTimeout(resolve, 3000);
  });
}

// License validation
async function validateLicense() {
  const Store = require('electron-store');
  const store = new Store();

  const licenseData = store.get('license');

  if (!licenseData || !licenseData.key) {
    return { valid: false, reason: 'no_license' };
  }

  try {
    const { validateLicenseKey } = require('./license/validator');
    const result = await validateLicenseKey(licenseData.key);
    return result;
  } catch (error) {
    console.error('License validation error:', error);
    return { valid: false, reason: 'validation_error' };
  }
}

// Create the license activation window
function createLicenseWindow() {
  licenseWindow = new BrowserWindow({
    width: 500,
    height: 400,
    resizable: false,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    licenseWindow.loadURL('http://localhost:5173/#/activate');
  } else {
    licenseWindow.loadFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'), {
      hash: '/activate'
    });
  }
}

// Create the main application window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // DevTools: uncomment line below to debug
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

// App initialization
app.whenReady().then(async () => {
  try {
    // Ensure userData directory exists
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    // License check removed - app is free to use

    // Get available port and start backend
    backendPort = await getAvailablePort(3001);
    console.log(`Starting backend on port ${backendPort}`);

    await startBackend(backendPort);
    console.log('Backend started successfully');

    // Create main window
    createMainWindow();

    // Check for updates (non-blocking)
    setTimeout(async () => {
      try {
        const { checkForUpdates } = require('./updater');
        const update = await checkForUpdates(app.getVersion());
        if (update.available && mainWindow) {
          mainWindow.webContents.send('update-available', update);
        }
      } catch (error) {
        console.error('Update check failed:', error);
      }
    }, 5000);

  } catch (error) {
    console.error('Failed to initialize app:', error);
    dialog.showErrorBox('Startup Error', `Failed to start the application: ${error.message}`);
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('get-backend-port', () => backendPort);

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('activate-license', async (event, key) => {
  try {
    const { validateLicenseKey } = require('./license/validator');
    const result = await validateLicenseKey(key);

    if (result.valid) {
      const Store = require('electron-store');
      const store = new Store();
      store.set('license', {
        key,
        activatedAt: Date.now(),
        machineId: result.machineId
      });

      // Close license window and start main app
      if (licenseWindow) {
        licenseWindow.close();
        licenseWindow = null;
      }

      // Start backend and main window
      backendPort = await getAvailablePort(3001);
      await startBackend(backendPort);
      createMainWindow();
    }

    return result;
  } catch (error) {
    console.error('License activation error:', error);
    return { valid: false, reason: 'activation_error', message: error.message };
  }
});

ipcMain.handle('get-license-status', async () => {
  return await validateLicense();
});

ipcMain.handle('check-updates', async () => {
  try {
    const { checkForUpdates } = require('./updater');
    return await checkForUpdates(app.getVersion());
  } catch (error) {
    return { available: false, error: error.message };
  }
});

ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('send-feedback', (event, data) => {
  const { openFeedbackEmail } = require('./support');
  openFeedbackEmail(data, app.getVersion());
});

// Cleanup on quit
app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
