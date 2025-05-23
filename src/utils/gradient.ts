export const parseLinearGradient = (input: string) => {
	const gradientContent = input.match(/linear-gradient\s*\((.*)\)/i)?.[1];
	if (!gradientContent) return null;

	// Split por vírgulas, respeitando parênteses
	const parts = gradientContent.match(/(?:[^,(]|\([^)]*\))+/g)?.map((p) => p.trim()) ?? [];

	const directionRegex = /^(to\b.+|\d+deg)$/i;
	const colorRegex = /(rgb(a)?\([^)]*\)|#[0-9a-fA-F]{3,6}|\b[a-zA-Z]+\b)/;
	const percentageRegex = /(\d+%|\d+\.\d+%)/;

	const result: {
		direction: string | null;
		stops: Array<{
			color: string | null;
			position: string | null;
		}>;
	} = {
		direction: null,
		stops: [],
	};

	// Verifica se o primeiro argumento é a direção
	if (parts.length && directionRegex.test(parts[0])) {
		result.direction = parts.shift();
	}

	// Processa os "stops" restantes
	for (const part of parts) {
		const colorMatch = part.match(colorRegex);
		const percentageMatch = part.match(percentageRegex);

		result.stops.push({
			color: colorMatch?.[0] ?? null,
			position: percentageMatch?.[0] ?? null,
		});
	}

	return result;
};

export const createGradientImage = (
	{
		direction,
		stops,
	}: {
		stops: Array<{
			color: string | null;
			position: string | null;
		}>;
		direction: string | null;
	},
	width = 400,
	height = 200,
) => {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");

	// Define os pontos de início e fim do gradiente
	const { x0, y0, x1, y1 } = resolveDirection(direction, width, height);

	const gradient = ctx.createLinearGradient(x0, y0, x1, y1);

	// Pré-processar os stops com posições ausentes
	const totalStops = stops.length;
	let definedStops = 0;
	const finalStops = stops.map((stop, i) => {
		if (stop.position) {
			definedStops++;
			return {
				color: stop.color,
				position: parseFloat(stop.position) / 100,
			};
		} else {
			return {
				color: stop.color,
				position: null, // marcamos para interpolar depois
				index: i,
			};
		}
	});

	// Se houver stops sem posição, espalhe igualmente
	if (definedStops !== totalStops) {
		for (let i = 0; i < finalStops.length; i++) {
			if (finalStops[i].position == null) {
				finalStops[i].position = i / (totalStops - 1);
			}
		}
	}

	for (const stop of finalStops) {
		gradient.addColorStop(stop.position!, stop.color!);
	}

	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, width, height);

	return canvas.toDataURL(); // base64
};

function resolveDirection(direction: string | null, width: number, height: number) {
	const to = (x0, y0, x1, y1) => ({ x0, y0, x1, y1 });

	switch ((direction ?? "to bottom").toLowerCase()) {
		case "to right":
			return to(0, 0, width, 0);
		case "to left":
			return to(width, 0, 0, 0);
		case "to bottom":
			return to(0, 0, 0, height);
		case "to top":
			return to(0, height, 0, 0);
		case "to top right":
			return to(0, height, width, 0);
		case "to top left":
			return to(width, height, 0, 0);
		case "to bottom right":
			return to(0, 0, width, height);
		case "to bottom left":
			return to(width, 0, 0, height);
		default:
			// Se for grau, tipo "45deg"
			const deg = parseFloat(direction);
			const rad = (deg * Math.PI) / 180;
			const x = Math.cos(rad);
			const y = Math.sin(rad);
			return to(
				width / 2 - (x * width) / 2,
				height / 2 - (y * height) / 2,
				width / 2 + (x * width) / 2,
				height / 2 + (y * height) / 2,
			);
	}
}
