import { sessionPushBench } from "./suites/session-push";

const main = async () => {
	const benches = [sessionPushBench];

	for (const bench of benches) {
		console.log(`Running "${bench.name}"...`);
		await bench.run();
		console.table(bench.table());
	}
};

main();
