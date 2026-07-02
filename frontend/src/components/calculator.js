import { ReactiveComponent } from '../core/component.js'
import { signal, computed } from '../core/signals.js'
import { html } from '../core/template.js'
import { componentStyles } from '../shared/component-styles.js'

const styles = componentStyles(`
    .calc { max-width: 320px; }
    .calc-display {
        background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px; padding: 1.25rem; text-align: right;
        margin-bottom: 1rem; min-height: 80px;
        display: flex; flex-direction: column; justify-content: flex-end;
    }
    .calc-expr { font-size: 0.85rem; color: #64748b; min-height: 1.2em; word-break: break-all; }
    .calc-result { font-size: 2rem; font-weight: 700; color: #f8fafc; word-break: break-all; }
    .calc-grid {
        display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
    }
    .calc-btn {
        padding: 0.9rem; border-radius: 10px; border: none;
        font-size: 1.1rem; font-weight: 500; cursor: pointer;
        transition: all 0.1s;
    }
    .calc-btn:active { transform: scale(0.95); }
    .calc-num { background: rgba(255,255,255,0.06); color: #f8fafc; }
    .calc-num:hover { background: rgba(255,255,255,0.1); }
    .calc-op { background: rgba(99,102,241,0.15); color: #a5b4fc; }
    .calc-op:hover { background: rgba(99,102,241,0.25); }
    .calc-fn { background: rgba(239,68,68,0.12); color: #f87171; }
    .calc-fn:hover { background: rgba(239,68,68,0.2); }
    .calc-eq { background: #6366f1; color: white; grid-column: span 2; }
    .calc-eq:hover { background: #4f46e5; }
    .calc-zero { grid-column: span 2; }
`)

export class CalculatorComponent extends ReactiveComponent {
    static styles = styles

    constructor() {
        super()
        this.display = signal('0')
        this.expression = signal('')
        this.lastOp = signal(null)
        this.resetNext = signal(false)
    }

    inputDigit(d) {
        if (this.resetNext.value) {
            this.display.value = d
            this.resetNext.value = false
        } else {
            this.display.value = this.display.value === '0' ? d : this.display.value + d
        }
    }

    inputDot() {
        if (this.resetNext.value) {
            this.display.value = '0.'
            this.resetNext.value = false
            return
        }
        if (!this.display.value.includes('.')) {
            this.display.value += '.'
        }
    }

    inputOp(op) {
        const val = parseFloat(this.display.value)
        if (this.lastOp.value && !this.resetNext.value) {
            this.calculate()
        }
        this.expression.value = `${this.display.value} ${op}`
        this.lastOp.value = op
        this.resetNext.value = true
    }

    calculate() {
        if (!this.lastOp.value) return
        const parts = this.expression.value.split(' ')
        const prev = parseFloat(parts[0])
        const curr = parseFloat(this.display.value)
        const op = this.lastOp.value
        let result = 0

        if (op === '+') result = prev + curr
        else if (op === '−') result = prev - curr
        else if (op === '×') result = prev * curr
        else if (op === '÷') result = curr !== 0 ? prev / curr : 'Error'

        this.expression.value = `${this.expression.value} ${this.display.value} =`
        this.display.value = String(result)
        this.lastOp.value = null
        this.resetNext.value = true
    }

    clear() {
        this.display.value = '0'
        this.expression.value = ''
        this.lastOp.value = null
        this.resetNext.value = false
    }

    clearEntry() {
        this.display.value = '0'
    }

    percent() {
        this.display.value = String(parseFloat(this.display.value) / 100)
    }

    negate() {
        const v = parseFloat(this.display.value)
        this.display.value = String(-v)
    }

    render() {
        return html`
            <div class="calc">
                <div class="calc-display">
                    <div class="calc-expr">${this.expression.value}</div>
                    <div class="calc-result">${this.display.value}</div>
                </div>
                <div class="calc-grid">
                    <button class="calc-btn calc-fn" @click="${() => this.clear()}">AC</button>
                    <button class="calc-btn calc-fn" @click="${() => this.clearEntry()}">CE</button>
                    <button class="calc-btn calc-fn" @click="${() => this.percent()}">%</button>
                    <button class="calc-btn calc-op" @click="${() => this.inputOp('÷')}">÷</button>

                    <button class="calc-btn calc-num" @click="${() => this.inputDigit('7')}">7</button>
                    <button class="calc-btn calc-num" @click="${() => this.inputDigit('8')}">8</button>
                    <button class="calc-btn calc-num" @click="${() => this.inputDigit('9')}">9</button>
                    <button class="calc-btn calc-op" @click="${() => this.inputOp('×')}">×</button>

                    <button class="calc-btn calc-num" @click="${() => this.inputDigit('4')}">4</button>
                    <button class="calc-btn calc-num" @click="${() => this.inputDigit('5')}">5</button>
                    <button class="calc-btn calc-num" @click="${() => this.inputDigit('6')}">6</button>
                    <button class="calc-btn calc-op" @click="${() => this.inputOp('−')}">−</button>

                    <button class="calc-btn calc-num" @click="${() => this.inputDigit('1')}">1</button>
                    <button class="calc-btn calc-num" @click="${() => this.inputDigit('2')}">2</button>
                    <button class="calc-btn calc-num" @click="${() => this.inputDigit('3')}">3</button>
                    <button class="calc-btn calc-op" @click="${() => this.inputOp('+')}">+</button>

                    <button class="calc-btn calc-num calc-zero" @click="${() => this.inputDigit('0')}">0</button>
                    <button class="calc-btn calc-num" @click="${() => this.inputDot()}">.</button>
                    <button class="calc-btn calc-eq" @click="${() => this.calculate()}">=</button>
                </div>
            </div>
        `
    }
}
