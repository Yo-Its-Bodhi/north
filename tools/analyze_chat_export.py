"""Find North product conversations in a ChatGPT HTML data export."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


SIGNALS = {
    "north": 1,
    "nova": 4,
    "head north": 8,
    "north blue": 7,
    "morning glass": 7,
    "journey mark": 8,
    "compass calibration": 8,
    "the trail": 5,
    "today's direction": 6,
    "north currently knows": 7,
    "what north has learned": 8,
    "north codex": 9,
    "north test": 7,
    "basecamp": 3,
}


def text_parts(message: dict) -> list[str]:
    content = message.get("content") or {}
    parts = content.get("parts") or []
    return [part for part in parts if isinstance(part, str)]


def load_export(path: Path) -> list[dict]:
    html = path.read_text(encoding="utf-8")
    marker = "var jsonData = "
    start = html.index(marker) + len(marker)
    conversations, _ = json.JSONDecoder().raw_decode(html[start:])
    return conversations


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("export", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    findings = []
    for conversation in load_export(args.export):
        messages = []
        for node in (conversation.get("mapping") or {}).values():
            message = node.get("message")
            if not message:
                continue
            body = "\n".join(text_parts(message)).strip()
            if body:
                messages.append(
                    {
                        "role": (message.get("author") or {}).get("role"),
                        "time": message.get("create_time") or 0,
                        "body": body,
                    }
                )

        title = conversation.get("title") or "Untitled"
        corpus = (title + "\n" + "\n".join(item["body"] for item in messages)).lower()
        score = sum(corpus.count(signal) * weight for signal, weight in SIGNALS.items())
        product_anchors = sum(
            corpus.count(term)
            for term in ("workout", "training", "nova", "journey", "wellness", "companion", "codex")
        )
        if score < 10 or product_anchors < 2:
            continue

        snippets = []
        ordered = sorted(messages, key=lambda item: item["time"])
        for item in ordered:
            lower = item["body"].lower()
            if not any(signal in lower for signal in SIGNALS if signal != "north"):
                continue
            cleaned = re.sub(r"\s+", " ", item["body"])
            snippets.append({"role": item["role"], "time": item["time"], "text": cleaned[:900]})
        findings.append(
            {
                "id": conversation.get("conversation_id"),
                "title": title,
                "updated": conversation.get("update_time"),
                "score": score,
                "message_count": len(messages),
                "snippets": snippets[-12:],
            }
        )

    findings.sort(key=lambda item: (item["score"], item["updated"] or 0), reverse=True)
    args.output.write_text(json.dumps(findings[:80], ensure_ascii=False, indent=2), encoding="utf-8")
    for item in findings[:40]:
        print(f"{item['score']:>5}  {item['id']}  {item['title']}  ({item['message_count']} messages)")


if __name__ == "__main__":
    main()
