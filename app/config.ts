import {app} from 'electron';

import chokidar from 'chokidar';

import type {parsedConfig, configOptions, rawConfig} from '../typings/config';

import {_import, getDefaultConfig} from './config/import';
import _openConfig from './config/open';
import {cfgPath, cfgDir} from './config/paths';
import {_write} from './config/migrate';
import notify from './notify';
import {getColorMap} from './utils/colors';

const watchers: Function[] = [];
let cfg: parsedConfig = {} as any;
let _watcher: chokidar.FSWatcher;
let suppressNextNotify = false;

export const getDeprecatedCSS = (config: configOptions) => {
  const deprecated: string[] = [];
  const deprecatedCSS = ['x-screen', 'x-row', 'cursor-node', '::selection'];
  deprecatedCSS.forEach((css) => {
    if (config.css?.includes(css) || config.termCSS?.includes(css)) {
      deprecated.push(css);
    }
  });
  return deprecated;
};

const checkDeprecatedConfig = () => {
  if (!cfg.config) {
    return;
  }
  const deprecated = getDeprecatedCSS(cfg.config);
  if (deprecated.length === 0) {
    return;
  }
  const deprecatedStr = deprecated.join(', ');
  notify('Configuration warning', `Your configuration uses some deprecated CSS classes (${deprecatedStr})`);
};

const _watch = () => {
  if (_watcher) {
    return;
  }

  const onChange = () => {
    // Need to wait 100ms to ensure that write is complete
    setTimeout(() => {
      cfg = _import();
      if (!suppressNextNotify) {
        notify('Configuration updated', 'Hyper configuration reloaded!');
      }
      suppressNextNotify = false;
      watchers.forEach((fn) => {
        fn();
      });
      checkDeprecatedConfig();
    }, 100);
  };

  _watcher = chokidar.watch(cfgPath);
  _watcher.on('change', onChange);
  _watcher.on('error', (error) => {
    console.error('error watching config', error);
  });

  app.on('before-quit', () => {
    if (Object.keys(_watcher.getWatched()).length > 0) {
      _watcher.close().catch((err) => {
        console.warn(err);
      });
    }
  });
};

export const subscribe = (fn: Function) => {
  watchers.push(fn);
  return () => {
    watchers.splice(watchers.indexOf(fn), 1);
  };
};

export const getConfigDir = () => {
  // expose config directory to load plugin from the right place
  return cfgDir;
};

export const getDefaultProfile = () => {
  return cfg.config.defaultProfile || cfg.config.profiles[0]?.name || 'default';
};

// get config for the default profile, keeping it for backward compatibility
export const getConfig = () => {
  return getProfileConfig(getDefaultProfile());
};

export const getProfiles = () => {
  return cfg.config.profiles;
};

export const getProfileConfig = (profileName: string): configOptions => {
  const {profiles, defaultProfile, ...baseConfig} = cfg.config;
  const profileConfig = profiles.find((p) => p.name === profileName)?.config || {};
  for (const key in profileConfig) {
    if (typeof baseConfig[key] === 'object' && !Array.isArray(baseConfig[key])) {
      baseConfig[key] = {...baseConfig[key], ...profileConfig[key]};
    } else {
      baseConfig[key] = profileConfig[key];
    }
  }
  return {...baseConfig, defaultProfile, profiles};
};

export const openConfig = () => {
  return _openConfig();
};

export const getPlugins = (): {plugins: string[]; localPlugins: string[]} => {
  return {
    plugins: cfg.plugins,
    localPlugins: cfg.localPlugins
  };
};

export const getKeymaps = () => {
  return cfg.keymaps;
};

// Get the full raw config (for preferences GUI)
export const getRawConfig = (): rawConfig => {
  return {
    config: cfg.config,
    plugins: cfg.plugins,
    localPlugins: cfg.localPlugins,
    keymaps: Object.keys(cfg.keymaps).reduce((acc, key) => {
      const value = cfg.keymaps[key];
      acc[key] = value.length === 1 ? value[0] : value;
      return acc;
    }, {} as Record<string, string | string[]>)
  };
};

// Save the full raw config (for preferences GUI)
export const saveRawConfig = (rawCfg: rawConfig): boolean => {
  try {
    // Temporarily disable watcher to avoid reload loop
    if (_watcher) {
      _watcher.close();
      _watcher = null as any;
    }

    // Write the config file
    const configString = JSON.stringify(rawCfg, null, 2);
    _write(cfgPath, configString);

    // Reload config
    cfg = _import();

    // Re-enable watcher
    _watch();

    notify('Configuración guardada', 'Los cambios se aplicarán en nuevas ventanas');
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    notify('Error', 'No se pudo guardar la configuración');
    // Re-enable watcher even on error
    _watch();
    return false;
  }
};

// Apply raw config immediately (live), without closing the watcher.
// Triggers a config reload and updates existing windows in vivo.
export const applyLiveRawConfig = (rawCfg: rawConfig): boolean => {
  try {
    // Suppress the generic notification for this live update
    suppressNextNotify = true;
    const configString = JSON.stringify(rawCfg, null, 2);
    _write(cfgPath, configString);
    return true;
  } catch (error) {
    console.error('Error applying live config:', error);
    suppressNextNotify = false;
    notify('Error', 'No se pudo aplicar la configuración en vivo');
    return false;
  }
};

export const setup = () => {
  cfg = _import();
  _watch();
  checkDeprecatedConfig();
};

export {get as getWin, recordState as winRecord, defaults as windowDefaults} from './config/windows';

export const fixConfigDefaults = (decoratedConfig: configOptions) => {
  const defaultConfig = getDefaultConfig().config!;
  decoratedConfig.colors = getColorMap(decoratedConfig.colors) || {};
  // We must have default colors for xterm css.
  decoratedConfig.colors = {...defaultConfig.colors, ...decoratedConfig.colors};
  return decoratedConfig;
};

export const htermConfigTranslate = (config: configOptions) => {
  const cssReplacements: Record<string, string> = {
    'x-screen x-row([ {.[])': '.xterm-rows > div$1',
    '.cursor-node([ {.[])': '.terminal-cursor$1',
    '::selection([ {.[])': '.terminal .xterm-selection div$1',
    'x-screen a([ {.[])': '.terminal a$1',
    'x-row a([ {.[])': '.terminal a$1'
  };
  Object.keys(cssReplacements).forEach((pattern) => {
    const searchvalue = new RegExp(pattern, 'g');
    const newvalue = cssReplacements[pattern];
    config.css = config.css?.replace(searchvalue, newvalue);
    config.termCSS = config.termCSS?.replace(searchvalue, newvalue);
  });
  return config;
};
