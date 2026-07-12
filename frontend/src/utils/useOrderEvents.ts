import { useEffect } from "react";
import {
  subscribeOrderSocket,
  type OrderEventPayload,
} from "./orderSocket";

const isOrderEventPayload = (value: unknown): value is OrderEventPayload => {
  if (!value || typeof value !== "object") return false;

  const payload = value as Partial<OrderEventPayload>;

  return (
    payload.type === "ORDER_CREATED" ||
    payload.type === "ORDER_STATUS_UPDATED" ||
    payload.type === "ORDER_READY"
  );
};

export const useOrderEvents = (
  onEvent: (payload: OrderEventPayload) => void,
  enabled = true
) => {
  useEffect(() => {
    if (!enabled) return undefined;

    return subscribeOrderSocket((payload) => {
      if (isOrderEventPayload(payload)) {
        onEvent(payload);
      }
    });
  }, [enabled, onEvent]);
};
