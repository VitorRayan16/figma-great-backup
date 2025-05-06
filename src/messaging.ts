import type { Message } from "./interfaces/figma";

if (!parent || !parent.postMessage) {
	throw new Error("parent.postMessage() is not defined");
}

export const postMessage = (message: Message) => parent.postMessage(message);
