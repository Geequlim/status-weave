import { describe, expect, it } from 'vitest';
import {
	formatBinaryBytes,
	formatByteRate,
	formatFrequencyHertz,
	formatGibibytes,
	formatPercentage,
	formatRpm,
	formatTemperature,
} from '../../src/presentation/value-format';

describe('value formatters', () => {
	it('formats every presentation unit without provider-specific logic', () => {
		expect(formatPercentage(42.44)).toBe('42%');
		expect(formatPercentage(42.44, 1)).toBe('42.4%');
		expect(formatBinaryBytes(7.4 * 1024 ** 3)).toBe('7.4 GiB');
		expect(formatGibibytes(0.2 * 1024 ** 3)).toBe('0.2 GiB');
		expect(formatByteRate(125.6 * 1024 ** 2)).toBe('125.6 MiB/s');
		expect(formatTemperature(68.44)).toBe('68.4 °C');
		expect(formatRpm(1419.6)).toBe('1420 RPM');
		expect(formatFrequencyHertz(2_400_000_000)).toBe('2.40 GHz');
	});
});
