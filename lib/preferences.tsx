import React, {useState, useEffect, useRef} from 'react';
import {createRoot} from 'react-dom/client';

import type {rawConfig} from '../typings/config';

import {ipcRenderer} from './utils/ipc';

const Preferences: React.FC = () => {
  const [config, setConfig] = useState<rawConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const initialLoadRef = useRef(true);
  const liveApplyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      console.log('Cargando configuración...');
      const rawConfig = await ipcRenderer.invoke('getRawConfig');
      console.log('Configuración cargada:', rawConfig);
      setConfig(rawConfig);
      setLoading(false);
    } catch (error) {
      console.error('Error loading config:', error);
      setLoading(false);
      // Mostrar error en la UI
      setConfig({
        config: {} as any,
        plugins: [],
        localPlugins: [],
        keymaps: {}
      });
    }
  };

  // Aplica cambios de configuración en vivo con debounce
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }
    if (!config) return;
    if (liveApplyTimerRef.current) {
      window.clearTimeout(liveApplyTimerRef.current);
    }
    liveApplyTimerRef.current = window.setTimeout(async () => {
      try {
        await ipcRenderer.invoke('applyLiveRawConfig', config);
      } catch (e) {
        console.error('Error aplicando configuración en vivo:', e);
      }
    }, 400);

    return () => {
      if (liveApplyTimerRef.current) {
        window.clearTimeout(liveApplyTimerRef.current);
        liveApplyTimerRef.current = null;
      }
    };
  }, [config]);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const success = await ipcRenderer.invoke('saveRawConfig', config);
      if (success) {
        // Cerrar la ventana después de guardar
        setTimeout(() => {
          try {
            const {remote} = require('@electron/remote');
            remote.getCurrentWindow().close();
          } catch (e) {
            // Fallback si remote no está disponible
            window.close();
          }
        }, 500);
      }
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (path: string[], value: any) => {
    if (!config) return;
    const newConfig = {...config};
    let current: any = newConfig;
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    setConfig(newConfig);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Cargando configuración...</div>
      </div>
    );
  }

  if (!config || !config.config) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Error al cargar la configuración</div>
      </div>
    );
  }

  const cfg = config.config;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Preferencias de Hyper</h1>
      </div>

      <div style={styles.content}>
        <div style={styles.sidebar}>
          <div
            style={{
              ...styles.sidebarItem,
              ...(activeTab === 'general' ? styles.sidebarItemActive : {})
            }}
            onClick={() => setActiveTab('general')}
          >
            General
          </div>
          <div
            style={{
              ...styles.sidebarItem,
              ...(activeTab === 'apariencia' ? styles.sidebarItemActive : {})
            }}
            onClick={() => setActiveTab('apariencia')}
          >
            Apariencia
          </div>
          <div
            style={{
              ...styles.sidebarItem,
              ...(activeTab === 'terminal' ? styles.sidebarItemActive : {})
            }}
            onClick={() => setActiveTab('terminal')}
          >
            Terminal
          </div>
          <div
            style={{
              ...styles.sidebarItem,
              ...(activeTab === 'shell' ? styles.sidebarItemActive : {})
            }}
            onClick={() => setActiveTab('shell')}
          >
            Shell
          </div>
          <div
            style={{
              ...styles.sidebarItem,
              ...(activeTab === 'colores' ? styles.sidebarItemActive : {})
            }}
            onClick={() => setActiveTab('colores')}
          >
            Colores
          </div>
          <div
            style={{
              ...styles.sidebarItem,
              ...(activeTab === 'plugins' ? styles.sidebarItemActive : {})
            }}
            onClick={() => setActiveTab('plugins')}
          >
            Plugins
          </div>
        </div>

        <div style={styles.mainContent}>
          {activeTab === 'general' && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>General</h2>
              <div style={styles.formGroup}>
                <label style={styles.label}>Canal de actualización</label>
                <select
                  style={styles.select}
                  value={cfg.updateChannel || 'stable'}
                  onChange={(e) => updateConfig(['config', 'updateChannel'], e.target.value)}
                >
                  <option value="stable">Estable</option>
                  <option value="canary">Canary</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={cfg.disableAutoUpdates || false}
                    onChange={(e) => updateConfig(['config', 'disableAutoUpdates'], e.target.checked)}
                    style={styles.checkbox}
                  />
                  Desactivar actualizaciones automáticas
                </label>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={cfg.autoUpdatePlugins === true || cfg.autoUpdatePlugins === 'true'}
                    onChange={(e) => updateConfig(['config', 'autoUpdatePlugins'], e.target.checked)}
                    style={styles.checkbox}
                  />
                  Actualizar plugins automáticamente
                </label>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={cfg.defaultSSHApp || false}
                    onChange={(e) => updateConfig(['config', 'defaultSSHApp'], e.target.checked)}
                    style={styles.checkbox}
                  />
                  Establecer como aplicación SSH predeterminada
                </label>
              </div>
            </div>
          )}

          {activeTab === 'apariencia' && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Apariencia</h2>
              <div style={styles.formGroup}>
                <label style={styles.label}>Tamaño de fuente</label>
                <input
                  type="number"
                  style={styles.input}
                  value={cfg.fontSize || 12}
                  onChange={(e) => updateConfig(['config', 'fontSize'], parseInt(e.target.value) || 12)}
                  min="8"
                  max="72"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Familia de fuente</label>
                <input
                  type="text"
                  style={styles.input}
                  value={cfg.fontFamily || ''}
                  onChange={(e) => updateConfig(['config', 'fontFamily'], e.target.value)}
                  placeholder="Menlo, 'DejaVu Sans Mono', Consolas, monospace"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Peso de fuente</label>
                <select
                  style={styles.select}
                  value={cfg.fontWeight || 'normal'}
                  onChange={(e) => updateConfig(['config', 'fontWeight'], e.target.value)}
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Negrita</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                  <option value="300">300</option>
                  <option value="400">400</option>
                  <option value="500">500</option>
                  <option value="600">600</option>
                  <option value="700">700</option>
                  <option value="800">800</option>
                  <option value="900">900</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Altura de línea</label>
                <input
                  type="number"
                  style={styles.input}
                  value={cfg.lineHeight || 1}
                  onChange={(e) => updateConfig(['config', 'lineHeight'], parseFloat(e.target.value) || 1)}
                  min="0.5"
                  max="3"
                  step="0.1"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Espaciado de letras</label>
                <input
                  type="number"
                  style={styles.input}
                  value={cfg.letterSpacing || 0}
                  onChange={(e) => updateConfig(['config', 'letterSpacing'], parseFloat(e.target.value) || 0)}
                  min="-2"
                  max="5"
                  step="0.1"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Padding</label>
                <input
                  type="text"
                  style={styles.input}
                  value={cfg.padding || ''}
                  onChange={(e) => updateConfig(['config', 'padding'], e.target.value)}
                  placeholder="12px 14px"
                />
              </div>
            </div>
          )}

          {activeTab === 'terminal' && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Terminal</h2>
              <div style={styles.formGroup}>
                <label style={styles.label}>Color de fondo</label>
                <div style={styles.colorInputGroup}>
                  <input
                    type="color"
                    style={styles.colorInput}
                    value={cfg.backgroundColor || '#000000'}
                    onChange={(e) => updateConfig(['config', 'backgroundColor'], e.target.value)}
                  />
                  <input
                    type="text"
                    style={styles.input}
                    value={cfg.backgroundColor || ''}
                    onChange={(e) => updateConfig(['config', 'backgroundColor'], e.target.value)}
                    placeholder="#000000"
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Color de texto</label>
                <div style={styles.colorInputGroup}>
                  <input
                    type="color"
                    style={styles.colorInput}
                    value={cfg.foregroundColor || '#ffffff'}
                    onChange={(e) => updateConfig(['config', 'foregroundColor'], e.target.value)}
                  />
                  <input
                    type="text"
                    style={styles.input}
                    value={cfg.foregroundColor || ''}
                    onChange={(e) => updateConfig(['config', 'foregroundColor'], e.target.value)}
                    placeholder="#ffffff"
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Color del cursor</label>
                <div style={styles.colorInputGroup}>
                  <input
                    type="color"
                    style={styles.colorInput}
                    value={cfg.cursorColor?.replace(/rgba?\([^)]+\)/, (match) => {
                      // Convertir rgba a hex aproximado
                      return '#f81ce5';
                    }) || '#f81ce5'}
                    onChange={(e) => updateConfig(['config', 'cursorColor'], e.target.value)}
                  />
                  <input
                    type="text"
                    style={styles.input}
                    value={cfg.cursorColor || ''}
                    onChange={(e) => updateConfig(['config', 'cursorColor'], e.target.value)}
                    placeholder="rgba(248,28,229,0.8)"
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Forma del cursor</label>
                <select
                  style={styles.select}
                  value={cfg.cursorShape || 'BLOCK'}
                  onChange={(e) => updateConfig(['config', 'cursorShape'], e.target.value)}
                >
                  <option value="BLOCK">Bloque</option>
                  <option value="BEAM">Barra</option>
                  <option value="UNDERLINE">Subrayado</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={cfg.cursorBlink || false}
                    onChange={(e) => updateConfig(['config', 'cursorBlink'], e.target.checked)}
                    style={styles.checkbox}
                  />
                  Cursor parpadeante
                </label>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Historial (scrollback)</label>
                <input
                  type="number"
                  style={styles.input}
                  value={cfg.scrollback || 1000}
                  onChange={(e) => updateConfig(['config', 'scrollback'], parseInt(e.target.value) || 1000)}
                  min="100"
                  max="100000"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={cfg.copyOnSelect || false}
                    onChange={(e) => updateConfig(['config', 'copyOnSelect'], e.target.checked)}
                    style={styles.checkbox}
                  />
                  Copiar al seleccionar
                </label>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={cfg.disableLigatures === false}
                    onChange={(e) => updateConfig(['config', 'disableLigatures'], !e.target.checked)}
                    style={styles.checkbox}
                  />
                  Habilitar ligaduras
                </label>
              </div>
            </div>
          )}

          {activeTab === 'shell' && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Shell</h2>
              <div style={styles.formGroup}>
                <label style={styles.label}>Shell</label>
                <input
                  type="text"
                  style={styles.input}
                  value={cfg.shell || ''}
                  onChange={(e) => updateConfig(['config', 'shell'], e.target.value)}
                  placeholder="Dejar vacío para usar el shell predeterminado"
                />
                <div style={styles.helpText}>
                  Ejemplo Windows: C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Argumentos del shell</label>
                <input
                  type="text"
                  style={styles.input}
                  value={Array.isArray(cfg.shellArgs) ? cfg.shellArgs.join(' ') : ''}
                  onChange={(e) => {
                    const args = e.target.value.split(' ').filter((a) => a.trim());
                    updateConfig(['config', 'shellArgs'], args);
                  }}
                  placeholder="--login"
                />
                <div style={styles.helpText}>
                  Separar argumentos con espacios
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Directorio de trabajo</label>
                <input
                  type="text"
                  style={styles.input}
                  value={cfg.workingDirectory || ''}
                  onChange={(e) => updateConfig(['config', 'workingDirectory'], e.target.value)}
                  placeholder="Dejar vacío para usar el directorio actual"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={cfg.preserveCWD || false}
                    onChange={(e) => updateConfig(['config', 'preserveCWD'], e.target.checked)}
                    style={styles.checkbox}
                  />
                  Preservar directorio de trabajo al crear nuevas pestañas
                </label>
              </div>
            </div>
          )}

          {activeTab === 'colores' && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Colores</h2>
              {cfg.colors && Object.entries(cfg.colors).map(([name, color]) => (
                <div key={name} style={styles.formGroup}>
                  <label style={styles.label}>{name}</label>
                  <div style={styles.colorInputGroup}>
                    <input
                      type="color"
                      style={styles.colorInput}
                      value={color || '#000000'}
                      onChange={(e) => {
                        const newColors = {...cfg.colors};
                        newColors[name as keyof typeof newColors] = e.target.value;
                        updateConfig(['config', 'colors'], newColors);
                      }}
                    />
                    <input
                      type="text"
                      style={styles.input}
                      value={color || ''}
                      onChange={(e) => {
                        const newColors = {...cfg.colors};
                        newColors[name as keyof typeof newColors] = e.target.value;
                        updateConfig(['config', 'colors'], newColors);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'plugins' && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Plugins</h2>
              <div style={styles.formGroup}>
                <label style={styles.label}>Plugins instalados</label>
                <textarea
                  style={styles.textarea}
                  value={Array.isArray(config.plugins) ? config.plugins.join('\n') : ''}
                  onChange={(e) => {
                    const plugins = e.target.value.split('\n').filter((p) => p.trim());
                    setConfig({...config, plugins});
                  }}
                  placeholder="hyperpower&#10;hyper-material-theme"
                  rows={10}
                />
                <div style={styles.helpText}>
                  Un plugin por línea. Ejemplo: hyperpower o @org/plugin
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Plugins locales</label>
                <textarea
                  style={styles.textarea}
                  value={Array.isArray(config.localPlugins) ? config.localPlugins.join('\n') : ''}
                  onChange={(e) => {
                    const localPlugins = e.target.value.split('\n').filter((p) => p.trim());
                    setConfig({...config, localPlugins});
                  }}
                  placeholder="local-plugin"
                  rows={5}
                />
                <div style={styles.helpText}>
                  Plugins locales de desarrollo
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={styles.footer}>
        <button style={styles.cancelButton} onClick={() => {
          try {
            const {remote} = require('@electron/remote');
            remote.getCurrentWindow().close();
          } catch (e) {
            // Fallback si remote no está disponible
            window.close();
          }
        }}>
          Cancelar
        </button>
        <button style={styles.saveButton} onClick={saveConfig} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#1e1e1e',
    color: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif'
  },
  header: {
    padding: '20px',
    borderBottom: '1px solid #333',
    backgroundColor: '#252526'
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 'bold'
  },
  content: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden'
  },
  sidebar: {
    width: '200px',
    backgroundColor: '#252526',
    borderRight: '1px solid #333',
    padding: '10px 0',
    overflowY: 'auto'
  },
  sidebarItem: {
    padding: '12px 20px',
    cursor: 'pointer',
    color: '#cccccc',
    transition: 'background-color 0.2s'
  },
  sidebarItemActive: {
    backgroundColor: '#2a2d2e',
    color: '#ffffff',
    borderLeft: '3px solid #007acc'
  },
  mainContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px'
  },
  section: {
    maxWidth: '800px'
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: '20px',
    fontSize: '18px',
    fontWeight: 'bold'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#cccccc'
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: '#3c3c3c',
    border: '1px solid #555',
    borderRadius: '4px',
    color: '#ffffff',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: '#3c3c3c',
    border: '1px solid #555',
    borderRadius: '4px',
    color: '#ffffff',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: '#3c3c3c',
    border: '1px solid #555',
    borderRadius: '4px',
    color: '#ffffff',
    fontSize: '14px',
    fontFamily: 'monospace',
    boxSizing: 'border-box',
    resize: 'vertical'
  },
  checkbox: {
    marginRight: '8px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: '#cccccc',
    cursor: 'pointer'
  },
  colorInputGroup: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  colorInput: {
    width: '60px',
    height: '40px',
    border: '1px solid #555',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  helpText: {
    marginTop: '4px',
    fontSize: '12px',
    color: '#888',
    fontStyle: 'italic'
  },
  footer: {
    padding: '20px',
    borderTop: '1px solid #333',
    backgroundColor: '#252526',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px'
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#3c3c3c',
    border: '1px solid #555',
    borderRadius: '4px',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px'
  },
  saveButton: {
    padding: '10px 20px',
    backgroundColor: '#007acc',
    border: 'none',
    borderRadius: '4px',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '16px',
    color: '#cccccc'
  },
  error: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '16px',
    color: '#ff4444'
  }
};

// Manejo de errores mejorado
try {
  const mountElement = document.getElementById('mount');
  if (!mountElement) {
    throw new Error('No se encontró el elemento #mount');
  }
  const root = createRoot(mountElement);
  root.render(<Preferences />);
} catch (error) {
  console.error('Error al renderizar Preferences:', error);
  document.body.innerHTML = `
    <div style="padding: 20px; color: #ff4444; font-family: monospace;">
      <h1>Error al cargar las preferencias</h1>
      <p>${error instanceof Error ? error.message : String(error)}</p>
      <p>Por favor, revisa la consola para más detalles.</p>
    </div>
  `;
}

