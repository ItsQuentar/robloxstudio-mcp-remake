import { CollectionService, HttpService } from "@rbxts/services";
import Utils from "../Utils";
import Recording from "../Recording";

const ChangeHistoryService = game.GetService("ChangeHistoryService");
const Selection = game.GetService("Selection");

const { getInstancePath, getInstanceByPath, readScriptSource } = Utils;
const { beginRecording, finishRecording } = Recording;

function serializeValue(value: unknown): unknown {
	const vType = typeOf(value);
	if (vType === "Vector3") {
		const v = value as Vector3;
		return { X: v.X, Y: v.Y, Z: v.Z, _type: "Vector3" };
	} else if (vType === "Vector2") {
		const v = value as Vector2;
		return { X: v.X, Y: v.Y, _type: "Vector2" };
	} else if (vType === "Color3") {
		const v = value as Color3;
		return { R: v.R, G: v.G, B: v.B, _type: "Color3" };
	} else if (vType === "CFrame") {
		const v = value as CFrame;
		const components = v.GetComponents();
		return { components, _type: "CFrame" };
	} else if (vType === "UDim2") {
		const v = value as UDim2;
		return {
			X: { Scale: v.X.Scale, Offset: v.X.Offset },
			Y: { Scale: v.Y.Scale, Offset: v.Y.Offset },
			_type: "UDim2",
		};
	} else if (vType === "BrickColor") {
		const v = value as BrickColor;
		return { Name: v.Name, _type: "BrickColor" };
	}
	return value;
}

function deserializeValue(attributeValue: unknown, valueType?: string): unknown {
	if (!typeIs(attributeValue, "table")) return attributeValue;

	const tbl = attributeValue as Record<string, unknown>;
	const t = (tbl._type as string) ?? valueType;

	if (t === "Vector3") {
		return new Vector3((tbl.X as number) ?? 0, (tbl.Y as number) ?? 0, (tbl.Z as number) ?? 0);
	} else if (t === "Vector2") {
		return new Vector2((tbl.X as number) ?? 0, (tbl.Y as number) ?? 0);
	} else if (t === "Color3") {
		return new Color3((tbl.R as number) ?? 0, (tbl.G as number) ?? 0, (tbl.B as number) ?? 0);
	} else if (t === "CFrame") {
		const comps = tbl.components as number[];
		if (comps && comps.size() === 12) {
			return new CFrame(
				comps[0],
				comps[1],
				comps[2],
				comps[3],
				comps[4],
				comps[5],
				comps[6],
				comps[7],
				comps[8],
				comps[9],
				comps[10],
				comps[11],
			);
		}
		const pos = tbl.Position as Record<string, number>;
		if (pos) {
			return new CFrame(pos.X ?? 0, pos.Y ?? 0, pos.Z ?? 0);
		}
		return new CFrame();
	} else if (t === "UDim2") {
		const x = tbl.X as Record<string, number> | undefined;
		const y = tbl.Y as Record<string, number> | undefined;
		return new UDim2(x?.Scale ?? 0, x?.Offset ?? 0, y?.Scale ?? 0, y?.Offset ?? 0);
	} else if (t === "BrickColor") {
		return new BrickColor(((tbl.Name as string) ?? "Medium stone grey") as unknown as "White");
	}
	return attributeValue;
}

function getAttribute(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	const attributeName = requestData.attributeName as string;

	if (!instancePath || !attributeName) {
		return { error: "Instance path and attribute name are required" };
	}

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };

	const [success, result] = pcall(() => {
		const value = instance.GetAttribute(attributeName);
		return {
			instancePath,
			attributeName,
			value: serializeValue(value),
			valueType: typeOf(value),
			exists: value !== undefined,
		};
	});

	if (success) return result;
	return { error: `Failed to get attribute: ${result}` };
}

function setAttribute(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	const attributeName = requestData.attributeName as string;
	const attributeValue = requestData.attributeValue;
	const valueType = requestData.valueType as string | undefined;

	if (!instancePath || !attributeName) {
		return { error: "Instance path and attribute name are required" };
	}

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };
	const recordingId = beginRecording(`Set attribute ${attributeName} on ${instance.Name}`);

	const [success, result] = pcall(() => {
		const value = deserializeValue(attributeValue, valueType);
		instance.SetAttribute(attributeName, value as AttributeValue);

		return {
			success: true, instancePath, attributeName,
			value: attributeValue, message: "Attribute set successfully",
		};
	});

	if (success) {
		finishRecording(recordingId, true);
		return result;
	}
	finishRecording(recordingId, false);
	return { error: `Failed to set attribute: ${result}` };
}

