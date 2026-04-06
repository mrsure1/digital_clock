const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  // 메인 윈도우 생성
  mainWindow = new BrowserWindow({
    width: 500,
    height: 350,
    minWidth: 300,
    minHeight: 200,
    frame: false, // 프레임 제거 (수동 크기 조절 가능)
    transparent: true, // 배경 투명화
    alwaysOnTop: true, // 배경화면처럼 쓰기 위해 기본은 상단 고정 해제
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // 렌더러 프로세스에서 직접 로직 수행을 위해 설정
    },
  });

  // index.html 로드
  mainWindow.loadFile('index.html');

  // 창이 닫힐 때 객체 해제
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 앱 준비 완료 시 창 생성
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 모든 창이 닫히면 앱 종료
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// 렌더러 프로세스에서 오는 종료 요청 처리
ipcMain.on('close-app', () => {
  app.quit();
});
