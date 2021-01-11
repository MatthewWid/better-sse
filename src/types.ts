import ExpressSession from "./adapters/ExpressAdapter";

declare global {
	namespace Express {
		interface Response {
			sse: ExpressSession;
			push: ExpressSession["push"];
		}
	}
}
