export enum MessageType {
	SelectionChange = "selectionchange",
	IsSelected = "isSelected",
	SelectionInit = "selectionInit",
	ConversionComplete = "conversionComplete",
}

export interface Message {
	type: MessageType;
	data?: any;
}

export interface InitSelectionMessage extends Message {
	type: MessageType.SelectionInit;
	data: {
		node: SceneNode;
	};
}
