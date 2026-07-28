import { beforeEach, describe, expect, it, vi } from 'vitest';

const { executeCommand, readTextFile } = vi.hoisted(() => ({
	executeCommand: vi.fn(),
	readTextFile: vi.fn(),
}));

vi.mock('../../src/platform/runtime', () => ({ executeCommand, readTextFile }));

import {
	calculateNetworkRate,
	NetworkProvider,
	parseDefaultIpv6Route,
	parseDefaultRoute,
	parseNetworkCounters,
	parseNetworkLinks,
} from '../../src/telemetry/providers/network-provider';

const counters = (received: number, sent: number) => `Inter-| Receive
 face |bytes packets errs drop fifo frame compressed multicast|bytes packets errs drop fifo colls carrier compressed
wlp1s0: ${received} 1 0 0 0 0 0 0 ${sent} 1 0 0 0 0 0 0
lo: 500 1 0 0 0 0 0 0 500 1 0 0 0 0 0 0
veth0: 300 1 0 0 0 0 0 0 400 1 0 0 0 0 0 0
`;

const route = `Iface\tDestination\tGateway\tFlags\tRefCnt\tUse\tMetric\tMask
wlp1s0\t00000000\t0101A8C0\t0003\t0\t0\t600\t00000000
`;

describe('network parsing', () => {
	it('parses counters, routes, physical links, and reset-safe rates', () => {
		expect(parseNetworkCounters(counters(1000, 2000))).toEqual([
			{ name: 'wlp1s0', receivedBytes: 1000, sentBytes: 2000 },
			{ name: 'veth0', receivedBytes: 300, sentBytes: 400 },
		]);
		expect(parseDefaultRoute(route)).toBe('wlp1s0');
		expect(
			parseDefaultIpv6Route(
				`00000000000000000000000000000000 00 00000000000000000000000000000000 00 00000000000000000000000000000000 00000064 00000000 00000000 00000001 wlp1s0`,
			),
		).toBe('wlp1s0');
		expect(
			parseNetworkLinks(
				'wlp1s0\t../../devices/pci0000:00/net/wlp1s0\nveth0\t../../devices/virtual/net/veth0\n',
			),
		).toEqual(
			new Map([
				['wlp1s0', true],
				['veth0', false],
			]),
		);
		expect(calculateNetworkRate(1000, 2_001_000, 1000)).toBe(2_000_000);
		expect(calculateNetworkRate(2000, 1000, 1000)).toBeNull();
	});
});

describe('NetworkProvider', () => {
	beforeEach(() => {
		executeCommand.mockReset();
		executeCommand.mockResolvedValue(
			'wlp1s0\t../../devices/pci0000:00/net/wlp1s0\nveth0\t../../devices/virtual/net/veth0\n',
		);
		readTextFile.mockReset();
	});

	it('does not read network counters unless the metric is active', async () => {
		expect((await new NetworkProvider().sample(new Set())).samples).toEqual([]);
		expect(readTextFile).not.toHaveBeenCalled();
	});

	it('shares one counter read across automatic, physical, and interface sources', async () => {
		let counterRead = 0;
		readTextFile.mockImplementation(async (path: string) => {
			if (path === '/proc/net/dev') {
				counterRead += 1;
				return counterRead === 1 ? counters(1000, 2000) : counters(2_001_000, 502_000);
			}
			if (path === '/proc/net/route') return route;
			if (path === '/proc/net/ipv6_route') return '';
			if (path.endsWith('/operstate')) return 'up\n';
			if (path.endsWith('/mtu')) return '1500\n';
			if (path.endsWith('/speed')) return '1000\n';
			throw new Error(`Unexpected path: ${path}`);
		});
		let now = 1000;
		const provider = new NetworkProvider(() => now);
		const first = await provider.sample(new Set(['network.traffic']));
		expect(first.samples.find((sample) => sample.sourceId === 'network:auto')).toMatchObject({
			status: 'waiting',
			value: { defaultInterfaceName: 'wlp1s0', selectedInterfaceNames: ['wlp1s0'] },
		});

		now = 2000;
		const second = await provider.sample(new Set(['network.traffic']));
		expect(readTextFile).toHaveBeenCalledWith('/proc/net/dev');
		expect(counterRead).toBe(2);
		expect(second.samples.find((sample) => sample.sourceId === 'network:auto')).toMatchObject({
			status: 'normal',
			value: {
				downloadBytesPerSecond: 2_000_000,
				uploadBytesPerSecond: 500_000,
			},
		});
		expect(
			second.samples.find((sample) => sample.sourceId === 'network:physical')?.value,
		).toMatchObject({ selectedInterfaceNames: ['wlp1s0'] });
		expect(executeCommand).toHaveBeenCalledTimes(1);
	});
});
