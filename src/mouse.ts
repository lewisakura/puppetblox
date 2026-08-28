import { type InstanceHandle } from "./instance.js";

export type MouseActionProperties = {
	wait_time_ms?: number;
} & (
	| {
			x?: number;
			y?: number;
			instance_path?: never;
	  }
	| {
			x?: never;
			y?: never;
			instance_path?: string;
	  }
);

export type MouseLocation =
	| {
			x: number;
			y: number;
			instance_path?: never;
	  }
	| {
			x?: never;
			y?: never;
			instance_path: string;
	  };

export type MouseButton = "left" | "right";

export type MouseActionMoveTo = {
	action: "moveTo";
} & MouseActionProperties &
	MouseLocation; // needs an override

export type MouseActionButtons = {
	action: "mouseButtonDown" | "mouseButtonUp" | "mouseButtonClick";
	mouse_button: "left" | "right";
} & MouseActionProperties;

export type MouseActionScroll = {
	action: "scrollUp" | "scrollDown";
} & MouseActionProperties;

export type MouseActionWait = {
	action: "wait";
	wait_time_ms: number;
};

type LocationArg = MouseLocation | InstanceHandle;

/** A mouse input step. */
export type MouseInputStep = (MouseActionMoveTo | MouseActionButtons | MouseActionScroll | MouseActionWait) & {
	__tag: "mouse";
};

// oxlint-disable no-misused-spread -- we're spreading InstanceHandles which have an instance_path

export function click(button: MouseButton, location?: LocationArg): MouseInputStep {
	return {
		__tag: "mouse",

		action: "mouseButtonClick",
		mouse_button: button,

		...location,
	};
}

export function down(button: MouseButton, location?: LocationArg): MouseInputStep {
	return {
		__tag: "mouse",

		action: "mouseButtonDown",
		mouse_button: button,

		...location,
	};
}

export function up(button: MouseButton, location?: LocationArg): MouseInputStep {
	return {
		__tag: "mouse",

		action: "mouseButtonUp",
		mouse_button: button,

		...location,
	};
}

export function scrollDown(location?: LocationArg): MouseInputStep {
	return {
		__tag: "mouse",

		action: "scrollDown",

		...location,
	};
}

export function scrollUp(location?: LocationArg): MouseInputStep {
	return {
		__tag: "mouse",

		action: "scrollUp",

		...location,
	};
}

export function wait(ms: number): MouseInputStep {
	if (ms < 0 || ms > 10000) throw new Error("`ms` can only be 0-10000");

	return {
		__tag: "mouse",

		action: "wait",
		wait_time_ms: ms,
	};
}

export function moveTo(location: LocationArg): MouseInputStep {
	return {
		__tag: "mouse",

		action: "moveTo",
		...location,
	};
}
