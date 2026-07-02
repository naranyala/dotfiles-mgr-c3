import { ReactiveComponent } from '../core/component.js'
import { signal, computed } from '../core/signals.js'
import { html, when } from '../core/template.js'
import { componentStyles } from '../shared/component-styles.js'

const styles = componentStyles(`
    .wizard { max-width: 600px; }
    .wizard-steps { display: flex; gap: 4px; margin-bottom: 1.5rem; }
    .step-indicator {
        flex: 1; height: 4px; border-radius: 2px;
        background: rgba(255,255,255,0.1); transition: background 0.3s;
    }
    .step-indicator.active { background: #6366f1; }
    .step-indicator.done { background: #10b981; }
    .step-title { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.5; margin-bottom: 0.5rem; }
    .step-content { min-height: 200px; }
    .step-content h3 { margin: 0 0 1rem; font-size: 1.1rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem; }
    .form-row.full { grid-template-columns: 1fr; }
    .field-group { display: flex; flex-direction: column; gap: 0.25rem; }
    .field-group label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.5; }
    .wizard-nav { display: flex; justify-content: space-between; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.06); }
    .review-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .review-table td { padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .review-table td:first-child { opacity: 0.5; width: 120px; }
    .success-msg { text-align: center; padding: 2rem; color: #10b981; }
    .success-msg h3 { margin: 0 0 0.5rem; }
`)

const STEPS = [
    { title: 'Personal', fields: ['firstName', 'lastName', 'email'] },
    { title: 'Address', fields: ['street', 'city', 'zip'] },
    { title: 'Preferences', fields: ['role', 'experience'] },
    { title: 'Review', fields: [] },
]

export class FormWizardComponent extends ReactiveComponent {
    static styles = styles

    constructor() {
        super()
        this.step = signal(0)
        this.formData = signal({
            firstName: '', lastName: '', email: '',
            street: '', city: '', zip: '',
            role: '', experience: '',
        })
        this.submitted = signal(false)
    }

    get currentStep() { return STEPS[this.step.value] }
    get isFirst() { return this.step.value === 0 }
    get isLast() { return this.step.value === STEPS.length - 1 }
    get isReview() { return this.step.value === STEPS.length - 1 }

    next() {
        if (this.step.value < STEPS.length - 1) this.step.value++
    }

    prev() {
        if (this.step.value > 0) this.step.value--
    }

    submit() {
        this.submitted.value = true
    }

    updateField(field, value) {
        this.formData.value = { ...this.formData.value, [field]: value }
    }

    renderField(key, label, type = 'text') {
        const val = this.formData.value[key] || ''
        return html`
            <div class="field-group">
                <label>${label}</label>
                <input type="${type}" :value="${val}"
                    @input=${e => this.updateField(key, e.target.value)} />
            </div>
        `
    }

    renderStep() {
        if (this.submitted.value) {
            return html`
                <div class="success-msg">
                    <h3>Submitted!</h3>
                    <p>Your form has been submitted successfully.</p>
                    <button class="btn btn-secondary btn-sm" @click=${() => { this.submitted.value = false; this.step.value = 0; this.formData.value = { firstName: '', lastName: '', email: '', street: '', city: '', zip: '', role: '', experience: '' } }}>Start Over</button>
                </div>
            `
        }

        const s = this.step.value
        const d = this.formData.value

        if (s === 0) {
            return html`
                <h3>Personal Information</h3>
                <div class="form-row">
                    ${this.renderField('firstName', 'First Name')}
                    ${this.renderField('lastName', 'Last Name')}
                </div>
                <div class="form-row full">
                    ${this.renderField('email', 'Email', 'email')}
                </div>
            `
        }
        if (s === 1) {
            return html`
                <h3>Address</h3>
                <div class="form-row full">
                    ${this.renderField('street', 'Street')}
                </div>
                <div class="form-row">
                    ${this.renderField('city', 'City')}
                    ${this.renderField('zip', 'ZIP Code')}
                </div>
            `
        }
        if (s === 2) {
            return html`
                <h3>Preferences</h3>
                <div class="form-row">
                    <div class="field-group">
                        <label>Role</label>
                        <select :value="${d.role}" @change=${e => this.updateField('role', e.target.value)}>
                            <option value="">Select...</option>
                            <option value="dev">Developer</option>
                            <option value="design">Designer</option>
                            <option value="pm">Product Manager</option>
                        </select>
                    </div>
                    <div class="field-group">
                        <label>Experience</label>
                        <select :value="${d.experience}" @change=${e => this.updateField('experience', e.target.value)}>
                            <option value="">Select...</option>
                            <option value="junior">Junior (0-2 years)</option>
                            <option value="mid">Mid (3-5 years)</option>
                            <option value="senior">Senior (5+ years)</option>
                        </select>
                    </div>
                </div>
            `
        }
        if (s === 3) {
            return html`
                <h3>Review</h3>
                <table class="review-table">
                    <tr><td>First Name</td><td>${d.firstName || '—'}</td></tr>
                    <tr><td>Last Name</td><td>${d.lastName || '—'}</td></tr>
                    <tr><td>Email</td><td>${d.email || '—'}</td></tr>
                    <tr><td>Street</td><td>${d.street || '—'}</td></tr>
                    <tr><td>City</td><td>${d.city || '—'}</td></tr>
                    <tr><td>ZIP</td><td>${d.zip || '—'}</td></tr>
                    <tr><td>Role</td><td>${d.role || '—'}</td></tr>
                    <tr><td>Experience</td><td>${d.experience || '—'}</td></tr>
                </table>
            `
        }
    }

    render() {
        return html`
            <div class="wizard">
                <div class="wizard-steps">
                    ${STEPS.map((s, i) => html`
                        <div class="step-indicator ${i === this.step.value ? 'active' : ''} ${i < this.step.value ? 'done' : ''}"></div>
                    `)}
                </div>
                <div class="step-title">Step ${this.step.value + 1} of ${STEPS.length}: ${this.currentStep.title}</div>
                <div class="step-content">${this.renderStep()}</div>
                ${!this.submitted.value ? html`
                    <div class="wizard-nav">
                        <button class="btn btn-secondary" @click=${() => this.prev()} ${this.isFirst ? 'disabled' : ''}>Back</button>
                        ${this.isReview
                            ? html`<button class="btn btn-primary" @click=${() => this.submit()}>Submit</button>`
                            : html`<button class="btn btn-primary" @click=${() => this.next()}>Next</button>`
                        }
                    </div>
                ` : ''}
            </div>
        `
    }
}
