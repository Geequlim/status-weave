import { formatRpm } from '../../../presentation/value-format';
import type { MetricSample } from '../../../telemetry/metrics/metric-sample';
import { metricStatusLabels } from '../../../telemetry/metrics/metric-status';

export function createFanPageModel(sample: MetricSample<'fan.hwmon'> | undefined) {
	const value = sample?.value;
	return {
		average: value ? formatRpm(value.averageRpm) : '—',
		badge: value
			? `${value.sensors.length} 个风扇`
			: metricStatusLabels[sample?.status ?? 'unavailable'],
		peak: value ? formatRpm(value.peakRpm) : '—',
		primary: value ? formatRpm(value.primaryRpm) : '—',
		sensors:
			value?.sensors.map((sensor) => ({
				id: sensor.id,
				label: sensor.label,
				value: formatRpm(sensor.rpm),
			})) ?? [],
		status: sample?.status ?? 'unavailable',
	};
}
