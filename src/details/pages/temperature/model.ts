import { formatTemperature } from '../../../presentation/value-format';
import type { MetricSample } from '../../../telemetry/metrics/metric-sample';
import { metricStatusLabels } from '../../../telemetry/metrics/metric-status';

const SENSOR_PAGE_FIXED_HEIGHT = 270;
const SENSOR_ROW_HEIGHT = 28;
const MAXIMUM_SENSOR_COLUMNS = 3;

export function calculateTemperatureColumnCount(
	sensorCount: number,
	maxContentHeight: number,
): number {
	if (sensorCount <= 0) return 1;
	const rowsPerColumn = Math.max(
		1,
		Math.floor((maxContentHeight - SENSOR_PAGE_FIXED_HEIGHT) / SENSOR_ROW_HEIGHT),
	);
	return Math.min(MAXIMUM_SENSOR_COLUMNS, Math.max(1, Math.ceil(sensorCount / rowsPerColumn)));
}

export function createTemperaturePageModel(sample: MetricSample<'temperature.hwmon'> | undefined) {
	const value = sample?.value;
	return {
		average: value ? formatTemperature(value.averageCelsius) : '—',
		badge: value
			? `${value.sensors.length} 个传感器`
			: metricStatusLabels[sample?.status ?? 'unavailable'],
		peak: value ? formatTemperature(value.peakCelsius) : '—',
		primary: value ? formatTemperature(value.primaryCelsius) : '—',
		sensors:
			value?.sensors.map((sensor) => ({
				id: sensor.id,
				label: sensor.label,
				value: formatTemperature(sensor.valueCelsius),
			})) ?? [],
		status: sample?.status ?? 'unavailable',
	};
}
