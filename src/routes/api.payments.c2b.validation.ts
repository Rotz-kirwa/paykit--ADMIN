import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/payments/c2b/validation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { handleC2bValidation } = await import("../lib/mpesa-callback.server");

          return Response.json(await handleC2bValidation(body));
        } catch (error) {
          console.error("[api/payments/c2b/validation]", error);

          return Response.json(
            { ResultCode: 1, ResultDesc: "Failed to process validation" },
            { status: 500 },
          );
        }
      },
    },
  },
});
