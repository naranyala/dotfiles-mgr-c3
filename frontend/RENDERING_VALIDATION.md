# Frontend Rendering Validation Checklist

## Overview
This checklist helps ensure all frontend components follow HTML safety best practices.

---

## Core Principles ✓

- [ ] **Never render user input directly** - Always use `escapeHtml()` or appropriate escaper
- [ ] **Always escape data attributes** - Use `escapeAttr()` for `data-*` attributes
- [ ] **Validate before rendering** - Use `validateHtmlSafety()` in development
- [ ] **Sanitize form input** - Use `sanitizeInput()` before storing
- [ ] **Use specialized helpers** - Use `renderCommandButton()` instead of manual HTML concatenation

---

## Dynamic Content ✓

### User-Provided Text
```javascript
// ❌ WRONG
return `<div>${userText}</div>`

// ✅ CORRECT
import { escapeHtml } from '../../shared'
return `<div>${escapeHtml(userText)}</div>`
```

### Command Output
```javascript
// ❌ WRONG
return `<pre>${commandOutput}</pre>`

// ✅ CORRECT
import { escapeHtml } from '../../shared'
return `<pre>${escapeHtml(commandOutput)}</pre>`
```

### Data Attributes
```javascript
// ❌ WRONG
`<button data-cmd="${cmd}">Click</button>`

// ✅ CORRECT - For simple data attributes
import { escapeAttr } from '../../shared'
`<button data-cmd="${escapeAttr(cmd)}">Click</button>`

// ✅ BETTER - For command buttons
import { renderCommandButton } from '../../shared'
renderCommandButton(cmd, label, icon)
```

---

## Common Rendering Patterns

### Pattern: Rendering Lists
```javascript
// ❌ WRONG
const items = state.items.map(item => `<li>${item.name}</li>`).join('')

// ✅ CORRECT
import { escapeHtml } from '../../shared'
const items = state.items.map(item => 
  `<li>${escapeHtml(item.name)}</li>`
).join('')

// ✅ BETTER - Use helper
import { renderList } from '../../shared'
const items = renderList(state.items, item =>
  `<li>${escapeHtml(item.name)}</li>`
)
```

### Pattern: Rendering Tables
```javascript
// ✅ CORRECT
import { renderTableRows } from '../../shared'
const rows = renderTableRows(data, [
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status', format: s => s.toUpperCase() }
])
```

### Pattern: Error Messages
```javascript
// ❌ WRONG
return `<div style="color:red">${errorMsg}</div>`

// ✅ CORRECT
import { renderError } from '../../shared'
return renderError(errorMsg, errorCode)
```

### Pattern: Success/Warning Messages
```javascript
// ✅ CORRECT
import { renderSuccess, renderWarning } from '../../shared'
return state.showSuccess 
  ? renderSuccess('Operation completed')
  : renderWarning('This action cannot be undone')
```

### Pattern: Code Display
```javascript
// ✅ CORRECT
import { renderCode } from '../../shared'
return renderCode(scriptContent, 'bash')
```

### Pattern: Key-Value Display
```javascript
// ✅ CORRECT
import { renderKeyValue } from '../../shared'
return renderKeyValue(systemInfo)
```

---

## Form Input Handling ✓

### Input Validation
```javascript
// When receiving user input
import { sanitizeInput, validateHtmlSafety } from '../../shared'

const userInput = inputElement.value
const validation = validateHtmlSafety(userInput)

if (!validation.valid) {
  console.warn('Invalid input:', validation.error)
  return
}

// Store sanitized version
state.userContent = sanitizeInput(userInput)
```

### File Upload Handling
```javascript
// Don't display file contents directly
import { renderError } from '../../shared'
try {
  const content = await file.text()
  // Always sanitize before use
  state.fileContent = sanitizeInput(content)
} catch (e) {
  return renderError(e.message)
}
```

---

## API Response Handling ✓

### Rendering API Data
```javascript
// ❌ WRONG
const data = await api.getData()
return `<div>${data.description}</div>`

// ✅ CORRECT
import { escapeHtml } from '../../shared'
const data = await api.getData()
return `<div>${escapeHtml(data.description)}</div>`
```

### Handling Errors from API
```javascript
// ✅ CORRECT
import { renderError } from '../../shared'
try {
  const result = await api.call()
} catch (e) {
  return renderError(e.message || 'API Error', e.code)
}
```

---

## Styling Safety ✓

### Dynamic Styles
```javascript
// ❌ WRONG
const styles = userColor + '; expression: alert()'

// ✅ CORRECT
import { validateStyles } from '../../shared'
const styles = validateStyles(`color: ${userColor}`)
```

### Inline Styles
```javascript
// ✅ CORRECT - Keep styles safe
const button = `<button style="color:red;padding:10px">${label}</button>`

// ✅ BETTER - Use CSS classes instead of inline styles
// Define classes in your CSS and use class attribute
```

---

## Component Rendering Checklist

For each component, verify:

- [ ] All user input is escaped with `escapeHtml()`
- [ ] All data attributes use `escapeAttr()`
- [ ] Error messages use `renderError()` or similar helpers
- [ ] List items are rendered with `renderList()` or escaped individually
- [ ] Table data uses `renderTableRows()` or is escaped
- [ ] Code blocks use `renderCode()`
- [ ] No hardcoded user data in templates
- [ ] Form inputs are validated with `validateHtmlSafety()`
- [ ] Sensitive output (logs, traces) is sanitized
- [ ] CSS inline styles don't include user data
- [ ] No `innerHTML` assignments with user data
- [ ] No dynamic `eval()` or `Function()` constructor with user data

---

## Testing Your Component

### Test Cases to Use
```javascript
const testCases = [
  // Basic cases
  { input: 'normal text', expected: 'normal text' },
  
  // Special HTML characters
  { input: '<script>', expected: '&lt;script&gt;' },
  { input: '& ampersand', expected: '&amp; ampersand' },
  
  // Quotes
  { input: 'text "with" quotes', expected: 'text &quot;with&quot; quotes' },
  { input: "text 'with' apostrophes", expected: "text &#39;with&#39; apostrophes" },
  
  // Combined
  { input: '<img src=x onerror="alert()">', expected: '&lt;img src=x onerror=&quot;alert()&quot;&gt;' },
  
  // Real command with quotes
  { input: 'docker ps --format "table {{.Names}}"', expected: 'docker ps --format &quot;table {{.Names}}&quot;' },
]

testCases.forEach(test => {
  const result = escapeHtml(test.input)
  console.assert(result === test.expected, {
    input: test.input,
    expected: test.expected,
    got: result
  })
})
```

---

## File-by-File Audit

### Commands Plugin (`/plugins/commands/index.js`)
- [x] Command buttons use `renderCommandButton()`
- [x] History items escape command with `escapeHtml()`
- [x] Output display escapes with `escapeHtml()`
- [x] Error messages are escaped

### System Monitor (`/plugins/system/index.js`)
- [ ] System metrics escape values
- [ ] Process lists escape names/paths
- [ ] Error messages use proper formatting

### File Browser (`/plugins/files/index.js`)
- [ ] File paths are escaped
- [ ] File contents (if displayed) are escaped
- [ ] Error messages are properly formatted

### Git Integration (`/plugins/git/index.js`)
- [ ] Branch names are escaped
- [ ] Commit messages are escaped
- [ ] Repository paths are escaped
- [ ] Error messages are formatted

### Terminal Component (`/components/terminal.js`)
- [ ] Terminal output is escaped
- [ ] Command input is validated
- [ ] Error messages are formatted

---

## Migration Priority

### High Priority (Fix First)
- [ ] Commands with special characters (quotes, pipes, etc.)
- [ ] User input display
- [ ] Dynamic API response rendering
- [ ] File content display

### Medium Priority
- [ ] System output rendering
- [ ] List item rendering
- [ ] Table data display

### Low Priority
- [ ] Static text
- [ ] Constant strings
- [ ] Icon/emoji rendering

---

## Review Checklist

Before committing frontend changes:

- [ ] All dynamic content is escaped
- [ ] No console errors about unsafe HTML
- [ ] Test with problematic inputs (quotes, special chars)
- [ ] Import helpers from `../../shared` (correct path)
- [ ] Bundle builds successfully
- [ ] Frontend displays correctly in browser
- [ ] No XSS vulnerabilities in browser console

---

## Quick Reference

```javascript
// Import all utilities
import {
  escapeHtml,              // For text content
  escapeAttr,              // For attributes
  renderCommandButton,     // For command buttons
  sanitizeInput,           // For user input
  renderError,             // For error display
  renderSuccess,           // For success display
  renderList,              // For lists
  renderTableRows,         // For tables
  renderCode,              // For code blocks
} from '../../shared'

// Typical usage patterns
const safe = escapeHtml(userContent)
const attrSafe = escapeAttr(attributeValue)
const html = renderCommandButton(cmd, label, icon)
const err = renderError(errorMsg, code)
```

---

## Troubleshooting

### "Unescaped quotes" Error
```javascript
// Problem: Quotes breaking HTML attributes
`<button data-cmd="${cmd}">` // cmd has quotes

// Solution: Use escapeAttr
import { escapeAttr } from '../../shared'
`<button data-cmd="${escapeAttr(cmd)}">`

// Or use helper
import { renderCommandButton } from '../../shared'
renderCommandButton(cmd, label, icon)
```

### "Element not rendering"
```javascript
// Problem: HTML being treated as text or escaped too much
return `<div>${content}</div>` // content might be pre-escaped

// Solution: Only escape once
return `<div>${escapeHtml(content)}</div>` // Don't double-escape
```

### "XSS vulnerability warning"
```javascript
// Problem: Potentially dangerous HTML
state.html = userInput // Contains <script> tags

// Solution: Sanitize
import { sanitizeInput } from '../../shared'
state.html = sanitizeInput(userInput)
```