function getAttributes(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	if (!instancePath) return { error: "Instance path is required" };

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };

	const [success, result] = pcall(() => {
		const attributes = instance.GetAttributes();
		const serializedAttributes: Record<string, { value: unknown; type: string }> = {};
		let count = 0;

		for (const [name, value] of pairs(attributes)) {
			serializedAttributes[name as string] = {
				value: serializeValue(value),
				type: typeOf(value),
			};
			count++;
		}

		return { instancePath, attributes: serializedAttributes, count };
	});

	if (success) return result;
	return { error: `Failed to get attributes: ${result}` };
}

function deleteAttribute(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	const attributeName = requestData.attributeName as string;

	if (!instancePath || !attributeName) {
		return { error: "Instance path and attribute name are required" };
	}

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };
	const recordingId = beginRecording(`Delete attribute ${attributeName} from ${instance.Name}`);

	const [success, result] = pcall(() => {
		const existed = instance.GetAttribute(attributeName) !== undefined;
		instance.SetAttribute(attributeName, undefined);

		return {
			success: true, instancePath, attributeName, existed,
			message: existed ? "Attribute deleted successfully" : "Attribute did not exist",
		};
	});

	if (success) {
		finishRecording(recordingId, true);
		return result;
	}
	finishRecording(recordingId, false);
	return { error: `Failed to delete attribute: ${result}` };
}

function getTags(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	if (!instancePath) return { error: "Instance path is required" };

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };

	const [success, result] = pcall(() => {
		const tags = CollectionService.GetTags(instance);
		return { instancePath, tags, count: tags.size() };
	});

	if (success) return result;
	return { error: `Failed to get tags: ${result}` };
}

function addTag(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	const tagName = requestData.tagName as string;

	if (!instancePath || !tagName) {
		return { error: "Instance path and tag name are required" };
	}

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };
	const recordingId = beginRecording(`Add tag ${tagName} to ${instance.Name}`);

	const [success, result] = pcall(() => {
		const alreadyHad = CollectionService.HasTag(instance, tagName);
		CollectionService.AddTag(instance, tagName);

		return {
			success: true, instancePath, tagName, alreadyHad,
			message: alreadyHad ? "Instance already had this tag" : "Tag added successfully",
		};
	});

	if (success) {
		finishRecording(recordingId, true);
		return result;
	}
	finishRecording(recordingId, false);
	return { error: `Failed to add tag: ${result}` };
}

function removeTag(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	const tagName = requestData.tagName as string;

	if (!instancePath || !tagName) {
		return { error: "Instance path and tag name are required" };
	}

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };
	const recordingId = beginRecording(`Remove tag ${tagName} from ${instance.Name}`);

	const [success, result] = pcall(() => {
		const hadTag = CollectionService.HasTag(instance, tagName);
		CollectionService.RemoveTag(instance, tagName);

		return {
			success: true, instancePath, tagName, hadTag,
			message: hadTag ? "Tag removed successfully" : "Instance did not have this tag",
		};
	});

	if (success) {
		finishRecording(recordingId, true);
		return result;
	}
	finishRecording(recordingId, false);
	return { error: `Failed to remove tag: ${result}` };
}

function getTagged(requestData: Record<string, unknown>) {
	const tagName = requestData.tagName as string;
	if (!tagName) return { error: "Tag name is required" };

	const [success, result] = pcall(() => {
		const taggedInstances = CollectionService.GetTagged(tagName);
		const instances = taggedInstances.map((instance) => ({
			name: instance.Name,
			className: instance.ClassName,
			path: getInstancePath(instance),
		}));

		return { tagName, instances, count: instances.size() };
	});

	if (success) return result;
	return { error: `Failed to get tagged instances: ${result}` };
}

