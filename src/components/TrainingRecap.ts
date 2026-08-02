export type TrainingRecapFormat = "square" | "story" | "landscape";

export type TrainingRecapTheme = {
  background: string;
  accent: string;
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
    ink: resolveThemeColor("--ink", "#202d38"),
    muted: resolveThemeColor("--muted", "#667582"),
    line: resolveThemeColor("--line", "rgba(31,64,82,.16)"),
  };
}

function colorChannels(color: string) {
  if (color.startsWith("#")) {
    const value = color.slice(1);
    const full = value.length === 3 ? value.split("").map((part) => part + part).join("") : value;
    if (full.length >= 6) return [0, 2, 4].map((offset) => Number.parseInt(full.slice(offset, offset + 2), 16));
  }
  const values = color.match(/[\d.]+/g)?.map(Number) ?? [];
  if (color.startsWith("color(srgb") && values.length >= 3) return values.slice(0, 3).map((value) => value * 255);
  return values.length >= 3 ? values.slice(0, 3) : [23, 107, 135];
}

function contrastColor(color: string) {
  const [red, green, blue] = colorChannels(color).map((value) => {
    const channel = value / 255;
    return channel <= .03928 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  return .2126 * red + .7152 * green + .0722 * blue > .48 ? "#10191d" : "#ffffff";
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

function drawTintedFootprint(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, maxWidth: number, maxHeight: number, color: string, alpha = 1) {
  const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const layer = document.createElement("canvas");
  layer.width = width;
  layer.height = height;
  const layerContext = layer.getContext("2d");
  if (!layerContext) return;
  layerContext.fillStyle = color;
  layerContext.fillRect(0, 0, width, height);
  layerContext.globalCompositeOperation = "destination-out";
  layerContext.drawImage(image, 0, 0, width, height);
  context.save();
  context.globalAlpha = alpha;
  context.drawImage(layer, x + (maxWidth - width) / 2, y + (maxHeight - height) / 2);
  context.restore();
}

export async function renderTrainingRecap(model: TrainingRecapModel) {
  const [width, height] = formatSize[model.format];
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Training recap canvas is unavailable");

  const footprint = await loadImage("/transparent-background/png/footprint-clean-black-transparent.png").catch(() => null);
  const isStory = model.format === "story";
  const isLandscape = model.format === "landscape";
  const inset = Math.round(width * .075);
  const contentWidth = width - inset * 2;
  const bannerHeight = Math.round(height * .14);
  const bannerInk = contrastColor(model.theme.accent);

  context.fillStyle = model.theme.background;
  context.fillRect(0, 0, width, height);
  context.fillStyle = model.theme.accent;
  context.fillRect(0, 0, width, bannerHeight);

  context.fillStyle = bannerInk;
  context.font = `800 ${isLandscape ? 38 : 32}px "Manrope", sans-serif`;
  context.fillText("NORTH / TRAINING ATLAS", inset, bannerHeight * .59);
  if (footprint) {
    const markHeight = bannerHeight * .64;
    drawTintedFootprint(context, footprint, width - inset - markHeight * .7, bannerHeight * .22, markHeight * .7, markHeight, bannerInk, .92);
  }

  const periodY = bannerHeight + (isStory ? 108 : isLandscape ? 62 : 72);
  context.fillStyle = model.theme.accent;
  context.font = `800 ${isLandscape ? 28 : 24}px "Manrope", sans-serif`;
  context.fillText(model.periodLabel.toUpperCase(), inset, periodY);

  const headlineY = periodY + (isStory ? 108 : isLandscape ? 92 : 96);
  const headlineSize = fitFont(context, model.headline, contentWidth, isLandscape ? 76 : 62, isLandscape ? 48 : 42, '"Manrope", sans-serif');
  context.fillStyle = model.theme.ink;
  context.font = `800 ${headlineSize}px "Manrope", sans-serif`;
  context.fillText(model.headline, inset, headlineY);

  const statsTop = isStory ? 650 : isLandscape ? 335 : 410;
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
    const valueSize = fitFont(context, stat.value, statWidth - 44, isStory ? 46 : 38, 24, '"Manrope", sans-serif');
    context.fillStyle = model.theme.ink;
    context.font = `800 ${valueSize}px "Manrope", sans-serif`;
    context.fillText(stat.value, x + 22, statsTop + (isStory ? 116 : 88));
  });

  const chartTop = Math.round(height * (isStory ? .52 : isLandscape ? .58 : .59));
  const chartBottom = Math.round(height * (isStory ? .83 : isLandscape ? .84 : .84));
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

  context.fillStyle = model.theme.ink;
  context.font = `800 ${isStory ? 20 : 17}px "Manrope", sans-serif`;
  context.fillText("north.bodhix.io", inset, height * .94);
  context.fillStyle = model.theme.muted;
  context.font = `700 ${isStory ? 15 : 13}px "DM Sans", sans-serif`;
  context.fillText("PRIVATE-SAFE TRAINING RECAP", inset, height * .94 + (isStory ? 30 : 24));

  return canvas;
}