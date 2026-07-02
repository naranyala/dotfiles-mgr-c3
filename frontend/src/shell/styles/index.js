import { base } from './base.js'
import { nav } from './nav.js'
import { home } from './home.js'
import { panels } from './panels.js'

export const styles = base + nav + home + panels

export const standaloneStyles = `
  :host {
    display: block;
    width: 100%;
    height: 100%;
    font-family: 'Inter', system-ui, sans-serif;
    color: #f8fafc;
    box-sizing: border-box;
  }
`
