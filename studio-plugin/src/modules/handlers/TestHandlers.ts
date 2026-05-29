import { LogService } from "@rbxts/services";
import Utils from "../Utils";

const StudioTestService = game.GetService("StudioTestService");
const ServerScriptService = game.GetService("ServerScriptService");
const ScriptEditorService = game.GetService("ScriptEditorService");

const STOP_SIGNAL = "__MCP_STOP__";

interface OutputEntry {
	message: string;
	messageType: string;
	timestamp: number;
}

let testRunning = false;
let outputBuffer: OutputEntry[] = [];
let logConnection: RBXScriptConnection | undefined;
let testResult: unknown;
let testError: string | undefined;
let stopListenerScript: Script | undefined;

function buildStopListenerSource(): string {
	return `local LogService = game:GetService("LogService")
local StudioTestService = game:GetService("StudioTestService")
LogService.MessageOut:Connect(function(message)
	if message == "${STOP_SIGNAL}" then
		pcall(function() StudioTestService:EndTest("stopped_by_mcp") end)
	end
end)`;
}

function injectStopListener() {
	const listener = new Instance("Script");
	listener.Name = "__MCP_StopListener";
	listener.Parent = ServerScriptService;

	const source = buildStopListenerSource();
	const [seOk] = pcall(() => {
		ScriptEditorService.UpdateSourceAsync(listener, () => source);
	});
	if (!seOk) {
		(listener as unknown as { Source: string }).Source = source;
	}

	stopListenerScript = listener;
}

function cleanupStopListener() {
	if (stopListenerScript) {
		pcall(() => stopListenerScript!.Destroy());
		stopListenerScript = undefined;
	}
}

function startPlaytest(requestData: Record<string, unknown>) {
	const mode = requestData.mode as string | undefined;

	if (mode !== "play" && mode !== "run") {
		return { error: 'mode must be "play" or "run"' };
	}

	if (testRunning) {
		return { error: "A test is already running" };
	}

	testRunning = true;
	outputBuffer = [];
	testResult = undefined;
	testError = undefined;

	cleanupStopListener();

	logConnection = LogService.MessageOut.Connect((message, messageType) => {
		if (message === STOP_SIGNAL) return;
		outputBuffer.push({
			message,
			messageType: messageType.Name,
			timestamp: tick(),
		});
	});

	const [injected, injErr] = pcall(() => injectStopListener());
	if (!injected) {
		warn(`[MCP] Failed to inject stop listener: ${injErr}`);
	}

	task.spawn(() => {
		const [ok, result] = pcall(() => {
			if (mode === "play") {
				return StudioTestService.ExecutePlayModeAsync({});
			}
			return StudioTestService.ExecuteRunModeAsync({});
		});

		if (ok) {
			testResult = result;
		} else {
			testError = tostring(result);
		}

		if (logConnection) {
			logConnection.Disconnect();
			logConnection = undefined;
		}
		testRunning = false;

		cleanupStopListener();
	});

	return { success: true, message: `Playtest started in ${mode} mode` };
}

function stopPlaytest(_requestData: Record<string, unknown>) {
	if (!testRunning) {
		return { error: "No test is currently running" };
	}

	warn(STOP_SIGNAL);

	return {
		success: true,
		output: [...outputBuffer],
		outputCount: outputBuffer.size(),
		message: "Playtest stop signal sent.",
	};
}

function getPlaytestOutput(_requestData: Record<string, unknown>) {
	return {
		isRunning: testRunning,
		output: [...outputBuffer],
		outputCount: outputBuffer.size(),
		testResult: testResult !== undefined ? tostring(testResult) : undefined,
		testError,
	};
}

function runTests(data: Record<string, unknown>): unknown {
	const action = data.action as string;

	if (action === "run_script_test") {
		const path = data.script_path as string;
		const inst = Utils.getInstanceByPath(path);
		if (inst && inst.IsA("LuaSourceContainer")) {
			const source = Utils.readScriptSource(inst);
			const [fn, err] = loadstring(source);
			if (!fn) return { success: false, error: `Compile error: ${err}` };
			const [ok, res] = pcall(fn);
			return { success: ok, result: tostring(res) };
		}
		return { error: "Script not found or invalid type" };
	} else if (action === "assert_property") {
		const path = data.instance_path as string;
		const prop = data.property_name as string;
		const expected = data.expected_value;
		const inst = Utils.getInstanceByPath(path);
		if (inst) {
			const [ok, val] = pcall(() => (inst as unknown as Record<string, unknown>)[prop]);
			if (!ok) return { success: false, error: `Failed to get property: ${tostring(val)}` };
			const match = tostring(val) === tostring(expected);
			return { success: match, actual: tostring(val), expected: tostring(expected) };
		}
		return { error: "Instance not found" };
	}

	return { error: `Unknown action: ${action}` };
}

