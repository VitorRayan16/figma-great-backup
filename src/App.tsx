import Colors from "./constants/colors";
import "./assets/App.css";
import { useEffect, useState } from "react";
import { MessageType, type Message } from "./interfaces/figma";
import { postMessage } from "./messaging";

function App() {
	const [isFrameSelected, setIsFrameSelected] = useState(false);
	const [warningMessage, setWarningMessage] = useState("");
	const [currentSelection, setCurrentSelection] = useState<null | any>(null);

	useEffect(() => {
		window.onmessage = (event: MessageEvent) => {
			const message = event.data.pluginMessage as Message;
			// console.log("[ui] message received:", message, message.type);

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

				case MessageType.ConversionComplete: {
					setIsFrameSelected(false);
					downloadJson(message.data);
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

	const downloadJson = (data: any) => {
		const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
		const url = URL.createObjectURL(blob);

		const a = document.createElement("a");
		a.href = url;
		a.download = "converted_frame.json";
		a.click();

		// Opcional: revoga o objeto após uso
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	};

	const initCloning = () => {
		console.log("[ui] initCloning", currentSelection);

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
