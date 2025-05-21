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

export interface SelectionMessage extends Message {
	type: MessageType.SelectionChange;
	data: {
		selection?: SceneNode[];
	};
}

export interface IsSelectedMessage extends Message {
	type: MessageType.IsSelected;
	data: {
		isSelected: boolean;
	};
}
