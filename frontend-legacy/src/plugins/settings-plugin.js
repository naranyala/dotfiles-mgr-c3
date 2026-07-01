import { Plugin, PluginManifest, PluginSystem } from '../core/plugin-system.js';
import { createSignal } from '../framework/signals.js';
import { SignalElement } from '../framework/component.js';
import { html } from '../framework/template.js';
import { PluginManager } from '../core/plugin-system.js';

const STORAGE_KEY = 'dotfiles-mgr-settings';

function loadSettings() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
}

function saveSettings(settings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

const settingsManifest = new PluginManifest({
    id: 'settings',
    name: 'Settings',
    version: '1.0.0',
    description: 'Application settings and plugin configuration',
    author: 'dotfiles-mgr',
    type: 'native',
    dependencies: []
});

class SettingsPlugin extends Plugin {
    #settings = createSignal(loadSettings());
    #activeSection = createSignal('general');

    async onLoad(config) {
        this.on('config.updated', (event) => {
            this.updateSetting(event.data.key, event.data.value);
        });
    }

    getSettings() { return this.#settings[0](); }
    getSettingsSignal() { return this.#settings[0]; }
    getActiveSection() { return this.#activeSection[0](); }
    getActiveSectionSignal() { return this.#activeSection[0]; }
    setActiveSection(section) { this.#activeSection[1](section); }

    getSetting(key, defaultValue = null) {
        const settings = this.#settings[0]();
        return key.split('.').reduce((obj, k) => obj?.[k], settings) ?? defaultValue;
    }

    updateSetting(key, value) {
        const settings = { ...this.#settings[0]() };
        const keys = key.split('.');
        let obj = settings;
        for (let i = 0; i < keys.length - 1; i++) {
            obj[keys[i]] = { ...obj[keys[i]] };
            obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;
        this.#settings[1](settings);
        saveSettings(settings);
        this.emit('config.updated', { key, value });
    }
}

class SettingsPanel extends SignalElement {
    #plugin = null;

    connectedCallback() {
        this.#plugin = PluginSystem.get('settings');
        super.connectedCallback();
    }

    render() {
        const settingsSignal = this.#plugin ? this.#plugin.getSettingsSignal() : () => ({});
        const activeSectionSignal = this.#plugin ? this.#plugin.getActiveSectionSignal() : () => 'general';
        const plugins = PluginSystem.getAll();

        return html`
            <style>
                :host { display: block; }
                .settings-layout { display: grid; grid-template-columns: 200px 1fr; gap: 24px; }
                .sidebar { background: #1e1e2e; border-radius: 12px; padding: 16px 0; }
                .nav-item { padding: 10px 20px; color: #666; cursor: pointer; font-size: 14px; transition: all 0.15s; }
                .nav-item:hover { color: #aaa; background: #2a2a35; }
                .nav-item.active { color: #4CAF50; background: #2a2a35; }
                .content { background: #1e1e2e; border-radius: 12px; padding: 24px; }
                .section-title { font-size: 18px; font-weight: 600; color: #fff; margin-bottom: 20px; }
                .field { margin-bottom: 16px; }
                .field-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 6px; }
                .field-input {
                    width: 100%; padding: 10px 12px; background: #2a2a35; border: 1px solid #333;
                    border-radius: 6px; color: #e0e0e0; font-size: 14px; outline: none;
                }
                .field-input:focus { border-color: #4CAF50; }
                .plugin-list { display: flex; flex-direction: column; gap: 8px; }
                .plugin-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #2a2a35; border-radius: 8px; }
                .plugin-info { display: flex; flex-direction: column; }
                .plugin-name { color: #fff; font-size: 14px; }
                .plugin-version { color: #666; font-size: 12px; }
                .plugin-state { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
                .state-active { background: #1b5e20; color: #4CAF50; }
                .state-loaded { background: #1a237e; color: #5C6BC0; }
                .state-error { background: #4a1414; color: #e74c3c; }
                .btn { padding: 8px 16px; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
                .btn-primary { background: #4CAF50; color: #fff; }
                .btn-primary:hover { background: #43A047; }
            </style>
            <div class="settings-layout">
                <div class="sidebar">
                    <div class="nav-item ${() => activeSectionSignal() === 'general' ? 'active' : ''}"
                         @click=${() => this.#plugin?.setActiveSection('general')}>General</div>
                    <div class="nav-item ${() => activeSectionSignal() === 'plugins' ? 'active' : ''}"
                         @click=${() => this.#plugin?.setActiveSection('plugins')}>Plugins</div>
                    <div class="nav-item ${() => activeSectionSignal() === 'weather' ? 'active' : ''}"
                         @click=${() => this.#plugin?.setActiveSection('weather')}>Weather</div>
                </div>
                <div class="content">
                    ${() => {
                        const activeSection = activeSectionSignal();
                        if (activeSection === 'general') return this.#renderGeneral(settingsSignal);
                        if (activeSection === 'plugins') return this.#renderPlugins(plugins);
                        if (activeSection === 'weather') return this.#renderWeather(settingsSignal);
                        return html``;
                    }}
                </div>
            </div>
        `;
    }

    #renderGeneral(settingsSignal) {
        return html`
            <div class="section-title">General Settings</div>
            <div class="field">
                <div class="field-label">Application Name</div>
                <input class="field-input" value="${() => settingsSignal()?.appName || 'Dotfiles Manager'}"
                       @change=${(e) => this.#plugin?.updateSetting('appName', e.target.value)} />
            </div>
            <div class="field">
                <div class="field-label">Theme</div>
                <select class="field-input"
                        @change=${(e) => this.#plugin?.updateSetting('theme', e.target.value)}>
                    <option value="dark" ?selected=${() => settingsSignal()?.theme === 'dark'}>Dark</option>
                    <option value="light" ?selected=${() => settingsSignal()?.theme === 'light'}>Light</option>
                </select>
            </div>
        `;
    }

    #renderPlugins(plugins) {
        return html`
            <div class="section-title">Installed Plugins</div>
            <div class="plugin-list">
                ${plugins.map(p => html`
                    <div class="plugin-item">
                        <div class="plugin-info">
                            <div class="plugin-name">${p.manifest.name}</div>
                            <div class="plugin-version">${p.manifest.version} - ${p.manifest.description}</div>
                        </div>
                        <span class="plugin-state state-${p.state}">${p.state}</span>
                    </div>
                `)}
            </div>
        `;
    }

    #renderWeather(settingsSignal) {
        return html`
            <div class="section-title">Weather Settings</div>
            <div class="field">
                <div class="field-label">API Key (OpenWeatherMap)</div>
                <input class="field-input" type="password" value="${() => settingsSignal()?.weather?.apiKey || ''}"
                       placeholder="Enter your API key"
                       @change=${(e) => this.#plugin?.updateSetting('weather.apiKey', e.target.value)} />
            </div>
            <div class="field">
                <div class="field-label">City</div>
                <input class="field-input" value="${() => settingsSignal()?.weather?.city || 'London'}"
                       placeholder="City name"
                       @change=${(e) => this.#plugin?.updateSetting('weather.city', e.target.value)} />
            </div>
        `;
    }
}

customElements.define('settings-panel', SettingsPanel);

PluginSystem.register(settingsManifest, SettingsPlugin);

PluginManager.register('Settings', {
    name: 'Settings',
    icon: '⚙',
    render: () => html`<settings-panel></settings-panel>`
});
