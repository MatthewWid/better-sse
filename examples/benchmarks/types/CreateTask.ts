import type { Bench } from "tinybench";

export type Port = number;

export type Listen = () => Promise<Port>;

export type TaskDefinition = {
	run: () => void | Promise<void>;
	teardown: () => void | Promise<void>;
};

export type CreateTask<Server> = (
	bench: Bench,
	name: string,
	setup: (server: Server, listen: Listen) => Promise<TaskDefinition>
) => void;
