-- Spawn from red-blox/Util, licensed under the MIT license
-- https://github.com/red-blox/Util/blob/main/libs/Spawn/Spawn.luau

local Spawn

do
	local FreeThreads: { thread } = {}

	local function RunCallback(Callback, Thread, ...)
		Callback(...)
		table.insert(FreeThreads, Thread)
	end

	local function Yielder()
		while true do
			RunCallback(coroutine.yield())
		end
	end

	function Spawn<T...>(Callback: (T...) -> (), ...: T...)
		local Thread
		if #FreeThreads > 0 then
			Thread = FreeThreads[#FreeThreads]
			FreeThreads[#FreeThreads] = nil
		else
			Thread = coroutine.create(Yielder)
			coroutine.resume(Thread)
		end

		task.spawn(Thread, Callback, Thread, ...)
	end
end
