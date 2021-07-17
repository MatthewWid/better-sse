import Channel from "./Channel";
import createChannel from "./createChannel";

it("returns a new instance of a channel", async () => {
	expect(createChannel()).toBeInstanceOf(Channel);
});
