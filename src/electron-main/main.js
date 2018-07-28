const {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
} = require('electron');

const DEV = process.env.NODE_ENV === 'development';

const gatherAddonsWrapper = require('./actions/addons-gatherer.js');
const downloadAddonWrapper = require('./actions/addon-loader.js');
const chooseDirectoryWrapper = require('./actions/directory-chooser.js');

const inst = {
  window: null,
  tempPath: ''
};

const createWindow = (x, y) => new BrowserWindow({
  width: x,
  height: y,
  titleBarStyle: 'hiddenInset'
});

app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', () => {
  inst.window = createWindow(800, 600);
  inst.window.loadFile('./dist/index.html');
  if (DEV) {
    inst.window.webContents.openDevTools();
    globalShortcut.register('f5', function() {
      inst.window.reload();
    });
  }
  inst.tempPath = app.getPath('temp');
  ipcMain.on('action/get-addons', gatherAddonsWrapper(inst));
  ipcMain.on('action/get-addon-data', downloadAddonWrapper(inst));
  ipcMain.on('action/choose-directory', chooseDirectoryWrapper(inst));
});
