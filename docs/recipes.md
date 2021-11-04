# Recipes

Better SSE can be used with any web-server framework that uses the underlying [Node HTTP module](https://nodejs.org/api/http.html). This section shows example usage with some popular HTTP frameworks.

Feel free to submit a PR with a minimal example for more frameworks!

* [HTTP](#http)
* [Express](#express)
* [Koa](#koa)
* [Nest](#nest)

## [HTTP](https://nodejs.org/api/http.html)

```javascript
import {createServer} from "http";
import {createSession} from "better-sse";

const server = createServer(async (req, res) => {
	switch (req.url) {
		case "/sse": {
			const sse = await createSession(req, res);

			sse.push("Hello world!");

			break;
		}
		default: {
			res.writeHead(404).end();
		}
	}
});

server.listen(8080);
```

## [Express](https://expressjs.com/)

```javascript
import express from "express";
import {createSession} from "better-sse";

const app = express();

app.get(
	"/sse",
	async (req, res, next) => {
		const session = await createSession(req, res);

		res.sse = session;

		next();
	},
	(req, res) => {
		res.sse.push("Hello world!");
	}
);

app.listen(8080);
```

## [Koa](https://koajs.com/)

```javascript
import Koa from "koa";
import Router from "@koa/router";
import {createSession} from "better-sse";

const app = new Koa();
const router = new Router();

router.get(
	"/sse",
	async (ctx, next) => {
		// Prevent Koa sending a response and closing the connection
		ctx.respond = false;

		const session = await createSession(ctx.req, ctx.res);

		ctx.sse = session;

		next();
	},
	(ctx) => {
		ctx.sse.push("Hello world!");
	}
);

app.use(router.routes());

app.listen(8080);
```

## [Nest](https://nestjs.com/)

Assuming you are using [`@nestjs/platform-express`](https://www.npmjs.com/package/@nestjs/platform-express) (the default).

```typescript
import { Controller, Get, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { createSession } from "better-sse";

@Controller()
export class SseController {
  @Get("sse")
  async sse(@Req() req: Request, @Res() res: Response) {
    const sse = await createSession(req, res);

    sse.push("Hello world!");
  }
}
```

### 
