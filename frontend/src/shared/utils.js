/**
 * Standardizes RPC calls with consistent error handling.
 */
export async function rpcCall(method, ...args) {
    try {
        const parts = method.split('.');
        const namespace = parts[0];
        const func = parts[1] || parts[0];
        
        if (!window.rpc[namespace]) {
            throw new Error(`RPC namespace ${namespace} not found`);
        }
        
        const result = await window.rpc[namespace][func](...args);
        
        if (result && result.error) {
            throw new Error(result.error);
        }
        
        return result;
    } catch (e) {
        console.error(`RPC Error [${method}]:`, e);
        throw e;
    }
}

/**
 * Formats bytes into human readable string.
 */
export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Simple wrapper for creating a consistent card UI.
 */
export function uiCard(title, content, icon = '📦') {
    return `
    <div class="card">
        <div class="hdr">${icon} ${title}</div>
        <div class="bd">${content}</div>
    </div>`;
}

/**
 * Escapes HTML special characters to prevent XSS.
 */
export function escapeHtml(str) {
    if (!str) return ''
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}
