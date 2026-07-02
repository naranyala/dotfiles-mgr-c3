import { ReactiveComponent } from '../core/component.js'
import { signal } from '../core/signals.js'
import { html } from '../core/template.js'
import { componentStyles } from '../shared/component-styles.js'

function escapeHtml(s) {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlight(source, config) {
	const rules = config.rules
	const lines = source.split('\n')
	return lines.map(line => {
		const tokens = []
		let i = 0
		while (i < line.length) {
			let matched = false
			for (const [pat, color] of rules) {
				pat.lastIndex = 0
				const m = pat.exec(line.slice(i))
				if (m && m.index === 0) {
					const raw = m[0]
					if (typeof color === 'function') {
						tokens.push(color(m))
					} else {
						tokens.push(`<span style="color:${color}">${escapeHtml(raw)}</span>`)
					}
					i += raw.length
					matched = true
					break
				}
			}
			if (!matched) {
				tokens.push(escapeHtml(line[i]))
				i++
			}
		}
		return tokens.join('')
	}).join('\n')
}

const LANG_CONFIGS = {
	javascript: {
		name: 'JavaScript',
		rules: [
			[/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/, '#6a9955'],
			[/(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/, '#ce9178'],
			[/(@\w+)/, '#dcdcaa'],
			[/(async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|false|finally|for|from|function|if|import|in|instanceof|let|new|null|of|return|static|super|switch|this|throw|true|try|typeof|var|void|while|with|yield)\b/,
				'#569cd6'],
			[/(\b\d+\.?\d*|0x[0-9a-fA-F]+)/, '#b5cea8'],
		],
	},
}
LANG_CONFIGS.js = LANG_CONFIGS.javascript
LANG_CONFIGS.ts = LANG_CONFIGS.javascript
LANG_CONFIGS.typescript = LANG_CONFIGS.javascript
LANG_CONFIGS.mjs = LANG_CONFIGS.javascript
LANG_CONFIGS.cjs = LANG_CONFIGS.javascript

LANG_CONFIGS.html = {
	name: 'HTML',
	rules: [
		[/(&lt;!--[\s\S]*?--&gt;)/, '#6a9955'],
		[/(&lt;\/?)([\w-]+)/, m => {
			return m[1] + `<span style="color:#569cd6">${m[2]}</span>`
		}],
		[/(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;)/, '#ce9178'],
		[/(&lt;!--[\s\S]*?--&gt;)/, '#6a9955'],
	],
}

LANG_CONFIGS.css = {
	name: 'CSS',
	rules: [
		[/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/, '#6a9955'],
		[/([\w-]+)(?=\s*:)/, '#9cdcfe'],
		[/(#[0-9a-fA-F]{3,8}|\b\d+\.?\d*(?:px|em|rem|vh|vw|%|s|ms)?)\b/, '#b5cea8'],
	],
}
LANG_CONFIGS.scss = LANG_CONFIGS.css

LANG_CONFIGS.python = {
	name: 'Python',
	rules: [
		[/(#[^\n]*)/, '#6a9955'],
		[/(?:\b(?:f|b|u|rf|fr)?'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/, '#ce9178'],
		[/(and|as|assert|async|await|break|class|continue|def|del|elif|else|except|False|finally|for|from|global|if|import|in|is|lambda|None|nonlocal|not|or|pass|raise|return|True|try|with|while|yield)\b/,
			'#569cd6'],
		[/(\b\d+\.?\d*)/, '#b5cea8'],
	],
}
LANG_CONFIGS.py = LANG_CONFIGS.python

LANG_CONFIGS.json = {
	name: 'JSON',
	rules: [
		[/(true|false|null)/, '#569cd6'],
		[/(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/, '#b5cea8'],
		[/((?:")[^"]*("))(?=\s*:)/, m => {
			const inner = escapeHtml(m[1].slice(1, -1))
			return `"<span style="color:#9cdcfe">${inner}</span>"`
		}],
		[/((?:")[^"]*("))/, m => `<span style="color:#ce9178">${escapeHtml(m[1])}</span>`],
	],
}

LANG_CONFIGS.shell = {
	name: 'Shell',
	rules: [
		[/(#[^\n]*)/, '#6a9955'],
		[/(['"][^'"]*['"])/, '#ce9178'],
		[/(alias|bg|bind|break|builtin|caller|cd|command|compgen|complete|continue|declare|dirs|disown|echo|enable|eval|exec|exit|export|false|fc|fg|getopts|hash|help|history|jobs|kill|let|local|logout|mapfile|popd|printf|pushd|pwd|read|readonly|return|set|shift|shopt|source|suspend|test|times|trap|true|type|typeset|ulimit|umask|unalias|unset|wait|if|then|else|elif|fi|for|while|until|do|done|case|esac|function|select|time)\b/,
			'#569cd6'],
		[/(\d+)/, '#b5cea8'],
	],
}
LANG_CONFIGS.sh = LANG_CONFIGS.shell
LANG_CONFIGS.bash = LANG_CONFIGS.shell
LANG_CONFIGS.zsh = LANG_CONFIGS.shell

LANG_CONFIGS.yaml = {
	name: 'YAML',
	rules: [
		[/(#[^\n]*)/, '#6a9955'],
		[/(?:([\w-]+)(?=\s*:))/, '#9cdcfe'],
		[/(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;)/, '#ce9178'],
	],
}
LANG_CONFIGS.yml = LANG_CONFIGS.yaml

LANG_CONFIGS.rust = {
	name: 'Rust',
	rules: [
		[/(\/\/[^\n]*)/, '#6a9955'],
		[/(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/, '#ce9178'],
		[/(as|async|await|break|const|continue|crate|dyn|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|unsafe|use|where|while|yield)\b/,
			'#569cd6'],
		[/(\b\d+\.?\d*)/, '#b5cea8'],
	],
}
LANG_CONFIGS.rs = LANG_CONFIGS.rust

LANG_CONFIGS.go = {
	name: 'Go',
	rules: [
		[/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/, '#6a9955'],
		[/(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/, '#ce9178'],
		[/(break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b/,
			'#569cd6'],
		[/(\b\d+\.?\d*)/, '#b5cea8'],
	],
}

LANG_CONFIGS.java = {
	name: 'Java',
	rules: [
		[/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/, '#6a9955'],
		[/(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/, '#ce9178'],
		[/(abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|native|new|null|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|void|volatile|while|true|false)\b/,
			'#569cd6'],
		[/(\b\d+\.?\d*)/, '#b5cea8'],
	],
}

LANG_CONFIGS.ruby = {
	name: 'Ruby',
	rules: [
		[/(#[^\n]*)/, '#6a9955'],
		[/(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`[^`]*`)/, '#ce9178'],
		[/(begin|break|case|class|def|do|else|elsif|end|ensure|false|for|if|in|module|next|nil|unless|until|when|while|rescue|retry|return|self|super|then|true|undef|yield|alias|and|or|not|defined?)\b/,
			'#569cd6'],
		[/(\b\d+\.?\d*)/, '#b5cea8'],
	],
}
LANG_CONFIGS.rb = LANG_CONFIGS.ruby

const SAMPLES = [
	{ lang: 'javascript', title: 'Debounce utility',
		code: 'function debounce(fn, delay = 300) {\n  let timer\n  return (...args) => {\n    clearTimeout(timer)\n    timer = setTimeout(() => fn(...args), delay)\n  }\n}' },
	{ lang: 'html', title: 'Simple card',
		code: '<div class="card">\n  <img src="photo.jpg" alt="Photo" />\n  <h2>Title</h2>\n  <p>Description</p>\n</div>' },
	{ lang: 'css', title: 'Flexbox centered',
		code: '.container {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  height: 100vh;\n}' },
	{ lang: 'python', title: 'Read file',
		code: 'def read_file(path):\n    with open(path, \'r\') as f:\n        return f.read()' },
	{ lang: 'json', title: 'Config sample',
		code: '{\n  "name": "my-app",\n  "version": "1.0.0",\n  "private": true\n}' },
	{ lang: 'shell', title: 'Git aliases',
		code: "alias gco='git checkout'\nalias gbr='git branch'\nalias gst='git status'" },
	{ lang: 'rust', title: 'Fibonacci',
		code: 'fn fib(n: u32) -> u32 {\n  match n {\n    0 => 0,\n    1 => 1,\n    _ => fib(n - 1) + fib(n - 2),\n  }\n}' },
	{ lang: 'go', title: 'Hello world',
		code: 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello, World!")\n}' },
	{ lang: 'java', title: 'Class example',
		code: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello");\n  }\n}' },
	{ lang: 'ruby', title: 'Block example',
		code: 'class Greeter\n  def initialize(name)\n    @name = name\n  end\n\n  def greet\n    puts "Hello, #{@name}!"\n  end\nend' },
]

const styles = componentStyles(`
	.codeblock { margin: 0; }
	.codeblock-titlebar {
		display: flex; align-items: center; justify-content: space-between;
		padding: 6px 12px;
		background: rgba(0,0,0,0.4);
		border-radius: 8px 8px 0 0;
		font-size: 0.75rem;
	}
	.codeblock-lang {
		color: #94a3b8; font-family: monospace; text-transform: uppercase; letter-spacing: 0.05em;
	}
	.codeblock-copy {
		background: none; border: none; color: #64748b; cursor: pointer;
		font-size: 0.7rem; padding: 3px 8px; border-radius: 4px;
		transition: color 0.12s, background 0.12s;
	}
	.codeblock-copy:hover { color: #f8fafc; background: rgba(255,255,255,0.06); }
	.codeblock-copy.copied { color: #10b981; }
	.codeblock-pre {
		margin: 0; padding: 16px; overflow-x: auto;
		background: rgba(0,0,0,0.3);
		border-radius: 0 0 8px 8px;
		font-size: 0.8rem; line-height: 1.6;
		font-family: ui-monospace, 'Fira Code', monospace;
		tab-size: 2;
		font-variant-ligatures: none;
	}
	.codeblock-pre code { display: block; white-space: pre; }
`)

export class CodeBlockComponent extends ReactiveComponent {
	static styles = styles

	constructor() {
		super()
		this.copiedIdx = signal(-1)
	}

	async copy(code, idx) {
		try {
			await navigator.clipboard.writeText(code)
			this.copiedIdx.value = idx
			setTimeout(() => { if (this.copiedIdx.value === idx) this.copiedIdx.value = -1 }, 1500)
		} catch {
			const ta = document.createElement('textarea')
			ta.value = code
			ta.style.position = 'fixed'
			ta.style.left = '-9999px'
			document.body.appendChild(ta)
			ta.select()
			document.execCommand('copy')
			ta.remove()
			this.copiedIdx.value = idx
			setTimeout(() => { if (this.copiedIdx.value === idx) this.copiedIdx.value = -1 }, 1500)
		}
	}

	renderCodeBlock(item, idx) {
		const config = LANG_CONFIGS[item.lang]
		const langKey = item.lang
		const langName = (config && config.name) || langKey
		const highlighted = config ? highlight(item.code, config) : escapeHtml(item.code)
		const isCopied = this.copiedIdx.value === idx

		return html`
			<div class="codeblock">
				<div class="codeblock-titlebar">
					<span class="codeblock-lang">${langName}</span>
					<button class="codeblock-copy ${isCopied ? 'copied' : ''}"
						@click="${() => this.copy(item.code, idx)}">
						${isCopied ? 'Copied!' : 'Copy'}
					</button>
				</div>
				<pre class="codeblock-pre"><code>${highlighted}</code></pre>
			</div>
		`
	}

	render() {
		return html`
			<h3 style="margin:0 0 1rem;font-size:1rem">Code Blocks</h3>
			<div style="display:flex;flex-direction:column;gap:1.5rem;max-width:700px">
				${SAMPLES.map((item, idx) => this.renderCodeBlock(item, idx))}
			</div>
		`
	}
}
