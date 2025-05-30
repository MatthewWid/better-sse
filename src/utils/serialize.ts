/**
 * Serialize arbitrary data to a string that can be sent over the wire to the client.
 */
type SerializerFunction = (data: unknown) => string;

const serialize: SerializerFunction = (data) => JSON.stringify(data);

export type {SerializerFunction};
export {serialize};
