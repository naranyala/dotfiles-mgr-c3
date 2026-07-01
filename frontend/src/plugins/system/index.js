import { reactive } from '../../core/signals.js'
import { uiCard, formatBytes } from '../../shared/index.js'

export const state = reactive({
	sysInfo: null,
	hostname: '',
	username: '',
	uname: null,
	memory: null,
	uptime: null,
	diskInfo: null,
})

export async function init() {
	try {
		state.sysInfo = await window.rpc.system.getSystemInfo()
	} catch (e) { state.sysInfo = { error: e.message } }
	try {
		state.hostname = (await window.rpc.shell.hostname()).hostname
	} catch (e) { state.hostname = `err: ${e.message}` }
	try {
		state.username = (await window.rpc.shell.username()).username
	} catch (e) { state.username = `err: ${e.message}` }
	try {
		state.uname = await window.rpc.shell.uname()
	} catch (e) { state.uname = { error: e.message } }
	try {
		state.memory = await window.rpc.shell.memoryInfo()
	} catch (e) { state.memory = { error: e.message } }
	try {
		state.uptime = await window.rpc.shell.uptime()
	} catch (e) { state.uptime = { error: e.message } }
	try {
		state.diskInfo = await window.rpc.shell.diskUsage('/')
	} catch (e) { state.diskInfo = { error: e.message } }
}

export function render() {
	const { sysInfo, hostname, username, uname, memory, uptime, diskInfo } = state

	return `
    ${uiCard('System', !sysInfo ? '<em>loading…</em>' :
          sysInfo.error ? `<span class="err">${sysInfo.error}</span>` :
          `<div class="mono">Platform: ${sysInfo.platform}<br>Home: ${sysInfo.homeDir}</div>`, '💻')}
    
    <div class="card">
      <div class="hdr">User</div>
      <div class="bd">
        <div class="mono">Host: ${hostname}<br>User: ${username}</div>
      </div>
    </div>

    ${uiCard('Kernel', !uname ? '<em>loading…</em>' : uname.error ? `<span class="err">${uname.error}</span>` :
          `<div class="mono">${uname.sysname} ${uname.release}<br>${uname.machine}<br>${uname.version}</div>`, '⚙️')}

    ${uiCard('Memory', !memory ? '<em>loading…</em>' : memory.error ? `<span class="err">${memory.error}</span>` :
          `<div class="mono">Total: ${formatBytes(memory.total)}<br>Available: ${formatBytes(memory.available)}<br>Used: ${memory.usedPercent} %</div>`, '🧠')}

    ${uiCard('Uptime', !uptime ? '<em>loading…</em>' : uptime.error ? `<span class="err">${uptime.error}</span>` :
          `<div class="mono">${Math.floor(uptime.seconds / 3600)}h ${Math.floor((uptime.seconds % 3600) / 60)}m</div>`, '⏱️')}

    ${uiCard('Disk Usage (/)', !diskInfo ? '<em>loading…</em>' : diskInfo.error ? `<span class="err">${diskInfo.error}</span>` :
          `<div class="mono">Total: ${formatBytes(diskInfo.total * 1024)}<br>Used: ${diskInfo.usedPercent} %<br>Free: ${formatBytes(diskInfo.free * 1024)}</div>`, '💾')}
    `
}
