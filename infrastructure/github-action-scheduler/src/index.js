const BERLIN_TIME_ZONE = "Europe/Berlin";

function berlinClock(scheduledTime) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BERLIN_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(scheduledTime));

  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

export function isMonday0815Berlin(scheduledTime) {
  const clock = berlinClock(scheduledTime);
  return clock.weekday === "Mon" && clock.hour === "08" && clock.minute === "15";
}

export async function dispatchUpdate(env, fetchImpl = fetch) {
  if (!env.GITHUB_TOKEN) throw new Error("GITHUB_TOKEN is not configured");

  const workflow = encodeURIComponent(env.GITHUB_WORKFLOW || "update-data.yml");
  const endpoint = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/actions/workflows/${workflow}/dispatches`;
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "clinicaltrialfailures-cloudflare-scheduler",
      "X-GitHub-Api-Version": "2026-03-10",
    },
    body: JSON.stringify({ ref: env.GITHUB_REF || "main" }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub workflow dispatch failed (${response.status}): ${body.slice(0, 500)}`);
  }

  console.log(JSON.stringify({
    event: "github_workflow_dispatched",
    workflow: env.GITHUB_WORKFLOW || "update-data.yml",
    ref: env.GITHUB_REF || "main",
  }));
}

export default {
  async scheduled(controller, env, ctx) {
    if (!isMonday0815Berlin(controller.scheduledTime)) {
      console.log(JSON.stringify({
        event: "scheduler_skipped_dst_companion_trigger",
        scheduledTime: controller.scheduledTime,
      }));
      return;
    }

    ctx.waitUntil(dispatchUpdate(env));
  },
};
