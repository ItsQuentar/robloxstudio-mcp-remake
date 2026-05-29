import Utils from "../Utils";
import Recording from "../Recording";

const { getInstanceByPath, convertPropertyValue, evaluateFormula } = Utils;
const { beginRecording, finishRecording } = Recording;

function setProperty(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	const propertyName = requestData.propertyName as string;
	const propertyValue = requestData.propertyValue;

	if (!instancePath || !propertyName) {
		return { error: "Instance path and property name are required" };
	}

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };
	const recordingId = beginRecording(`Set ${propertyName} property`);

	const inst = instance as unknown as Record<string, unknown>;

	const [success, result] = pcall(() => {
		if (propertyName === "Parent" || propertyName === "PrimaryPart") {
			if (typeIs(propertyValue, "string")) {
				const refInstance = getInstanceByPath(propertyValue);
				if (refInstance) {
					inst[propertyName] = refInstance;
				} else {
					return { error: `${propertyName} instance not found: ${propertyValue}` };
				}
			}
		} else if (propertyName === "Name") {
			instance.Name = tostring(propertyValue);
		} else if (propertyName === "Source" && instance.IsA("LuaSourceContainer")) {
			(instance as unknown as { Source: string }).Source = tostring(propertyValue);
		} else {
			const convertedValue = convertPropertyValue(instance, propertyName, propertyValue);
			if (convertedValue !== undefined) {
				inst[propertyName] = convertedValue;
			} else {
				inst[propertyName] = propertyValue;
			}
		}

		return true;
	});

	if (success) {
		finishRecording(recordingId, true);
		return {
			success: true,
			instancePath,
			propertyName,
			propertyValue,
			message: "Property set successfully",
		};
	} else {
		finishRecording(recordingId, false);
		return { error: `Failed to set property: ${result}`, instancePath, propertyName };
	}
}

function massSetProperty(requestData: Record<string, unknown>) {
	const paths = requestData.paths as string[];
	const propertyName = requestData.propertyName as string;
	const propertyValue = requestData.propertyValue;

	if (!paths || !typeIs(paths, "table") || (paths as defined[]).size() === 0 || !propertyName) {
		return { error: "Paths array and property name are required" };
	}

	const results: Record<string, unknown>[] = [];
	let successCount = 0;
	let failureCount = 0;
	const recordingId = beginRecording(`Mass set ${propertyName} property`);

	for (const path of paths) {
		const instance = getInstanceByPath(path);
		if (instance) {
			const [success, err] = pcall(() => {
				const convertedValue = convertPropertyValue(instance, propertyName, propertyValue);
				if (convertedValue !== undefined) {
					(instance as unknown as Record<string, unknown>)[propertyName] = convertedValue;
				} else {
					(instance as unknown as Record<string, unknown>)[propertyName] = propertyValue;
				}
			});
			if (success) {
				successCount++;
				results.push({ path, success: true, propertyName, propertyValue });
			} else {
				failureCount++;
				results.push({ path, success: false, error: tostring(err) });
			}
		} else {
			failureCount++;
			results.push({ path, success: false, error: "Instance not found" });
		}
	}

	finishRecording(recordingId, successCount > 0);

	return {
		results,
		summary: { total: paths.size(), succeeded: successCount, failed: failureCount },
	};
}

function massGetProperty(requestData: Record<string, unknown>) {
	const paths = requestData.paths as string[];
	const propertyName = requestData.propertyName as string;

	if (!paths || !typeIs(paths, "table") || (paths as defined[]).size() === 0 || !propertyName) {
		return { error: "Paths array and property name are required" };
	}

	const results: Record<string, unknown>[] = [];

	for (const path of paths) {
		const instance = getInstanceByPath(path);
		if (instance) {
			const [success, value] = pcall(() => (instance as unknown as Record<string, unknown>)[propertyName]);
			if (success) {
				results.push({ path, success: true, propertyName, propertyValue: value });
			} else {
				results.push({ path, success: false, error: tostring(value) });
			}
		} else {
			results.push({ path, success: false, error: "Instance not found" });
		}
	}

	return { results, propertyName };
}

