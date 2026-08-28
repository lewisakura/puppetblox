# Puppetblox

A JavaScript library inspired by [Puppeteer](https://pptr.dev/) that provides a high-level API for controlling Roblox
Studio over the Studio MCP server.

<!-- prettier-ignore -->
> [!CAUTION]
> Puppetblox is still heavily experimental and the API has not yet been stabilized. It attempts to mimic Puppeteer's
> API, but there is no guarantee it will continue to do so in the future.

<!-- prettier-ignore -->
> [!WARNING]
> Unlike Puppeteer, Puppetblox cannot run headlessly and requires Roblox Studio to already be opened to the correct
> place file.

## Example

```typescript
import { connect, mouse, keyboard } from "puppetblox";

// Start the Studio MCP server
const studioMcp = await connect();

// Find and attach to an existing Studio instance by name
const studio = await studioMcp.attach({ name: "Place1" });

// Start the game
await studio.startPlaying();

// Create a UI from Luau
await studio.executeLuau(/* luau */ `
local gui = Instance.new("ScreenGui")

local textBox = Instance.new("TextBox")
textBox.Name = "MyTextBox"
textBox.Size = UDim2.fromScale(0.25, 0.25)
textBox.Position = UDim2.fromOffset(200, 200)
textBox.AnchorPoint = Vector2.new(0.5, 0.5)
textBox.Parent = gui

gui.Parent = game.Players.LocalPlayer.PlayerGui
`);

// Click and type into the textbox, and admire your hard work
await studio.input(
  mouse.click("left", { x: 200, y: 200 }),
  mouse.moveTo({ x: 300, y: 300 }),
  keyboard.text("Hello, Puppetblox!"),
  keyboard.wait(3000),
);

// Stop the game
await studio.stopPlaying();

// Cleanup the MCP server
await studioMcp.close();
```
