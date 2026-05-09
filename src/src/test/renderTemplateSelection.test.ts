import { describe, expect, it } from "vitest";
import { hasSourceBootstrap, isLocalHostRequest } from "../../api/_lib/platformSettings";

describe("render template selection", () => {
  it("treats raw Vite source bootstrap templates as production-unsafe", () => {
    expect(
      hasSourceBootstrap(`
        <script type="module">
          void import("/src/boot.ts");
        </script>
      `),
    ).toBe(true);

    expect(
      hasSourceBootstrap('<script type="module" crossorigin src="/assets/index-abc123.js"></script>'),
    ).toBe(false);
  });

  it("allows source-template fallback only for localhost requests", () => {
    expect(
      isLocalHostRequest({
        headers: {
          host: "localhost:8080",
        },
      }),
    ).toBe(true);

    expect(
      isLocalHostRequest({
        headers: {
          "x-forwarded-host": "initoption.com",
        },
      }),
    ).toBe(false);
  });
});
