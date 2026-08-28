/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { MouseInputStep } from "./mouse.js";
import { KeyboardInputStep } from "./keyboard.js";

import { type StudioMCP } from "./mcp.js";
import { StudioMCPError } from "./util.js";
import { InstanceHandle } from "./instance.js";
import { PROMISES_LIB } from "./std/index.js";

/** The current editor mode. */
type StudioMode = "Edit" | "Play";
/** An editor context. */
type DatamodelContext = "Edit" | "Client" | "Server";

/** The active Studio state. */
type StudioState = {
	/** The current play mode. */
	mode: StudioMode;

	/** The available contexts accessible from the current play mode. */
	availableDatamodels: DatamodelContext[];

	/** The currently focused context. */
	focusedDatamodel: DatamodelContext;
};

type InputStep = MouseInputStep | KeyboardInputStep;

type WorldLocation =
	| {
			x: number;
			y: number;
			z: number;
			instance_path?: never;
	  }
	| {
			x?: never;
			y?: never;
			z?: never;
			instance_path: string;
	  };

/** An instance of Roblox Studio. */
export class Studio {
	#mcp: StudioMCP;
	#id: string;
	#state: StudioState;

	constructor(mcp: StudioMCP, id: string) {
		this.#mcp = mcp;
		this.#id = id;

		this.#state = {} as StudioState;
	}

