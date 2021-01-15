import {Request, Response, NextFunction} from "express";
import Session from "../adapters/ExpressAdapter";
import {SessionOptions} from "../Session";

/**
 * Create and return an Express middleware that attaches the SSE session to the `sse` property of the `res` object.
 */
const createMiddleware = (options?: SessionOptions) => (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	const session = new Session(req, res, options);

	session.onConnect();

	res.sse = session;

	res.push = session.push;
	res.stream = session.stream;

	next();
};

export default createMiddleware;
