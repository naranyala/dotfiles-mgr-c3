export const TaskStatus = {
	PENDING: 'pending',
	ERROR: 'error',
	COMPLETE: 'complete',
}

export class Task {
	constructor(host, config) {
		this._host = host
		this._config = config
		this._status = TaskStatus.PENDING
		this._value = undefined
		this._error = undefined
		this._promise = undefined
		this._runId = 0
		this._autoRun = config.autoRun !== false

		host.addController(this)

		if (this._autoRun) {
			queueMicrotask(() => this._run())
		}
	}

	get status() { return this._status }
	get value() { return this._value }
	get error() { return this._error }
	get promise() { return this._promise }

	hostConnected() {
		if (this._autoRun && this._status === TaskStatus.PENDING) {
			this._run()
		}
	}

	hostDisconnected() {}

	async _run() {
		const id = ++this._runId
		const args = this._config.args ? this._config.args() : []

		try {
			this._status = TaskStatus.PENDING
			this._host.requestUpdate?.()

			const result = this._config.task(args)
			this._promise = result instanceof Promise ? result : Promise.resolve(result)
			this._value = await this._promise

			if (id !== this._runId) return

			this._status = TaskStatus.COMPLETE
			this._host.requestUpdate?.()
		} catch (e) {
			if (id !== this._runId) return

			this._error = e
			this._status = TaskStatus.ERROR
			this._host.requestUpdate?.()
		}
	}

	run(...args) {
		if (this._config.run) {
			this._config.run(this, ...args)
		} else {
			this._run()
		}
	}

	render(renderers) {
		switch (this._status) {
			case TaskStatus.PENDING:
				return renderers.pending ? renderers.pending() : ''
			case TaskStatus.ERROR:
				return renderers.error ? renderers.error(this._error) : ''
			case TaskStatus.COMPLETE:
				return renderers.complete ? renderers.complete(this._value) : ''
			default:
				return ''
		}
	}

	throwOnError(shouldThrow = true) {
		this._shouldThrow = shouldThrow
		return this
	}
}

export function asyncAppend(host, asyncIterable, template) {
	return new AsyncAppendDirective(host, asyncIterable, template)
}

class AsyncAppendDirective {
	constructor(host, asyncIterable, template) {
		this._host = host
		this._asyncIterable = asyncIterable
		this._template = template
		this._values = []
		this._done = false

		host.addController(this)
		this._start()
	}

	async _start() {
		for await (const value of this._asyncIterable) {
			this._values.push(value)
			this._host.requestUpdate?.()
		}
		this._done = true
		this._host.requestUpdate?.()
	}

	hostConnected() {}
	hostDisconnected() { this._done = true }
}
