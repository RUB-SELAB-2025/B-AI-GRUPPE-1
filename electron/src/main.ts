import { app, BrowserWindow, ipcMain, shell, Menu, dialog} from 'electron';
import * as path from "path";
import * as fs from 'fs';
import { omnaiscopeBackendManager } from './omnaiBackend';
import {analysisBackendManager} from "./analysisBackend";
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
try {
  if (require('electron-squirrel-startup')) {
    app.quit();
  }
} catch (err) {
  console.log('electron-squirrel-startup not available:', err.message);
}

let mainWindow: BrowserWindow;

function getVersionPath(): string {
  const versionPath: string = app.isPackaged 
    ? path.join(process.resourcesPath, "version.json")
    : path.join(__dirname, "..", "src", "version.json")

    return versionPath; 
}

const versionInfo = JSON.parse(fs.readFileSync(getVersionPath(), 'utf-8'));

const createWindow = (): void => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    icon: "./images/icon",
    height: 600,
    width: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
  });
  const indexPath: string = path.join(__dirname, "..", "res", "angular", "browser", "index.csr.html");
  mainWindow.loadFile(indexPath).catch(err => console.error("Fehler beim Laden der HTML-Datei:", err));
};

let pwmIsActive = false;

const menuScope: Electron.MenuItemConstructorOptions[] = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Import',
        click() {
          (async () => {
            console.log("Clicked File:Import");
          })();
        }
      },
      {
        label: 'Export',
        click() {
          (async () => {
            console.log("Clicked File:Export");
          })();
        }
      },
      {
        label: 'Close',
        accelerator: 'CmdOrCtrl+Q',
        click: () => {
          app.quit();
        }
      }
    ]
  },
  {
    label: 'Analysis',
    submenu: [
      {
        label: 'Minimum',
        click() {
          (async () => {
            console.log("Clicked Analysis:Minimum");
          })();
        }
      },
      {
        label: 'Maximum',
        click() {
          (async () => {
            console.log("Clicked Analysis:Maximum");
          })();
        }
      },
      {
        label: 'Median',
        type: 'checkbox',
        checked: false,
        click(menuItem: Electron.MenuItem) {
          if (mainWindow) {
            mainWindow.webContents.toggleDevTools();
          }
          console.log('Median checked state:', menuItem.checked);
        }
      },
      {
        label: 'PWM',
        type: 'checkbox',
        checked: false,
        click: async (menuItem: Electron.MenuItem) => {
          try {
            if (pwmIsActive) {
              const response = await fetch('http://127.0.0.1:'+analysisBackendManager.getPort()+"/OFF");
              console.log(response);
              console.log(response.status);
              if (response.status != 200) {
                dialog.showMessageBox(mainWindow, {
                  type: 'error',
                  title: 'HTTP Error',
                  message: `HTTP ${response.status}`,
                  buttons: ['OK']
                });
                return;
              }

              if (response.status == 200) {
                dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  title: 'Information',
                  message: `PWM Analyse wurde erfolgreich deaktiviert!`,
                  buttons: ['OK']
                });
                pwmIsActive = false;
                menuItem.checked = false;
              }
            } else {
              const response = await fetch('http://127.0.0.1:'+analysisBackendManager.getPort()+"/PWM");
              console.log(response);
              console.log(response.status);
              if (response.status != 200) {
                dialog.showMessageBox(mainWindow, {
                  type: 'error',
                  title: 'HTTP Error',
                  message: `HTTP ${response.status}`,
                  buttons: ['OK']
                });
                return;
              }

              if (response.status == 200) {
                dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  title: 'Information',
                  message: `PWM Analyse wurde erfolgreich aktiviert!`,
                  buttons: ['OK']
                });
                pwmIsActive = true;
                menuItem.checked = true;
              }
            }


            //const data = await response.json();
            //console.log(data);
            //if (data.analyse?.toUpperCase() === 'OFF') {
            //  dialog.showMessageBox(mainWindow, {
            //    type: 'info',
            //    title: 'Information',
            //    message: `IST OFF`,
            //    buttons: ['OK']
            //  });
            //  menuItem.checked = true;
            //  if (mainWindow) mainWindow.webContents.send('status-ok');
            //} else {
            //  console.log('Status ist nicht OK');
            //  menuItem.checked = false;
            //  if (mainWindow) mainWindow.webContents.send('status-not-ok');
            //}
          } catch (error: any) {
            console.error('Fehler beim HTTP-Request:', error);
            menuItem.checked = false;
            if (mainWindow) mainWindow.webContents.send('status-error', error.message);
          }
        }
      }
    ]
  },
  {
    label: 'Help',
    submenu: [
      {
        label: 'Information',
        click() {
          (async () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Information',
              message: `electron-v.${versionInfo.electronVersion}\nangular-v.${versionInfo.angularVersion}\n${versionInfo.generatedAt}\n\nMIT © ${new Date().getFullYear()} AI-Gruppe`,
              buttons: ['OK']
            });
          })();
        }
      },
      {
        label: 'Support-Website',
        click() {
          (async () => {
            shell.openExternal("https://omnaiscope.auto-intern.de/support/");
          })();
        }
      },
      {
        label: 'Developer-Tools',
        accelerator: 'CmdOrCtrl+I',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.toggleDevTools();
          }
        }
      }
    ]
  }
];

const menu = Menu.buildFromTemplate(menuScope);
Menu.setApplicationMenu(menu);


omnaiscopeBackendManager.startBackend();

ipcMain.handle('get-omnaiscope-backend-port', async () => {
  return omnaiscopeBackendManager.getPort();
});

analysisBackendManager.startBackend();

ipcMain.handle('get-analysis-backend-port', async () => {
  return analysisBackendManager.getPort();
});

console.log("Current Analysis Backend Port is "+analysisBackendManager.getPort().toString())

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {

  omnaiscopeBackendManager.stopBackend();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
