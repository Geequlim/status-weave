import { describe, expect, it } from 'vitest';
import {
	parseCpuModelName,
	parseMemoryHardwareMetadata,
} from '../../src/telemetry/providers/hardware-metadata';

describe('hardware metadata parsers', () => {
	it('normalizes CPU trademark markers', () => {
		expect(parseCpuModelName('model name : Intel(R) Core(TM) Ultra 9 386H\n')).toBe(
			'Intel Core Ultra 9 386H',
		);
	});

	it('deduplicates installed memory device metadata from udev', () => {
		expect(
			parseMemoryHardwareMetadata(`E: MEMORY_DEVICE_0_TYPE=LPDDR5
E: MEMORY_DEVICE_0_MANUFACTURER=SK Hynix
E: MEMORY_DEVICE_0_CONFIGURED_SPEED_MTS=8533
E: MEMORY_DEVICE_1_TYPE=LPDDR5
E: MEMORY_DEVICE_1_MANUFACTURER=SK Hynix
E: MEMORY_DEVICE_1_CONFIGURED_SPEED_MTS=8533
E: MEMORY_DEVICE_2_PRESENT=0
E: MEMORY_DEVICE_2_TYPE=DDR4
`),
		).toEqual({
			configuredSpeedMegatransfersPerSecond: 8533,
			manufacturer: 'SK Hynix',
			type: 'LPDDR5',
		});
	});
});
