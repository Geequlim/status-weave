export function parseCpuFrequencyHertz(content: string): number {
	const kilohertz = Number(content.trim());
	if (!Number.isFinite(kilohertz) || kilohertz <= 0) {
		throw new Error('Invalid CPU frequency');
	}
	return kilohertz * 1000;
}
