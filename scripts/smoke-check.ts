const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const smokeBasePath = process.env.SMOKE_BASE_PATH ?? process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const smokeEventId = process.env.SMOKE_EVENT_ID;

type RouteCheck = {
  path: string;
  expected: number[];
  redirect?: RequestRedirect;
  method?: "GET" | "POST";
  headers?: HeadersInit;
  body?: string;
};

const routeChecks: RouteCheck[] = [
  { path: "/", expected: [200] },
  { path: "/login", expected: [200] },
  { path: "/admin", expected: [200, 307, 308], redirect: "manual" },
  { path: "/admin/live", expected: [200, 307, 308], redirect: "manual" },
  { path: "/admin/events", expected: [200, 307, 308], redirect: "manual" },
  { path: "/admin/lucky-draw", expected: [200, 307, 308], redirect: "manual" },
  { path: "/admin/auction", expected: [200, 307, 308], redirect: "manual" },
  { path: "/admin/themes", expected: [200, 307, 308], redirect: "manual" },
  { path: "/admin/settings", expected: [200, 307, 308], redirect: "manual" },
  { path: "/admin/debug", expected: [200, 307, 308], redirect: "manual" },
  { path: "/display/lucky-draw/demo-event", expected: [200] },
  { path: "/display/lucky-draw-all/demo-event", expected: [200] },
  { path: "/display/auction/demo-event", expected: [200] },
  { path: "/display/master/demo-event", expected: [200] },
];

const apiChecks: RouteCheck[] = [
  { path: "/api/display/lucky_draw/demo-event", expected: [200] },
  { path: "/api/display/auction/demo-event", expected: [200] },
  { path: "/api/display/master/demo-event", expected: [200] },
  { path: "/api/realtime/stream", expected: [410] },
  { path: "/api/uploads/sign", expected: [410], redirect: "manual", method: "POST" },
];

if (smokeEventId) {
  apiChecks.unshift({ path: `/api/events/${smokeEventId}/display-state`, expected: [200] });
  apiChecks.push({ path: `/api/export/winners/${smokeEventId}`, expected: [200] });
  apiChecks.push({ path: `/api/export/auction-results/${smokeEventId}`, expected: [200] });
  apiChecks.push({ path: `/api/export/ticket-pool/${smokeEventId}`, expected: [200] });
}

function smokeUrl(path: string) {
  const base = new URL(baseUrl);
  const basePathFromUrl = base.pathname === "/" ? "" : base.pathname.replace(/\/$/, "");
  const configuredBasePath = smokeBasePath.replace(/\/$/, "");
  const prefix = configuredBasePath || basePathFromUrl;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(`${prefix}${normalizedPath}`.replace(/\/+/g, "/"), base.origin);
}

async function runCheck(check: RouteCheck) {
  const response = await fetch(smokeUrl(check.path), {
    method: check.method ?? "GET",
    redirect: check.redirect ?? "follow",
    headers: check.headers,
    body: check.body,
  });

  const passed = check.expected.includes(response.status);
  return {
    ...check,
    status: response.status,
    passed,
  };
}

async function main() {
  const checks = [...routeChecks, ...apiChecks];
  const results = [];

  for (const check of checks) {
    try {
      results.push(await runCheck(check));
    } catch (error) {
      results.push({
        ...check,
        status: 0,
        passed: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  for (const result of results) {
    const prefix = result.passed ? "PASS" : "FAIL";
    console.log(`${prefix} ${result.path} -> ${result.status}${"error" in result ? ` (${result.error})` : ""}`);
  }

  const failed = results.filter((result) => !result.passed);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

void main();
