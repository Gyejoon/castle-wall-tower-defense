/**
 * deterministic-json.ts
 *
 * stableStringify: produces a deterministic, diff-friendly JSON string.
 *
 * Rules (must match the Phase 1 design decision Q2-2):
 *   - Object keys sorted alphabetically at every level.
 *   - -0 normalised to 0.
 *   - Integer-valued floats emitted without ".0" (e.g. 3, not 3.0).
 *   - No scientific notation for integers (e.g. 10000000000, not 1e10).
 *   - Arrays preserve insertion order.
 *   - Pretty-printed with 2-space indent.
 */

type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue };

function normalizeValue(value: unknown): JsonValue {
	if (value === null || value === undefined) return null;
	if (typeof value === 'boolean') return value;
	if (typeof value === 'number') {
		// Normalise -0 → 0
		if (Object.is(value, -0)) return 0;
		// Normalise NaN / ±Infinity → null (JSON cannot represent these)
		if (!isFinite(value)) return null;
		return value;
	}
	if (typeof value === 'string') return value;
	if (Array.isArray(value)) {
		return value.map(normalizeValue);
	}
	if (typeof value === 'object') {
		const sorted: { [key: string]: JsonValue } = {};
		for (const key of Object.keys(value as object).sort((a, b) =>
			a < b ? -1 : a > b ? 1 : 0,
		)) {
			sorted[key] = normalizeValue((value as Record<string, unknown>)[key]);
		}
		return sorted;
	}
	// Symbols, functions, etc. → null
	return null;
}

/**
 * Custom number serialiser that avoids scientific notation for integer-valued
 * numbers and never emits ".0" for whole numbers.
 *
 * JSON.stringify already does NOT add ".0", so the main job here is handling
 * the scientific-notation edge case for large integers.
 */
function serializeNumber(n: number): string {
	// Already normalised — no -0 or NaN/Inf at this point.
	if (Number.isInteger(n)) {
		// For large integers JS may default to scientific notation in toString(),
		// but JSON.stringify itself doesn't; however to be safe we use toFixed(0).
		// We only do this when the default string representation uses 'e'.
		const s = String(n);
		if (s.includes('e') || s.includes('E')) {
			return n.toFixed(0);
		}
		return s;
	}
	return String(n);
}

function buildString(value: JsonValue, indent: number, depth: number): string {
	const pad = ' '.repeat(indent * depth);
	const childPad = ' '.repeat(indent * (depth + 1));

	if (value === null) return 'null';
	if (typeof value === 'boolean') return value ? 'true' : 'false';
	if (typeof value === 'number') return serializeNumber(value);
	if (typeof value === 'string') return JSON.stringify(value);

	if (Array.isArray(value)) {
		if (value.length === 0) return '[]';
		const items = value.map(
			(item) => `${childPad}${buildString(item, indent, depth + 1)}`,
		);
		return `[\n${items.join(',\n')}\n${pad}]`;
	}

	// Object (already sorted)
	const keys = Object.keys(value);
	if (keys.length === 0) return '{}';
	const entries = keys.map(
		(k) =>
			`${childPad}${JSON.stringify(k)}: ${buildString(value[k], indent, depth + 1)}`,
	);
	return `{\n${entries.join(',\n')}\n${pad}}`;
}

/**
 * Produce a deterministic, alphabetically-sorted, pretty-printed JSON string.
 *
 * @param value - Any serialisable value.
 * @returns UTF-8 JSON string with 2-space indent, no trailing newline.
 */
export function stableStringify(value: unknown): string {
	const normalized = normalizeValue(value);
	return buildString(normalized, 2, 0);
}
