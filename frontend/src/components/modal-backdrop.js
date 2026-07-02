import { ReactiveComponent } from '../core/component.js'
import { signal } from '../core/signals.js'
import { html, when } from '../core/template.js'
import { componentStyles } from '../shared/component-styles.js'

const styles = componentStyles(`
    .modal-demo { display: flex; flex-direction: column; gap: 1rem; }
    .trigger-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .modal-backdrop {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6);
        backdrop-filter: blur(4px); z-index: 999;
        display: flex; align-items: center; justify-content: center;
        opacity: 0; pointer-events: none;
        transition: opacity 0.2s ease;
    }
    .modal-backdrop.open { opacity: 1; pointer-events: auto; }
    .modal-panel {
        background: #1e293b; border: 1px solid rgba(255,255,255,0.1);
        border-radius: 16px; width: 90%; max-width: 480px;
        transform: scale(0.95) translateY(10px);
        transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .modal-backdrop.open .modal-panel { transform: scale(1) translateY(0); }
    .modal-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .modal-header h3 { margin: 0; font-size: 1.1rem; }
    .modal-close {
        background: rgba(255,255,255,0.05); border: none; color: #94a3b8;
        width: 32px; height: 32px; border-radius: 8px; cursor: pointer;
        font-size: 1.1rem; display: flex; align-items: center; justify-content: center;
    }
    .modal-close:hover { background: rgba(239,68,68,0.15); color: #f87171; }
    .modal-body { padding: 1.5rem; font-size: 0.9rem; line-height: 1.6; color: #cbd5e1; }
    .modal-body p { margin: 0 0 0.75rem; }
    .modal-footer {
        display: flex; justify-content: flex-end; gap: 0.5rem;
        padding: 1rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.06);
    }
    .confirm-content { text-align: center; padding: 0.5rem 0; }
    .confirm-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
    .confirm-content p { color: #94a3b8; }
    .form-content .field-group { margin-bottom: 0.75rem; }
    .form-content label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.5; display: block; margin-bottom: 0.25rem; }
    .form-content input, .form-content textarea {
        width: 100%; background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.12);
        color: #f8fafc; padding: 0.5rem 0.75rem; border-radius: 8px; font-size: 0.85rem;
        font-family: inherit; box-sizing: border-box;
    }
    .form-content input:focus, .form-content textarea:focus { outline: none; border-color: rgba(99,102,241,0.5); }
    .form-content textarea { min-height: 80px; resize: vertical; }
`)

export class ModalBackdropComponent extends ReactiveComponent {
    static styles = styles

    constructor() {
        super()
        this.open = signal(false)
        this.modalType = signal('info')
        this.modalTitle = signal('')
        this.formName = signal('')
        this.formEmail = signal('')
        this.formMessage = signal('')
        this.confirmed = signal(false)
    }

    showInfo() {
        this.modalType.value = 'info'
        this.modalTitle.value = 'Information'
        this.open.value = true
    }

    showConfirm() {
        this.modalType.value = 'confirm'
        this.modalTitle.value = 'Confirm Action'
        this.confirmed.value = false
        this.open.value = true
    }

    showForm() {
        this.modalType.value = 'form'
        this.modalTitle.value = 'Contact Form'
        this.formName.value = ''
        this.formEmail.value = ''
        this.formMessage.value = ''
        this.open.value = true
    }

    close() {
        this.open.value = false
    }

    confirm() {
        this.confirmed.value = true
        setTimeout(() => this.close(), 800)
    }

    submitForm() {
        this.close()
    }

    renderBody() {
        if (this.modalType.value === 'info') {
            return html`
                <div class="modal-body">
                    <p>This is a modal dialog with a backdrop overlay. It demonstrates:</p>
                    <p>• Backdrop blur effect<br>• Scale + translate entrance animation<br>• Click outside to close<br>• Multiple modal variants (info, confirm, form)</p>
                    <p>Components are built using the new framework lifecycle hooks and two-way binding.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" @click=${() => this.close()}>Got it</button>
                </div>
            `
        }
        if (this.modalType.value === 'confirm') {
            return html`
                <div class="modal-body">
                    ${this.confirmed.value
                        ? html`<div class="confirm-content"><div class="confirm-icon">✅</div><p>Action confirmed!</p></div>`
                        : html`<div class="confirm-content"><div class="confirm-icon">⚠️</div><p>Are you sure you want to proceed?</p></div>`
                    }
                </div>
                ${!this.confirmed.value ? html`
                    <div class="modal-footer">
                        <button class="btn btn-secondary" @click=${() => this.close()}>Cancel</button>
                        <button class="btn btn-danger" @click=${() => this.confirm()}>Confirm</button>
                    </div>
                ` : ''}
            `
        }
        if (this.modalType.value === 'form') {
            return html`
                <div class="modal-body form-content">
                    <div class="field-group">
                        <label>Name</label>
                        <input type="text" :value="${this.formName}" @input=${e => this.formName.value = e.target.value} placeholder="Your name" />
                    </div>
                    <div class="field-group">
                        <label>Email</label>
                        <input type="email" :value="${this.formEmail}" @input=${e => this.formEmail.value = e.target.value} placeholder="you@example.com" />
                    </div>
                    <div class="field-group">
                        <label>Message</label>
                        <textarea :value="${this.formMessage}" @input=${e => this.formMessage.value = e.target.value} placeholder="Write something..."></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" @click=${() => this.close()}>Cancel</button>
                    <button class="btn btn-primary" @click=${() => this.submitForm()} ${!this.formName.value || !this.formEmail.value ? 'disabled' : ''}>Send</button>
                </div>
            `
        }
    }

    render() {
        return html`
            <div class="modal-demo">
                <div class="trigger-row">
                    <button class="btn btn-primary btn-sm" @click=${() => this.showInfo()}>Info Modal</button>
                    <button class="btn btn-danger btn-sm" @click=${() => this.showConfirm()}>Confirm Modal</button>
                    <button class="btn btn-secondary btn-sm" @click=${() => this.showForm()}>Form Modal</button>
                </div>
                <div class="modal-backdrop ${this.open.value ? 'open' : ''}" @click=${() => this.close()}>
                    <div class="modal-panel" @click=${e => e.stopPropagation()}>
                        <div class="modal-header">
                            <h3>${this.modalTitle.value}</h3>
                            <button class="modal-close" @click=${() => this.close()}>✕</button>
                        </div>
                        ${this.renderBody()}
                    </div>
                </div>
            </div>
        `
    }
}
