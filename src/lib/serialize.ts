export interface SerializerFunction {
	(data: unknown): string;
}

const serialize: SerializerFunction = (data) => JSON.stringify(data);

export default serialize;
