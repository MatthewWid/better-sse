import {RequestHandler} from "express";
import Session from "../adapters/ExpressAdapter";
import {SessionOptions} from "../Session";

declare module "express-serve-static-core" {
	interface Response {
		sse: Session;
		push: Session["push"];
		stream: Session["stream"];
	}
}

/**
 * Create and return an Express middleware that attaches the SSE session to the `sse` property of the `res` object.
 */
const createMiddleware = (options?: SessionOptions): RequestHandler => (
	req,
	res,
	next
): void => {
	const session = new Session(req, res, options);

	session.onConnect();

	res.sse = session;
	res.push = session.push;
	res.stream = session.stream;

	next();
};

export default createMiddleware;
