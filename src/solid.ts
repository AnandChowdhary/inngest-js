import type { ApiHandler, Method } from "solid-start/api/types";
import {
  InngestCommHandler,
  ServeHandler,
} from "./components/InngestCommHandler";
import { headerKeys, queryKeys } from "./helpers/consts";
import { allProcessEnv } from "./helpers/env";

/**
 * In SolidStart, serve and register any declared functions with Inngest, making
 * them available to be triggered by events.
 *
 * SolidStart requires that you export a handler per request method, so this
 * exports `GET`, `POST`, and `PUT` methods for you.
 *
 * @example
 * ```
 * import { serve } from "inngest/solid";
 * import { Inngest } from "./components/Inngest";
 *
 * const inngest = new Inngest({ name: "My Solid App" });
 *
 * export const { GET, POST, PUT } = serve(inngest, [...fns]);
 * ```
 *
 * @public
 */
export const serve: ServeHandler = (nameOrInngest, functions, opts) => {
  const handler = new InngestCommHandler(
    "solid",
    nameOrInngest,
    functions,
    {
      ...opts,
    },
    (method: "GET" | "POST" | "PUT", event: Parameters<ApiHandler>[0]) => {
      const isProduction = Boolean(event.env.manifest);
      const env = allProcessEnv();
      const scheme = isProduction ? "https" : "http";
      const url = new URL(
        event.request.url,
        `${scheme}://${event.request.headers.get("Host") || ""}`
      );

      return {
        register: () => {
          if (method === "PUT") {
            return {
              env,
              isProduction,
              url,
              deployId: url.searchParams.get(queryKeys.DeployId) as string,
            };
          }
        },
        run: async () => {
          if (method === "POST") {
            return {
              env,
              isProduction,
              url,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              data: await event.request.json(),
              fnId: url.searchParams.get(queryKeys.FnId) as string,
              stepId: url.searchParams.get(queryKeys.StepId) as string,
              signature: event.request.headers.get(
                headerKeys.Signature
              ) as string,
            };
          }
        },
        view: () => {
          if (method === "GET") {
            return {
              env,
              isProduction,
              url,
              isIntrospection: url.searchParams.has(queryKeys.Introspect),
            };
          }
        },
      };
    },
    ({ body, headers, status }) => {
      return new Response(body, { headers, status });
    }
  ).createHandler();

  return {
    GET: handler.bind(null, "GET"),
    POST: handler.bind(null, "POST"),
    PUT: handler.bind(null, "PUT"),
  } satisfies Partial<Record<Method, ApiHandler>>;
};
