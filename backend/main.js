(() => {
  // backend/common/indentString.ts
  var indentString = (str, indentLevel = 2) => {
    const regex = /^(?!\s*$)/gm;
    return str.replace(regex, " ".repeat(indentLevel));
  };

  // backend/common/numToAutoFixed.ts
  var numberToFixedString = (num) => {
    return num.toFixed(2).replace(/\.00$/, "");
  };
  var roundToNearestDecimal = (decimal) => (n) => Math.round(n * 10 ** decimal) / 10 ** decimal;
  var roundToNearestHundreth = roundToNearestDecimal(2);

  // backend/common/parseJSX.ts
  var formatWithJSX = (property, value) => {
    if (typeof value === "number") {
      return `${property}: ${numberToFixedString(value)}px`;
    } else {
      return `${property}: ${value}`;
    }
  };
  var formatMultipleJSXArray = (styles) => Object.entries(styles).filter(([key, value]) => value !== "").map(([key, value]) => formatWithJSX(key, value));
  var formatMultipleJSX = (styles) => Object.entries(styles).filter(([key, value]) => value).map(([key, value]) => formatWithJSX(key, value)).join("; ");

  // backend/common/retrieveFill.ts
  var retrieveTopFill = (fills) => {
    if (fills && Array.isArray(fills) && fills.length > 0) {
      return [...fills].reverse().find((d) => d.visible !== false);
    }
    return void 0;
  };

  // backend/html/builderImpl/htmlColor.ts
  var processColorWithVariable = (fill) => {
    const opacity = fill.opacity ? fill.opacity : 1;
    if (fill.variableColorName) {
      const varName = fill.variableColorName;
      const fallbackColor = htmlColor(fill.color, opacity);
      return `var(--${varName}, ${fallbackColor})`;
    }
    return htmlColor(fill.color, opacity);
  };
  var getColorAndVariable = (fill) => {
    if (fill.type === "SOLID") {
      return {
        color: fill.color,
        opacity: fill.opacity ?? 1,
        variableColorName: fill.variableColorName
      };
    } else if ((fill.type === "GRADIENT_LINEAR" || fill.type === "GRADIENT_RADIAL" || fill.type === "GRADIENT_ANGULAR" || fill.type === "GRADIENT_DIAMOND") && fill.gradientStops.length > 0) {
      const firstStop = fill.gradientStops[0];
      return {
        color: firstStop.color,
        opacity: fill.opacity ?? 1,
        variableColorName: firstStop.variableColorName
      };
    }
    return { color: { r: 0, g: 0, b: 0 }, opacity: 0 };
  };
  var htmlColorFromFills = (fills) => {
    const fill = retrieveTopFill(fills);
    if (fill) {
      const colorInfo = getColorAndVariable(fill);
      return processColorWithVariable(colorInfo);
    }
    return "";
  };
  var htmlColor = (color, alpha = 1) => {
    if (color.r === 1 && color.g === 1 && color.b === 1 && alpha === 1) {
      return "white";
    }
    if (color.r === 0 && color.g === 0 && color.b === 0 && alpha === 1) {
      return "black";
    }
    if (alpha === 1) {
      const r2 = Math.round(color.r * 255);
      const g2 = Math.round(color.g * 255);
      const b2 = Math.round(color.b * 255);
      const toHex = (num) => num.toString(16).padStart(2, "0");
      return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`.toUpperCase();
    }
    const r = numberToFixedString(color.r * 255);
    const g = numberToFixedString(color.g * 255);
    const b = numberToFixedString(color.b * 255);
    const a = numberToFixedString(alpha);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };
  var processGradientStop = (stop, fillOpacity = 1, positionMultiplier = 100, unit = "%") => {
    const fillInfo = {
      color: stop.color,
      opacity: stop.color.a * fillOpacity,
      boundVariables: stop.boundVariables,
      variableColorName: stop.variableColorName
    };
    const color = processColorWithVariable(fillInfo);
    const position = `${(stop.position * positionMultiplier).toFixed(0)}${unit}`;
    return `${color} ${position}`;
  };
  var processGradientStops = (stops, fillOpacity = 1, positionMultiplier = 100, unit = "%") => {
    return stops.map((stop) => processGradientStop(stop, fillOpacity, positionMultiplier, unit)).join(", ");
  };
  var htmlGradientFromFills = (fill) => {
    if (!fill) return "";
    switch (fill.type) {
      case "GRADIENT_LINEAR":
        return htmlLinearGradient(fill);
      case "GRADIENT_ANGULAR":
        return htmlAngularGradient(fill);
      case "GRADIENT_RADIAL":
        return htmlRadialGradient(fill);
      case "GRADIENT_DIAMOND":
        return htmlDiamondGradient(fill);
      default:
        return "";
    }
  };
  var htmlLinearGradient = (fill) => {
    const [start, end] = fill.gradientHandlePositions;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    angle = (angle + 360) % 360;
    const cssAngle = (angle + 90) % 360;
    const mappedFill = processGradientStops(fill.gradientStops, fill.opacity ?? 1);
    return `linear-gradient(${cssAngle.toFixed(0)}deg, ${mappedFill})`;
  };
  var htmlRadialGradient = (fill) => {
    const [center, h1, h2] = fill.gradientHandlePositions;
    const cx = center.x * 100;
    const cy = center.y * 100;
    const rx = Math.sqrt((h1.x - center.x) ** 2 + (h1.y - center.y) ** 2) * 100;
    const ry = Math.sqrt((h2.x - center.x) ** 2 + (h2.y - center.y) ** 2) * 100;
    const mappedStops = processGradientStops(fill.gradientStops, fill.opacity ?? 1);
    return `radial-gradient(ellipse ${rx.toFixed(2)}% ${ry.toFixed(2)}% at ${cx.toFixed(2)}% ${cy.toFixed(
      2
    )}%, ${mappedStops})`;
  };
  var htmlAngularGradient = (fill) => {
    const [center, _, startDirection] = fill.gradientHandlePositions;
    const cx = center.x * 100;
    const cy = center.y * 100;
    const dx = startDirection.x - center.x;
    const dy = startDirection.y - center.y;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    angle = (angle + 360) % 360;
    const mappedFill = processGradientStops(fill.gradientStops, fill.opacity ?? 1, 360, "deg");
    return `conic-gradient(from ${angle.toFixed(0)}deg at ${cx.toFixed(2)}% ${cy.toFixed(2)}%, ${mappedFill})`;
  };
  var htmlDiamondGradient = (fill) => {
    const stops = processGradientStops(fill.gradientStops, fill.opacity ?? 1, 50, "%");
    const gradientConfigs = [
      { direction: "to bottom right", position: "bottom right" },
      { direction: "to bottom left", position: "bottom left" },
      { direction: "to top left", position: "top left" },
      { direction: "to top right", position: "top right" }
    ];
    return gradientConfigs.map(({ direction, position }) => `linear-gradient(${direction}, ${stops}) ${position} / 50% 50% no-repeat`).join(", ");
  };
  var buildBackgroundValues = (paintArray) => {
    if (paintArray === figma.mixed) {
      return "";
    }
    if (paintArray.length === 1) {
      const paint = paintArray[0];
      if (paint.type === "SOLID") {
        return htmlColorFromFills(paintArray);
      } else if (paint.type === "GRADIENT_LINEAR" || paint.type === "GRADIENT_RADIAL" || paint.type === "GRADIENT_ANGULAR" || paint.type === "GRADIENT_DIAMOND") {
        return htmlGradientFromFills(paint);
      }
      return "";
    }
    const styles = [...paintArray].reverse().map((paint, index) => {
      if (paint.type === "SOLID") {
        const color = htmlColorFromFills([paint]);
        if (index === 0) {
          return `linear-gradient(0deg, ${color} 0%, ${color} 100%)`;
        }
        return color;
      } else if (paint.type === "GRADIENT_LINEAR" || paint.type === "GRADIENT_RADIAL" || paint.type === "GRADIENT_ANGULAR" || paint.type === "GRADIENT_DIAMOND") {
        return htmlGradientFromFills(paint);
      }
      return "";
    });
    return styles.filter((value) => value !== "").join(", ");
  };

  // backend/html/builderImpl/htmlShadow.ts
  var htmlShadow = (node) => {
    if (node.effects && node.effects.length > 0) {
      const shadowEffects = node.effects.filter(
        (d) => (d.type === "DROP_SHADOW" || d.type === "INNER_SHADOW" || d.type === "LAYER_BLUR") && d.visible
      );
      if (shadowEffects.length > 0) {
        const shadow = shadowEffects[0];
        let x = 0;
        let y = 0;
        let blur = 0;
        let spread = "";
        let inner = "";
        let color = "";
        if (shadow.type === "DROP_SHADOW" || shadow.type === "INNER_SHADOW") {
          x = shadow.offset.x;
          y = shadow.offset.y;
          blur = shadow.radius;
          spread = shadow.spread ? `${shadow.spread}px ` : "";
          inner = shadow.type === "INNER_SHADOW" ? " inset" : "";
          color = htmlColor(shadow.color, shadow.color.a);
        } else if (shadow.type === "LAYER_BLUR") {
          x = shadow.radius;
          y = shadow.radius;
          blur = shadow.radius;
        }
        return `${x}px ${y}px ${blur}px ${spread}${color}${inner}`;
      }
    }
    return "";
  };

  // backend/html/builderImpl/htmlBlend.ts
  var htmlOpacity = (node) => {
    if (node.opacity !== void 0 && node.opacity !== 1) {
      return `opacity: ${numberToFixedString(node.opacity)}`;
    }
    return "";
  };
  var htmlBlendMode = (node) => {
    if (node.blendMode !== "NORMAL" && node.blendMode !== "PASS_THROUGH") {
      let blendMode = "";
      switch (node.blendMode) {
        case "MULTIPLY":
          blendMode = "multiply";
          break;
        case "SCREEN":
          blendMode = "screen";
          break;
        case "OVERLAY":
          blendMode = "overlay";
          break;
        case "DARKEN":
          blendMode = "darken";
          break;
        case "LIGHTEN":
          blendMode = "lighten";
          break;
        case "COLOR_DODGE":
          blendMode = "color-dodge";
          break;
        case "COLOR_BURN":
          blendMode = "color-burn";
          break;
        case "HARD_LIGHT":
          blendMode = "hard-light";
          break;
        case "SOFT_LIGHT":
          blendMode = "soft-light";
          break;
        case "DIFFERENCE":
          blendMode = "difference";
          break;
        case "EXCLUSION":
          blendMode = "exclusion";
          break;
        case "HUE":
          blendMode = "hue";
          break;
        case "SATURATION":
          blendMode = "saturation";
          break;
        case "COLOR":
          blendMode = "color";
          break;
        case "LUMINOSITY":
          blendMode = "luminosity";
          break;
      }
      if (blendMode) {
        return formatWithJSX("mix-blend-mode", blendMode);
      }
    }
    return "";
  };
  var htmlVisibility = (node) => {
    if (node.visible !== void 0 && !node.visible) {
      return formatWithJSX("visibility", "hidden");
    }
    return "";
  };
  var htmlRotation = (node) => {
    const rotation = -Math.round((node.rotation || 0) + (node.cumulativeRotation || 0)) || 0;
    if (rotation !== 0) {
      return [
        formatWithJSX("transform", `rotate(${numberToFixedString(rotation)}deg)`),
        formatWithJSX("transform-origin", "top left")
      ];
    }
    return [];
  };

  // backend/common/commonPadding.ts
  var commonPadding = (node) => {
    if ("layoutMode" in node && node.layoutMode !== "NONE") {
      const paddingLeft = parseFloat((node.paddingLeft ?? 0).toFixed(2));
      const paddingRight = parseFloat((node.paddingRight ?? 0).toFixed(2));
      const paddingTop = parseFloat((node.paddingTop ?? 0).toFixed(2));
      const paddingBottom = parseFloat((node.paddingBottom ?? 0).toFixed(2));
      if (paddingLeft === paddingRight && paddingLeft === paddingBottom && paddingTop === paddingBottom) {
        return { all: paddingLeft };
      } else if (paddingLeft === paddingRight && paddingTop === paddingBottom) {
        return {
          horizontal: paddingLeft,
          vertical: paddingTop
        };
      } else {
        return {
          left: paddingLeft,
          right: paddingRight,
          top: paddingTop,
          bottom: paddingBottom
        };
      }
    }
    return null;
  };

  // backend/html/builderImpl/htmlPadding.ts
  var htmlPadding = (node) => {
    const padding = commonPadding(node);
    if (padding === null) {
      return [];
    }
    if ("all" in padding) {
      if (padding.all !== 0) {
        return [formatWithJSX("padding", padding.all)];
      } else {
        return [];
      }
    }
    let comp = [];
    if ("horizontal" in padding) {
      if (padding.horizontal !== 0) {
        comp.push(formatWithJSX("padding-left", padding.horizontal));
        comp.push(formatWithJSX("padding-right", padding.horizontal));
      }
      if (padding.vertical !== 0) {
        comp.push(formatWithJSX("padding-top", padding.vertical));
        comp.push(formatWithJSX("padding-bottom", padding.vertical));
      }
      return comp;
    }
    if (padding.top !== 0) {
      comp.push(formatWithJSX("padding-top", padding.top));
    }
    if (padding.bottom !== 0) {
      comp.push(formatWithJSX("padding-bottom", padding.bottom));
    }
    if (padding.left !== 0) {
      comp.push(formatWithJSX("padding-left", padding.left));
    }
    if (padding.right !== 0) {
      comp.push(formatWithJSX("padding-right", padding.right));
    }
    return comp;
  };

  // backend/common/nodeWidthHeight.ts
  var nodeSize = (node) => {
    if ("layoutSizingHorizontal" in node && "layoutSizingVertical" in node) {
      const width = node.layoutSizingHorizontal === "FILL" ? "fill" : node.layoutSizingHorizontal === "HUG" ? null : node.width;
      const height = node.layoutSizingVertical === "FILL" ? "fill" : node.layoutSizingVertical === "HUG" ? null : node.height;
      return { width, height };
    }
    return { width: node.width, height: node.height };
  };

  // backend/html/builderImpl/htmlSize.ts
  var htmlSizePartial = (node) => {
    if (isPreviewGlobal && node.parent === void 0) {
      return {
        width: formatWithJSX("width", "100%"),
        height: formatWithJSX("height", "100%"),
        constraints: []
      };
    }
    const size = nodeSize(node);
    const nodeParent = node.parent;
    let w = "";
    if (typeof size.width === "number") {
      w = formatWithJSX("width", size.width);
    } else if (size.width === "fill") {
      if (nodeParent && "layoutMode" in nodeParent && nodeParent.layoutMode === "HORIZONTAL") {
        w = formatWithJSX("flex", "1 1 0");
      } else {
        if (node.maxWidth) {
          w = formatWithJSX("width", "100%");
        } else {
          w = formatWithJSX("align-self", "stretch");
        }
      }
    }
    let h = "";
    if (typeof size.height === "number") {
      h = formatWithJSX("height", size.height);
    } else if (typeof size.height === "string") {
      if (nodeParent && "layoutMode" in nodeParent && nodeParent.layoutMode === "VERTICAL") {
        h = formatWithJSX("flex", "1 1 0");
      } else {
        if (node.maxHeight) {
          h = formatWithJSX("height", "100%");
        } else {
          h = formatWithJSX("align-self", "stretch");
        }
      }
    }
    const constraints = [];
    if (node.maxWidth !== void 0 && node.maxWidth !== null) {
      constraints.push(formatWithJSX("max-width", node.maxWidth));
    }
    if (node.minWidth !== void 0 && node.minWidth !== null) {
      constraints.push(formatWithJSX("min-width", node.minWidth));
    }
    if (node.maxHeight !== void 0 && node.maxHeight !== null) {
      constraints.push(formatWithJSX("max-height", node.maxHeight));
    }
    if (node.minHeight !== void 0 && node.minHeight !== null) {
      constraints.push(formatWithJSX("min-height", node.minHeight));
    }
    return {
      width: w,
      height: h,
      constraints
    };
  };

  // backend/common/commonRadius.ts
  var getCommonRadius = (node) => {
    if ("rectangleCornerRadii" in node) {
      const [topLeft, topRight, bottomRight, bottomLeft] = node.rectangleCornerRadii;
      if (topLeft === topRight && topLeft === bottomRight && topLeft === bottomLeft) {
        return { all: topLeft };
      }
      return {
        topLeft,
        topRight,
        bottomRight,
        bottomLeft
      };
    }
    if ("cornerRadius" in node && node.cornerRadius !== figma.mixed && node.cornerRadius) {
      return { all: node.cornerRadius };
    }
    if ("topLeftRadius" in node) {
      if (node.topLeftRadius === node.topRightRadius && node.topLeftRadius === node.bottomRightRadius && node.topLeftRadius === node.bottomLeftRadius) {
        return { all: node.topLeftRadius };
      }
      return {
        topLeft: node.topLeftRadius,
        topRight: node.topRightRadius,
        bottomRight: node.bottomRightRadius,
        bottomLeft: node.bottomLeftRadius
      };
    }
    return { all: 0 };
  };

  // backend/html/builderImpl/htmlBorderRadius.ts
  var htmlBorderRadius = (node) => {
    let comp = [];
    if ("children" in node && node.children.length > 0 && "clipsContent" in node && node.clipsContent === true) {
      comp.push(formatWithJSX("overflow", "hidden"));
    }
    if (node.type === "ELLIPSE") {
      comp.push(formatWithJSX("border-radius", 9999));
      return comp;
    }
    const radius = getCommonRadius(node);
    let singleCorner = 0;
    if ("all" in radius) {
      if (radius.all === 0) {
        return comp;
      }
      singleCorner = radius.all;
      comp.push(formatWithJSX("border-radius", radius.all));
    } else {
      const cornerValues = [radius.topLeft, radius.topRight, radius.bottomRight, radius.bottomLeft];
      const cornerProperties = [
        "border-top-left-radius",
        "border-top-right-radius",
        "border-bottom-right-radius",
        "border-bottom-left-radius"
      ];
      for (let i = 0; i < 4; i++) {
        if (cornerValues[i] > 0) {
          comp.push(formatWithJSX(cornerProperties[i], cornerValues[i]));
        }
      }
    }
    return comp;
  };

  // backend/common/commonPosition.ts
  var getCommonPositionValue = (node, settings2) => {
    if (node.parent && node.parent.absoluteBoundingBox) {
      if (settings2?.embedVectors && node.svg) {
        return {
          x: node.absoluteBoundingBox.x - node.parent.absoluteBoundingBox.x,
          y: node.absoluteBoundingBox.y - node.parent.absoluteBoundingBox.y
        };
      }
      return { x: node.x, y: node.y };
    }
    if (node.parent && node.parent.type === "GROUP") {
      return {
        x: node.x - node.parent.x,
        y: node.y - node.parent.y
      };
    }
    return {
      x: node.x,
      y: node.y
    };
  };
  var commonIsAbsolutePosition = (node) => {
    if ("layoutPositioning" in node && node.layoutPositioning === "ABSOLUTE") {
      return true;
    }
    if (!node.parent || node.parent === void 0) {
      return false;
    }
    if ("layoutMode" in node.parent && node.parent.layoutMode === "NONE" || !("layoutMode" in node.parent)) {
      return true;
    }
    return false;
  };

  // backend/common/commonStroke.ts
  var commonStroke = (node, divideBy = 1) => {
    if (!("strokes" in node) || !node.strokes || node.strokes.length === 0) {
      return null;
    }
    if ("strokeTopWeight" in node) {
      if (node.strokeTopWeight === node.strokeBottomWeight && node.strokeTopWeight === node.strokeLeftWeight && node.strokeTopWeight === node.strokeRightWeight) {
        return { all: node.strokeTopWeight / divideBy };
      }
      return {
        left: node.strokeLeftWeight / divideBy,
        top: node.strokeTopWeight / divideBy,
        right: node.strokeRightWeight / divideBy,
        bottom: node.strokeBottomWeight / divideBy
      };
    } else if (node.strokeWeight !== figma.mixed && node.strokeWeight !== 0) {
      return { all: node.strokeWeight / divideBy };
    }
    return null;
  };

  // backend/common/lowercaseFirstLetter.ts
  function lowercaseFirstLetter(str) {
    if (!str || str.length === 0) {
      return str;
    }
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  // backend/common/commonFormatAttributes.ts
  var joinStyles = (styles) => styles.map((s) => s.trim()).join("; ");
  var formatStyleAttribute = (styles) => {
    const trimmedStyles = joinStyles(styles);
    if (trimmedStyles === "") return "";
    return ` style=${`"${trimmedStyles}"`}`;
  };
  var formatDataAttribute = (label, value) => ` data-${lowercaseFirstLetter(label).replace(" ", "-")}${value === void 0 ? `` : `="${value}"`}`;
  var formatClassAttribute = (classes) => classes.length === 0 ? "" : ` ${"class"}="${classes.join(" ")}"`;

  // backend/html/htmlDefaultBuilder.ts
  var HtmlDefaultBuilder = class {
    styles;
    data;
    node;
    cssClassName = null;
    get name() {
      return "";
    }
    get visible() {
      return this.node.visible;
    }
    // Get the appropriate HTML element based on node type
    get htmlElement() {
      if (this.node.type === "TEXT") return "p";
      return "div";
    }
    constructor(node) {
      this.node = node;
      this.styles = [];
      this.data = [];
    }
    commonPositionStyles() {
      this.size();
      this.autoLayoutPadding();
      this.position();
      this.blend();
      return this;
    }
    commonShapeStyles() {
      if ("fills" in this.node) {
        this.applyFillsToStyle(this.node.fills, this.node.type === "TEXT" ? "text" : "background");
      }
      this.shadow();
      this.border();
      this.blur();
      return this;
    }
    addStyles = (...newStyles) => {
      this.styles.push(...newStyles.filter((style) => style));
    };
    blend() {
      const { node } = this;
      this.addStyles(
        htmlVisibility(node),
        ...htmlRotation(node),
        htmlOpacity(node),
        htmlBlendMode(node)
      );
      return this;
    }
    border() {
      const { node } = this;
      this.addStyles(...htmlBorderRadius(node));
      const commonBorder = commonStroke(node);
      if (!commonBorder) {
        return this;
      }
      const strokes = "strokes" in node && node.strokes || void 0;
      const color = htmlColorFromFills(strokes);
      if (!color) {
        return this;
      }
      const borderStyle = "dashPattern" in node && node.dashPattern.length > 0 ? "dotted" : "solid";
      const strokeAlign = "strokeAlign" in node ? node.strokeAlign : "INSIDE";
      const consolidateBorders = (border) => [`${numberToFixedString(border)}px`, color, borderStyle].filter((d) => d).join(" ");
      if ("all" in commonBorder) {
        if (commonBorder.all === 0) {
          return this;
        }
        const weight = commonBorder.all;
        if (strokeAlign === "CENTER" || strokeAlign === "OUTSIDE" || node.type === "FRAME" || node.type === "INSTANCE" || node.type === "COMPONENT") {
          this.addStyles(formatWithJSX("outline", consolidateBorders(weight)));
          if (strokeAlign === "CENTER") {
            this.addStyles(formatWithJSX("outline-offset", `${numberToFixedString(-weight / 2)}px`));
          } else if (strokeAlign === "INSIDE") {
            this.addStyles(formatWithJSX("outline-offset", `${numberToFixedString(-weight)}px`));
          }
        } else {
          this.addStyles(formatWithJSX("border", consolidateBorders(weight)));
        }
      } else {
        if (commonBorder.left !== 0) {
          this.addStyles(formatWithJSX("border-left", consolidateBorders(commonBorder.left)));
        }
        if (commonBorder.top !== 0) {
          this.addStyles(formatWithJSX("border-top", consolidateBorders(commonBorder.top)));
        }
        if (commonBorder.right !== 0) {
          this.addStyles(formatWithJSX("border-right", consolidateBorders(commonBorder.right)));
        }
        if (commonBorder.bottom !== 0) {
          this.addStyles(formatWithJSX("border-bottom", consolidateBorders(commonBorder.bottom)));
        }
      }
      return this;
    }
    position() {
      const { node } = this;
      const isAbsolutePosition = commonIsAbsolutePosition(node);
      if (isAbsolutePosition) {
        const { x, y } = getCommonPositionValue(node);
        this.addStyles(formatWithJSX("left", x), formatWithJSX("top", y), formatWithJSX("position", "absolute"));
      } else {
        if (node.type === "GROUP" || node.isRelative) {
          this.addStyles(formatWithJSX("position", "relative"));
        }
      }
      return this;
    }
    applyFillsToStyle(paintArray, property) {
      if (property === "text") {
        this.addStyles(formatWithJSX("text", htmlColorFromFills(paintArray)));
        return this;
      }
      const backgroundValues = buildBackgroundValues(paintArray);
      if (backgroundValues) {
        this.addStyles(formatWithJSX("background", backgroundValues));
        if (paintArray !== figma.mixed) {
          const blendModes = this.buildBackgroundBlendModes(paintArray);
          if (blendModes) {
            this.addStyles(formatWithJSX("background-blend-mode", blendModes));
          }
        }
      }
      return this;
    }
    buildBackgroundBlendModes(paintArray) {
      if (paintArray.length === 0 || paintArray.every((d) => d.blendMode === "NORMAL" || d.blendMode === "PASS_THROUGH")) {
        return "";
      }
      const blendModes = [...paintArray].reverse().map((paint) => {
        if (paint.blendMode === "PASS_THROUGH") {
          return "normal";
        }
        return paint.blendMode?.toLowerCase();
      });
      return blendModes.join(", ");
    }
    shadow() {
      const { node } = this;
      if ("effects" in node) {
        const shadow = htmlShadow(node);
        if (shadow) {
          this.addStyles(formatWithJSX("box-shadow", htmlShadow(node)));
        }
      }
      return this;
    }
    size() {
      const { node } = this;
      const { width, height, constraints } = htmlSizePartial(node);
      if (node.type === "TEXT") {
        switch (node.textAutoResize) {
          case "WIDTH_AND_HEIGHT":
            break;
          case "HEIGHT":
            this.addStyles(width);
            break;
          case "NONE":
          case "TRUNCATE":
            this.addStyles(width, height);
            break;
        }
      } else {
        this.addStyles(width, height);
      }
      if (constraints.length > 0) {
        this.addStyles(...constraints);
      }
      return this;
    }
    autoLayoutPadding() {
      const { node } = this;
      if ("paddingLeft" in node) {
        this.addStyles(...htmlPadding(node));
      }
      return this;
    }
    blur() {
      const { node } = this;
      if ("effects" in node && node.effects.length > 0) {
        const blur = node.effects.find((e) => e.type === "LAYER_BLUR" && e.visible);
        if (blur) {
          this.addStyles(formatWithJSX("filter", `blur(${numberToFixedString(blur.radius / 2)}px)`));
        }
        const backgroundBlur = node.effects.find((e) => e.type === "BACKGROUND_BLUR" && e.visible);
        if (backgroundBlur) {
          this.addStyles(
            formatWithJSX("backdrop-filter", `blur(${numberToFixedString(backgroundBlur.radius / 2)}px)`)
          );
        }
      }
    }
    addData(label, value) {
      const attribute = formatDataAttribute(label, value);
      this.data.push(attribute);
      return this;
    }
    build(additionalStyle = []) {
      this.addStyles(...additionalStyle);
      let classNames = [];
      if (this.name) {
        this.addData("layer", this.name.trim());
      }
      if ("componentProperties" in this.node && this.node.componentProperties) {
        Object.entries(this.node.componentProperties)?.map((prop) => {
          if (prop[1].type === "VARIANT" || prop[1].type === "BOOLEAN") {
            const cleanName = prop[0].split("#")[0].replace(/\s+/g, "-").toLowerCase();
            return formatDataAttribute(cleanName, String(prop[1].value));
          }
          return "";
        }).filter(Boolean).sort().forEach((d) => this.data.push(d));
      }
      const dataAttributes = this.data.join("");
      const classAttribute = formatClassAttribute(classNames);
      const styleAttribute = formatStyleAttribute(this.styles);
      return `${dataAttributes}${classAttribute}${styleAttribute}`;
    }
  };

  // backend/common/commonTextHeightSpacing.ts
  var commonLineHeight = (lineHeight, fontSize) => {
    switch (lineHeight.unit) {
      case "AUTO":
        return 0;
      case "PIXELS":
        return lineHeight.value;
      case "PERCENT":
        return fontSize * lineHeight.value / 100;
    }
  };
  var commonLetterSpacing = (letterSpacing, fontSize) => {
    switch (letterSpacing.unit) {
      case "PIXELS":
        return letterSpacing.value;
      case "PERCENT":
        return fontSize * letterSpacing.value / 100;
    }
  };

  // backend/html/htmlTextBuilder.ts
  var HtmlTextBuilder = class extends HtmlDefaultBuilder {
    constructor(node) {
      super(node);
    }
    // Override htmlElement to ensure text nodes use paragraph elements
    get htmlElement() {
      return "p";
    }
    getTextSegments(node) {
      const segments = node.styledTextSegments;
      if (!segments) {
        return [];
      }
      return segments.map((segment, index) => {
        const additionalStyles = {};
        const layerBlurStyle = this.getLayerBlurStyle();
        if (layerBlurStyle) {
          additionalStyles.filter = layerBlurStyle;
        }
        const textShadowStyle = this.getTextShadowStyle();
        if (textShadowStyle) {
          additionalStyles["text-shadow"] = textShadowStyle;
        }
        const styleAttributes = formatMultipleJSX({
          color: htmlColorFromFills(segment.fills),
          "font-size": segment.fontSize,
          "font-family": segment.fontName.family,
          "font-style": this.getFontStyle(segment.fontName.style),
          "font-weight": `${segment.fontWeight}`,
          "text-decoration": this.textDecoration(segment.textDecoration),
          "text-transform": this.textTransform(segment.textCase),
          "line-height": this.lineHeight(segment.lineHeight, segment.fontSize),
          "letter-spacing": this.letterSpacing(segment.letterSpacing, segment.fontSize),
          // "text-indent": segment.indentation,
          "word-wrap": "break-word",
          ...additionalStyles
        });
        const charsWithLineBreak = segment.characters.split("\n").join("<br/>");
        const result = {
          style: styleAttributes,
          text: charsWithLineBreak,
          openTypeFeatures: segment.openTypeFeatures
        };
        return result;
      });
    }
    fontSize(node, isUI = false) {
      if (node.fontSize !== figma.mixed) {
        const value = isUI ? Math.min(node.fontSize, 24) : node.fontSize;
        this.addStyles(formatWithJSX("font-size", value));
      }
      return this;
    }
    textTrim() {
      if ("leadingTrim" in this.node && this.node.leadingTrim === "CAP_HEIGHT") {
        this.addStyles(formatWithJSX("text-box-trim", "trim-both"));
        this.addStyles(formatWithJSX("text-box-edge", "cap alphabetic"));
      }
      return this;
    }
    textDecoration(textDecoration) {
      switch (textDecoration) {
        case "STRIKETHROUGH":
          return "line-through";
        case "UNDERLINE":
          return "underline";
        case "NONE":
          return "";
      }
    }
    textTransform(textCase) {
      switch (textCase) {
        case "UPPER":
          return "uppercase";
        case "LOWER":
          return "lowercase";
        case "TITLE":
          return "capitalize";
        case "ORIGINAL":
        case "SMALL_CAPS":
        case "SMALL_CAPS_FORCED":
        default:
          return "";
      }
    }
    letterSpacing(letterSpacing, fontSize) {
      const letterSpacingProp = commonLetterSpacing(letterSpacing, fontSize);
      if (letterSpacingProp > 0) {
        return letterSpacingProp;
      }
      return null;
    }
    lineHeight(lineHeight, fontSize) {
      const lineHeightProp = commonLineHeight(lineHeight, fontSize);
      if (lineHeightProp > 0) {
        return lineHeightProp;
      }
      return null;
    }
    /**
     * https://tailwindcss.com/docs/font-style/
     * example: font-extrabold
     * example: italic
     */
    getFontStyle(style) {
      if (style.toLowerCase().match("italic")) {
        return "italic";
      }
      return "";
    }
    textAlignHorizontal() {
      const node = this.node;
      if (node.textAlignHorizontal && node.textAlignHorizontal !== "LEFT") {
        let textAlign = "";
        switch (node.textAlignHorizontal) {
          case "CENTER":
            textAlign = "center";
            break;
          case "RIGHT":
            textAlign = "right";
            break;
          case "JUSTIFIED":
            textAlign = "justify";
            break;
        }
        this.addStyles(formatWithJSX("text-align", textAlign));
      }
      return this;
    }
    textAlignVertical() {
      const node = this.node;
      if (node.textAlignVertical && node.textAlignVertical !== "TOP") {
        let alignItems = "";
        switch (node.textAlignVertical) {
          case "CENTER":
            alignItems = "center";
            break;
          case "BOTTOM":
            alignItems = "flex-end";
            break;
        }
        if (alignItems) {
          this.addStyles(formatWithJSX("justify-content", alignItems));
          this.addStyles(formatWithJSX("display", "flex"));
          this.addStyles(formatWithJSX("flex-direction", "column"));
        }
      }
      return this;
    }
    /**
     * Returns a CSS filter value for layer blur.
     */
    getLayerBlurStyle() {
      if (this.node && this.node.effects) {
        const effects = this.node.effects;
        const blurEffect = effects.find(
          (effect) => effect.type === "LAYER_BLUR" && effect.visible !== false && effect.radius > 0
        );
        if (blurEffect && blurEffect.radius) {
          return `blur(${blurEffect.radius}px)`;
        }
      }
      return "";
    }
    /**
     * Returns a CSS text-shadow value if a drop shadow effect is applied.
     */
    getTextShadowStyle() {
      if (this.node && this.node.effects) {
        const effects = this.node.effects;
        const dropShadow = effects.find((effect) => effect.type === "DROP_SHADOW" && effect.visible !== false);
        if (dropShadow) {
          const ds = dropShadow;
          const offsetX = Math.round(ds.offset.x);
          const offsetY = Math.round(ds.offset.y);
          const blurRadius = Math.round(ds.radius);
          const r = Math.round(ds.color.r * 255);
          const g = Math.round(ds.color.g * 255);
          const b = Math.round(ds.color.b * 255);
          const a = ds.color.a;
          return `${offsetX}px ${offsetY}px ${blurRadius}px rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
        }
      }
      return "";
    }
  };

  // backend/html/builderImpl/htmlAutoLayout.ts
  var getFlexDirection = (node) => node.layoutMode === "HORIZONTAL" ? "" : "column";
  var getJustifyContent = (node) => {
    switch (node.primaryAxisAlignItems) {
      case void 0:
      case "MIN":
        return "flex-start";
      case "CENTER":
        return "center";
      case "MAX":
        return "flex-end";
      case "SPACE_BETWEEN":
        return "space-between";
    }
  };
  var getAlignItems = (node) => {
    switch (node.counterAxisAlignItems) {
      case void 0:
      case "MIN":
        return "flex-start";
      case "CENTER":
        return "center";
      case "MAX":
        return "flex-end";
      case "BASELINE":
        return "baseline";
    }
  };
  var getGap = (node) => node.itemSpacing > 0 && node.primaryAxisAlignItems !== "SPACE_BETWEEN" ? node.itemSpacing : "";
  var getFlexWrap = (node) => node.layoutWrap === "WRAP" ? "wrap" : "";
  var getAlignContent = (node) => {
    if (node.layoutWrap !== "WRAP") return "";
    switch (node.counterAxisAlignItems) {
      case void 0:
      case "MIN":
        return "flex-start";
      case "CENTER":
        return "center";
      case "MAX":
        return "flex-end";
      case "BASELINE":
        return "baseline";
      default:
        return "normal";
    }
  };
  var getFlex = (node, autoLayout) => node.parent && "layoutMode" in node.parent && node.parent.layoutMode === autoLayout.layoutMode ? "flex" : "inline-flex";
  var htmlAutoLayoutProps = (node) => formatMultipleJSXArray({
    "flex-direction": getFlexDirection(node),
    "justify-content": getJustifyContent(node),
    "align-items": getAlignItems(node),
    gap: getGap(node),
    display: getFlex(node, node),
    "flex-wrap": getFlexWrap(node),
    "align-content": getAlignContent(node)
  });

  // backend/common/nodeVisibility.ts
  var getVisibleNodes = (nodes) => nodes.filter((d) => d.visible ?? true);

  // node_modules/js-base64/base64.mjs
  var _hasBuffer = typeof Buffer === "function";
  var _TD = typeof TextDecoder === "function" ? new TextDecoder() : void 0;
  var _TE = typeof TextEncoder === "function" ? new TextEncoder() : void 0;
  var b64ch = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var b64chs = Array.prototype.slice.call(b64ch);
  var b64tab = ((a) => {
    let tab = {};
    a.forEach((c, i) => tab[c] = i);
    return tab;
  })(b64chs);
  var _fromCC = String.fromCharCode.bind(String);
  var _U8Afrom = typeof Uint8Array.from === "function" ? Uint8Array.from.bind(Uint8Array) : (it) => new Uint8Array(Array.prototype.slice.call(it, 0));
  var btoaPolyfill = (bin) => {
    let u32, c0, c1, c2, asc = "";
    const pad = bin.length % 3;
    for (let i = 0; i < bin.length; ) {
      if ((c0 = bin.charCodeAt(i++)) > 255 || (c1 = bin.charCodeAt(i++)) > 255 || (c2 = bin.charCodeAt(i++)) > 255)
        throw new TypeError("invalid character found");
      u32 = c0 << 16 | c1 << 8 | c2;
      asc += b64chs[u32 >> 18 & 63] + b64chs[u32 >> 12 & 63] + b64chs[u32 >> 6 & 63] + b64chs[u32 & 63];
    }
    return pad ? asc.slice(0, pad - 3) + "===".substring(pad) : asc;
  };
  var _btoa = typeof btoa === "function" ? (bin) => btoa(bin) : _hasBuffer ? (bin) => Buffer.from(bin, "binary").toString("base64") : btoaPolyfill;

  // backend/common/commonConversionWarnings.ts
  var warnings = /* @__PURE__ */ new Set();
  var addWarning = (warning) => {
    if (warnings.has(warning) === false) {
      console.warn(warning);
    }
    warnings.add(warning);
  };

  // backend/common/exportAsyncProxy.ts
  var isRunning = false;
  var exportAsyncProxy = async (node, settings2) => {
    if (isRunning === false) {
      isRunning = true;
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    const figmaNode = await figma.getNodeByIdAsync(node.id);
    if (figmaNode.exportAsync === void 0) {
      throw new TypeError(
        "Something went wrong. This node doesn't have an exportAsync() function. Maybe check the type before calling this function."
      );
    }
    let result;
    if (settings2.format === "SVG_STRING") {
      result = await figmaNode.exportAsync(settings2);
    } else {
      result = await figmaNode.exportAsync(settings2);
    }
    isRunning = false;
    return result;
  };

  // backend/common/images.ts
  var fillIsImage = ({ type }) => type === "IMAGE";
  var getImageFills = (node) => {
    try {
      return node.fills.filter(fillIsImage);
    } catch (e) {
      return [];
    }
  };
  var nodeHasImageFill = (node) => getImageFills(node).length > 0;
  var imageBytesToBase64 = (bytes) => {
    const binaryString = bytes.reduce((data, byte) => {
      return data + String.fromCharCode(byte);
    }, "");
    const b64 = _btoa(binaryString);
    return `data:image/png;base64,${b64}`;
  };
  var exportNodeAsBase64PNG = async (node, excludeChildren) => {
    if (node.base64 !== void 0 && node.base64 !== "") {
      return node.base64;
    }
    const n = node;
    const temporarilyHideChildren = excludeChildren && "children" in n && n.children.length > 0;
    const parent = n;
    const originalVisibility = /* @__PURE__ */ new Map();
    if (temporarilyHideChildren) {
      parent.children.map(
        (child) => originalVisibility.set(child, child.visible)
      ), // Temporarily hide all children
      parent.children.forEach((child) => {
        child.visible = false;
      });
    }
    const exportSettings = {
      format: "PNG",
      constraint: { type: "SCALE", value: 1 }
    };
    const bytes = await exportAsyncProxy(n, exportSettings);
    if (temporarilyHideChildren) {
      parent.children.forEach((child) => {
        child.visible = originalVisibility.get(child) ?? false;
      });
    }
    addWarning("Some images exported as Base64 PNG");
    const base64 = imageBytesToBase64(bytes);
    node.base64 = base64;
    return base64;
  };

  // backend/node/nodeUtils.ts
  var renderAndAttachSVG = async (node) => {
    if (node.canBeFlattened) {
      if (node.svg) {
        return node;
      }
      try {
        const svg = await exportAsyncProxy(node, {
          format: "SVG_STRING"
        });
        if (node.colorVariableMappings && node.colorVariableMappings.size > 0) {
          let processedSvg = svg;
          const colorAttributeRegex = /(fill|stroke)="([^"]*)"/g;
          processedSvg = processedSvg.replace(colorAttributeRegex, (match, attribute, colorValue) => {
            const normalizedColor = colorValue.toLowerCase().trim();
            const mapping = node.colorVariableMappings.get(normalizedColor);
            if (mapping) {
              return `${attribute}="var(--${mapping.variableName}, ${colorValue})"`;
            }
            return match;
          });
          const styleRegex = /style="([^"]*)(?:(fill|stroke):\s*([^;"]*))(;|\s|")([^"]*)"/g;
          processedSvg = processedSvg.replace(
            styleRegex,
            (match, prefix, property, colorValue, separator, suffix) => {
              const normalizedColor = colorValue.toLowerCase().trim();
              const mapping = node.colorVariableMappings.get(normalizedColor);
              if (mapping) {
                return `style="${prefix}${property}: var(--${mapping.variableName}, ${colorValue})${separator}${suffix}"`;
              }
              return match;
            }
          );
          node.svg = processedSvg;
        } else {
          node.svg = svg;
        }
      } catch (error) {
        console.error(`Error rendering SVG for ${node.type}:${node.id}`);
        console.error(error);
      }
    }
    return node;
  };

  // backend/html/htmlMain.ts
  var selfClosingTags = ["img"];
  var isPreviewGlobal = false;
  var previousExecutionCache;
  var cssCollection = {};
  function getCollectedCSS() {
    if (Object.keys(cssCollection).length === 0) {
      return "";
    }
    return Object.entries(cssCollection).map(([className, { styles }]) => {
      if (!styles.length) return "";
      return `.${className} {
  ${styles.join(";\n  ")}${styles.length ? ";" : ""}
}`;
    }).filter(Boolean).join("\n\n");
  }
  var classNameCounters = /* @__PURE__ */ new Map();
  function resetClassNameCounters() {
    classNameCounters.clear();
  }
  var htmlMain = async (sceneNode, isPreview = false) => {
    isPreviewGlobal = isPreview;
    previousExecutionCache = [];
    cssCollection = {};
    resetClassNameCounters();
    let htmlContent = await htmlWidgetGenerator(sceneNode);
    if (htmlContent.length > 0 && htmlContent.startsWith("\n")) {
      htmlContent = htmlContent.slice(1, htmlContent.length);
    }
    const output = { html: htmlContent };
    if (Object.keys(cssCollection).length > 0) {
      output.css = getCollectedCSS();
    }
    return output;
  };
  var htmlWidgetGenerator = async (sceneNode) => {
    const promiseOfConvertedCode = getVisibleNodes(sceneNode).map(convertNode());
    const code = (await Promise.all(promiseOfConvertedCode)).join("");
    return code;
  };
  var convertNode = () => async (node) => {
    if (node.canBeFlattened) {
      const altNode = await renderAndAttachSVG(node);
      if (altNode.svg) {
        return htmlWrapSVG(altNode);
      }
    }
    switch (node.type) {
      case "RECTANGLE":
      case "ELLIPSE":
        return await htmlContainer(node, "", []);
      case "GROUP":
        return await htmlGroup(node);
      case "FRAME":
      case "COMPONENT":
      case "INSTANCE":
      case "COMPONENT_SET":
        return await htmlFrame(node);
      case "SECTION":
        return await htmlSection(node);
      case "TEXT":
        return htmlText(node);
      case "LINE":
        return htmlLine(node);
      case "VECTOR":
        if (!isPreviewGlobal) {
          addWarning("Vector is not supported");
        }
        return await htmlContainer({ ...node, type: "RECTANGLE" }, "", []);
      default:
        addWarning(`${node.type} node is not supported`);
        return "";
    }
  };
  var htmlWrapSVG = (node) => {
    if (node.svg === "") return "";
    const builder = new HtmlDefaultBuilder(node).addData("svg-wrapper").position();
    return `
<div${builder.build()}>
${node.svg ?? ""}</div>`;
  };
  var htmlGroup = async (node) => {
    if (node.width < 0 || node.height <= 0 || node.children.length === 0) {
      return "";
    }
    const builder = new HtmlDefaultBuilder(node).commonPositionStyles();
    if (builder.styles) {
      const attr = builder.build();
      const generator = await htmlWidgetGenerator(node.children);
      return `
<div${attr}>${indentString(generator)}
</div>`;
    }
    return await htmlWidgetGenerator(node.children);
  };
  var htmlText = (node) => {
    let layoutBuilder = new HtmlTextBuilder(node).commonPositionStyles().textTrim().textAlignHorizontal().textAlignVertical();
    const styledHtml = layoutBuilder.getTextSegments(node);
    previousExecutionCache.push(...styledHtml);
    let content = "";
    if (styledHtml.length === 1) {
      layoutBuilder.addStyles(styledHtml[0].style);
      content = styledHtml[0].text;
      const additionalTag = styledHtml[0].openTypeFeatures.SUBS === true ? "sub" : styledHtml[0].openTypeFeatures.SUPS === true ? "sup" : "";
      if (additionalTag) {
        content = `<${additionalTag}>${content}</${additionalTag}>`;
      }
    } else {
      content = styledHtml.map((style) => {
        const tag = style.openTypeFeatures.SUBS === true ? "sub" : style.openTypeFeatures.SUPS === true ? "sup" : "span";
        return `<${tag} style="${style.style}">${style.text}</${tag}>`;
      }).join("");
    }
    return `
<div${layoutBuilder.build()}>${content}</div>`;
  };
  var htmlFrame = async (node) => {
    const childrenStr = await htmlWidgetGenerator(node.children);
    if (node.layoutMode !== "NONE") {
      const rowColumn = htmlAutoLayoutProps(node);
      return await htmlContainer(node, childrenStr, rowColumn);
    }
    return await htmlContainer(node, childrenStr, []);
  };
  var htmlContainer = async (node, children, additionalStyles = []) => {
    if (node.width <= 0 || node.height <= 0) {
      return children;
    }
    const builder = new HtmlDefaultBuilder(node).commonPositionStyles().commonShapeStyles();
    if (builder.styles || additionalStyles) {
      let tag = "div";
      let src = "";
      if (nodeHasImageFill(node)) {
        const altNode = node;
        const hasChildren = "children" in node && node.children.length > 0;
        const imgUrl = await exportNodeAsBase64PNG(altNode, hasChildren) ?? "";
        if (hasChildren) {
          builder.addStyles(formatWithJSX("background-image", `url(${imgUrl})`));
        } else {
          tag = "img";
          src = ` src="${imgUrl}"`;
        }
      }
      const build = builder.build(additionalStyles);
      if (children) {
        return `
<${tag}${build}${src}>${indentString(children)}
</${tag}>`;
      } else if (selfClosingTags.includes(tag)) {
        return `
<${tag}${build}${src} />`;
      } else {
        return `
<${tag}${build}${src}></${tag}>`;
      }
    }
    return children;
  };
  var htmlSection = async (node) => {
    const childrenStr = await htmlWidgetGenerator(node.children);
    const builder = new HtmlDefaultBuilder(node).size().position().applyFillsToStyle(node.fills, "background");
    if (childrenStr) {
      return `
<div${builder.build()}>${indentString(childrenStr)}
</div>`;
    } else {
      return `
<div${builder.build()}></div>`;
    }
  };
  var htmlLine = (node) => {
    const builder = new HtmlDefaultBuilder(node).commonPositionStyles().commonShapeStyles();
    return `
<div${builder.build()}></div>`;
  };

  // backend/node/processors/iconDetection.ts
  var ICON_PRIMITIVE_TYPES = /* @__PURE__ */ new Set([
    "ELLIPSE",
    "RECTANGLE",
    "STAR",
    "POLYGON",
    "LINE"
  ]);
  var ICON_COMPLEX_VECTOR_TYPES = /* @__PURE__ */ new Set([
    "VECTOR",
    "BOOLEAN_OPERATION"
  ]);
  var ICON_TYPES_IGNORE_SIZE = /* @__PURE__ */ new Set([
    "VECTOR",
    "BOOLEAN_OPERATION",
    "POLYGON",
    "STAR"
  ]);
  var ICON_CONTAINER_TYPES = /* @__PURE__ */ new Set([
    "FRAME",
    "GROUP",
    "COMPONENT",
    "INSTANCE"
  ]);
  var DISALLOWED_ICON_TYPES = /* @__PURE__ */ new Set([
    "SLICE",
    "CONNECTOR",
    "STICKY",
    "SHAPE_WITH_TEXT",
    "CODE_BLOCK",
    "WIDGET",
    "TEXT",
    "COMPONENT_SET"
    // Component sets are containers for components, not icons themselves
  ]);
  var DISALLOWED_CHILD_TYPES = /* @__PURE__ */ new Set([
    "FRAME",
    // No nested frames
    "COMPONENT",
    // No nested components
    "INSTANCE",
    // No nested instances
    "TEXT",
    // No text
    "SLICE",
    "CONNECTOR",
    "STICKY",
    "SHAPE_WITH_TEXT",
    "CODE_BLOCK",
    "WIDGET",
    "COMPONENT_SET"
  ]);
  function isTypicalIconSize(node, maxSize = 64) {
    if (!("width" in node && "height" in node && node.width > 0 && node.height > 0)) {
      return false;
    }
    return node.width <= maxSize && node.height <= maxSize;
  }
  function hasSvgExportSettings(node) {
    const settingsToCheck = node.exportSettings || [];
    return settingsToCheck.some((setting) => setting.format === "SVG");
  }
  function checkChildrenRecursively(children) {
    let hasDisallowedChild = false;
    let hasValidContent = false;
    for (const child of children) {
      if (child.visible === false) {
        continue;
      }
      if (DISALLOWED_CHILD_TYPES.has(child.type)) {
        hasDisallowedChild = true;
        break;
      }
      if (ICON_COMPLEX_VECTOR_TYPES.has(child.type) || ICON_PRIMITIVE_TYPES.has(child.type)) {
        hasValidContent = true;
      } else if (child.type === "GROUP" && "children" in child) {
        const groupResult = checkChildrenRecursively(child.children);
        if (groupResult.hasDisallowedChild) {
          hasDisallowedChild = true;
          break;
        }
        if (groupResult.hasValidContent) {
          hasValidContent = true;
        }
      }
    }
    return { hasDisallowedChild, hasValidContent };
  }
  function isLikelyIcon(node, logDetails = false) {
    const info = [`Node: ${node.name} (${node.type}, ID: ${node.id})`];
    let result = false;
    let reason = "";
    if (DISALLOWED_ICON_TYPES.has(node.type)) {
      reason = `Disallowed Type: ${node.type}`;
      result = false;
    } else if (hasSvgExportSettings(node)) {
      reason = "Has SVG export settings";
      result = true;
    } else if (!("width" in node && "height" in node && node.width > 0 && node.height > 0)) {
      if (ICON_TYPES_IGNORE_SIZE.has(node.type)) {
        reason = `Direct ${node.type} type (no dimensions check needed)`;
        result = true;
      } else {
        reason = "No dimensions";
        result = false;
      }
    } else {
      if (ICON_TYPES_IGNORE_SIZE.has(node.type)) {
        reason = `Direct ${node.type} type (size ignored)`;
        result = true;
      } else if (ICON_PRIMITIVE_TYPES.has(node.type)) {
        if (isTypicalIconSize(node)) {
          reason = `Direct ${node.type} with typical size`;
          result = true;
        } else {
          reason = `Direct ${node.type} but too large (${Math.round(node.width)}x${Math.round(node.height)})`;
          result = false;
        }
      } else if (ICON_CONTAINER_TYPES.has(node.type) && "children" in node) {
        if (!isTypicalIconSize(node)) {
          reason = `Container but too large (${Math.round(node.width)}x${Math.round(node.height)})`;
          result = false;
        } else {
          const visibleChildren = node.children.filter(
            (child) => child.visible !== false
          );
          if (visibleChildren.length === 0) {
            const hasVisibleFill = "fills" in node && Array.isArray(node.fills) && node.fills.some(
              (f) => typeof f === "object" && f !== null && f.visible !== false && ("opacity" in f ? f.opacity ?? 1 : 1) > 0
            );
            const hasVisibleStroke = "strokes" in node && Array.isArray(node.strokes) && node.strokes.some((s) => s.visible !== false);
            if (hasVisibleFill || hasVisibleStroke) {
              reason = "Empty container with visible fill/stroke and typical size";
              result = true;
            } else {
              reason = "Empty container with no visible style";
              result = false;
            }
          } else {
            const checkResult = checkChildrenRecursively(visibleChildren);
            if (checkResult.hasDisallowedChild) {
              reason = "Container has disallowed child type (Text, Frame, Component, Instance, etc.)";
              result = false;
            } else if (!checkResult.hasValidContent) {
              reason = "Container has no vector or primitive content";
              result = false;
            } else {
              reason = "Container with valid children and typical size";
              result = true;
            }
          }
        }
      } else {
        reason = "Not a recognized icon structure (Vector, Primitive, or valid Container)";
        result = false;
      }
    }
    info.push(`Result: ${result ? "YES" : "NO"} (${reason})`);
    if (logDetails) console.log(info.join(" | "));
    return result;
  }

  // backend/node/processors/position.ts
  function calculateRectangleFromBoundingBox(boundingBox, figmaRotationDegrees) {
    const cssRotationDegrees = -figmaRotationDegrees;
    const theta = cssRotationDegrees * Math.PI / 180;
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);
    const absCosTheta = Math.abs(cosTheta);
    const absSinTheta = Math.abs(sinTheta);
    const { width: w_b, height: h_b, x: x_b, y: y_b } = boundingBox;
    const denominator = absCosTheta * absCosTheta - absSinTheta * absSinTheta;
    const h = (w_b * absSinTheta - h_b * absCosTheta) / -denominator;
    const w = (w_b - h * absSinTheta) / absCosTheta;
    const corners = [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h }
    ];
    const rotatedCorners = corners.map(({ x, y }) => ({
      x: x * cosTheta + y * sinTheta,
      y: -x * sinTheta + y * cosTheta
    }));
    const minX = Math.min(...rotatedCorners.map((c) => c.x));
    const minY = Math.min(...rotatedCorners.map((c) => c.y));
    const left = x_b - minX;
    const top = y_b - minY;
    return {
      width: parseFloat(w.toFixed(2)),
      height: parseFloat(h.toFixed(2)),
      left: parseFloat(left.toFixed(2)),
      top: parseFloat(top.toFixed(2)),
      rotation: cssRotationDegrees
    };
  }

  // backend/node/JsonNodeConversor.ts
  var nodeNameCounters = /* @__PURE__ */ new Map();
  var nodesToJSON = async (nodes) => {
    nodeNameCounters.clear();
    const exportJsonStart = Date.now();
    const nodeResults = await Promise.all(
      nodes.map(async (node) => {
        const nodeDoc = (await node.exportAsync({
          format: "JSON_REST_V1"
        })).document;
        let nodeCumulativeRotation = 0;
        if (node.type === "GROUP") {
          nodeDoc.type = "FRAME";
          if ("rotation" in nodeDoc && nodeDoc.rotation) {
            nodeCumulativeRotation = -nodeDoc.rotation * (180 / Math.PI);
            nodeDoc.rotation = 0;
          }
        }
        return {
          nodeDoc,
          nodeCumulativeRotation
        };
      })
    );
    console.log("[debug] initial nodeJson", { ...nodes[0] });
    console.log(`[benchmark][inside nodesToJSON] JSON_REST_V1 export: ${Date.now() - exportJsonStart}ms`);
    const processNodesStart = Date.now();
    const result = [];
    for (let i = 0; i < nodes.length; i++) {
      const processedNode = await processNodePair(
        nodeResults[i].nodeDoc,
        nodes[i],
        void 0,
        nodeResults[i].nodeCumulativeRotation
      );
      if (processedNode !== null) {
        if (Array.isArray(processedNode)) {
          result.push(...processedNode);
        } else {
          result.push(processedNode);
        }
      }
    }
    console.log(`[benchmark][inside nodesToJSON] Process node pairs: ${Date.now() - processNodesStart}ms`);
    return result;
  };
  var processNodePair = async (jsonNode, figmaNode, parentNode, parentCumulativeRotation = 0) => {
    if (!jsonNode.id) return null;
    if (jsonNode.visible === false) return null;
    const nodeType = jsonNode.type;
    if (parentNode) {
      jsonNode.cumulativeRotation = parentCumulativeRotation;
    }
    if ((nodeType === "FRAME" || nodeType === "INSTANCE" || nodeType === "COMPONENT" || nodeType === "COMPONENT_SET") && (!jsonNode.children || jsonNode.children.length === 0)) {
      jsonNode.type = "RECTANGLE";
      return processNodePair(jsonNode, figmaNode, parentNode, parentCumulativeRotation);
    }
    if ("rotation" in jsonNode && jsonNode.rotation) {
      jsonNode.rotation = -jsonNode.rotation * (180 / Math.PI);
    }
    if (nodeType === "GROUP" && jsonNode.children) {
      const processedChildren = [];
      if (Array.isArray(jsonNode.children) && figmaNode && "children" in figmaNode) {
        const visibleJsonChildren = jsonNode.children.filter((child) => child.visible !== false);
        const figmaChildrenById = /* @__PURE__ */ new Map();
        figmaNode.children.forEach((child) => {
          figmaChildrenById.set(child.id, child);
        });
        for (const child of visibleJsonChildren) {
          const figmaChild = figmaChildrenById.get(child.id);
          if (!figmaChild) continue;
          const processedChild = await processNodePair(
            child,
            figmaChild,
            parentNode,
            // The group's parent
            parentCumulativeRotation + (jsonNode.rotation || 0)
          );
          if (processedChild !== null) {
            if (Array.isArray(processedChild)) {
              processedChildren.push(...processedChild);
            } else {
              processedChildren.push(processedChild);
            }
          }
        }
      }
      return processedChildren;
    }
    if (nodeType === "SLICE") {
      return null;
    }
    if (parentNode) {
      jsonNode.parent = parentNode;
    }
    const cleanName = jsonNode.name.trim();
    const count = nodeNameCounters.get(cleanName) || 0;
    nodeNameCounters.set(cleanName, count + 1);
    jsonNode.uniqueName = count === 0 ? cleanName : `${cleanName}_${count.toString().padStart(2, "0")}`;
    if (figmaNode.type === "TEXT") {
      let styledTextSegments = figmaNode.getStyledTextSegments([
        "fontName",
        "fills",
        "fontSize",
        "fontWeight",
        "hyperlink",
        "indentation",
        "letterSpacing",
        "lineHeight",
        "listOptions",
        "textCase",
        "textDecoration",
        "textStyleId",
        "fillStyleId",
        "openTypeFeatures"
      ]);
      if (styledTextSegments.length > 0) {
        const baseSegmentName = (jsonNode.uniqueName || jsonNode.name).replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
        styledTextSegments = await Promise.all(
          styledTextSegments.map(async (segment, index) => {
            const mutableSegment = Object.assign({}, segment);
            if (styledTextSegments.length === 1) {
              mutableSegment.uniqueId = `${baseSegmentName}_span`;
            } else {
              mutableSegment.uniqueId = `${baseSegmentName}_span_${(index + 1).toString().padStart(2, "0")}`;
            }
            return mutableSegment;
          })
        );
        jsonNode.styledTextSegments = styledTextSegments;
      }
      Object.assign(jsonNode, jsonNode.style);
      if (!jsonNode.textAutoResize) {
        jsonNode.textAutoResize = "NONE";
      }
    }
    if ("absoluteBoundingBox" in jsonNode && jsonNode.absoluteBoundingBox) {
      if (jsonNode.parent) {
        const rect = calculateRectangleFromBoundingBox(
          {
            width: jsonNode.absoluteBoundingBox.width,
            height: jsonNode.absoluteBoundingBox.height,
            x: jsonNode.absoluteBoundingBox.x - (jsonNode.parent?.absoluteBoundingBox.x || 0),
            y: jsonNode.absoluteBoundingBox.y - (jsonNode.parent?.absoluteBoundingBox.y || 0)
          },
          -((jsonNode.rotation || 0) + (jsonNode.cumulativeRotation || 0))
        );
        jsonNode.width = rect.width;
        jsonNode.height = rect.height;
        jsonNode.x = rect.left;
        jsonNode.y = rect.top;
      } else {
        jsonNode.width = jsonNode.absoluteBoundingBox.width;
        jsonNode.height = jsonNode.absoluteBoundingBox.height;
        jsonNode.x = 0;
        jsonNode.y = 0;
      }
    }
    if (!parentNode?.canBeFlattened) {
      const isIcon = isLikelyIcon(jsonNode);
      jsonNode.canBeFlattened = isIcon;
      if (isIcon && settings.useColorVariables) {
        jsonNode._collectColorMappings = true;
      }
    } else {
      jsonNode.canBeFlattened = false;
    }
    if ("individualStrokeWeights" in jsonNode && jsonNode.individualStrokeWeights) {
      jsonNode.strokeTopWeight = jsonNode.individualStrokeWeights.top;
      jsonNode.strokeBottomWeight = jsonNode.individualStrokeWeights.bottom;
      jsonNode.strokeLeftWeight = jsonNode.individualStrokeWeights.left;
      jsonNode.strokeRightWeight = jsonNode.individualStrokeWeights.right;
    }
    if ("layoutMode" in jsonNode && jsonNode.layoutMode) {
      if (jsonNode.paddingLeft === void 0) {
        jsonNode.paddingLeft = 0;
      }
      if (jsonNode.paddingRight === void 0) {
        jsonNode.paddingRight = 0;
      }
      if (jsonNode.paddingTop === void 0) {
        jsonNode.paddingTop = 0;
      }
      if (jsonNode.paddingBottom === void 0) {
        jsonNode.paddingBottom = 0;
      }
    }
    if (!jsonNode.layoutMode) jsonNode.layoutMode = "NONE";
    if (!jsonNode.layoutGrow) jsonNode.layoutGrow = 0;
    if (!jsonNode.layoutSizingHorizontal) jsonNode.layoutSizingHorizontal = "FIXED";
    if (!jsonNode.layoutSizingVertical) jsonNode.layoutSizingVertical = "FIXED";
    if (!jsonNode.primaryAxisAlignItems) {
      jsonNode.primaryAxisAlignItems = "MIN";
    }
    if (!jsonNode.counterAxisAlignItems) {
      jsonNode.counterAxisAlignItems = "MIN";
    }
    const hasChildren = "children" in jsonNode && jsonNode.children && Array.isArray(jsonNode.children) && jsonNode.children.length > 0;
    if (jsonNode.layoutSizingHorizontal === "HUG" && !hasChildren) {
      jsonNode.layoutSizingHorizontal = "FIXED";
    }
    if (jsonNode.layoutSizingVertical === "HUG" && !hasChildren) {
      jsonNode.layoutSizingVertical = "FIXED";
    }
    if ("children" in jsonNode && jsonNode.children && Array.isArray(jsonNode.children) && "children" in figmaNode) {
      const visibleJsonChildren = jsonNode.children.filter((child) => child.visible !== false);
      const figmaChildrenById = /* @__PURE__ */ new Map();
      figmaNode.children.forEach((child) => {
        figmaChildrenById.set(child.id, child);
      });
      const cumulative = parentCumulativeRotation + (jsonNode.type === "GROUP" ? jsonNode.rotation || 0 : 0);
      const processedChildren = [];
      for (const child of visibleJsonChildren) {
        const figmaChild = figmaChildrenById.get(child.id);
        if (!figmaChild) continue;
        const processedChild = await processNodePair(child, figmaChild, jsonNode, cumulative);
        if (processedChild !== null) {
          if (Array.isArray(processedChild)) {
            processedChildren.push(...processedChild);
          } else {
            processedChildren.push(processedChild);
          }
        }
      }
      jsonNode.children = processedChildren;
      if (jsonNode.layoutMode === "NONE" || jsonNode.children.some((d) => "layoutPositioning" in d && d.layoutPositioning === "ABSOLUTE")) {
        jsonNode.isRelative = true;
      }
      adjustChildrenOrder(jsonNode);
    }
    return jsonNode;
  };
  function adjustChildrenOrder(node) {
    if (!node.itemReverseZIndex || !node.children || node.layoutMode === "NONE") {
      return;
    }
    const children = node.children;
    const absoluteChildren = [];
    const fixedChildren = [];
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child.layoutPositioning === "ABSOLUTE") {
        absoluteChildren.push(child);
      } else {
        fixedChildren.unshift(child);
      }
    }
    node.children = [...absoluteChildren, ...fixedChildren];
  }

  // backend/main.ts
  figma.showUI(__html__, {
    height: 300,
    width: 400
  });
  figma.on("selectionchange", () => {
    console.log("[DEBUG] selectionchange event - New selection:", figma.currentPage.selection);
    if (figma.currentPage.selection.length === 0) {
      figma.ui.postMessage({
        type: "isSelected" /* IsSelected */,
        data: { isSelected: false }
      });
      return;
    }
    figma.ui.postMessage({
      type: "isSelected" /* IsSelected */,
      data: { isSelected: true }
    });
    figma.ui.postMessage({
      type: "selectionchange" /* SelectionChange */,
      data: {
        selection: figma.currentPage.selection
      }
    });
  });
  figma.loadAllPagesAsync();
  figma.ui.onmessage = (message) => {
    switch (message.type) {
      case "selectionInit" /* SelectionInit */: {
        const { node } = message.data;
        runClone(node);
        break;
      }
      default:
        break;
    }
  };
  async function runClone(node) {
    let convertedSelection;
    convertedSelection = await nodesToJSON([node]);
    console.log("nodeJson", convertedSelection);
    console.log("[debug] convertedSelection", { ...convertedSelection[0] });
    const code = await htmlMain(convertedSelection);
    console.log("code", code);
  }
})();
