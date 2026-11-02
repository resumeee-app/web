import * as React from "react";
import type { ToastActionElement, ToastProps } from "./toast";

/** Maximum number of toasts displayed concurrently */
const TOAST_LIMIT = 3;
/** Delay before dismissed toasts are completely unmounted from the DOM (ms) */
const TOAST_REMOVE_DELAY = 1000;

/**
 * Toast state object representing an active or exiting toast.
 */
export interface ToasterToast extends Omit<ToastProps, "title" | "description"> {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

let count = 0;

function genId(): string {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type ActionType = typeof actionTypes;

type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: ToasterToast;
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<ToasterToast>;
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      toastId?: ToasterToast["id"];
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      toastId?: ToasterToast["id"];
    };

interface State {
  toasts: ToasterToast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: actionTypes.REMOVE_TOAST,
      toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

/**
 * Pure state reducer handling toast queue transitions.
 *
 * @param state - Current toast queue state.
 * @param action - Action to perform on toast state.
 * @returns Updated state copy.
 */
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action;

      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      };
    }
    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

const listeners: Array<(state: State) => void> = [];

let memoryState: State = { toasts: [] };

/**
 * Clears all active toasts and timeouts. Used primarily for test teardown and resets.
 */
export function clearToasts(): void {
  toastTimeouts.forEach((timeout) => clearTimeout(timeout));
  toastTimeouts.clear();
  memoryState = { toasts: [] };
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

/**
 * Configuration options when scheduling a toast notification.
 */
export type ToastOptions = Omit<ToasterToast, "id">;

/**
 * Imperatively enqueues and displays a toast notification.
 *
 * @param props - Toast properties including title, description, and variant.
 * @returns An object with the unique `id`, a `dismiss()` callback, and an `update()` callback.
 */
export function toast({ ...props }: ToastOptions): {
  id: string;
  dismiss: () => void;
  update: (props: ToasterToast) => void;
} {
  const id = genId();

  const update = (updatedProps: ToasterToast) =>
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      toast: { ...updatedProps, id },
    });
  const dismiss = () =>
    dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id });

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return {
    id,
    dismiss,
    update,
  };
}

/**
 * Hook providing reactive access to the toast notifications queue and dispatch functions.
 *
 * @returns An object containing the current `toasts` array, `toast` trigger function, and `dismiss` helper.
 */
export function useToast(): {
  toasts: ToasterToast[];
  toast: typeof toast;
  dismiss: (toastId?: string) => void;
} {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) =>
      dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
  };
}
