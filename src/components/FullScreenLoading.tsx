import Colors from "../constants/colors";

const FullScreenLoading = () => {
	const spinnerStyle = {
		width: "60px",
		height: "60px",
		border: `6px solid ${Colors.primaryColor}33`, // 33 = ~20% opacity
		borderTop: `6px solid ${Colors.primaryColor}`,
		borderRadius: "50%",
		animation: "spin 1s linear infinite",
	};

	return <div style={spinnerStyle}></div>;
};

export default FullScreenLoading;
