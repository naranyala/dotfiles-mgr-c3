import { createEffect } from './signals.js';

export class ReactiveElement extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        createEffect(() => {
            this.root.innerHTML = this.render();
            this.setupEvents();
        });
    }

    render() {
        return '';
    }
    
    // Override this to attach event listeners to elements inside the shadow DOM
    setupEvents() {}
}
