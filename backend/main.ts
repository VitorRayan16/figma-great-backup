// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

import { htmlMain } from "./html/htmlMain";
import { MessageType, type Message } from "./interfaces/messages";
import { nodesToJSON } from "./node/JsonNodeConversor";

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// This shows the HTML page in "ui.html".
figma.showUI(__html__, {
	height: 300,
	width: 400,
});

figma.on("selectionchange", () => {
	console.log("[DEBUG] selectionchange event - New selection:", figma.currentPage.selection);

	if (figma.currentPage.selection.length === 0) {
		figma.ui.postMessage({
			type: MessageType.IsSelected,
			data: { isSelected: false },
		});

		return;
	}

	figma.ui.postMessage({
		type: MessageType.IsSelected,
		data: { isSelected: true },
	});

	figma.ui.postMessage({
		type: MessageType.SelectionChange,
		data: {
			selection: figma.currentPage.selection,
		},
	});
});

figma.loadAllPagesAsync();

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = (message: Message) => {
	switch (message.type) {
		case MessageType.SelectionInit: {
			const { node } = message.data;
			runClone(node);
			break;
		}
		default:
			break;
	}
};

let clonedFrame = {};

async function runClone(node: SceneNode) {
	let convertedSelection: any;

	convertedSelection = await nodesToJSON([node]);
	console.log("nodeJson", convertedSelection);

	console.log("[debug] convertedSelection", { ...convertedSelection[0] });

	const code = await htmlMain(convertedSelection);

	// const colors = await retrieveGenericSolidUIColors();
	// const gradients = await retrieveGenericLinearGradients();

	console.log("code", code);

	// postConversionComplete({
	// 	code,
	// 	htmlPreview,
	// 	colors,
	// 	gradients,
	// 	settings,
	// 	warnings: [...warnings],
	// });
}
