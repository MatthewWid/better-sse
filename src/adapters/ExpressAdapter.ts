import Session, {SessionOptions} from "../Session";
import {Request, Response} from "express";

class ExpressAdapter extends Session {
	/**
	 * @param req - Express request object.
	 * @param res - Express response object.
	 * @param options - Session options.
	 */
	constructor(
		private req: Request,
		private res: Response,
		options?: SessionOptions
	) {
		super(options);
	}

	writeAndFlushHeaders = (
		statusCode: number,
		headers: {[name: string]: string}
	): void => {
		this.res.status(statusCode);

		Object.entries<string>(headers).forEach(([name, value]) => {
			this.res.setHeader(name, value);
		});

		this.res.flushHeaders();
	};

	readHeader = (name: string): string => this.req.get(name) ?? "";

	writeBodyChunk = (chunk: string): void => {
		this.res.write(chunk);
	};
}

export default ExpressAdapter;
