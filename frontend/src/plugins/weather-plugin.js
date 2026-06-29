import { Plugin, PluginManifest, PluginSystem, PluginType, eventBus } from '../core/plugin-system.js';
import { createSignal } from '../framework/signals.js';
import { ReactiveElement } from '../framework/component.js';
import { html } from '../framework/template.js';
import { rpc } from '../core/rpc.js';

// --- Backend Plugin ---

const weatherManifest = new PluginManifest({
    id: 'weather',
    name: 'Weather',
    version: '1.0.0',
    description: 'Fetch weather data from OpenWeatherMap API',
    author: 'dotfiles-mgr',
    type: PluginType.EXTERNAL,
    dependencies: [],
    config: {
        apiKey: '',
        city: 'London',
        units: 'metric'
    }
});

class WeatherPlugin extends Plugin {
    #weatherData = createSignal(null);
    #loading = createSignal(false);
    #error = createSignal(null);

    async onLoad(config, context) {
        this.on('config.updated', (event) => {
            if (event.data?.apiKey) {
                this.fetchWeather();
            }
        });
    }

    async onStart() {
        if (this.config.apiKey) {
            await this.fetchWeather();
        }
    }

    async onStop() {
        this.#weatherData[1](null);
    }

    async fetchWeather() {
        const [_, setLoading] = this.#loading;
        const [__, setError] = this.#error;

        setLoading(true);
        setError(null);

        try {
            const data = await this.rpc('weather.fetch', {
                apiKey: this.config.apiKey,
                city: this.config.city,
                units: this.config.units
            });
            this.#weatherData[1](data);
            this.emit('weather.updated', data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    getWeatherSignal() { return this.#weatherData[0]; }
    getLoadingSignal() { return this.#loading[0]; }
    getErrorSignal() { return this.#error[0]; }
}

// --- Frontend Component ---

class WeatherCard extends ReactiveElement {
    #plugin = null;

    connectedCallback() {
        const pluginId = this.getAttribute('plugin-id');
        this.#plugin = PluginSystem.get(pluginId);
        super.connectedCallback();
    }

    render() {
        const weather = this.#plugin?.getWeatherSignal();
        const loading = this.#plugin?.getLoadingSignal();
        const error = this.#plugin?.getErrorSignal();

        return html`
            <style>
                :host { display: block; }
                .card {
                    padding: 24px;
                    background: #1e1e2e;
                    border-radius: 12px;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }
                .title { font-size: 16px; font-weight: 600; color: #fff; }
                .temp { font-size: 48px; font-weight: 700; color: #fff; margin: 8px 0; }
                .desc { font-size: 14px; color: #888; margin-bottom: 16px; }
                .details { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                .detail { padding: 8px; background: #2a2a35; border-radius: 6px; }
                .detail-label { font-size: 11px; color: #666; text-transform: uppercase; }
                .detail-value { font-size: 14px; color: #ccc; }
                .error { color: #e74c3c; padding: 16px; text-align: center; }
                .loading { color: #666; padding: 16px; text-align: center; }
                button {
                    padding: 6px 12px;
                    background: #333;
                    border: none;
                    border-radius: 4px;
                    color: #ccc;
                    cursor: pointer;
                    font-size: 12px;
                }
                button:hover { background: #444; }
            </style>
            <div class="card">
                <div class="header">
                    <div class="title">Weather</div>
                    <button id="refresh">Refresh</button>
                </div>
                ${() => {
                    if (loading?.()) return html`<div class="loading">Loading...</div>`;
                    if (error?.()) return html`<div class="error">${error()}</div>`;
                    const data = weather?.();
                    if (!data) return html`<div class="loading">No data. Set API key in settings.</div>`;
                    return html`
                        <div class="temp">${data.temp}${data.units === 'metric' ? 'C' : 'F'}</div>
                        <div class="desc">${data.description}</div>
                        <div class="details">
                            <div class="detail">
                                <div class="detail-label">Feels Like</div>
                                <div class="detail-value">${data.feelsLike}</div>
                            </div>
                            <div class="detail">
                                <div class="detail-label">Humidity</div>
                                <div class="detail-value">${data.humidity}%</div>
                            </div>
                            <div class="detail">
                                <div class="detail-label">Wind</div>
                                <div class="detail-value">${data.wind} m/s</div>
                            </div>
                            <div class="detail">
                                <div class="detail-label">City</div>
                                <div class="detail-value">${data.city}</div>
                            </div>
                        </div>
                    `;
                }}
            </div>
        `;
    }

    setupEvents() {
        this.root.querySelector('#refresh')?.addEventListener('click', () => {
            this.#plugin?.fetchWeather();
        });
    }
}

customElements.define('weather-card', WeatherCard);

// Register the plugin
PluginSystem.register(weatherManifest, WeatherPlugin);
