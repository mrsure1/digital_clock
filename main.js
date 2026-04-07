const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');

const MIN_WINDOW_WIDTH = 300;
const MIN_WINDOW_HEIGHT = 80;
const WINDOW_STATE_FILE = 'window-state.json';

let mainWindow;
let tray = null;
let saveWindowStateTimeout = null;

function getWindowStatePath() {
  return path.join(app.getPath('userData'), WINDOW_STATE_FILE);
}

function readWindowState() {
  try {
    const rawState = fs.readFileSync(getWindowStatePath(), 'utf8');
    const parsedState = JSON.parse(rawState);

    return {
      width: Math.max(parsedState.width || MIN_WINDOW_WIDTH, MIN_WINDOW_WIDTH),
      height: Math.max(parsedState.height || MIN_WINDOW_HEIGHT, MIN_WINDOW_HEIGHT),
    };
  } catch (error) {
    return {
      width: MIN_WINDOW_WIDTH,
      height: MIN_WINDOW_HEIGHT,
    };
  }
}

function writeWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const [width, height] = mainWindow.getContentSize();

  fs.writeFileSync(
    getWindowStatePath(),
    JSON.stringify({
      width: Math.max(width, MIN_WINDOW_WIDTH),
      height: Math.max(height, MIN_WINDOW_HEIGHT),
    })
  );
}

function scheduleWindowStateSave() {
  clearTimeout(saveWindowStateTimeout);
  saveWindowStateTimeout = setTimeout(writeWindowState, 150);
}

function createWindow() {
  const savedWindowState = readWindowState();

  mainWindow = new BrowserWindow({
    width: savedWindowState.width,
    height: savedWindowState.height,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    useContentSize: true,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.setMinimumSize(MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT);
  mainWindow.on('resize', scheduleWindowStateSave);
  mainWindow.on('close', writeWindowState);

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    clearTimeout(saveWindowStateTimeout);
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  tray = new Tray(path.join(__dirname, 'icon.ico'));
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: '시계 보이기/숨기기', 
      click: () => {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
        }
      }
    },
    { type: 'separator' },
    { 
      label: '종료', 
      click: () => {
        app.quit();
      }
    }
  ]);
  tray.setToolTip('디지털 시계');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('close-app', () => {
  app.quit();
});

ipcMain.on('resize-window', (event, { width, height }) => {
  if (mainWindow) {
    mainWindow.setSize(
      Math.max(width, MIN_WINDOW_WIDTH),
      Math.max(height, MIN_WINDOW_HEIGHT),
      true
    );
  }
});
