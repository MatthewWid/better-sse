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
}

export default ExpressAdapter;
