import { describe, it, expect, beforeEach } from 'bun:test'
import { Task, TaskStatus, asyncAppend } from '../core/task.js'

function createMockHost() {
	return {
		_controllers: new Set(),
		_updates: 0,
		addController(c) { this._controllers.add(c) },
		removeController(c) { this._controllers.delete(c) },
		requestUpdate() { this._updates++ },
	}
}

describe('TaskStatus', () => {
	it('should have PENDING status', () => {
		expect(TaskStatus.PENDING).toBe('pending')
	})

	it('should have ERROR status', () => {
		expect(TaskStatus.ERROR).toBe('error')
	})

	it('should have COMPLETE status', () => {
		expect(TaskStatus.COMPLETE).toBe('complete')
	})
})

describe('Task', () => {
	it('should initialize with PENDING status', () => {
		const host = createMockHost()
		const task = new Task(host, { task: () => 'result', autoRun: false })
		expect(task.status).toBe(TaskStatus.PENDING)
		expect(task.value).toBeUndefined()
		expect(task.error).toBeUndefined()
	})

	it('should auto-run task when autoRun is not false', async () => {
		const host = createMockHost()
		const task = new Task(host, { task: () => 'auto-result' })
		await new Promise(r => setTimeout(r, 10))
		expect(task.status).toBe(TaskStatus.COMPLETE)
		expect(task.value).toBe('auto-result')
	})

	it('should not auto-run when autoRun is false', () => {
		const host = createMockHost()
		const task = new Task(host, { task: () => 'result', autoRun: false })
		expect(task.status).toBe(TaskStatus.PENDING)
	})

	it('should complete with sync result', async () => {
		const host = createMockHost()
		const task = new Task(host, { task: () => 42, autoRun: false })
		task.run()
		await new Promise(r => setTimeout(r, 10))
		expect(task.status).toBe(TaskStatus.COMPLETE)
		expect(task.value).toBe(42)
	})

	it('should complete with async result', async () => {
		const host = createMockHost()
		const task = new Task(host, {
			task: async () => {
				await new Promise(r => setTimeout(r, 5))
				return 'async-result'
			},
			autoRun: false,
		})
		task.run()
		await new Promise(r => setTimeout(r, 20))
		expect(task.status).toBe(TaskStatus.COMPLETE)
		expect(task.value).toBe('async-result')
	})

	it('should handle task errors', async () => {
		const host = createMockHost()
		const task = new Task(host, {
			task: () => { throw new Error('task failed') },
			autoRun: false,
		})
		task.run()
		await new Promise(r => setTimeout(r, 10))
		expect(task.status).toBe(TaskStatus.ERROR)
		expect(task.error).toBeInstanceOf(Error)
		expect(task.error.message).toBe('task failed')
	})

	it('should handle async task errors', async () => {
		const host = createMockHost()
		const task = new Task(host, {
			task: async () => { throw new Error('async failed') },
			autoRun: false,
		})
		task.run()
		await new Promise(r => setTimeout(r, 10))
		expect(task.status).toBe(TaskStatus.ERROR)
		expect(task.error.message).toBe('async failed')
	})

	it('should call requestUpdate on status changes', async () => {
		const host = createMockHost()
		const task = new Task(host, { task: () => 'x', autoRun: false })
		expect(host._updates).toBe(0)
		task.run()
		await new Promise(r => setTimeout(r, 10))
		expect(host._updates).toBeGreaterThanOrEqual(2)
	})

	it('should render pending state', () => {
		const host = createMockHost()
		const task = new Task(host, { task: () => 'x', autoRun: false })
		const result = task.render({
			pending: () => 'loading',
			complete: (v) => `done: ${v}`,
			error: (e) => `err: ${e.message}`,
		})
		expect(result).toBe('loading')
	})

	it('should render complete state', async () => {
		const host = createMockHost()
		const task = new Task(host, { task: () => 'hello', autoRun: false })
		task.run()
		await new Promise(r => setTimeout(r, 10))
		const result = task.render({
			pending: () => 'loading',
			complete: (v) => `done: ${v}`,
			error: (e) => `err: ${e.message}`,
		})
		expect(result).toBe('done: hello')
	})

	it('should render error state', async () => {
		const host = createMockHost()
		const task = new Task(host, {
			task: () => { throw new Error('oops') },
			autoRun: false,
		})
		task.run()
		await new Promise(r => setTimeout(r, 10))
		const result = task.render({
			pending: () => 'loading',
			complete: (v) => `done: ${v}`,
			error: (e) => `err: ${e.message}`,
		})
		expect(result).toBe('err: oops')
	})

	it('should return empty string for missing renderer', () => {
		const host = createMockHost()
		const task = new Task(host, { task: () => 'x', autoRun: false })
		expect(task.render({})).toBe('')
	})

	it('should support throwOnError', () => {
		const host = createMockHost()
		const task = new Task(host, { task: () => 'x', autoRun: false })
		const returned = task.throwOnError()
		expect(returned).toBe(task)
		expect(task._shouldThrow).toBe(true)
	})

	it('should pass args to task function', async () => {
		const host = createMockHost()
		const task = new Task(host, {
			args: () => ['a', 'b'],
			task: (args) => args.join('+'),
			autoRun: false,
		})
		task.run()
		await new Promise(r => setTimeout(r, 10))
		expect(task.value).toBe('a+b')
	})

	it('should register as controller on host', () => {
		const host = createMockHost()
		const task = new Task(host, { task: () => 'x', autoRun: false })
		expect(host._controllers.has(task)).toBe(true)
	})

	it('should store promise', async () => {
		const host = createMockHost()
		const task = new Task(host, { task: () => 'val', autoRun: false })
		task.run()
		expect(task.promise).toBeInstanceOf(Promise)
		await task.promise
	})
})

describe('asyncAppend', () => {
	it('should create an AsyncAppendDirective', async () => {
		const host = createMockHost()
		async function* gen() { yield 1; yield 2; yield 3 }
		const directive = asyncAppend(host, gen(), (v) => String(v))
		expect(directive._values).toEqual([])
		expect(directive._done).toBe(false)
		await new Promise(r => setTimeout(r, 20))
		expect(directive._values).toEqual([1, 2, 3])
		expect(directive._done).toBe(true)
	})

	it('should register as controller on host', () => {
		const host = createMockHost()
		async function* gen() { yield 1 }
		asyncAppend(host, gen(), (v) => String(v))
		expect(host._controllers.size).toBe(1)
	})

	it('should call requestUpdate on each yield', async () => {
		const host = createMockHost()
		async function* gen() { yield 'a'; yield 'b' }
		asyncAppend(host, gen(), (v) => v)
		await new Promise(r => setTimeout(r, 20))
		expect(host._updates).toBeGreaterThanOrEqual(3)
	})

	it('should stop on disconnect', async () => {
		const host = createMockHost()
		async function* gen() {
			yield 1
			await new Promise(r => setTimeout(r, 100))
			yield 2
		}
		const directive = asyncAppend(host, gen(), (v) => v)
		await new Promise(r => setTimeout(r, 5))
		const ctrl = [...host._controllers][0]
		ctrl.hostDisconnected()
		expect(directive._done).toBe(true)
	})
})
