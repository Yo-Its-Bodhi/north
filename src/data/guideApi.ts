import { NORTH_API_BASE, northDeviceHeaders, withFreshAccess } from "./account";
import type { GuideAgentSource } from "./guideAgent";

export async function sendGuideQuestion(question: string, sources: GuideAgentSource[]) {
  return withFreshAccess(async (token) => {
    const response = await fetch(`${NORTH_API_BASE}/v1/guide/respond`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...northDeviceHeaders() },
      body: JSON.stringify({ question, sources }),
    });
    const result = await response.json().catch(() => ({})) as { answer?: string; error?: string };
    if (!response.ok || !result.answer) throw new Error(result.error || "North Guide could not answer right now.");
    return result.answer;
  });
}
