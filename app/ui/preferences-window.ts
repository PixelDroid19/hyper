import {resolve} from 'path';

import {app, BrowserWindow} from 'electron';
import type {BrowserWindowConstructorOptions} from 'electron';

import {enable as remoteEnable} from '@electron/remote/main';
import isDev from 'electron-is-dev';

import {icon} from '../config/paths';

let preferencesWindow: BrowserWindow | null = null;

export function createPreferencesWindow(): BrowserWindow {
  // Si ya existe una ventana de preferencias, enfocarla
  if (preferencesWindow && !preferencesWindow.isDestroyed()) {
    preferencesWindow.focus();
    return preferencesWindow;
  }

  const winOpts: BrowserWindowConstructorOptions = {
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 400,
    backgroundColor: '#1e1e1e',
    title: 'Hyper - Preferencias',
    frame: true,
    show: false,
    icon,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  };

  preferencesWindow = new BrowserWindow(winOpts);

  // Enable remote module on this window
  remoteEnable(preferencesWindow.webContents);

  // En modo dev, __dirname es target/ui, necesitamos subir un nivel
  // En producción, app.getAppPath() ya apunta al directorio correcto
  const basePath = isDev ? resolve(__dirname, '..') : app.getAppPath();
  const url = `file://${resolve(basePath, 'preferences.html')}`;
  console.log('preferences window will open', url);
  console.log('basePath:', basePath);
  console.log('__dirname:', __dirname);

  void preferencesWindow.loadURL(url);

  preferencesWindow.once('ready-to-show', () => {
    preferencesWindow?.show();
  });

  preferencesWindow.on('closed', () => {
    preferencesWindow = null;
  });

  return preferencesWindow;
}

export function getPreferencesWindow(): BrowserWindow | null {
  return preferencesWindow;
}
