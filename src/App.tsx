import Colors from "./constants/colors";
import "./assets/App.css";
import { useEffect, useState } from "react";
import { MessageType, type Message } from "./interfaces/figma";
import { postMessage } from "./messaging";

function App() {
	const [isFrameSelected, setIsFrameSelected] = useState(false);
	const [warningMessage, setWarningMessage] = useState("");
	const [currentSelection, setCurrentSelection] = useState<null | SceneNode>(null);

	useEffect(() => {
		window.onmessage = (event: MessageEvent) => {
			const message = event.data.pluginMessage as Message;
			console.log("[ui] message received:", message);

			switch (message.type) {
				case MessageType.SelectionChange: {
					if (message.data.selection.length > 1) {
						setWarningMessage("Selecione apenas um frame");
						setIsFrameSelected(false);
						setCurrentSelection(null);
						break;
					}

					setWarningMessage("");
					setCurrentSelection(message.data.selection[0]);
					break;
				}

				case MessageType.IsSelected: {
					setIsFrameSelected(message.data.isSelected);
					break;
				}

				default:
					break;
			}
		};

		return () => {
			window.onmessage = null;
		};
	}, []);

	const initCloning = () => {
		postMessage({
			type: MessageType.SelectionInit,
			data: { node: currentSelection! },
		});
	};

	return (
		<div
			style={{
				background: `linear-gradient(${Colors.primaryColor}, ${Colors.primaryColorLight})`,
				width: "100%",
				height: "100%",
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				flexDirection: "column",
				padding: "2rem",
				gap: "1rem",
			}}
		>
			<h1 style={{ color: "white", fontWeight: "bold", textTransform: "uppercase" }}>Great Pages</h1>
			<p
				style={{
					color: "white",
					margin: "0",
					fontWeight: "bold",
				}}
			>
				{warningMessage.length ? warningMessage : "Selecione um frame para conversão em página"}
			</p>
			<button
				style={{
					padding: "0.8rem 1.5rem",
					backgroundColor: Colors.primaryColor,
					color: "white",
					border: "none",
					borderRadius: "6px",
					cursor: "pointer",
					fontSize: "1.2rem",
					textTransform: "uppercase",
					fontWeight: "bold",
					visibility: isFrameSelected ? "visible" : "hidden",
				}}
				onClick={initCloning}
			>
				Converter
			</button>
		</div>
	);
}

export default App;
