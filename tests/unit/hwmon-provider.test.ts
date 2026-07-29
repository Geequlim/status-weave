import { beforeEach, describe, expect, it, vi } from 'vitest';

const { executeCommand, readTextFile } = vi.hoisted(() => ({
	executeCommand: vi.fn(),
	readTextFile: vi.fn(),
}));

vi.mock('../../src/platform/runtime', () => ({ executeCommand, readTextFile }));

import {
	HwmonProvider,
	selectPrimaryTemperatureSensor,
	stableHwmonDevicePath,
	temperatureStatus,
} from '../../src/telemetry/providers/hwmon-provider';

const links = [
	'hwmon7\t../../devices/platform/coretemp.0/hwmon/hwmon7',
	'hwmon5\t../../devices/platform/asus-nb-wmi/hwmon/hwmon5',
].join('\n');

const files = [
	'/sys/class/hwmon/hwmon7\tname',
	'/sys/class/hwmon/hwmon7\ttemp1_input',
	'/sys/class/hwmon/hwmon7\ttemp1_label',
	'/sys/class/hwmon/hwmon7\ttemp1_max',
	'/sys/class/hwmon/hwmon7\ttemp1_crit',
	'/sys/class/hwmon/hwmon5\tname',
	'/sys/class/hwmon/hwmon5\tfan1_input',
	'/sys/class/hwmon/hwmon5\tfan1_label',
	'/sys/class/hwmon/hwmon5\tfan2_input',
	'/sys/class/hwmon/hwmon5\tfan2_label',
].join('\n');

const values: Record<string, string> = {
	'/sys/class/hwmon/hwmon7/name': 'coretemp\n',
	'/sys/class/hwmon/hwmon7/temp1_input': '52000\n',
	'/sys/class/hwmon/hwmon7/temp1_label': 'Package id 0\n',
	'/sys/class/hwmon/hwmon7/temp1_max': '100000\n',
	'/sys/class/hwmon/hwmon7/temp1_crit': '105000\n',
	'/sys/class/hwmon/hwmon5/name': 'asus\n',
	'/sys/class/hwmon/hwmon5/fan1_input': '2200\n',
	'/sys/class/hwmon/hwmon5/fan1_label': 'cpu_fan\n',
	'/sys/class/hwmon/hwmon5/fan2_input': '2500\n',
	'/sys/class/hwmon/hwmon5/fan2_label': 'gpu_fan\n',
};

describe('HwmonProvider', () => {
	beforeEach(() => {
		executeCommand.mockReset();
		executeCommand.mockImplementation(async (_command: string, args: readonly string[]) =>
			args.includes('/sys/class/hwmon') ? links : files,
		);
		readTextFile.mockReset();
		readTextFile.mockImplementation(async (path: string) => {
			const value = values[path];
			if (value === undefined) throw new Error(`missing fixture: ${path}`);
			return value;
		});
	});

	it('does not discover or read sensors when neither metric is active', async () => {
		const snapshot = await new HwmonProvider().sample(new Set());
		expect(snapshot.samples).toEqual([]);
		expect(executeCommand).not.toHaveBeenCalled();
		expect(readTextFile).not.toHaveBeenCalled();
	});

	it('discovers stable temperature identities and aggregates readings', async () => {
		const snapshot = await new HwmonProvider().sample(new Set(['temperature.hwmon']));
		expect(snapshot.samples).toEqual([
			expect.objectContaining({
				metricId: 'temperature.hwmon',
				status: 'normal',
				value: expect.objectContaining({
					averageCelsius: 52,
					peakCelsius: 52,
					primaryCelsius: 52,
					primaryLabel: 'Package id 0',
					sensors: [
						expect.objectContaining({
							id: 'coretemp:platform/coretemp.0:temp1',
							valueCelsius: 52,
						}),
					],
				}),
			}),
		]);
		expect(readTextFile).not.toHaveBeenCalledWith('/sys/class/hwmon/hwmon5/fan1_input');
	});

	it('selects the CPU fan as primary and exposes every fan', async () => {
		const snapshot = await new HwmonProvider().sample(new Set(['fan.hwmon']));
		expect(snapshot.samples[0]).toMatchObject({
			metricId: 'fan.hwmon',
			value: {
				averageRpm: 2350,
				peakRpm: 2500,
				primaryLabel: 'cpu_fan',
				primaryRpm: 2200,
			},
		});
		expect(snapshot.samples[0]?.value?.sensors).toHaveLength(2);
	});
});

describe('hwmon helpers', () => {
	it('normalizes class symlinks into IDs that survive hwmon renumbering', () => {
		expect(stableHwmonDevicePath('../../devices/platform/coretemp.0/hwmon/hwmon7')).toBe(
			'platform/coretemp.0',
		);
	});

	it('derives warning and critical states from sensor limits', () => {
		const sensor = {
			criticalCelsius: 100,
			deviceName: 'coretemp',
			id: 'package',
			label: 'Package',
			maximumCelsius: 90,
			valueCelsius: 90,
		};
		expect(temperatureStatus([sensor])).toBe('warning');
		expect(temperatureStatus([{ ...sensor, valueCelsius: 100 }])).toBe('critical');
	});

	it('selects CPU package temperatures instead of unrelated first sensors', () => {
		const sensor = (
			deviceName: string,
			label: string,
			valueCelsius: number,
		): Parameters<typeof selectPrimaryTemperatureSensor>[0][number] => ({
			criticalCelsius: null,
			deviceName,
			id: `${deviceName}:${label}`,
			label,
			maximumCelsius: null,
			valueCelsius,
		});
		const nvme = sensor('nvme', 'Composite', 45);
		const tctl = sensor('k10temp', 'Tctl', 58);
		const tdie = sensor('k10temp', 'Tdie', 56);
		expect(selectPrimaryTemperatureSensor([nvme, tctl])).toBe(tctl);
		expect(selectPrimaryTemperatureSensor([nvme, tctl, tdie])).toBe(tdie);

		const intelPackage = sensor('coretemp', 'Package id 0', 52);
		expect(selectPrimaryTemperatureSensor([nvme, intelPackage])).toBe(intelPackage);
		expect(selectPrimaryTemperatureSensor([nvme])).toBe(nvme);
	});
});
