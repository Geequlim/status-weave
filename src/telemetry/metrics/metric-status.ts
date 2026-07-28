import type { MetricStatus } from './metric-sample';

export const metricStatusLabels: Record<MetricStatus, string> = {
	normal: '正常',
	warning: '警告',
	critical: '危险',
	sleeping: '休眠',
	waiting: '等待采样',
	unavailable: '不可用',
};

export function usageStatus(percentage: number): MetricStatus {
	if (percentage >= 90) return 'critical';
	if (percentage >= 75) return 'warning';
	return 'normal';
}
