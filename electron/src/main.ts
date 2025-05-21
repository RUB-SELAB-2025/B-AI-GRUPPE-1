import { app, BrowserWindow, ipcMain, shell, Menu, dialog} from 'electron';
import * as path from "path";
import { omnaiscopeBackendManager } from './omnaiBackend';
import versionInfo from '../version-info.json';
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow;
const electronVersion: string = "123";


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

const menuScope = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Import',
        click: async () => {console.log("Clicked File:Import")}
      },
      {
        label: 'Export',
        click: async () => {console.log("Clicked File:Export")}
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
      click: async () => {console.log("Clicked Analysis:Minimum")}
    },
    {
      label: 'Maximum',
      click: async () => {console.log("Clicked Analysis:Maximum")}
    },
    {
      label: 'Median',
      click: async () => {console.log("Clicked Analysis:Median")}
    },
    {
      label: 'PWM',
      click: async () => {console.log("Clicked Analysis:PWM")}
    }
  ]
},
  {
    label: 'Help',
    submenu: [{
      label: 'Information',
      click: async () => {
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'Information',
          message: `Electron v${versionInfo.electronVersion}
                    Angular v${versionInfo.angularVersion}
                    
          MIT © AI-Gruppe ${new Date().getFullYear()}`,
          buttons: ['OK']
        })
      }
    },
      {
        label: 'Support-Website',
        click: async () => {
          shell.openExternal("https://omnaiscope.auto-intern.de/support/")
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

app.whenReady().then(() => {
  createWindow();
  console.log('Electron app version:', electronVersion);

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
