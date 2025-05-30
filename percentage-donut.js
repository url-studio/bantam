// DONUT PERCENTAGE GENERATOR -----------------------------------------------
function initializePercentageDonuts(scope = document) {
  scope.querySelectorAll("[percentage-donut]").forEach(donut => {
    if (donut.__initialized) return;
    donut.__initialized = true;

    const schematic = donut.getAttribute("percentage-donut");
    const classPrefix = donut.getAttribute("class-prefix") || "";
    const additionalClasses = donut.getAttribute("additional-class");
    const additionalClassList = additionalClasses ? additionalClasses.split(" ") : [];

    const pattern = /\[(\d+),\s*([^\]]+)\]/g;
    const rawSegments = [];
    let match;

    while ((match = pattern.exec(schematic)) !== null) {
      const count = parseInt(match[1], 10);
      if (count <= 0) continue;
      let styleClass = match[2].trim();
      if (classPrefix) styleClass = `${classPrefix}${styleClass}`;
      rawSegments.push({ styleClass, count });
    }

    if (rawSegments.length === 0) return;

    const segmentMap = new Map();
    rawSegments.forEach(({ styleClass, count }) => {
      segmentMap.set(styleClass, (segmentMap.get(styleClass) || 0) + count);
    });

    const segments = Array.from(segmentMap.entries())
      .map(([styleClass, count]) => ({ styleClass, count }))
      .filter(seg => seg.count > 0);

    const totalUnits = segments.reduce((sum, seg) => sum + seg.count, 0);

    const size = donut.offsetWidth;
    const strokeWidth = size * 0.18;
    const outerRadius = size / 2;
    const innerRadius = outerRadius - strokeWidth;
    const center = size / 2;
    const gapPx = 1;

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    svg.style.display = "block";
    svg.style.overflow = "visible";

    let currentAngle = -90;

    segments.forEach(({ styleClass, count }) => {
      const percent = count / totalUnits;
      const segmentAngle = 360 * percent;
      const start = currentAngle;
      const end = start + segmentAngle;
      currentAngle = end;

      const fillDiv = document.createElement("div");
      fillDiv.className = styleClass;
      document.body.appendChild(fillDiv);
      const fillColor = getComputedStyle(fillDiv).backgroundColor || "#999";
      fillDiv.remove();

      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", generateWedgePath(center, center, outerRadius, innerRadius, start, end, gapPx));
      path.setAttribute("fill", fillColor);
      svg.appendChild(path);
    });

    // Center hole
    const hole = document.createElementNS(svgNS, "circle");
    hole.setAttribute("cx", center);
    hole.setAttribute("cy", center);
    hole.setAttribute("r", innerRadius * 0.2);
    hole.setAttribute("fill", getComputedStyle(donut).backgroundColor || "#fff");
    svg.appendChild(hole);

    donut.innerHTML = "";
    donut.appendChild(svg);
  });

  function polarToCartesian(cx, cy, r, angleDegrees) {
    const angleRadians = angleDegrees * (Math.PI / 180);
    return {
      x: cx + r * Math.cos(angleRadians),
      y: cy + r * Math.sin(angleRadians),
    };
  }

  function offsetPerpendicular(x, y, cx, cy, amount) {
    const dx = x - cx, dy = y - cy;
    const length = Math.hypot(dx, dy);
    if (length === 0) return { x, y };
    const nx = -dy / length, ny = dx / length;
    return {
      x: x + nx * amount,
      y: y + ny * amount
    };
  }

  function generateWedgePath(cx, cy, outerR, innerR, startDeg, endDeg, gapPx) {
    const gap = gapPx / 2;
    const start = polarToCartesian(cx, cy, outerR, startDeg);
    const end = polarToCartesian(cx, cy, outerR, endDeg);
    const startIn = polarToCartesian(cx, cy, innerR, startDeg);
    const endIn = polarToCartesian(cx, cy, innerR, endDeg);

    const p1 = offsetPerpendicular(start.x, start.y, cx, cy, gap);
    const p2 = offsetPerpendicular(end.x, end.y, cx, cy, -gap);
    const p3 = offsetPerpendicular(endIn.x, endIn.y, cx, cy, -gap);
    const p4 = offsetPerpendicular(startIn.x, startIn.y, cx, cy, gap);

    const largeArc = ((endDeg - startDeg + 360) % 360) > 180 ? 1 : 0;

    return `
      M ${p1.x} ${p1.y}
      A ${outerR} ${outerR} 0 ${largeArc} 1 ${p2.x} ${p2.y}
      L ${p3.x} ${p3.y}
      A ${innerR} ${innerR} 0 ${largeArc} 0 ${p4.x} ${p4.y}
      Z
    `.trim();
  }
}

initializePercentageDonuts();
// END OF DONUT PERCENTAGE GENERATOR -----------------------------------------
