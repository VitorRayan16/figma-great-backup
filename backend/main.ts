// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

import BlockBuilder from "./html/BlockBuilder";
import { MessageType, type Message } from "./interfaces/messages";
import BlockElement from "./interfaces/pageElements/BlockElement";
import CommonPageElement from "./interfaces/pageElements/CommonPageElement";
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
let clonedFrame: null | {
	block: BlockElement;
	elements: CommonPageElement[];
};
let processingGradients: CommonPageElement[] = [];

figma.ui.onmessage = (message: Message) => {
	console.log("[DEBUG] message received:", message);

	switch (message.type) {
		case MessageType.SelectionInit: {
			const { node } = message.data;
			const sceneNode = figma.currentPage.findOne((n) => n.id === node.id);
			runClone(sceneNode!);
			break;
		}

		case MessageType.GradientProcessed: {
			const { gradient, image } = message.data;

			if (!image) {
				console.log("[DEBUG] No image found");

				const element: CommonPageElement = clonedFrame!.elements.find((el) => el.id === gradient.id)!;

				element.content.desktop = element.content.desktop.replace("#gradient-img#", "none");
				element.content.mobile = element.content.mobile.replace("#gradient-img#", "none");

				element.css.desktop = element.css.desktop.replace("#gradient-img#", "none");
				element.css.mobile = element.css.mobile.replace("#gradient-img#", "none");

				processGradient();
				return;
			}

			const element: CommonPageElement = clonedFrame!.elements.find((el) => el.id === gradient.id)!;

			if (element) {
				const imageCss = `url(${image})`;
				element.content.desktop = element.content.desktop.replace("#gradient-img#", imageCss);
				element.content.mobile = element.content.mobile.replace("#gradient-img#", imageCss);

				element.css.desktop = element.css.desktop.replace("#gradient-img#", imageCss);
				element.css.mobile = element.css.mobile.replace("#gradient-img#", imageCss);
			}

			processGradient();
			break;
		}

		default:
			break;
	}
};

async function runClone(node: SceneNode) {
	let convertedSelection: any;

	convertedSelection = await nodesToJSON([node]);
	console.log("nodeJson", convertedSelection);

	console.log("[debug] convertedSelection", { ...convertedSelection[0] });

	const blockBuilder = new BlockBuilder();

	clonedFrame = await blockBuilder.build(convertedSelection[0]);

	console.log("clonedFrame", clonedFrame);

	const gradients = clonedFrame.elements.filter((element) => element.content.desktop.includes("#gradient-img#"));

	if (gradients.length > 0) {
		processingGradients = gradients;
		processGradient();
		return;
	}

	sendConversionComplete();
}

const processGradient = async () => {
	const gradient = processingGradients.pop();

	if (!gradient) {
		sendConversionComplete();
		return;
	}

	figma.ui.postMessage({
		type: MessageType.ProcessGradient,
		data: gradient,
	});
};

const sendConversionComplete = () => {
	figma.ui.postMessage({
		type: MessageType.ConversionComplete,
		data: { ...clonedFrame, styles: [], scripts: [], icons: {} },
	});
};
