import { describe, expect, it } from 'vitest';
import {
	formatBinaryBytes,
	formatByteRate,
	formatCompactPercentage,
	formatCompactNetworkRate,
	formatCompactTemperature,
	formatFrequencyHertz,
	formatGigabytes,
	formatNetworkRate,
	formatPercentage,
	formatRpm,
	formatTemperature,
} from '../../src/presentation/value-format';

describe('value formatters', () => {
	it('formats every presentation unit without provider-specific logic', () => {
		expect(formatPercentage(42.44)).toBe('42%');
		expect(formatPercentage(42.44, 1)).toBe('42.4%');
		expect(formatCompactPercentage(9.04)).toBe('9.0%');
		expect(formatCompactPercentage(9.96)).toBe('10%');
		expect(formatCompactPercentage(42.44)).toBe('42%');
		expect(formatBinaryBytes(7.4 * 1024 ** 3)).toBe('7.4 GiB');
		expect(formatGigabytes(1_300_000_000)).toBe('1.3 GB');
		expect(formatNetworkRate(12_400_000, true)).toBe('12.4 MB');
		expect(formatNetworkRate(12_400_000)).toBe('12.4 MB/s');
		expect(formatCompactNetworkRate(0)).toBe('0.00 K');
		expect(formatCompactNetworkRate(25)).toBe('0.03 K');
		expect(formatCompactNetworkRate(567)).toBe('0.57 K');
		expect(formatCompactNetworkRate(4_200_000)).toBe('4.20 M');
		expect(formatCompactNetworkRate(12_500)).toBe('12.5 K');
		expect(formatCompactNetworkRate(12_300_000)).toBe('12.3 M');
		expect(formatByteRate(125.6 * 1024 ** 2)).toBe('125.6 MiB/s');
		expect(formatTemperature(68.44)).toBe('68.4 °C');
		expect(formatCompactTemperature(8.44)).toBe('8.4 °C');
		expect(formatCompactTemperature(9.96)).toBe('10 °C');
		expect(formatCompactTemperature(68.44)).toBe('68 °C');
		expect(formatRpm(1419.6)).toBe('1420 RPM');
		expect(formatFrequencyHertz(2_400_000_000)).toBe('2.40 GHz');
	});
});
