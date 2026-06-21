import { observable } from "@legendapp/state";

type Coords = { latitude: number; longitude: number };

export const locationPicker$ = observable<{
  initial: Coords | null;
  confirmed: Coords | null;
}>({
  initial: null,
  confirmed: null,
});
