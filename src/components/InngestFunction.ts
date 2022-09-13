import { FunctionConfig, FunctionOptions, Steps } from "../types";
import { Inngest } from "./Inngest";

export class InngestFunction<Events extends Record<string, any>> {
  readonly #inngest: Inngest<Events>;
  readonly #opts: FunctionOptions;
  readonly #trigger: keyof Events;
  readonly #steps: Steps<Events>;

  constructor(
    inngest: Inngest<Events>,
    opts: FunctionOptions,
    trigger: keyof Events,
    steps: Steps<Events>
  ) {
    this.#inngest = inngest;
    this.#opts = opts;
    this.#trigger = trigger;
    this.#steps = steps;
  }

  public get name() {
    return this.#opts.name;
  }

  /**
   * Retrieve the Inngest config for this function.
   */
  private getConfig(
    /**
     * Must be provided a URL that will be used to trigger the step. This
     * function can't be expected to know how it will be accessed, so relies on
     * an outside method providing context.
     */
    url: URL
  ): FunctionConfig {
    return {
      id: this.#opts.name,
      name: this.#opts.name,
      triggers: [{ event: this.#trigger as string }],
      steps: Object.keys(this.#steps).reduce<FunctionConfig["steps"]>(
        (acc, stepId) => {
          return {
            ...acc,
            [stepId]: {
              id: stepId,
              name: stepId,
              runtime: {
                type: "remote",
                url: url.href,
              },
            },
          };
        },
        {}
      ),
    };
  }

  private runStep(stepId: string, data: any): Promise<unknown> {
    const step = this.#steps[stepId];
    if (!step) {
      throw new Error(
        `Could not find step with ID "${stepId}" in function "${this.name}"`
      );
    }

    return step["run"](data);
  }
}