	async #call(toolName: string, args?: Record<string, unknown>) {
		return await this.#mcp.call(toolName, {
			...args,
			studio_id: this.#id,
		});
	}

	async #callText(toolName: string, args?: Record<string, unknown>): Promise<string> {
		return await this.#mcp.callText(toolName, {
			...args,
			studio_id: this.#id,
		});
	}

	async #callJson<T extends object>(toolName: string, args?: Record<string, unknown>): Promise<T> {
		return await this.#mcp.callJson<T>(toolName, {
			...args,
			studio_id: this.#id,
		});
	}

	/**
	 * Updates the internal representation of the current {@link StudioState}.
	 *
	 * You only need to do this if you know a user may have changed the state outside of Puppetblox's knowledge. This is
	 * called for you when you initially get a Studio instance.
	 */
	async syncState() {
		// whoever wrote this tool so that it returns markdown instead of JSON, i dislike you greatly, please
		// don't do this in future MCP versions
		const stateMarkdown = await this.#callText("get_studio_state");

		const [modeRaw, availableModelsRaw, focusedModelRaw] = stateMarkdown.split("\n");

		const [, mode] = modeRaw.split(": ");
		const [, availableDatamodels] = availableModelsRaw.split(": ");
		const [, focusedDatamodel] = focusedModelRaw.split(": ");

		this.#state = {
			mode: mode as StudioMode,
			availableDatamodels: availableDatamodels.split(", ") as DatamodelContext[],
			focusedDatamodel: focusedDatamodel as DatamodelContext,
		};
	}

	getStudioState() {
		return this.#state;
	}

	/** Enters the Play {@link StudioMode} if not already in it. */
	async startPlaying() {
		if (this.#state.mode === "Play") return;

		await this.#call("start_stop_play", { is_start: true });
		await this.syncState();
	}

	/** Exits the Play {@link StudioMode} if already in it. */
	async stopPlaying() {
		if (this.#state.mode === "Edit") return;

		await this.#call("start_stop_play", { is_start: false });
		await this.syncState();
	}

	/**
	 * Gets the current console output in Studio.
	 *
	 * @returns {Promise<string>} The console output.
	 */
	async getConsoleOutput(): Promise<string> {
		return await this.#callText("get_console_output");
	}

	/**
	 * Executes Luau code in Studio.
	 *
	 * @param code The Luau script to run.
	 * @param context The {@link DatamodelContext} to run the script in.
	 * @returns The result of the script, or an error.
	 */
	async executeLuau<T>(code: string, context: DatamodelContext = this.#state.focusedDatamodel): Promise<T> {
		// TODO: handle instance return values when MCP is updated
		const wrappedCode = `
			local result = (function() ${code} end)()

			if result ~= nil then
				return game:GetService("HttpService"):JSONEncode(result)
			end
		`;

		try {
			const result = await this.#callText("execute_luau", {
				code: wrappedCode,
				datamodel_type: context,
			});

			if (result === "nil") return null as T;

			return JSON.parse(result);
		} catch (error) {
			if (error instanceof StudioMCPError) {
				// luau execution error?
				if (error.message.includes("CommandExecution")) {
					throw new Error(`Luau execution failed: ${error.message.split("CommandExecution:54: ")[1]}`); // the error message this returns is an awful long internal plugin error
				}

				if (error.message.includes("datamodel is not available")) {
					// rethrow this but with a nicer error message since it's user error
					throw new Error(`Script context ${context} is not valid in current Studio state`);
				}
			}

			throw error;
		}
	}

	async input(...steps: InputStep[]) {
		const batch = new Set<InputStep>();

		const processBatch = async () => {
			const steps = [...batch];

			switch (steps[0].__tag) {
				case "mouse": {
					await this.mouseInputs([...batch] as MouseInputStep[]);
					break;
				}
				case "keyboard": {
					await this.keyboardInputs([...batch] as KeyboardInputStep[]);
					break;
				}
			}

			batch.clear();
		};

		for (const step of steps) {
			const currentTag = [...batch][0]?.__tag || step.__tag; // if we're the first in this batch we just use our own tag

			if (currentTag !== step.__tag) {
				await processBatch();
			}

			batch.add(step);
		}

		await processBatch();
	}

	async mouseInputs(steps: MouseInputStep[]) {
		await this.#call("user_mouse_input", {
			actions: steps,
			datamodel_type: "Client",
		});
	}

	async keyboardInputs(steps: KeyboardInputStep[]) {
		await this.#call("user_keyboard_input", {
			actions: steps,
			datamodel_type: "Client",
		});
	}

	async movePlayerTo(location: WorldLocation, speedMultiplier: number = 1.0) {
		if (speedMultiplier < 0.1 || speedMultiplier > 10.0) {
			throw new Error("`speedMultiplier` can only be 0.1-10.0");
		}

		await this.#call("character_navigation", {
			...location,
			speed_multiplier: speedMultiplier,
			datamodel_type: "Client",
		});
	}

	async $(query: string, context: DatamodelContext = this.#state.focusedDatamodel): Promise<InstanceHandle | null> {
		try {
			const instanceReturnData = await this.executeLuau<{ name: string; type: string }>(
				`
				local descendants = game:QueryDescendants([=====[${query}]=====])

				if #descendants == 0 then return nil end

				return { name = descendants[1]:GetFullName(), type = descendants[1].ClassName }
			`,
				context,
			);

			return new InstanceHandle(this, instanceReturnData.name, instanceReturnData.type);
		} catch {
			return null;
		}
	}

	async $$(query: string, context: DatamodelContext = this.#state.focusedDatamodel): Promise<InstanceHandle[]> {
		try {
			const instanceReturnData = await this.executeLuau<[{ name: string; type: string }]>(
				`
				local descendants = game:QueryDescendants([=====[${query}]=====])

				if #descendants == 0 then return {} end

				local descendantInfo = {}

				for _, item in descendants do
					table.insert(descendantInfo, { name = item:GetFullName(), type = item.ClassName })
				end

				return { name = descendants[1]:GetFullName(), type = descendants[1].ClassName }
			`,
				context,
			);

			const instances: InstanceHandle[] = [];

			for (const item of instanceReturnData) {
				instances.push(new InstanceHandle(this, item.name, item.type));
			}

			return instances;
		} catch {
			return [];
		}
	}

	async inspectInstance(instancePath: string): Promise<any> {
		return this.#callJson<Record<string, any>>("inspect_instance", {
			path: instancePath,
		});
	}

	async waitFor(query: string, timeout?: undefined, context?: DatamodelContext): Promise<InstanceHandle>;
	async waitFor(query: string, timeout?: number, context?: DatamodelContext): Promise<InstanceHandle | null>;
	async waitFor(
		query: string,
		timeout?: number,
		context: DatamodelContext = this.#state.focusedDatamodel,
	): Promise<InstanceHandle | null> {
		try {
			const instanceReturnData = await this.executeLuau<{ name: string; type: string }>(
				`
				${PROMISES_LIB}

				local CollectionService = game:GetService("CollectionService")

				local query = [=====[${query}]=====]
				local timeout = ${timeout ?? "nil"}

				local promise = Promise.new(function(resolve, reject)
					local descendants = game:QueryDescendants(query)

					if #descendants >= 1 then
						resolve(descendants[1])
						return
					end

					local timeoutThread
					if timeout ~= nil then
						timeoutThread = task.delay(timeout, function()
							reject()
						end)
					end

					local collection = CollectionService:CreateCollection(query, game)
					collection.OnAdded = function(instance)
						if timeoutThread ~= nil then task.cancel(timeoutThread) end
						resolve(instance)
						collection:Destroy()
					end
				end)

				local instance = promise:Await()

				return { name = instance:GetFullName(), type = instance.ClassName }
			`,
				context,
			);

			return new InstanceHandle(this, instanceReturnData.name, instanceReturnData.type);
		} catch {
			return null;
		}
	}
}
