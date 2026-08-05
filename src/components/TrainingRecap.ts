export type TrainingRecapFormat = "square" | "story" | "landscape";

export type TrainingRecapTheme = {
  background: string;
  accent: string;
  navy: string;
  ink: string;
  muted: string;
  line: string;
};

export type TrainingRecapModel = {
  format: TrainingRecapFormat;
  periodLabel: string;
  headline: string;
  metricLabel: string;
  metricTotal: string;
  stats: Array<{ label: string; value: string }>;
  buckets: Array<{ label: string; value: number }>;
  theme: TrainingRecapTheme;
};

const formatSize: Record<TrainingRecapFormat, [number, number]> = {
  square: [1080, 1080],
  story: [1080, 1920],
  landscape: [1600, 900],
};

function resolveThemeColor(variable: string, fallback: string) {
  const probe = document.createElement("span");
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  probe.style.color = `var(${variable}, ${fallback})`;
  document.body.append(probe);
  const color = getComputedStyle(probe).color || fallback;
  probe.remove();
  return color;
}

export function readTrainingRecapTheme(): TrainingRecapTheme {
  return {
    background: resolveThemeColor("--surface-solid", "#ffffff"),
    accent: resolveThemeColor("--blue", "#176b87"),
    navy: resolveThemeColor("--navy", "#193136"),
    ink: resolveThemeColor("--ink", "#202d38"),
    muted: resolveThemeColor("--muted", "#667582"),
    line: resolveThemeColor("--line", "rgba(31,64,82,.16)"),
  };
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("North footprint could not load"));
    image.src = source;
  });
}

