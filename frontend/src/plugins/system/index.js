import { reactive } from '../../core/signals.js'

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
		state.sysInfo = await window.rpc.systemInfo()
	} catch (e) { state.sysInfo = { error: e.message } }
	try {
		state.hostname = (await window.rpc.hostname()).hostname
	} catch (e) { state.hostname = `err: ${e.message}` }
	try {
		state.username = (await window.rpc.username()).username
	} catch (e) { state.username = `err: ${e.message}` }
	try {
		state.uname = await window.rpc.uname()
	} catch (e) { state.uname = { error: e.message } }
	try {
		state.memory = await window.rpc.memoryInfo()
	} catch (e) { state.memory = { error: e.message } }
	try {
		state.uptime = await window.rpc.uptime()
	} catch (e) { state.uptime = { error: e.message } }
	try {
		state.diskInfo = await window.rpc.diskUsage('/')
	} catch (e) { state.diskInfo = { error: e.message } }
}

export function render() {
	const { sysInfo, hostname, username, uname, memory, uptime, diskInfo } = state

	return `
    <!-- System Info -->
    <div class="card">
      <div class="hdr">System</div>
      <div class="bd">
        ${!sysInfo ? '<em>loading…</em>' :
          sysInfo.error ? `<span class="err">${sysInfo.error}</span>` :
          `<div class="mono">Platform: ${sysInfo.platform}<br>Home: ${sysInfo.homeDir}</div>`}
        <div class="mono" style="margin-top:6px">Host: ${hostname}<br>User: ${username}</div>
      </div>
    </div>

    <!-- Uname -->
    <div class="card">
      <div class="hdr">Kernel</div>
      <div class="bd">
        ${!uname ? '<em>loading…</em>' : uname.error ? `<span class="err">${uname.error}</span>` :
          `<div class="mono">${uname.sysname} ${uname.release}<br>${uname.machine}<br>${uname.version}</div>`}
      </div>
    </div>

    <!-- Memory -->
    <div class="card">
      <div class="hdr">Memory</div>
      <div class="bd">
        ${!memory ? '<em>loading…</em>' : memory.error ? `<span class="err">${memory.error}</span>` :
          `<div class="mono">Total: ${(memory.total/1024/1024).toFixed(1)} MB<br>Available: ${(memory.available/1024/1024).toFixed(1)} MB<br>Used: ${memory.usedPercent} %</div>`}
      </div>
    </div>

    <!-- Uptime -->
    <div class="card">
      <div class="hdr">Uptime</div>
      <div class="bd">
        ${!uptime ? '<em>loading…</em>' : uptime.error ? `<span class="err">${uptime.error}</span>` :
          `<div class="mono">${Math.floor(uptime.seconds / 3600)}h ${Math.floor((uptime.seconds % 3600) / 60)}m</div>`}
      </div>
    </div>

    <!-- Disk -->
    <div class="card">
      <div class="hdr">Disk Usage (/)</div>
      <div class="bd">
        ${!diskInfo ? '<em>loading…</em>' : diskInfo.error ? `<span class="err">${diskInfo.error}</span>` :
          `<div class="mono">Total: ${(diskInfo.total/1024/1024/1024).toFixed(1)} GB<br>Used: ${diskInfo.usedPercent} %<br>Free: ${(diskInfo.free/1024/1024/1024).toFixed(1)} GB</div>`}
      </div>
    </div>`
}
