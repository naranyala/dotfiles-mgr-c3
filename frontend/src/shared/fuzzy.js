export function fuzzyMatch(text, query) {
	if (!query) return true
	text = text.toLowerCase()
	query = query.toLowerCase()
	let qi = 0
	for (let ti = 0; ti < text.length && qi < query.length; ti++) {
		if (text[ti] === query[qi]) qi++
	}
	return qi === query.length
}
