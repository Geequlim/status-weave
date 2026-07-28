import { formatDecimalBytes, formatNetworkRate } from '../../../presentation/value-format';
import type { MetricSample } from '../../../telemetry/metrics/metric-sample';
import { metricStatusLabels } from '../../../telemetry/metrics/metric-status';

const rate = (value: number | null): string => (value === null ? '—' : formatNetworkRate(value));

const interfaceTypeLabels = {
	ethernet: '有线',
	other: '网络',
	virtual: '虚拟',
	wifi: 'Wi-Fi',
} as const;

export function createNetworkPageModel(sample: MetricSample<'network.traffic'> | undefined) {
	const value = sample?.value;
	return {
		badge: value?.selectedInterfaceNames.length
			? value.sourceLabel
			: metricStatusLabels[sample?.status ?? 'unavailable'],
		defaultInterface: value?.defaultInterfaceName ?? '—',
		download: value ? rate(value.downloadBytesPerSecond) : '—',
		interfaces:
			value?.interfaces.map((entry) => ({
				connected: entry.connected,
				id: entry.name,
				label: `${entry.name}（${interfaceTypeLabels[entry.type]}）`,
				value: `↓ ${rate(entry.downloadBytesPerSecond)}  ↑ ${rate(
					entry.uploadBytesPerSecond,
				)}`,
			})) ?? [],
		received: value ? formatDecimalBytes(value.receivedBytes) : '—',
		sent: value ? formatDecimalBytes(value.sentBytes) : '—',
		source: value?.sourceLabel ?? '—',
		status: sample?.status ?? 'unavailable',
		upload: value ? rate(value.uploadBytesPerSecond) : '—',
	};
}
