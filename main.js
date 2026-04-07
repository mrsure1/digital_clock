const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');

const MIN_WINDOW_WIDTH = 220;
const MIN_WINDOW_HEIGHT = 64;

let mainWindow;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: MIN_WINDOW_WIDTH,
    height: MIN_WINDOW_HEIGHT,
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

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
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
