import { createSignal } from './framework/signals.js';
import { ReactiveElement } from './framework/component.js';

const [getCount, setCount] = createSignal(0);

class CounterElement extends ReactiveElement {
    render() {
        return `
            <style>
                :host {
                    display: block;
                    padding: 20px;
                    background: #2c2c2c;
                    border-radius: 8px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
                    text-align: center;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }
                button {
                    background: linear-gradient(135deg, #4CAF50, #2E7D32);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: bold;
                    transition: transform 0.2s, box-shadow 0.2s;
                    box-shadow: 0 2px 10px rgba(76, 175, 80, 0.3);
                }
                button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(76, 175, 80, 0.5);
                }
                button:active {
                    transform: translateY(1px);
                }
                .count-display {
                    font-size: 32px;
                    font-weight: bold;
                    margin-left: 20px;
                    color: #A5D6A7;
                    vertical-align: middle;
                }
                h2 {
                    color: #ffffff;
                    margin-top: 0;
                    margin-bottom: 20px;
                }
            </style>
            <h2>My Reactive Counter</h2>
            <div>
                <button id="inc-btn">Increment Count</button>
                <span class="count-display">${getCount()}</span>
            </div>
        `;
    }

    setupEvents() {
        const btn = this.root.getElementById('inc-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                setCount(getCount() + 1);
            });
        }
    }
}

class RPCTesterElement extends ReactiveElement {
    render() {
        return `
            <style>
                :host {
                    display: block;
                    padding: 20px;
                    background: #2c2c2c;
                    border-radius: 8px;
                    margin-top: 20px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
                    text-align: center;
                }
                button {
                    background: linear-gradient(135deg, #2196F3, #1565C0);
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    margin: 5px;
                }
                .response {
                    margin-top: 15px;
                    padding: 10px;
                    background: #1e1e1e;
                    border-radius: 4px;
                    font-family: monospace;
                    min-height: 20px;
                    color: #90CAF9;
                }
            </style>
            <h2>Backend RPC Test</h2>
            <button id="btn-ping">Ping Backend</button>
            <button id="btn-sys">Get System Info</button>
            <div class="response" id="rpc-output">Awaiting response...</div>
        `;
    }

    setupEvents() {
        const out = this.root.getElementById('rpc-output');
        
        this.root.getElementById('btn-ping')?.addEventListener('click', async () => {
            if (out) out.innerText = "Pinging...";
            try {
                const res = await window.backendRPC("ping");
                if (out) out.innerText = JSON.stringify(res, null, 2);
            } catch(e) {
                if (out) out.innerText = "Error: " + String(e);
            }
        });
        
        this.root.getElementById('btn-sys')?.addEventListener('click', async () => {
            if (out) out.innerText = "Fetching sys info...";
            try {
                const res = await window.backendRPC("getSystemInfo");
                if (out) out.innerText = JSON.stringify(res, null, 2);
            } catch(e) {
                if (out) out.innerText = "Error: " + String(e);
            }
        });
    }
}

class AppLayout extends ReactiveElement {
    render() {
        return `
            <style>
                :host {
                    display: block;
                    width: 100vw;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    background-color: #121212;
                    color: #ececec;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                
                .toolbar {
                    height: 50px;
                    background-color: #1e1e1e;
                    border-bottom: 1px solid #333;
                    display: flex;
                    align-items: center;
                    padding: 0 20px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.5);
                    z-index: 10;
                }
                
                .toolbar-title {
                    font-size: 18px;
                    font-weight: 600;
                    background: linear-gradient(90deg, #4CAF50, #2E7D32);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin-right: auto;
                }
                
                .toolbar-actions button {
                    background: transparent;
                    border: 1px solid #444;
                    color: #ccc;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-left: 10px;
                    transition: all 0.2s;
                }
                
                .toolbar-actions button:hover {
                    background: #333;
                    color: #fff;
                    border-color: #555;
                }
                
                .main-container {
                    display: flex;
                    flex: 1;
                    overflow: hidden;
                }
                
                .sidebar {
                    width: 250px;
                    background-color: #181818;
                    border-right: 1px solid #333;
                    display: flex;
                    flex-direction: column;
                    padding: 20px 0;
                }
                
                .nav-item {
                    padding: 12px 20px;
                    color: #aaa;
                    cursor: pointer;
                    transition: all 0.2s;
                    border-left: 3px solid transparent;
                    display: flex;
                    align-items: center;
                }
                
                .nav-item:hover {
                    background-color: #222;
                    color: #fff;
                }
                
                .nav-item.active {
                    background-color: #2a2a2a;
                    color: #4CAF50;
                    border-left-color: #4CAF50;
                }
                
                .content-area {
                    flex: 1;
                    padding: 30px;
                    overflow-y: auto;
                    background-color: #121212;
                }
                
                .dashboard-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
                    gap: 20px;
                }
            </style>
            
            <div class="toolbar">
                <div class="toolbar-title">Dotfiles Manager</div>
                <div class="toolbar-actions">
                    <button id="btn-sync">Sync Configs</button>
                    <button id="btn-settings">Settings</button>
                </div>
            </div>
            
            <div class="main-container">
                <div class="sidebar">
                    <div class="nav-item active">Dashboard</div>
                    <div class="nav-item">Configurations</div>
                    <div class="nav-item">System Info</div>
                    <div class="nav-item">Git Status</div>
                </div>
                
                <div class="content-area">
                    <div class="dashboard-grid">
                        <my-counter></my-counter>
                        <rpc-tester></rpc-tester>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('my-counter', CounterElement);
customElements.define('rpc-tester', RPCTesterElement);
customElements.define('app-layout', AppLayout);

console.log("Custom Framework initialized in pure JavaScript!");
