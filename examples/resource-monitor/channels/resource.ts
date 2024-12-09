import {createChannel} from "better-sse";
import osu, {type NetStatMetrics} from "node-os-utils";

const resource = createChannel();

const interval = 100;

const broadcastSystemStats = async () => {
	const cpuUsage = await osu.cpu.usage(interval);

	const {totalMemMb, freeMemMb} = await osu.mem.info();
	const memoryUsage = (freeMemMb / totalMemMb) * 100;

	resource.broadcast(
		{
			cpuUsage,
			memoryUsage,
		},
		"system-stats"
	);

	setTimeout(broadcastSystemStats, interval);
};

broadcastSystemStats();

const broadcastNetStats = async () => {
	const netStats = await osu.netstat.inOut(1000);
	const {
		total: {inputMb, outputMb},
	} = netStats as NetStatMetrics;

	resource.broadcast(
		{
			inputMb,
			outputMb,
		},
		"net-stats"
	);

	setTimeout(broadcastNetStats, interval);
};

broadcastNetStats();

export {resource};
