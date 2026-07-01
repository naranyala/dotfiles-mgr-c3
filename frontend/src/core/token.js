export class DesignToken {
	constructor(name) {
		this.name = name.startsWith('--') ? name : `--${name}`
		this._defaultValue = ''
	}
	
	static create(name) {
		return new DesignToken(name)
	}
	
	withDefault(val) {
		this._defaultValue = val
		return this
	}
	
	setValueFor(element, val) {
		element.style.setProperty(this.name, val)
	}
	
	getValueFor(element) {
		return getComputedStyle(element).getPropertyValue(this.name) || this._defaultValue
	}
	
	toString() {
		return `var(${this.name}, ${this._defaultValue})`
	}
}
