/**
 * The whole app is one state machine (HANDOFF.md §5). There are no URL routes per screen,
 * so the booth device can never navigate "back" into a previous visitor's session.
 * The session lives in client memory only and is wiped by Start over / Not now / timeouts.
 * Audio is never stored here.
 */
import type { Lang } from "./i18n";
import type { ErrorState } from "./schemas";
import type { Brief, BriefField, HistoryItem, Localized, QuickAnswer, Strategy } from "./services/types";

export type Screen = "welcome" | "listening" | "conversation" | "create" | "preview" | "email" | "thanks";

/** Which request a "Reconnecting" sheet will retry. */
export type RetryTarget = "conversation" | "strategy" | "email";

export interface SessionState {
  /** Visitor session id ("" until a visitor starts). */
  id: string;
  screen: Screen;
  lang: Lang;
  /** Where LISTENING returns to on cancel. */
  listenFrom: "welcome" | "conversation";
  brief: Brief;
  /** Earlier turns, oldest first. The pending answer is in lastAnswer until the AI replies. */
  history: HistoryItem[];
  asking: BriefField | null;
  question: Localized | null;
  quickAnswers: QuickAnswer[];
  lastAnswer: string | null;
  /** A visitor answer is waiting for Conversation.next(). */
  awaiting: boolean;
  /** Increments on every AI turn, so each question is spoken once. */
  turnId: number;
  /** The last turn closed the brief; go to CREATE once it has been spoken. */
  briefDone: boolean;
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
  listenFrom: "welcome",
  brief: {},
  history: [],
  asking: null,
  question: null,
  quickAnswers: [],
  lastAnswer: null,
  awaiting: false,
  turnId: 0,
  briefDone: false,
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
  | { type: "HOLD_START"; id: string }
  | { type: "LISTEN_CANCEL" }
  | { type: "LISTEN_SEND"; transcript: string }
  | { type: "TURN"; brief: Brief; asking: BriefField | null; question: Localized; quickAnswers: QuickAnswer[]; done: boolean }
  | { type: "QUICK_ANSWER"; answer: string }
  | { type: "PICK_EXAMPLE"; brief: Brief; id: string }
  | { type: "BRIEF_COMPLETE" }
  | { type: "STRATEGY_READY"; strategy: Strategy }
  | { type: "EMAIL_REQUEST" }
  | { type: "NOT_NOW" }
  | { type: "EMAIL_SUBMIT"; email: string; name: string; consent: boolean }
  | { type: "EMAIL_REJECTED" }
  | { type: "EMAIL_EDIT" }
  | { type: "EMAIL_SENT" }
  | { type: "ERROR"; state: ErrorState; retry?: RetryTarget }
  | { type: "RETRY" }
  | { type: "DISMISS_ERROR" }
  | { type: "RESET" };

/** Wipes every piece of visitor data (language included); bumps sessionId to drop late replies. */
const wiped = (state: SessionState): SessionState => ({ ...initialState, sessionId: state.sessionId + 1 });

export function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case "SET_LANG":
      return { ...state, lang: action.lang };
    case "HOLD_START":
      if (state.screen !== "welcome" && state.screen !== "conversation") return state;
      return { ...state, id: state.id || action.id, screen: "listening", listenFrom: state.screen, error: null };
    case "LISTEN_CANCEL":
      return state.screen === "listening" ? { ...state, screen: state.listenFrom } : state;
    case "LISTEN_SEND":
      return state.screen === "listening"
        ? { ...state, screen: "conversation", lastAnswer: action.transcript, awaiting: true }
        : state;
    case "TURN": {
      const history: HistoryItem[] = [...state.history];
      if (state.lastAnswer) history.push({ role: "visitor", text: state.lastAnswer });
      history.push({ role: "ai", text: action.question.en });
      return {
        ...state,
        awaiting: false,
        turnId: state.turnId + 1,
        history,
        brief: action.brief,
        asking: action.asking,
        question: action.question,
        quickAnswers: action.quickAnswers,
        briefDone: action.done,
        error: null,
      };
    }
    case "QUICK_ANSWER":
      if (state.screen !== "conversation" || state.awaiting) return state;
      return { ...state, lastAnswer: action.answer, awaiting: true };
    case "PICK_EXAMPLE":
      return { ...state, id: state.id || action.id, brief: action.brief, screen: "create" };
    case "BRIEF_COMPLETE":
      return state.screen === "conversation" ? { ...state, screen: "create" } : state;
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