function getSelection(_requestData: Record<string, unknown>) {
	const selection = Selection.Get();

	if (selection.size() === 0) {
		return { success: true, selection: [], count: 0, message: "No objects selected" };
	}

	const selectedObjects = selection.map((instance: Instance) => ({
		name: instance.Name,
		className: instance.ClassName,
		path: getInstancePath(instance),
		parent: instance.Parent ? getInstancePath(instance.Parent) : undefined,
	}));

	return {
		success: true,
		selection: selectedObjects,
		count: selection.size(),
		message: `${selection.size()} object(s) selected`,
	};
}

function executeLuau(requestData: Record<string, unknown>) {
	const code = requestData.code as string;
	if (!code || code === "") return { error: "Code is required" };

	const output: string[] = [];
	const oldPrint = print;
	const oldWarn = warn;

	const [success, result] = pcall(() => {
		const [fn, compileError] = loadstring(code);
		if (!fn) error(`Compile error: ${compileError}`);

		const env = setmetatable(
			{
				print: (...args: defined[]) => {
					const parts: string[] = [];
					for (const a of args) parts.push(tostring(a));
					output.push(parts.join("\t"));
					oldPrint(...(args as [defined, ...defined[]]));
				},
				warn: (...args: defined[]) => {
					const parts: string[] = [];
					for (const a of args) parts.push(tostring(a));
					output.push(`[warn] ${parts.join("\t")}`);
					oldWarn(...(args as [defined, ...defined[]]));
				},
			},
			{ __index: (getfenv as unknown as (l: number) => Record<string, unknown>)(1) } as unknown as LuaMetatable<object>,
		);

		(setfenv as unknown as (fn: unknown, env: unknown) => void)(fn, env);
		return fn();
	});

	if (success) {
		return {
			success: true,
			returnValue: result !== undefined ? tostring(result) : undefined,
			output,
			message: "Code executed successfully",
		};
	} else {
		return {
			success: false,
			error: tostring(result),
			output,
			message: "Code execution failed",
		};
	}
}

function undo(_requestData: Record<string, unknown>) {
	const [success, result] = pcall(() => {
		ChangeHistoryService.Undo();
		return {
			success: true,
			message: "Undo executed successfully",
		};
	});

	if (success) return result;
	return { error: `Failed to undo: ${result}` };
}

function redo(_requestData: Record<string, unknown>) {
	const [success, result] = pcall(() => {
		ChangeHistoryService.Redo();
		return {
			success: true,
			message: "Redo executed successfully",
		};
	});

	if (success) return result;
	return { error: `Failed to redo: ${result}` };
}

function historyControl(data: Record<string, unknown>): unknown {
	const action = data.action as string;
	const [ok, result] = pcall(() => {
		if (action === "undo") {
			ChangeHistoryService.Undo();
		} else if (action === "redo") {
			ChangeHistoryService.Redo();
		} else if (action === "set_waypoint") {
			ChangeHistoryService.SetWaypoint((data.waypoint_name as string) || "MCP Waypoint");
		} else if (action === "get_waypoints") {
			return { waypoints: [] }; // ChangeHistoryService doesn't expose list
		}
		return { success: true };
	});
	if (!ok) return { error: tostring(result) };
	return result;
}

function controlSelection(data: Record<string, unknown>): unknown {
	const action = data.action as string;
	const [ok, result] = pcall(() => {
		if (action === "select") {
			const paths = (data.paths as string[]) || [];
			const instances: Instance[] = [];
			for (const p of paths) {
				const inst = getInstanceByPath(p);
				if (inst) instances.push(inst);
			}
			Selection.Set(instances);
		} else if (action === "add_to_selection") {
			const paths = (data.paths as string[]) || [];
			const instances: Instance[] = [];
			for (const p of paths) {
				const inst = getInstanceByPath(p);
				if (inst) instances.push(inst);
			}
			const current = Selection.Get();
			for (const inst of instances) {
				if (!current.includes(inst)) current.push(inst);
			}
			Selection.Set(current);
		} else if (action === "clear_selection") {
			Selection.Set([]);
		} else if (action === "get_selection") {
			const selection = Selection.Get();
			const props = (data.properties as string[]) || ["Name", "ClassName"];
			return {
				selection: selection.map((inst) => {
					const info: Record<string, unknown> = { path: getInstancePath(inst) };
					for (const p of props) {
						pcall(() => {
							info[p] = tostring((inst as unknown as Record<string, unknown>)[p]);
						});
					}
					return info;
				}),
			};
		} else if (action === "focus_camera_on") {
			const paths = (data.paths as string[]) || [];
			const inst = paths.size() > 0 ? getInstanceByPath(paths[0]) : Selection.Get()[0];
			if (inst && inst.IsA("BasePart")) {
				const camera = game.Workspace.CurrentCamera;
				if (camera) camera.CFrame = new CFrame(inst.Position.add(new Vector3(0, 10, 10)), inst.Position);
			} else if (inst && inst.IsA("Model")) {
				const camera = game.Workspace.CurrentCamera;
				if (camera) {
					const [cf, size] = inst.GetBoundingBox();
					camera.CFrame = new CFrame(cf.Position.add(new Vector3(0, size.Y + 10, size.Z + 10)), cf.Position);
				}
			}
		}
		return { success: true };
	});
	if (!ok) return { error: tostring(result) };
	return result;
}

