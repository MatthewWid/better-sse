import express, { type Express } from "express";
import type { CreateTask } from "../types/CreateTask";
import { createPort } from "./createPort";

export const createExpressTask: CreateTask<Express> = async (
	bench,
	name,
	setup
) => {
	const server = express();

	const { run, teardown } = await setup(server, async () => {
		const port = createPort();

		await new Promise((resolve) => server.listen(port, resolve));

		return port;
	});

	bench.add(name, run, { afterAll: teardown });
};
