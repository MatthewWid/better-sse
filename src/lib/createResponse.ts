import type { ServerResponse } from "http";
import * as stream from "node:stream";

export const createResponse = (res: ServerResponse | Response): Response => {
	if (res instanceof Response) {
		return res.clone();
	}

	const response = stream.Writable.toWeb(res);
};
