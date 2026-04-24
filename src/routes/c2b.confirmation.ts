import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/c2b/confirmation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { handleC2bConfirmation } = await import("../lib/mpesa-callback.server");

          return Response.json(await handleC2bConfirmation(body));
        } catch (error) {
          console.error("[c2b/confirmation]", error);

          return Response.json(
            { ResultCode: 1, ResultDesc: "Failed to process confirmation" },
            { status: 500 },
          );
        }
      },
    },
  },
});
