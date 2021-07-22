import osu, {NetStatMetrics} from "node-os-utils";
import {createChannel} from "better-sse";

const resource = createChannel();

const interval = 100;

const broadcastSystemStats = async () => {
	const cpuUsage = await osu.cpu.usage(interval);

	const {totalMemMb, freeMemMb} = await osu.mem.info();
	const memoryUsage = (freeMemMb / totalMemMb) * 100;

	resource.broadcast("system-stats", {
		cpuUsage,
		memoryUsage,
	});

	setTimeout(broadcastSystemStats, interval);
};

broadcastSystemStats();

const broadcastNetStats = async () => {
	const netStats = await osu.netstat.inOut(1000);
	const {
		total: {inputMb, outputMb},
	} = netStats as NetStatMetrics;

	resource.broadcast("net-stats", {
		inputMb,
		outputMb,
	});

	setTimeout(broadcastNetStats, interval);
};

broadcastNetStats();

export default resource;