function controlLighting(data: Record<string, unknown>): unknown {
	const Lighting = game.GetService("Lighting");
	const action = data.action as string;

	if (action === "get_state") {
		return {
			Brightness: Lighting.Brightness,
			ClockTime: Lighting.ClockTime,
			FogColor: { R: Lighting.FogColor.R, G: Lighting.FogColor.G, B: Lighting.FogColor.B },
			FogEnd: Lighting.FogEnd,
			Ambient: { R: Lighting.Ambient.R, G: Lighting.Ambient.G, B: Lighting.Ambient.B },
		};
	} else if (action === "set_property") {
		const prop = data.property as string;
		const val = data.value;
		const [ok, err] = pcall(() => {
			const converted = convertPropertyValue(Lighting, prop, val);
			(Lighting as unknown as Record<string, unknown>)[prop] = converted !== undefined ? converted : val;
		});
		if (!ok) return { error: tostring(err) };
		return { success: true };
	} else if (action === "set_atmosphere") {
		const atmosphere = Lighting.FindFirstChildWhichIsA("Atmosphere") || new Instance("Atmosphere", Lighting);
		const prop = data.property as string;
		const val = data.value;
		const [ok, err] = pcall(() => {
			const converted = convertPropertyValue(atmosphere, prop, val);
			(atmosphere as unknown as Record<string, unknown>)[prop] = converted !== undefined ? converted : val;
		});
		if (!ok) return { error: tostring(err) };
		return { success: true };
	} else if (action === "apply_preset") {
		const preset = data.preset as string;
		if (preset === "sunset") {
			Lighting.ClockTime = 18;
			Lighting.Brightness = 2;
		} else if (preset === "midnight") {
			Lighting.ClockTime = 0;
			Lighting.Brightness = 0;
		} else if (preset === "noon") {
			Lighting.ClockTime = 12;
			Lighting.Brightness = 3;
		} else if (preset === "space") {
			Lighting.ClockTime = 0;
			Lighting.Ambient = new Color3(0, 0, 0);
			const sky = Lighting.FindFirstChildWhichIsA("Sky") || new Instance("Sky", Lighting);
			sky.StarCount = 5000;
		}
		return { success: true, preset };
	}

	return { error: `Unknown action: ${action}` };
}

// === Feature 22: Grid Snapper ===
let globalGridSize = 1;

function snapToGrid(data: Record<string, unknown>): unknown {
	const action = data.action as string;
	const paths = (data.paths as string[]) || [];

	if (action === "set_grid_size") {
		globalGridSize = (data.grid_size as number) || 1;
		return { success: true, gridSize: globalGridSize };
	}

	const recordingId = beginRecording(`Snap to grid: ${action}`);

	const snap = (v: number, g: number) => math.round(v / g) * g;

	const [ok] = pcall(() => {
		for (const p of paths) {
			const inst = getInstanceByPath(p);
			if (inst && inst.IsA("BasePart")) {
				if (action === "snap_selection" || action === "snap_path") {
					inst.Position = new Vector3(
						snap(inst.Position.X, globalGridSize),
						snap(inst.Position.Y, globalGridSize),
						snap(inst.Position.Z, globalGridSize),
					);
				} else if (action === "snap_rotation") {
					const snapDeg = (data.rotation_snap as number) || 90;
					const rotation = inst.Rotation;
					inst.Rotation = new Vector3(
						snap(rotation.X, snapDeg),
						snap(rotation.Y, snapDeg),
						snap(rotation.Z, snapDeg),
					);
				}
			}
		}
	});

	finishRecording(recordingId, ok);
	return { success: ok };
}

// === Feature 23: Decal & Texture Painter ===
function paintSurfaces(data: Record<string, unknown>): unknown {
	const action = data.action as string;
	const targetPath = data.target_path as string;
	const target = getInstanceByPath(targetPath);
	if (!target || !target.IsA("BasePart")) return { error: "BasePart not found" };

	const recordingId = beginRecording(`Paint surfaces: ${action}`);

	const [ok] = pcall(() => {
		const faces = (data.faces as string[]) || ["Top", "Bottom", "Left", "Right", "Front", "Back"];
		if (action === "apply_decal") {
			for (const f of faces) {
				const decal = new Instance("Decal", target);
				decal.Texture = (data.decal_id as string) || "";
				const face = Enum.NormalId.GetEnumItems().find((e) => e.Name === f);
				if (face) decal.Face = face;
			}
		} else if (action === "apply_texture") {
			for (const f of faces) {
				const tex = new Instance("Texture", target);
				tex.Texture = (data.texture_id as string) || "";
				const face = Enum.NormalId.GetEnumItems().find((e) => e.Name === f);
				if (face) tex.Face = face;
				tex.StudsPerTileU = (data.studs_u as number) || 2;
				tex.StudsPerTileV = (data.studs_v as number) || 2;
			}
		} else if (action === "remove_decals") {
			for (const child of target.GetChildren()) {
				if (child.IsA("Decal") || child.IsA("Texture")) child.Destroy();
			}
		}
	});

	finishRecording(recordingId, ok);
	return { success: ok };
}

export = {
	setProperty,
	massSetProperty,
	massGetProperty,
	controlLighting,
	snapToGrid,
	paintSurfaces,
};
