/*
 * MIT License
 *
 * Copyright (c) 2025 AI-Gruppe
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { app, BrowserWindow, ipcMain, shell, Menu, dialog, screen} from 'electron';
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
const createWindow = (width: number, height: number): void => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    icon: "./images/icon",
    height: height,
    width: width,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
  });
  const indexPath: string = path.join(__dirname, "..", "res", "angular", "browser", "index.csr.html");
  mainWindow.loadFile(indexPath).catch(err => console.error("Fehler beim Laden der HTML-Datei:", err));
  mainWindow.webContents.on('did-fail-load', () => {
    console.log('Electron was unable to find path due to missing History function thus defaulting to Entrypoint');
    mainWindow.loadFile(indexPath).catch(err => console.error("The default entrypoint HTML file could not be loaded", err));
  });
};

let pwmIsActive = false;
let medianIsActive = false;
let avgIsActive = false;
let frequenzIsActive = false;
let smoothIsActive = false;

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
        click: async () => {
          try {
            await new Promise(resolve => setTimeout(resolve, 3000));
            const response = await fetch('http://127.0.0.1:' + analysisBackendManager.getPort() + '/MIN');
            console.log(response);
            console.log(response.status);

            if (response.status !== 200) {
              dialog.showMessageBox(mainWindow, {
                type: 'error',
                title: 'HTTP Error',
                message: `HTTP ${response.status}`,
                buttons: ['OK']
              });
              return;
            }

            const data = await response.json();
            console.log(data);

            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Minimum-Wert',
              message: `Der kleinste aktuelle Wert ist ${data.minValue}`,
              buttons: ['OK']
            });

          } catch (error: any) {
            console.error('Fehler beim Abrufen des Minimum-Werts:', error);
            dialog.showMessageBox(mainWindow, {
              type: 'error',
              title: 'Netzwerkfehler',
              message: `Fehler beim Verbinden mit dem Analyse-Server:\n${error.message}`,
              buttons: ['OK']
            });
          }
        }
      },
      {
        label: 'Maximum',
        click: async () => {
          try {
            await new Promise(resolve => setTimeout(resolve, 3000));
            const response = await fetch('http://127.0.0.1:' + analysisBackendManager.getPort() + '/MAX');
            console.log(response);
            console.log(response.status);

            if (response.status !== 200) {
              dialog.showMessageBox(mainWindow, {
                type: 'error',
                title: 'HTTP Error',
                message: `HTTP ${response.status}`,
                buttons: ['OK']
              });
              return;
            }

            const data = await response.json();
            console.log(data);

            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Maximum-Wert',
              message: `Der größte aktuelle Wert ist ${data.maxValue}`,
              buttons: ['OK']
            });

          } catch (error: any) {
            console.error('Fehler beim Abrufen des Maximum-Werts:', error);
            dialog.showMessageBox(mainWindow, {
              type: 'error',
              title: 'Netzwerkfehler',
              message: `Fehler beim Verbinden mit dem Analyse-Server:\n${error.message}`,
              buttons: ['OK']
            });
          }
        }
      },
      {
        label: 'Average',
        type: 'checkbox',
        checked: false,
        click: async (menuItem: Electron.MenuItem) => {
          try {
            await new Promise(resolve => setTimeout(resolve, 3000));
            const analysisValue = await fetch('http://127.0.0.1:'+analysisBackendManager.getPort()+"/ANALYSE");
            const analysisStatus = await analysisValue.json();
            console.log(analysisStatus.analyse);

            if (analysisStatus.analyse.trim().toUpperCase() !== 'OFF' && !avgIsActive) {
              dialog.showMessageBox(mainWindow, {
                type: 'error',
                title: 'Analyse bereits aktiv',
                message: 'Es ist bereits eine weitere Analyse aktiv. Deaktiviere diese zuerst.',
                buttons: ['OK']
              });
              menuItem.checked = false;
              return;
            }
            if (avgIsActive) {
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
                  message: `AVERAGE Analyse wurde erfolgreich deaktiviert!`,
                  buttons: ['OK']
                });
                avgIsActive = false;
                menuItem.checked = false;
              }
            } else {
              const response = await fetch('http://127.0.0.1:'+analysisBackendManager.getPort()+"/AVG");
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
                  message: `AVERAGE Analyse wurde erfolgreich aktiviert!`,
                  buttons: ['OK']
                });
                avgIsActive = true;
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
      },
      {
        label: 'Frequenz',
        type: 'checkbox',
        checked: false,
        click: async (menuItem: Electron.MenuItem) => {
          try {
            await new Promise(resolve => setTimeout(resolve, 3000));
            const analysisValue = await fetch('http://127.0.0.1:'+analysisBackendManager.getPort()+"/ANALYSE");
            const analysisStatus = await analysisValue.json();
            console.log(analysisStatus.analyse);

            if (analysisStatus.analyse.trim().toUpperCase() !== 'OFF' && !frequenzIsActive) {
              dialog.showMessageBox(mainWindow, {
                type: 'error',
                title: 'Analyse bereits aktiv',
                message: 'Es ist bereits eine weitere Analyse aktiv. Deaktiviere diese zuerst.',
                buttons: ['OK']
              });
              menuItem.checked = false;
              return;
            }
            if (frequenzIsActive) {
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
                  message: `FREQUENZ Analyse wurde erfolgreich deaktiviert!`,
                  buttons: ['OK']
                });
                frequenzIsActive = false;
                menuItem.checked = false;
              }
            } else {
              const response = await fetch('http://127.0.0.1:'+analysisBackendManager.getPort()+"/FREQUENZ");
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
                  message: `FREQUENZ Analyse wurde erfolgreich aktiviert!`,
                  buttons: ['OK']
                });
                frequenzIsActive = true;
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
      },
      {
        label: 'PWM',
        type: 'checkbox',
        checked: false,
        click: async (menuItem: Electron.MenuItem) => {
          try {
            await new Promise(resolve => setTimeout(resolve, 3000));
            const analysisValue = await fetch('http://127.0.0.1:'+analysisBackendManager.getPort()+"/ANALYSE");
            const analysisStatus = await analysisValue.json();
            console.log(analysisStatus.analyse);

            if (analysisStatus.analyse.trim().toUpperCase() !== 'OFF' && !pwmIsActive) {
              dialog.showMessageBox(mainWindow, {
                type: 'error',
                title: 'Analyse bereits aktiv',
                message: 'Es ist bereits eine weitere Analyse aktiv. Deaktiviere diese zuerst.',
                buttons: ['OK']
              });
              menuItem.checked = false;
              return;
            }
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
      },
            {
        label: 'Präsentation-Reload',
        click: () => {
          app.relaunch();
          app.exit(0);
        }
      },
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
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  createWindow(width, height);
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(width, height);    
    }
  });
});

app.on("window-all-closed", () => {

  omnaiscopeBackendManager.stopBackend();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
