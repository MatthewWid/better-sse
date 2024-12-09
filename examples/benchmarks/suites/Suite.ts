import {Suite as BenchmarkSuite} from "benchmark";
import express, {type Express} from "express";

/**
 * Wrap the Benchmark.js Suite with a much nicer and more
 * intuitive interface that also supports promises.
 */
export class Suite extends BenchmarkSuite {
	static port = 8000;

	constructor(
		name: string,
		private createBenchmarks: () => Promise<void>
	) {
		super(name, {async: true});

		this.on("start", () => {
			console.log(`Benchmarking "${name}".`);
		});

		this.on("cycle", (event: Event) => {
			console.log(String(event.target));
		});

		this.on("complete", () => {
			process.exit(0);
		});
	}

	/**
	 * Initialise all benchmarks.
	 */
	setup = async () => {
		await this.createBenchmarks();

		return this;
	};

	/**
	 * Set up a new benchmark with a name and setup function.
	 *
	 * The setup function takes the web-server, its port, and a function
	 * that makes it listen on the given port.
	 *
	 * The setup function should return an object with a function to *run*
	 * the code to be benchmarked, and a function to tear down anything
	 * created in the setup and running process.
	 */
	addBenchmark = async (
		name: string,
		setup: (
			server: Express,
			port: number,
			listen: () => Promise<void>
		) => Promise<{run: () => void; teardown: () => void}>
	): Promise<void> => {
		const server = express();
		const port = ++Suite.port;

		const {run, teardown} = await setup(
			server,
			port,
			() => new Promise((resolve) => server.listen(port, () => resolve()))
		);

		super.add(name, run, {onComplete: teardown});
	};
}