function manageDatastore(data: Record<string, unknown>): unknown {
	const RunService = game.GetService("RunService");
	if (RunService.IsEdit()) {
		return { error: "DataStore operations only work in Studio Test/Run mode with API access enabled." };
	}

	const DataStoreService = game.GetService("DataStoreService");
	const action = data.action as string;
	const storeName = data.store_name as string;
	const store = DataStoreService.GetDataStore(storeName);

	const [ok, result] = pcall(() => {
		if (action === "get_value") {
			return { value: store.GetAsync(data.key as string) };
		} else if (action === "set_value") {
			store.SetAsync(data.key as string, data.value);
			return { success: true };
		} else if (action === "remove_value") {
			store.RemoveAsync(data.key as string);
			return { success: true };
		} else if (action === "list_keys") {
			const pages = store.ListKeysAsync(data.prefix as string);
			const keys: string[] = [];
			let count = 0;
			while (count < 50) {
				const current = pages.GetCurrentPage() as unknown as Record<string, unknown>[];
				for (const entry of current) {
					keys.push(entry.KeyName as string);
					count++;
				}
				if (pages.IsFinished) break;
				pages.AdvanceToNextPageAsync();
			}
			return { keys };
		} else if (action === "increment_value") {
			return { value: store.IncrementAsync(data.key as string, (data.delta as number) || 1) };
		}
		return { error: `Unknown action: ${action}` };
	});

	if (!ok) return { error: tostring(result) };
	return result;
}

// === Feature 24: Changelog Tracker ===
function trackChanges(data: Record<string, unknown>): unknown {
	const action = data.action as string;

	if (action === "start_tracking") {
		Recording.setTracking(true);
		return { success: true, message: "Tracking started" };
	} else if (action === "stop_tracking") {
		Recording.setTracking(false);
		return { success: true, message: "Tracking stopped" };
	} else if (action === "get_changelog") {
		const changeLog = Recording.getLog();
		let md = "# MCP Changelog\n\n";
		for (const entry of changeLog) {
			md += `- [${os.date("%X", entry.time)}] **${entry.tool}** - ${entry.success ? "Success" : "Failure"}\n`;
		}
		return { success: true, changelog: md };
	} else if (action === "clear_changelog") {
		Recording.clearLog();
		return { success: true };
	}

	return { error: `Unknown action: ${action}` };
}

// === Feature 25: Backup Manager ===
function manageBackups(data: Record<string, unknown>): unknown {
	const action = data.action as string;

	if (action === "create_backup") {
		const serialize = (inst: Instance): Record<string, unknown> => {
			const info: Record<string, unknown> = {
				name: inst.Name,
				className: inst.ClassName,
				children: inst.GetChildren().map((c) => serialize(c)),
			};
			if (inst.IsA("LuaSourceContainer")) {
				info.source = readScriptSource(inst);
			}
			return info;
		};

		const backup = {
			timestamp: tick(),
			gameName: game.Name,
			data: serialize(game.Workspace),
		};

		return { success: true, backupSize: HttpService.JSONEncode(backup).size(), backup };
	}

	return { error: `Unknown action: ${action}` };
}

export = {
	getAttribute,
	setAttribute,
	getAttributes,
	deleteAttribute,
	getTags,
	addTag,
	removeTag,
	getTagged,
	getSelection,
	executeLuau,
	undo,
	redo,
	historyControl,
	controlSelection,
	manageDatastore,
	trackChanges,
	manageBackups,
};
