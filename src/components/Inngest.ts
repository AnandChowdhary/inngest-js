import axios, { AxiosInstance, AxiosResponse } from "axios";
import * as InngestT from "../types";
import { InngestFunction } from "./InngestFunction";
import { InngestStep } from "./InngestStep";

/**
 * A client used to interact with the Inngest API by sending or reacting to
 * events.
 *
 * To provide event typing, make sure to pass in your generated event types as
 * the first generic.
 */
export class Inngest<Events extends Record<string, InngestT.EventPayload>> {
  /**
   * The name of this instance, most commonly the name of the application it
   * resides in.
   */
  public readonly name: string;

  /**
   * Inngest event key, used to send events to Inngest Cloud.
   */
  private readonly eventKey: string;

  /**
   * Base URL for Inngest Cloud.
   */
  public readonly inngestBaseUrl: URL;

  /**
   * The URL of the Inngest Cloud API.
   */
  private readonly inngestApiUrl: URL;

  /**
   * An Axios instance used for communicating with Inngest Cloud.
   *
   * @link https://npm.im/axios
   */
  private readonly client: AxiosInstance;

  constructor(
    /**
     * The name of this instance, most commonly the name of the application it
     * resides in.
     */
    name: string,

    /**
     * Inngest event key, used to send events to Inngest Cloud.
     */
    eventKey: string,
    { inngestBaseUrl = "https://inn.gs/" }: InngestT.ClientOptions = {}
  ) {
    if (!name) {
      throw new Error("A name must be passed to create an Inngest instance.");
    }

    if (!eventKey) {
      throw new Error(
        "An event key must be passed to create an Inngest instance."
      );
    }

    this.name = name;
    this.eventKey = eventKey;
    this.inngestBaseUrl = new URL(inngestBaseUrl);
    this.inngestApiUrl = new URL(`e/${this.eventKey}`, this.inngestBaseUrl);

    this.client = axios.create({
      timeout: 0,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "InngestJS 0.1.0",
      },
      validateStatus: () => true, // all status codes return a response
      maxRedirects: 0,
    });
  }

  #getResponseError(response: AxiosResponse): Error {
    let errorMessage = "Unknown error";
    switch (response.status) {
      case 401:
        errorMessage = "Event key Not Found";
        break;
      case 400:
        errorMessage = "Cannot process event payload";
        break;
      case 403:
        errorMessage = "Forbidden";
        break;
      case 404:
        errorMessage = "Event key not found";
        break;
      case 406:
        errorMessage = `${JSON.stringify(response.data)}`;
        break;
      case 409:
      case 412:
        errorMessage = "Event transformation failed";
        break;
      case 413:
        errorMessage = "Event payload too large";
        break;
      case 500:
        errorMessage = "Internal server error";
        break;
    }
    return new Error(`Inngest API Error: ${response.status} ${errorMessage}`);
  }

  /**
   * Send event(s) to Inngest
   */
  public async send<Event extends keyof Events>(
    name: Event,
    payload: Omit<Events[Event], "name"> | Omit<Events[Event], "name">[]
  ): Promise<boolean> {
    const response = await this.client.post(this.inngestApiUrl.href, {
      ...payload,
      name,
    });

    if (response.status >= 200 && response.status < 300) {
      return true;
    }

    throw this.#getResponseError(response);
  }

  /**
   * Given an event to listen to, run the given function when that event is
   * seen.
   */
  public createFunction<
    Event extends keyof Events,
    Fn extends InngestT.StepFn<Events[Event], string, "step">
  >(name: string, event: Event, fn: Fn): InngestFunction<Events>;
  public createFunction<
    Event extends keyof Events,
    Fn extends InngestT.StepFn<Events[Event], string, "step">
  >(
    opts: InngestT.FunctionOptions,
    event: Event,
    fn: Fn
  ): InngestFunction<Events>;
  public createFunction<
    Event extends keyof Events,
    Fn extends InngestT.StepFn<Events[Event], string, "step">
  >(
    nameOrOpts: string | InngestT.FunctionOptions,
    event: Event,
    fn: Fn
  ): InngestFunction<Events> {
    return new InngestFunction<Events>(
      typeof nameOrOpts === "string" ? { name: nameOrOpts } : nameOrOpts,
      event,
      {
        step: new InngestStep(fn),
      }
    );
  }
}