function fitFont(context: CanvasRenderingContext2D, text: string, maxWidth: number, start: number, minimum: number, family: string) {
  let size = start;
  while (size > minimum) {
    context.font = `800 ${size}px ${family}`;
    if (context.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

export async function renderTrainingRecap(model: TrainingRecapModel) {
  const [width, height] = formatSize[model.format];
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Training recap canvas is unavailable");

  const footprint = await loadImage("/png/transparent/footprint-stamp-offwhite.png").catch(() => null);
  const isStory = model.format === "story";
  const isLandscape = model.format === "landscape";
  const inset = Math.round(width * .075);
  const contentWidth = width - inset * 2;
  const headerHeight = isStory ? 545 : isLandscape ? 240 : 330;

  context.fillStyle = model.theme.background;
  context.fillRect(0, 0, width, height);
  const header = context.createLinearGradient(0, 0, width, headerHeight);
  header.addColorStop(0, model.theme.navy);
  header.addColorStop(.62, model.theme.navy);
  header.addColorStop(1, model.theme.accent);
  context.fillStyle = header;
  context.fillRect(0, 0, width, headerHeight);

  const patternStep = Math.max(54, Math.round(width / 15));
  context.save();
  context.globalAlpha = .12;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 2;
  for (let x = 0; x <= width; x += patternStep) {
    context.beginPath(); context.moveTo(x, 0); context.lineTo(x, headerHeight); context.stroke();
  }
  for (let y = 0; y <= headerHeight; y += patternStep) {
    context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
  }
  context.globalAlpha = .1;
  const arcScale = Math.min(width / 1080, headerHeight / 545);
  [170, 250, 330].forEach((radius) => {
    context.lineWidth = Math.max(12, 28 * arcScale);
    context.beginPath();
    context.arc(width + 70 * arcScale, headerHeight + 50 * arcScale, radius * arcScale, Math.PI, Math.PI * 1.5);
    context.stroke();
  });
  context.restore();

  const diamondSize = Math.min(width * .23, headerHeight * .46);
  const diamondX = width / 2;
  const diamondY = headerHeight * .53;
  context.save();
  context.translate(diamondX, diamondY);
  context.rotate(Math.PI / 4);
  context.fillStyle = "rgba(255,255,255,.07)";
  context.strokeStyle = "rgba(255,255,255,.32)";
  context.lineWidth = Math.max(2, width / 360);
  context.fillRect(-diamondSize / 2, -diamondSize / 2, diamondSize, diamondSize);
  context.strokeRect(-diamondSize / 2, -diamondSize / 2, diamondSize, diamondSize);
  context.strokeStyle = "rgba(255,255,255,.1)";
  context.lineWidth = Math.max(10, diamondSize * .072);
  context.strokeRect(-diamondSize / 2 - diamondSize * .1, -diamondSize / 2 - diamondSize * .1, diamondSize * 1.2, diamondSize * 1.2);
  context.restore();

  if (footprint) {
    const stampHeight = diamondSize * .86;
    const stampWidth = footprint.naturalWidth / footprint.naturalHeight * stampHeight;
    context.drawImage(footprint, diamondX - stampWidth / 2, diamondY - stampHeight / 2, stampWidth, stampHeight);
  }

  context.fillStyle = "rgba(255,255,255,.82)";
  context.font = `800 ${isLandscape ? 28 : 24}px "DM Sans", sans-serif`;
  context.fillText("NORTH JOURNEY", inset, isLandscape ? 54 : 76);
  context.textAlign = "right";
  context.fillText("TRAINING RECAP", width - inset, isLandscape ? 54 : 76);
  context.textAlign = "left";

  const periodY = headerHeight + (isStory ? 108 : isLandscape ? 48 : 58);
  context.fillStyle = model.theme.accent;
  context.font = `800 ${isLandscape ? 28 : 24}px "Manrope", sans-serif`;
  context.fillText(model.periodLabel.toUpperCase(), inset, periodY);

  const headlineY = periodY + (isStory ? 108 : isLandscape ? 70 : 84);
  const headline = model.headline.toUpperCase();
  const headlineSize = fitFont(context, headline, contentWidth, isLandscape ? 76 : 68, isLandscape ? 48 : 42, '"Barlow Condensed", sans-serif');
  context.fillStyle = model.theme.ink;
  context.font = `800 ${headlineSize}px "Barlow Condensed", sans-serif`;
  context.fillText(headline, inset, headlineY);

  const statsTop = headerHeight + (isStory ? 300 : isLandscape ? 170 : 205);
  const statGap = isLandscape ? 22 : 18;
  const statWidth = (contentWidth - statGap * 2) / 3;
  const statHeight = isStory ? 166 : isLandscape ? 118 : 132;
  model.stats.slice(0, 3).forEach((stat, index) => {
    const x = inset + index * (statWidth + statGap);
    roundedRect(context, x, statsTop, statWidth, statHeight, 18);
    context.save();
    context.globalAlpha = .075;
    context.fillStyle = model.theme.accent;
    context.fill();
    context.restore();
    context.strokeStyle = model.theme.line;
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = model.theme.muted;
    context.font = `800 ${isStory ? 20 : 17}px "DM Sans", sans-serif`;
    context.fillText(stat.label.toUpperCase(), x + 22, statsTop + (isStory ? 48 : 38));
    const valueSize = fitFont(context, stat.value, statWidth - 44, isStory ? 52 : 44, 24, '"Barlow Condensed", sans-serif');
    context.fillStyle = model.theme.ink;
    context.font = `800 ${valueSize}px "Barlow Condensed", sans-serif`;
    context.fillText(stat.value, x + 22, statsTop + (isStory ? 116 : 88));
  });

  const chartTop = statsTop + statHeight + (isStory ? 80 : isLandscape ? 72 : 78);
  const chartBottom = Math.round(height * (isStory ? .86 : isLandscape ? .84 : .84));
  context.fillStyle = model.theme.muted;
  context.font = `800 ${isStory ? 20 : 17}px "DM Sans", sans-serif`;
  context.fillText(`${model.metricLabel.toUpperCase()} BY PERIOD`, inset, chartTop - 34);
  context.textAlign = "right";
  context.fillStyle = model.theme.ink;
  context.font = `800 ${isStory ? 26 : 22}px "Manrope", sans-serif`;
  context.fillText(model.metricTotal, width - inset, chartTop - 34);
  context.textAlign = "left";

  const plotLeft = inset + (isStory ? 62 : 54);
  const plotRight = width - inset;
  const plotTop = chartTop + 18;
  const baseline = chartBottom - (isStory ? 52 : 42);
  const plotHeight = baseline - plotTop;
  const chartMax = Math.max(1, ...model.buckets.map((bucket) => bucket.value));
  for (let line = 0; line <= 2; line += 1) {
    const y = plotTop + plotHeight * line / 2;
    context.strokeStyle = model.theme.line;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(plotLeft, y);
    context.lineTo(plotRight, y);
    context.stroke();
    context.fillStyle = model.theme.muted;
    context.font = `700 ${isStory ? 17 : 14}px "DM Sans", sans-serif`;
    context.textAlign = "right";
    context.fillText(String(Math.round(chartMax * (2 - line) / 2)), plotLeft - 14, y + 5);
  }

  const slotWidth = (plotRight - plotLeft) / Math.max(1, model.buckets.length);
  const barWidth = Math.max(8, Math.min(slotWidth * .54, isStory ? 48 : 42));
  model.buckets.forEach((bucket, index) => {
    const x = plotLeft + index * slotWidth + (slotWidth - barWidth) / 2;
    const barHeight = bucket.value ? Math.max(5, bucket.value / chartMax * plotHeight) : 0;
    if (barHeight) {
      roundedRect(context, x, baseline - barHeight, barWidth, barHeight, Math.min(8, barWidth / 3));
      context.fillStyle = model.theme.accent;
      context.fill();
      context.fillStyle = model.theme.ink;
      context.font = `800 ${isStory ? 16 : 13}px "DM Sans", sans-serif`;
      context.textAlign = "center";
      context.fillText(String(Math.round(bucket.value)), x + barWidth / 2, baseline - barHeight - 12);
    }
    const labelStep = model.buckets.length > 10 ? 2 : 1;
    if (index % labelStep === 0 || index === model.buckets.length - 1) {
      context.fillStyle = model.theme.muted;
      context.font = `700 ${isStory ? 16 : 13}px "DM Sans", sans-serif`;
      context.textAlign = "center";
      context.fillText(bucket.label, x + barWidth / 2, baseline + (isStory ? 34 : 28));
    }
  });
  context.textAlign = "left";

  if (model.buckets.every((bucket) => bucket.value === 0)) {
    context.fillStyle = model.theme.muted;
    context.font = `700 ${isStory ? 22 : 18}px "DM Sans", sans-serif`;
    context.textAlign = "center";
    context.fillText(`No ${model.metricLabel.toLowerCase()} recorded in this period`, (plotLeft + plotRight) / 2, plotTop + plotHeight / 2);
    context.textAlign = "left";
  }

  context.strokeStyle = model.theme.line;
  context.lineWidth = 2;
  context.beginPath(); context.moveTo(inset, height * .91); context.lineTo(width - inset, height * .91); context.stroke();
  context.fillStyle = model.theme.muted;
  context.font = `700 ${isStory ? 20 : 17}px "DM Sans", sans-serif`;
  context.fillText("NORTH TRAINING RECAP", inset, height * .95);
  context.textAlign = "right";
  context.fillText("north.bodhix.io", width - inset, height * .95);
  context.textAlign = "left";

  return canvas;
}