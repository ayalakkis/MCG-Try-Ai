/**
 * The whole app is one state machine. There are no URL routes per screen,
 * so the booth device can never navigate "back" into a previous visitor's session.
 * The session lives in client memory only and is wiped by Start over / Not now / timeouts.
 * Nothing is recorded: the visitor answers by tapping.
 */
import type { Lang } from "./i18n";
import { QUESTIONS } from "./questions";
import type { ErrorState } from "./schemas";
import type { Brief, BriefField, Localized, Strategy } from "./services/types";

export type Screen = "welcome" | "questions" | "create" | "preview" | "email" | "thanks";

/** Which request a "Reconnecting" sheet will retry. */
export type RetryTarget = "strategy" | "email";

export interface SessionState {
  /** Visitor session id ("" until a visitor starts). */
  id: string;
  screen: Screen;
  lang: Lang;
  brief: Brief;
  /** Index into QUESTIONS; QUESTIONS.length = the optional business-name step. */
  step: number;
  /** Increments on reset so late async results from a previous visitor are dropped. */
  sessionId: number;
  strategy: Strategy | null;
  email: string;
  name: string;
  consent: boolean;
  /** Screen 06 submitted; waiting for Email.send() (retried by the "Reconnecting" sheet). */
  sending: boolean;
  /** The server rejected the address: show the inline invalid-email state. */
  emailRejected: boolean;
  /** Error sheet over the current screen (design/reference/orb-states-and-errors.html). */
  error: { state: ErrorState; retry?: RetryTarget } | null;
  /** Increments on "Retry now" / auto-retry so the failed request runs again. */
  retryNonce: number;
}

export const initialState: SessionState = {
  id: "",
  screen: "welcome",
  lang: "en",
  brief: {},
  step: 0,
  sessionId: 0,
  strategy: null,
  email: "",
  name: "",
  consent: true, // TODO: default only if legal approves (HANDOFF §6).
  sending: false,
  emailRejected: false,
  error: null,
  retryNonce: 0,
};

export type Action =
  | { type: "SET_LANG"; lang: Lang }
  | { type: "START"; id: string }
  /** A tapped (or typed "Other") answer to the current question. */
  | { type: "ANSWER"; field: BriefField; value: Localized; optionId: string }
  | { type: "BACK" }
  /** Last step: the optional business name, then CREATE. */
  | { type: "QUESTIONS_DONE"; brandName: string }
  | { type: "STRATEGY_READY"; strategy: Strategy }
  | { type: "EMAIL_REQUEST" }
  | { type: "NOT_NOW" }
  | { type: "EMAIL_SUBMIT"; email: string; name: string; consent: boolean }
  | { type: "EMAIL_REJECTED" }
  | { type: "EMAIL_EDIT" }
  | { type: "EMAIL_SENT" }
  | { type: "ERROR"; state: ErrorState; retry?: RetryTarget }
  /** Email can't be delivered at all (sender not set up): retrying won't help. */
  | { type: "EMAIL_FAILED" }
  | { type: "RETRY" }
  | { type: "DISMISS_ERROR" }
  | { type: "RESET" };

/** Wipes every piece of visitor data (language included); bumps sessionId to drop late replies. */
const wiped = (state: SessionState): SessionState => ({ ...initialState, sessionId: state.sessionId + 1 });

export function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case "SET_LANG":
      return { ...state, lang: action.lang };
    case "START":
      return state.screen === "welcome" ? { ...state, id: state.id || action.id, screen: "questions", step: 0 } : state;
    case "ANSWER": {
      if (state.screen !== "questions" || QUESTIONS[state.step]?.field !== action.field) return state;
      const brief: Brief = { ...state.brief, [action.field]: action.value };
      if (action.field === "business") brief.industry = action.optionId;
      return { ...state, brief, step: state.step + 1 };
    }
    case "BACK":
      if (state.screen !== "questions") return state;
      return state.step === 0 ? { ...state, screen: "welcome" } : { ...state, step: state.step - 1 };
    case "QUESTIONS_DONE": {
      if (state.screen !== "questions") return state;
      const brandName = action.brandName.trim();
      return { ...state, brief: { ...state.brief, brandName: brandName || undefined }, screen: "create" };
    }
    case "STRATEGY_READY":
      return { ...state, strategy: action.strategy, screen: "preview", error: null };
    case "EMAIL_REQUEST":
      return { ...state, screen: "email" };
    case "EMAIL_SUBMIT":
      if (state.screen !== "email" || state.sending) return state;
      return { ...state, email: action.email, name: action.name, consent: action.consent, sending: true, emailRejected: false };
    case "EMAIL_REJECTED":
      return { ...state, sending: false, emailRejected: true };
    case "EMAIL_EDIT":
      return state.emailRejected ? { ...state, emailRejected: false } : state;
    case "EMAIL_FAILED":
      return { ...state, sending: false, error: { state: "send-failed" } };
    case "EMAIL_SENT":
      return state.screen === "email" ? { ...state, sending: false, screen: "thanks", error: null } : state;
    case "ERROR":
      return { ...state, error: { state: action.state, retry: action.retry } };
    case "RETRY":
      return { ...state, error: null, retryNonce: state.retryNonce + 1 };
    case "DISMISS_ERROR":
      return { ...state, error: null };
    case "NOT_NOW":
    case "RESET":
      return wiped(state);
    default:
      return state;
  }
}
