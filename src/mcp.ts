import { CallToolResult, Client as MCPClient, TextContent } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

import { Studio } from "./studio.js";
import { StudioMCPError } from "./util.js";

/** An active Studio instance accessible by this MCP server. */
type StudioInstance = {
	/** The GUID of this instance. */
	id: string;

	/** The open place name. */
	name: string;

	/** The open place ID, if in a cloud-saved game. */
	placeId?: number;
};

/** A query to find an active Studio instance to attach to. */
type StudioInstanceQuery = { name: string; placeId?: number } | { name?: string; placeId: number };

const PLACE_ID_REGEX = /(.*) \(placeId: (\d+)\)$/i;

export class StudioMCP {
	#mcp: MCPClient;
	#transport: StdioClientTransport;

	constructor() {
		this.#mcp = new MCPClient({
			name: "puppetblox",
			version: "0.0.0",
		});

		this.#transport = new StdioClientTransport({
			command: "cmd.exe",
			args: ["/c", "%LOCALAPPDATA%\\Roblox\\mcp.bat"],
		});
	}

	async call(toolName: string, args?: Record<string, unknown>): Promise<CallToolResult> {
		const result = await this.#mcp.callTool({
			name: toolName,
			arguments: args,
		});

		if (result.isError) {
			throw new StudioMCPError((result.content[0] as TextContent).text);
		}

		return result;
	}

	async callText(toolName: string, args?: Record<string, unknown>): Promise<string> {
		const result = await this.call(toolName, args);

		const content = result.content[0];

		if (content.type !== "text") {
			throw new Error("MCP server returned incorrect result type");
		}

		return content.text;
	}

	async callJson<T extends object>(toolName: string, args?: Record<string, unknown>): Promise<T> {
		return JSON.parse(await this.callText(toolName, args)) as T;
	}

	/** Connects to the MCP server. */
	async connect() {
		await this.#mcp.connect(this.#transport);
	}

	/** Disconnects from the MCP server. */
	async close() {
		await this.#mcp.close();
	}

	/**
	 * Lists all of the tools the MCP server provides.
	 *
	 * @returns The raw tool call data.
	 */
	async listTools() {
		return await this.#mcp.listTools();
	}

	/**
	 * Lists the active Studio instances currently accessible by the MCP server.
	 *
	 * @returns The active {@link StudioInstance}s.
	 */
	async listActiveStudios(): Promise<StudioInstance[]> {
		const listResult = await this.callJson<{
			studios: { id: string; name: string }[];
		}>("list_roblox_studios");

		const studioInstances: StudioInstance[] = [];
		for (const studio of listResult.studios) {
			const matchResults = studio.name.match(PLACE_ID_REGEX);

			if (!matchResults) {
				studioInstances.push(studio);
				continue;
			}

			const [, name, placeId] = matchResults;

			studioInstances.push({
				id: studio.id,
				name,
				placeId: parseInt(placeId),
			});
		}

		return studioInstances;
	}

	/**
	 * Attaches to an existing Roblox Studio instance.
	 *
	 * @param query Query to find what Studio instance to connect to.
	 * @returns A {@link Studio} instance.
	 * @throws Will throw if a Studio instance that matches the query cannot be found.
	 */
	async attach(query: StudioInstanceQuery): Promise<Studio> {
		const studios = await this.listActiveStudios();

		const targetInstance = studios.find((studio) => studio.placeId === query.placeId || studio.name === query.name);

		if (!targetInstance) {
			throw new Error("No active Studio that meets query");
		}

		const studio = new Studio(this, targetInstance.id);

		// pull current state to sync
		await studio.syncState();

		return studio;
	}
}

/**
 * Connects to the Studio MCP server.
 *
 * @returns A {@link StudioMCP} instance.
 */
export async function connect(): Promise<StudioMCP> {
	const mcpInstance = new StudioMCP();

	await mcpInstance.connect();

	return mcpInstance;
}
