import {Request, Response, NextFunction} from "express";
import Session from "../adapters/ExpressAdapter";
import {SessionOptions} from "../Session";

const createMiddleware = (options?: SessionOptions) => (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	const session = new Session(req, res, options);

	res.sse = session;

	next();
};

export default createMiddleware;
