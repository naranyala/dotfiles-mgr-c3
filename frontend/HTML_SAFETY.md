# Frontend HTML Safety Validation

This document explains the HTML safety validation utilities available in the frontend to prevent rendering issues.

## Overview

The `html-safe.js` module provides utilities to safely handle HTML rendering by:
- Escaping special characters in user/dynamic content
- Validating data before rendering
- Preventing attribute breakage from unescaped quotes
- Sanitizing potentially malicious content

## Core Functions

### 1. `escapeHtml(str)` - Escape HTML Content
Escapes all HTML special characters, suitable for text content.

```javascript
import { escapeHtml } from '../../shared/html-safe.js'

const userInput = 'Hello <script>alert("xss")</script>'
const safe = escapeHtml(userInput)
// Result: "Hello &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
```

**Use case**: Rendering user-provided text, command output, etc.

### 2. `escapeAttr(str)` - Escape Attribute Values
Escapes quotes specifically for use in HTML attributes.

```javascript
import { escapeAttr } from '../../shared/html-safe.js'

const cmd = 'docker ps --format "table {{.Names}}"'
const safe = escapeAttr(cmd)
// Result: 'docker ps --format &quot;table {{.Names}}&quot;'
// Usage: <button data-run-cmd="${safe}">
```

**Use case**: Building data attributes like `data-run-cmd`, `data-value`, etc.

### 3. `renderCommandButton(cmd, label, icon, extraStyles)` - Render Safe Button
Renders a complete button element with proper escaping.

```javascript
import { renderCommandButton } from '../../shared/html-safe.js'

const html = renderCommandButton(
  'docker ps --format "table {{.Names}}"',
  'docker ps',
  '⊞'
)
// Returns fully escaped and safe HTML button
```

**Use case**: Building command preset buttons or similar UI elements.

### 4. `validateHtmlSafety(str)` - Validate String Safety
Validates whether a string is safe for HTML rendering.

```javascript
import { validateHtmlSafety } from '../../shared/html-safe.js'

const result = validateHtmlSafety('normal text')
// { valid: true }

const result2 = validateHtmlSafety('text "with" quotes')
// { valid: false, error: 'Unescaped quotes detected...' }
```

**Use case**: Pre-validation before rendering in development/debugging.

### 5. `sanitizeInput(input)` - Remove Dangerous Content
Removes script tags, event handlers, and escapes remaining HTML.

```javascript
import { sanitizeInput } from '../../shared/html-safe.js'

const dirty = 'Click <button onclick="alert()">here</button>'
const clean = sanitizeInput(dirty)
// Removes script/onclick, escapes remaining HTML
```

**Use case**: Processing user input from forms/textareas.

### 6. `safeDataAttr(value)` - Safe Data Attribute
Validates and escapes values for data attributes, returning empty string if unsafe.

```javascript
import { safeDataAttr } from '../../shared/html-safe.js'

const value = safeDataAttr(userProvidedString)
// Returns escaped value or empty string if validation fails
// Usage: <div data-value="${value}">
```

**Use case**: Building data attributes with optional content.

### 7. `validateStyles(...styles)` - Validate CSS
Validates and concatenates CSS styles, preventing injection.

```javascript
import { validateStyles } from '../../shared/html-safe.js'

const styles = validateStyles(
  'color: red',
  'font-size: 12px',
  'expression: alert()' // This will be filtered out
)
```

**Use case**: Dynamically building inline styles safely.

## Common Patterns

### Pattern 1: Rendering Dynamic Lists
```javascript
import { escapeHtml } from '../../shared/html-safe.js'

const items = state.history.map(h =>
  `<span title="${escapeHtml(h.cmd)}">${escapeHtml(h.cmd)}</span>`
).join('')
```

### Pattern 2: Building Buttons with Commands
```javascript
import { renderCommandButton } from '../../shared/html-safe.js'

const buttons = commands.map(cmd =>
  renderCommandButton(cmd.command, cmd.label, cmd.icon)
).join('')
```

### Pattern 3: Displaying User Output
```javascript
import { escapeHtml } from '../../shared/html-safe.js'

function render() {
  return html`
    <pre>${state.running ? 'Running…' : escapeHtml(state.output)}</pre>
  `
}
```

### Pattern 4: Form Input Sanitization
```javascript
import { sanitizeInput } from '../../shared/html-safe.js'

const userText = document.querySelector('#input').value
const safe = sanitizeInput(userText)
state.content = safe
```

## Common Issues Prevented

### Issue 1: Unescaped Quotes in Attributes
❌ **Before**:
```javascript
`<button data-cmd="${cmd}">` // cmd contains quotes → broken HTML
```

✅ **After**:
```javascript
import { renderCommandButton } from '../../shared/html-safe.js'
renderCommandButton(cmd, label, icon) // Automatically escapes
```

### Issue 2: Command Output Injection
❌ **Before**:
```javascript
`<pre>${commandOutput}</pre>` // Output might contain HTML
```

✅ **After**:
```javascript
import { escapeHtml } from '../../shared/html-safe.js'
`<pre>${escapeHtml(commandOutput)}</pre>`
```

### Issue 3: Cross-Site Scripting (XSS)
❌ **Before**:
```javascript
state.userMessage = userInput // Might contain <script> tags
```

✅ **After**:
```javascript
import { sanitizeInput } from '../../shared/html-safe.js'
state.userMessage = sanitizeInput(userInput)
```

## Best Practices

1. **Always escape dynamic content**: Never trust user input or dynamic data
   ```javascript
   // ❌ BAD
   `<div>${value}</div>`
   
   // ✅ GOOD
   `<div>${escapeHtml(value)}</div>`
   ```

2. **Use attribute-specific escaping for data attributes**:
   ```javascript
   // For attributes, use escapeAttr instead of escapeHtml
   `<button data-value="${escapeAttr(value)}">`
   ```

3. **Validate user input early**:
   ```javascript
   import { validateHtmlSafety } from '../../shared/html-safe.js'
   if (!validateHtmlSafety(userInput).valid) {
     console.warn('Unsafe input detected')
   }
   ```

4. **Use helper functions for repetitive patterns**:
   ```javascript
   // Instead of manually escaping in every button render,
   // use renderCommandButton helper
   renderCommandButton(cmd, label, icon)
   ```

5. **Sanitize before storing user content**:
   ```javascript
   import { sanitizeInput } from '../../shared/html-safe.js'
   state.userContent = sanitizeInput(rawInput)
   ```

## Testing Your Validation

Test with problematic inputs:

```javascript
import { escapeHtml, escapeAttr, validateHtmlSafety } from '../../shared/html-safe.js'

// Test cases
const testCases = [
  'normal text',
  'text with "quotes"',
  "text with 'apostrophes'",
  '<script>alert("xss")</script>',
  'onclick="malicious()"',
  'text with & ampersand'
]

testCases.forEach(test => {
  console.log({
    input: test,
    escaped: escapeHtml(test),
    valid: validateHtmlSafety(test)
  })
})
```

## Performance Notes

- Escaping functions are lightweight (simple string replacements)
- Safe to call on every render
- No external dependencies
- Minimal performance impact

## Migration Guide

If you have existing code with manual escaping:

```javascript
// ❌ OLD: Manual replace
const safe = cmd.replace(/"/g, '&quot;')

// ✅ NEW: Use utility function
import { escapeAttr } from '../../shared/html-safe.js'
const safe = escapeAttr(cmd)

// ✅ BETTER: Use specialized function
import { renderCommandButton } from '../../shared/html-safe.js'
const html = renderCommandButton(cmd, label, icon)
```