function characterNavigation(requestData: Record<string, unknown>) {
	const action = requestData.action as string;
	const targetPath = requestData.target_path as string;
	const destination = requestData.destination as { x: number; y: number; z: number };

	const instance = Utils.getInstanceByPath(targetPath);
	if (!instance) return { error: `Target not found: ${targetPath}` };

	const humanoid = instance.IsA("Humanoid") ? instance : instance.FindFirstChildOfClass("Humanoid");
	if (!humanoid) return { error: "Humanoid not found in target" };

	if (action === "move_to" && destination) {
		humanoid.MoveTo(new Vector3(destination.x, destination.y, destination.z));
		return { success: true, message: `Moving to ${destination.x}, ${destination.y}, ${destination.z}` };
	} else if (action === "jump") {
		humanoid.Jump = true;
		return { success: true };
	} else if (action === "sit") {
		humanoid.Sit = true;
		return { success: true };
	} else if (action === "get_status") {
		return {
			success: true,
			health: humanoid.Health,
			maxHealth: humanoid.MaxHealth,
			moveDirection: { x: humanoid.MoveDirection.X, y: humanoid.MoveDirection.Y, z: humanoid.MoveDirection.Z },
			walkSpeed: humanoid.WalkSpeed,
			floorMaterial: tostring(humanoid.FloorMaterial),
		};
	}

	return { error: `Unknown action: ${action}` };
}

interface VirtualInputManagerService {
	SendMouseButtonEvent(x: number, y: number, mouseButton: number, isDown: boolean, game: unknown, processed: number): void;
	SendMouseMoveEvent(x: number, y: number, game: unknown): void;
	SendMouseWheelEvent(x: number, y: number, forward: boolean, game: unknown): void;
	SendKeyEvent(isDown: boolean, keyCode: Enum.KeyCode, processed: boolean, game: unknown): void;
}

function simulateMouseInput(requestData: Record<string, unknown>) {
	const VirtualInputManager = game.GetService("VirtualInputManager" as never) as unknown as VirtualInputManagerService;
	const action = requestData.action as string;
	const position = (requestData.position as { x: number; y: number }) || { x: 0, y: 0 };
	const button = (requestData.button as string) || "Left";
	const delta = (requestData.delta as number) || 0;

	const mouseButton = button === "Left" ? Enum.UserInputType.MouseButton1 :
		button === "Right" ? Enum.UserInputType.MouseButton2 :
		Enum.UserInputType.MouseButton3;

	if (action === "click") {
		VirtualInputManager.SendMouseButtonEvent(position.x, position.y, mouseButton.Value, true, game, 0);
		task.wait(0.05);
		VirtualInputManager.SendMouseButtonEvent(position.x, position.y, mouseButton.Value, false, game, 0);
	} else if (action === "move") {
		VirtualInputManager.SendMouseMoveEvent(position.x, position.y, game);
	} else if (action === "button_down") {
		VirtualInputManager.SendMouseButtonEvent(position.x, position.y, mouseButton.Value, true, game, 0);
	} else if (action === "button_up") {
		VirtualInputManager.SendMouseButtonEvent(position.x, position.y, mouseButton.Value, false, game, 0);
	} else if (action === "scroll") {
		VirtualInputManager.SendMouseWheelEvent(position.x, position.y, delta > 0, game);
	}

	return { success: true };
}

function simulateKeyboardInput(requestData: Record<string, unknown>) {
	const VirtualInputManager = game.GetService("VirtualInputManager" as never) as unknown as VirtualInputManagerService;
	const action = requestData.action as string;
	const key = requestData.key as string;

	const keyCode = Enum.KeyCode.GetEnumItems().find((k) => k.Name === key) as Enum.KeyCode;
	if (!keyCode) return { error: `Invalid key: ${key}` };

	if (action === "type") {
		VirtualInputManager.SendKeyEvent(true, keyCode, false, game);
		task.wait(0.05);
		VirtualInputManager.SendKeyEvent(false, keyCode, false, game);
	} else if (action === "key_down") {
		VirtualInputManager.SendKeyEvent(true, keyCode, false, game);
	} else if (action === "key_up") {
		VirtualInputManager.SendKeyEvent(false, keyCode, false, game);
	}

	return { success: true };
}

export = {
	startPlaytest,
	stopPlaytest,
	getPlaytestOutput,
	runTests,
	characterNavigation,
	simulateMouseInput,
	simulateKeyboardInput,
};
