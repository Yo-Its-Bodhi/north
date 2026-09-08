import { uniquePngName } from "./ExportFileName";

export type TrophyShareRecord = {
  id: string;
  category: "Strength" | "Endurance" | "Movement" | "Consistency";
  title: string;
  value: string;
  unit: string;
  detail: string;
  date?: string;
  earned: boolean;
  icon: "strength" | "bike" | "run" | "walk" | "time" | "consistency";
  relevance?: number;
};

type TrophyShareTheme = {
  accent: string;
  navy: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
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

function readTheme(): TrophyShareTheme {
  return {
    accent: resolveThemeColor("--blue", "#176b87"),
    navy: resolveThemeColor("--navy", "#193136"),
    surface: resolveThemeColor("--surface-solid", "#ffffff"),
    ink: resolveThemeColor("--ink", "#202d38"),
    muted: resolveThemeColor("--muted", "#667582"),
    line: resolveThemeColor("--line", "rgba(31,64,82,.16)"),
  };
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("North stamp could not load"));
    image.src = source;
  });
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function drawWrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const wrapped = wrapText(context, text, maxWidth);
  const lines = wrapped.slice(0, maxLines);
  if (wrapped.length > maxLines) {
    let finalLine = lines[maxLines - 1];
    while (finalLine && context.measureText(`${finalLine}…`).width > maxWidth) finalLine = finalLine.slice(0, -1);
    lines[maxLines - 1] = `${finalLine.trim()}…`;
  }
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
  return lines.length * lineHeight;
}

function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Trophy PNG could not be created")), "image/png");
  });
}

function fileName(record: TrophyShareRecord) {
  return uniquePngName([
    "north",
    record.earned ? "pr" : "trophy-goal",
    record.title,
    record.value,
    record.unit,
    record.date ? `earned-${record.date}` : undefined,
  ]);
}

export async function renderTrophyPng(record: TrophyShareRecord) {
  await document.fonts.ready;
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Trophy canvas is unavailable");

  const theme = readTheme();
  const headerHeight = 545;
  const inset = 82;
  const contentWidth = width - inset * 2;
  const header = context.createLinearGradient(0, 0, width, headerHeight);
  header.addColorStop(0, theme.navy);
  header.addColorStop(.62, theme.navy);
  header.addColorStop(1, theme.accent);
  context.fillStyle = theme.surface;
  context.fillRect(0, 0, width, height);
  context.fillStyle = header;
  context.fillRect(0, 0, width, headerHeight);

  context.save();
  context.globalAlpha = .12;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 2;
  for (let x = 0; x <= width; x += 72) {
    context.beginPath(); context.moveTo(x, 0); context.lineTo(x, headerHeight); context.stroke();
  }
  for (let y = 0; y <= headerHeight; y += 72) {
    context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
  }
  context.globalAlpha = .1;
  [170, 250, 330].forEach((radius) => {
    context.lineWidth = 28;
    context.beginPath();
    context.arc(width + 70, headerHeight + 50, radius, Math.PI, Math.PI * 1.5);
    context.stroke();
  });
  context.restore();

  const diamondSize = 250;
  const diamondX = width / 2;
  const diamondY = 275;
  context.save();
  context.translate(diamondX, diamondY);
  context.rotate(Math.PI / 4);
  context.fillStyle = "rgba(255,255,255,.07)";
  context.strokeStyle = "rgba(255,255,255,.32)";
  context.lineWidth = 3;
  context.fillRect(-diamondSize / 2, -diamondSize / 2, diamondSize, diamondSize);
  context.strokeRect(-diamondSize / 2, -diamondSize / 2, diamondSize, diamondSize);
  context.strokeStyle = "rgba(255,255,255,.1)";
  context.lineWidth = 18;
  context.strokeRect(-diamondSize / 2 - 25, -diamondSize / 2 - 25, diamondSize + 50, diamondSize + 50);
  context.restore();

  const stamp = await loadImage("/png/transparent/footprint-stamp-offwhite.png").catch(() => null);
  if (stamp) {
    const stampHeight = 215;
    const stampWidth = stamp.naturalWidth / stamp.naturalHeight * stampHeight;
    context.drawImage(stamp, diamondX - stampWidth / 2, diamondY - stampHeight / 2, stampWidth, stampHeight);
  }

  context.fillStyle = "rgba(255,255,255,.82)";
  context.font = '800 24px "DM Sans", sans-serif';
  context.fillText("NORTH TROPHY ROOM", inset, 76);
  context.textAlign = "right";
  context.fillText(record.earned ? "PERSONAL RECORD" : "NEXT TO CLAIM", width - inset, 76);
  context.textAlign = "left";

  context.fillStyle = theme.accent;
  context.font = '800 25px "DM Sans", sans-serif';
  context.fillText(record.earned ? `${record.category.toUpperCase()} RECORD` : "UNCLAIMED TROPHY", inset, 638);
  context.fillStyle = theme.ink;
  context.font = '800 74px "Barlow Condensed", sans-serif';
  const titleHeight = drawWrappedText(context, record.title.toUpperCase(), inset, 730, contentWidth, 68, 3);
  context.fillStyle = theme.muted;
  context.font = '600 30px "DM Sans", sans-serif';
  drawWrappedText(context, record.detail, inset, 730 + titleHeight + 32, contentWidth, 44, 4);

  if (record.date) {
    context.fillStyle = theme.muted;
    context.font = '700 24px "DM Sans", sans-serif';
    context.fillText(new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" }).format(new Date(record.date)), inset, 1100);
  }
  context.strokeStyle = theme.line;
  context.lineWidth = 2;
  context.beginPath(); context.moveTo(inset, 1140); context.lineTo(width - inset, 1140); context.stroke();
  context.fillStyle = theme.ink;
  context.font = `800 ${record.value.length > 12 ? 66 : 104}px "Barlow Condensed", sans-serif`;
  context.fillText(record.value.toUpperCase(), inset, 1252);
  if (record.unit) {
    const valueWidth = context.measureText(record.value.toUpperCase()).width;
    context.fillStyle = theme.accent;
    context.font = '800 27px "DM Sans", sans-serif';
    context.fillText(record.unit.toUpperCase(), Math.min(width - inset - 120, inset + valueWidth + 18), 1252);
  }
  context.textAlign = "right";
  context.fillStyle = theme.muted;
  context.font = '700 20px "DM Sans", sans-serif';
  context.fillText("north.bodhix.io", width - inset, 1262);
  context.textAlign = "left";
  return canvas;
}

export async function shareTrophyPng(record: TrophyShareRecord) {
  const canvas = await renderTrophyPng(record);
  const blob = await canvasBlob(canvas);
  const name = fileName(record);
  const file = new File([blob], name, { type: "image/png" });
  if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: record.title, text: `My North ${record.category.toLowerCase()} record.` });
      return "shared" as const;
    } catch (error) {
      if ((error as DOMException).name === "AbortError") return "cancelled" as const;
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded" as const;
}