// This file provides standard libraries that are used in some parts of the API
// to provide features that rely on Luau execution a bit easier. They are adapted
// to not require any requires or exports, and to be prepended to any snippet that
// requires them to exist.

import spawn from "./spawn.luau";
import promises from "./promises.luau";

export const SPAWN_LIB = spawn;
export const PROMISES_LIB = `${spawn}\n${promises}`;
