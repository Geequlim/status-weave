export interface CpuTimes {
	readonly idle: number;
	readonly total: number;
}

export interface CpuCounters {
	readonly aggregate: CpuTimes;
	readonly cores: readonly {
		readonly id: string;
		readonly index: number;
		readonly times: CpuTimes;
	}[];
}
