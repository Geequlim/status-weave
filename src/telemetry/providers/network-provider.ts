import { executeCommand, readTextFile } from '../../platform/runtime';
import type {
	AnyMetricSample,
	MetricId,
	MetricStatus,
	NetworkInterfaceTraffic,
	NetworkTrafficValue,
	TelemetrySnapshot,
} from '../metrics/metric-sample';
import type { SnapshotProvider } from './system-provider';

const NETWORK_ROOT = '/sys/class/net';
const REDISCOVERY_INTERVAL = 30;

export interface NetworkCounters {
	readonly name: string;
	readonly receivedBytes: number;
	readonly sentBytes: number;
}

interface NetworkInterfaceMetadata {
	readonly isPhysical: boolean;
	readonly linkSpeedBitsPerSecond: number | null;
	readonly mtu: number | null;
	readonly name: string;
	readonly operstate: string;
	readonly type: NetworkInterfaceTraffic['type'];
}

const parseNonNegativeNumber = (value: string | undefined): number | null => {
	if (value === undefined) return null;
	const parsed = Number(value.trim());
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export function parseNetworkCounters(content: string): NetworkCounters[] {
	const counters: NetworkCounters[] = [];
	for (const line of content.split('\n')) {
		const separator = line.indexOf(':');
		if (separator < 0) continue;
		const name = line.slice(0, separator).trim();
		const fields = line
			.slice(separator + 1)
			.trim()
			.split(/\s+/);
		const receivedBytes = parseNonNegativeNumber(fields[0]);
		const sentBytes = parseNonNegativeNumber(fields[8]);
		if (!name || receivedBytes === null || sentBytes === null) {
			throw new Error(`Invalid network counters for ${name || 'unknown interface'}`);
		}
		if (name !== 'lo') counters.push({ name, receivedBytes, sentBytes });
	}
	return counters;
}

export function parseDefaultRoute(content: string): string | null {
	let selected: { metric: number; name: string } | null = null;
	for (const line of content.split('\n').slice(1)) {
		const fields = line.trim().split(/\s+/);
		if (fields.length < 8 || fields[1] !== '00000000') continue;
		const flags = Number.parseInt(fields[3]!, 16);
		const metric = Number(fields[6]);
		if (!Number.isFinite(flags) || (flags & 1) === 0 || !Number.isFinite(metric)) continue;
		if (!selected || metric < selected.metric) selected = { metric, name: fields[0]! };
	}
	return selected?.name ?? null;
}

export function parseDefaultIpv6Route(content: string): string | null {
	let selected: { metric: number; name: string } | null = null;
	for (const line of content.split('\n')) {
		const fields = line.trim().split(/\s+/);
		if (
			fields.length < 10 ||
			fields[0] !== '00000000000000000000000000000000' ||
			fields[1] !== '00'
		) {
			continue;
		}
		const metric = Number.parseInt(fields[5]!, 16);
		if (!Number.isFinite(metric)) continue;
		const name = fields[9]!;
		if (!selected || metric < selected.metric) selected = { metric, name };
	}
	return selected?.name ?? null;
}

export function parseNetworkLinks(manifest: string): Map<string, boolean> {
	const links = new Map<string, boolean>();
	for (const line of manifest.split('\n')) {
		const [name, target] = line.split('\t');
		if (name && target) links.set(name, !target.includes('/devices/virtual/'));
	}
	return links;
}

export function calculateNetworkRate(
	previousBytes: number,
	currentBytes: number,
	elapsedMilliseconds: number,
): number | null {
	if (elapsedMilliseconds <= 0 || currentBytes < previousBytes) return null;
	return ((currentBytes - previousBytes) * 1000) / elapsedMilliseconds;
}

const interfaceType = (name: string, isPhysical: boolean): NetworkInterfaceTraffic['type'] => {
	if (!isPhysical) return 'virtual';
	if (/^(wl|wifi)/i.test(name)) return 'wifi';
	if (/^(en|eth)/i.test(name)) return 'ethernet';
	return 'other';
};

const safeRead = async (path: string): Promise<string> => {
	try {
		return await readTextFile(path);
	} catch {
		return '';
	}
};

const sumNullable = (
	interfaces: readonly NetworkInterfaceTraffic[],
	field: 'downloadBytesPerSecond' | 'uploadBytesPerSecond',
): number | null => {
	const values = interfaces.map((entry) => entry[field]);
	if (values.length === 0 || values.every((value) => value === null)) return null;
	return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
};

const trafficValue = (
	interfaces: readonly NetworkInterfaceTraffic[],
	selected: readonly NetworkInterfaceTraffic[],
	defaultInterfaceName: string | null,
	sourceLabel: string,
): NetworkTrafficValue => ({
	defaultInterfaceName,
	downloadBytesPerSecond: sumNullable(selected, 'downloadBytesPerSecond'),
	interfaces,
	receivedBytes: selected.reduce((sum, entry) => sum + entry.receivedBytes, 0),
	selectedInterfaceNames: selected.map((entry) => entry.name),
	sourceLabel,
	sentBytes: selected.reduce((sum, entry) => sum + entry.sentBytes, 0),
	uploadBytesPerSecond: sumNullable(selected, 'uploadBytesPerSecond'),
});

const trafficStatus = (value: NetworkTrafficValue): MetricStatus => {
	if (value.selectedInterfaceNames.length === 0) return 'unavailable';
	if (value.downloadBytesPerSecond === null || value.uploadBytesPerSecond === null) {
		return 'waiting';
	}
	return 'normal';
};

const metricSample = (
	sampledAt: number,
	sourceId: string,
	value: NetworkTrafficValue,
): AnyMetricSample => ({
	...(value.selectedInterfaceNames.length === 0 ? { error: '未发现符合当前来源的网络接口' } : {}),
	metricId: 'network.traffic',
	sampledAt,
	sourceId,
	status: trafficStatus(value),
	value,
});

export class NetworkProvider implements SnapshotProvider {
	private metadata = new Map<string, NetworkInterfaceMetadata>();
	private previousCounters = new Map<string, NetworkCounters>();
	private previousSampledAt: number | null = null;
	private samplesUntilRediscovery = 0;

	constructor(private readonly now: () => number = Date.now) {}

	reset(): void {
		this.previousCounters.clear();
		this.previousSampledAt = null;
	}

	async sample(metricIds: ReadonlySet<MetricId>): Promise<TelemetrySnapshot> {
		const sampledAt = this.now();
		if (!metricIds.has('network.traffic')) {
			this.reset();
			return { sampledAt, samples: [] };
		}
		try {
			const [counterText, routeText, ipv6RouteText] = await Promise.all([
				readTextFile('/proc/net/dev'),
				safeRead('/proc/net/route'),
				safeRead('/proc/net/ipv6_route'),
			]);
			const counters = parseNetworkCounters(counterText);
			const names = counters.map((entry) => entry.name);
			if (
				this.samplesUntilRediscovery <= 0 ||
				names.some((name) => !this.metadata.has(name)) ||
				Array.from(this.metadata.keys()).some((name) => !names.includes(name))
			) {
				this.metadata = await this.discover(names);
				this.samplesUntilRediscovery = REDISCOVERY_INTERVAL;
			}
			this.samplesUntilRediscovery -= 1;

			const elapsed =
				this.previousSampledAt === null ? null : sampledAt - this.previousSampledAt;
			const interfaces = counters.map((entry): NetworkInterfaceTraffic => {
				const previous = this.previousCounters.get(entry.name);
				const metadata = this.metadata.get(entry.name);
				return {
					connected: metadata?.operstate === 'up' || metadata?.operstate === 'unknown',
					downloadBytesPerSecond:
						previous && elapsed !== null
							? calculateNetworkRate(
									previous.receivedBytes,
									entry.receivedBytes,
									elapsed,
								)
							: null,
					isPhysical: metadata?.isPhysical ?? false,
					linkSpeedBitsPerSecond: metadata?.linkSpeedBitsPerSecond ?? null,
					mtu: metadata?.mtu ?? null,
					name: entry.name,
					receivedBytes: entry.receivedBytes,
					sentBytes: entry.sentBytes,
					type: metadata?.type ?? 'other',
					uploadBytesPerSecond:
						previous && elapsed !== null
							? calculateNetworkRate(previous.sentBytes, entry.sentBytes, elapsed)
							: null,
				};
			});
			const defaultInterfaceName =
				parseDefaultRoute(routeText) ?? parseDefaultIpv6Route(ipv6RouteText);
			const automatic = defaultInterfaceName
				? interfaces.filter((entry) => entry.name === defaultInterfaceName)
				: [];
			const physical = interfaces.filter((entry) => entry.isPhysical && entry.connected);
			const samples: AnyMetricSample[] = [
				metricSample(
					sampledAt,
					'network:auto',
					trafficValue(
						interfaces,
						automatic,
						defaultInterfaceName,
						defaultInterfaceName ?? '自动主连接',
					),
				),
				metricSample(
					sampledAt,
					'network:physical',
					trafficValue(interfaces, physical, defaultInterfaceName, '所有物理接口'),
				),
				...interfaces.map((entry) =>
					metricSample(
						sampledAt,
						`network:interface:${entry.name}`,
						trafficValue(interfaces, [entry], defaultInterfaceName, entry.name),
					),
				),
			];
			this.previousCounters = new Map(counters.map((entry) => [entry.name, entry]));
			this.previousSampledAt = sampledAt;
			return { sampledAt, samples };
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			return {
				sampledAt,
				samples: [
					{
						error: `Network: ${detail}`,
						metricId: 'network.traffic',
						sampledAt,
						sourceId: 'network:auto',
						status: 'unavailable',
						value: null,
					},
				],
			};
		}
	}

	private async discover(
		names: readonly string[],
	): Promise<Map<string, NetworkInterfaceMetadata>> {
		const manifest = await executeCommand('find', [
			NETWORK_ROOT,
			'-mindepth',
			'1',
			'-maxdepth',
			'1',
			'-type',
			'l',
			'-printf',
			'%f\t%l\n',
		]);
		const physicalByName = parseNetworkLinks(manifest);
		const entries = await Promise.all(
			names.map(async (name): Promise<NetworkInterfaceMetadata> => {
				const [operstate, mtuText, speedText] = await Promise.all([
					safeRead(`${NETWORK_ROOT}/${name}/operstate`),
					safeRead(`${NETWORK_ROOT}/${name}/mtu`),
					safeRead(`${NETWORK_ROOT}/${name}/speed`),
				]);
				const isPhysical = physicalByName.get(name) ?? false;
				const speedMegabits = parseNonNegativeNumber(speedText);
				return {
					isPhysical,
					linkSpeedBitsPerSecond:
						speedMegabits === null ? null : speedMegabits * 1_000_000,
					mtu: parseNonNegativeNumber(mtuText),
					name,
					operstate: operstate.trim(),
					type: interfaceType(name, isPhysical),
				};
			}),
		);
		return new Map(entries.map((entry) => [entry.name, entry]));
	}
}
