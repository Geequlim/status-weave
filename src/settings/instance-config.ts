export interface InstanceConfig {
	readonly label: string;
	readonly tooltip: string;
}

export const defaultInstanceConfig: InstanceConfig = {
	label: 'Status Weave',
	tooltip: 'Status Weave 正在初始化',
};
