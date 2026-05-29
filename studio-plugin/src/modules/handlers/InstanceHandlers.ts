import Utils from "../Utils";
import Recording from "../Recording";

const { getInstancePath, getInstanceByPath, convertPropertyValue } = Utils;
const { beginRecording, finishRecording } = Recording;

type ProcessedCreateResult =
	| {
		instance: Instance;
		className: string;
		parentPath: string;
	}
	| {
		error: string;
		className?: string;
		parentPath?: string;
	};

type ProcessedBatchResult = {
	results: Record<string, unknown>[];
	successCount: number;
	failureCount: number;
};

function processObjectEntries(
	objects: Record<string, unknown>[],
	createFn: (objData: Record<string, unknown>) => ProcessedCreateResult,
): ProcessedBatchResult {
	const results: Record<string, unknown>[] = [];
	let successCount = 0;
	let failureCount = 0;

	const [loopSuccess, loopError] = pcall(() => {
		for (const entry of objects) {
			if (!typeIs(entry, "table")) {
				failureCount++;
				results.push({ success: false, error: "Each object entry must be a table" });
				continue;
			}

			const objData = entry as Record<string, unknown>;
			const className = objData.className as string;
			const parentPath = objData.parent as string;

			if (!className || !parentPath) {
				failureCount++;
				results.push({ success: false, error: "Class name and parent are required" });
				continue;
			}

			const [entrySuccess, entryResult] = pcall(() => createFn(objData));
			if (!entrySuccess) {
				failureCount++;
				results.push({ success: false, className, parent: parentPath, error: tostring(entryResult) });
				continue;
			}

			if ("instance" in entryResult) {
				successCount++;
				results.push({
					success: true,
					className: entryResult.className,
					parent: entryResult.parentPath,
					instancePath: getInstancePath(entryResult.instance),
					name: entryResult.instance.Name,
				});
			} else {
				failureCount++;
				results.push({
					success: false,
					className: entryResult.className ?? className,
					parent: entryResult.parentPath ?? parentPath,
					error: entryResult.error,
				});
			}
		}
	});

	if (!loopSuccess) {
		failureCount++;
		results.push({ success: false, error: `Unexpected mass create failure: ${tostring(loopError)}` });
	}

	return { results, successCount, failureCount };
}

function createObject(requestData: Record<string, unknown>) {
	const className = requestData.className as string;
	const parentPath = requestData.parent as string;
	const name = requestData.name as string | undefined;
	const properties = (requestData.properties as Record<string, unknown>) ?? {};

	if (!className || !parentPath) {
		return { error: "Class name and parent are required" };
	}

	const parentInstance = getInstanceByPath(parentPath);
	if (!parentInstance) return { error: `Parent instance not found: ${parentPath}` };
	const recordingId = beginRecording(`Create ${className}`);

	const [success, newInstance] = pcall(() => {
		const instance = new Instance(className as keyof CreatableInstances);
		if (name) instance.Name = name;

		for (const [propertyName, propertyValue] of pairs(properties)) {
			pcall(() => {
				const converted = convertPropertyValue(instance, propertyName as string, propertyValue);
				(instance as unknown as { [key: string]: unknown })[propertyName as string] = converted;
			});
		}

		instance.Parent = parentInstance;
		return instance;
	});

	if (success && newInstance) {
		finishRecording(recordingId, true, "create_object");
		return {
			success: true,
			className,
			parent: parentPath,
			instancePath: getInstancePath(newInstance as Instance),
			name: (newInstance as Instance).Name,
			message: "Object created successfully",
		};
	} else {
		finishRecording(recordingId, false);
		return { error: `Failed to create object: ${newInstance}`, className, parent: parentPath };
	}
}

function deleteObject(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	if (!instancePath) return { error: "Instance path is required" };

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };
	if (instance === game) return { error: "Cannot delete the game instance" };
	const recordingId = beginRecording(`Delete ${instance.ClassName} (${instance.Name})`);

	const [success, result] = pcall(() => {
		instance.Destroy();
		return true;
	});

	if (success) {
		finishRecording(recordingId, true, "delete_object");
		return { success: true, instancePath, message: "Object deleted successfully" };
	} else {
		finishRecording(recordingId, false, "delete_object");
		return { error: `Failed to delete object: ${result}`, instancePath };
	}
}

function massCreateObjects(requestData: Record<string, unknown>) {
	const objects = requestData.objects as Record<string, unknown>[];
	if (!objects || !typeIs(objects, "table") || (objects as defined[]).size() === 0) {
		return { error: "Objects array is required" };
	}

	const recordingId = beginRecording("Mass create objects");

	const { results, successCount, failureCount } = processObjectEntries(objects, (objData) => {
		const className = objData.className as string;
		const parentPath = objData.parent as string;
		const name = objData.name as string | undefined;
		const parentInstance = getInstanceByPath(parentPath);
		if (!parentInstance) {
			return { error: "Parent instance not found", className, parentPath };
		}

		const [success, newInstance] = pcall(() => {
			const instance = new Instance(className as keyof CreatableInstances);
			if (name) instance.Name = name;
			instance.Parent = parentInstance;
			return instance;
		});

		if (!success || !newInstance) {
			return { error: tostring(newInstance), className, parentPath };
		}

		return { instance: newInstance as Instance, className, parentPath };
	});

	finishRecording(recordingId, successCount > 0, "mass_create_objects");
	return { results, summary: { total: (objects as defined[]).size(), succeeded: successCount, failed: failureCount } };
}

function massCreateObjectsWithProperties(requestData: Record<string, unknown>) {
	const objects = requestData.objects as Record<string, unknown>[];
	if (!objects || !typeIs(objects, "table") || (objects as defined[]).size() === 0) {
		return { error: "Objects array is required" };
	}

	const recordingId = beginRecording("Mass create objects with properties");

	const { results, successCount, failureCount } = processObjectEntries(objects, (objData) => {
		const className = objData.className as string;
		const parentPath = objData.parent as string;
		const name = objData.name as string | undefined;
		const propertiesRaw = objData.properties;
		const properties = typeIs(propertiesRaw, "table")
			? (propertiesRaw as Record<string, unknown>)
			: ({} as Record<string, unknown>);

		const parentInstance = getInstanceByPath(parentPath);
		if (!parentInstance) {
			return { error: "Parent instance not found", className, parentPath };
		}

		const [success, newInstance] = pcall(() => {
			const instance = new Instance(className as keyof CreatableInstances);
			if (name) instance.Name = name;
			instance.Parent = parentInstance;

			for (const [propName, propValue] of pairs(properties)) {
				pcall(() => {
					const propNameStr = tostring(propName);
					const converted = convertPropertyValue(instance, propNameStr, propValue);
					if (converted !== undefined) {
						(instance as unknown as { [key: string]: unknown })[propNameStr] = converted;
					}
				});
			}
			return instance;
		});

		if (!success || !newInstance) {
			return { error: tostring(newInstance), className, parentPath };
		}

		return { instance: newInstance as Instance, className, parentPath };
	});

	finishRecording(recordingId, successCount > 0, "mass_create_objects_with_properties");
	return { results, summary: { total: (objects as defined[]).size(), succeeded: successCount, failed: failureCount } };
}

function performSmartDuplicate(requestData: Record<string, unknown>, useRecording = true) {
	const instancePath = requestData.instancePath as string;
	const count = requestData.count as number;
	const options = (requestData.options as Record<string, unknown>) ?? {};

	if (!instancePath || !count || count < 1) {
		return { error: "Instance path and count > 0 are required" };
	}

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };
	const recordingId = useRecording ? beginRecording(`Smart duplicate ${instance.Name}`) : undefined;

	const results: Record<string, unknown>[] = [];
	let successCount = 0;
	let failureCount = 0;

	for (let i = 1; i <= count; i++) {
		const [success, newInstance] = pcall(() => {
			const clone = instance.Clone();

			if (options.namePattern) {
				clone.Name = (options.namePattern as string).gsub("{n}", tostring(i))[0];
			} else {
				clone.Name = instance.Name + i;
			}

			if (options.positionOffset && clone.IsA("BasePart")) {
				const offset = options.positionOffset as number[];
				const currentPos = clone.Position;
				clone.Position = new Vector3(
					currentPos.X + ((offset[0] ?? 0) as number) * i,
					currentPos.Y + ((offset[1] ?? 0) as number) * i,
					currentPos.Z + ((offset[2] ?? 0) as number) * i,
				);
			}

			if (options.rotationOffset && clone.IsA("BasePart")) {
				const offset = options.rotationOffset as number[];
				clone.CFrame = clone.CFrame.mul(CFrame.Angles(
					math.rad(((offset[0] ?? 0) as number) * i),
					math.rad(((offset[1] ?? 0) as number) * i),
					math.rad(((offset[2] ?? 0) as number) * i),
				));
			}

			if (options.scaleOffset && clone.IsA("BasePart")) {
				const offset = options.scaleOffset as number[];
				const currentSize = clone.Size;
				clone.Size = new Vector3(
					currentSize.X * (((offset[0] ?? 1) as number) ** i),
					currentSize.Y * (((offset[1] ?? 1) as number) ** i),
					currentSize.Z * (((offset[2] ?? 1) as number) ** i),
				);
			}

			if (options.propertyVariations) {
				for (const [propName, values] of pairs(options.propertyVariations as Record<string, unknown[]>)) {
					if (values && (values as defined[]).size() > 0) {
						const valueIndex = ((i - 1) % (values as defined[]).size());
						pcall(() => {
							(clone as unknown as { [key: string]: unknown })[propName as string] = (values as unknown[])[valueIndex];
						});
					}
				}
			}

			const targetParents = options.targetParents as string[] | undefined;
			if (targetParents && targetParents[i - 1]) {
				const targetParent = getInstanceByPath(targetParents[i - 1]);
				clone.Parent = targetParent ?? instance.Parent;
			} else {
				clone.Parent = instance.Parent;
			}

			return clone;
		});

		if (success && newInstance) {
			successCount++;
			results.push({
				success: true,
				instancePath: getInstancePath(newInstance as Instance),
				name: (newInstance as Instance).Name,
				index: i,
			});
		} else {
			failureCount++;
			results.push({ success: false, index: i, error: tostring(newInstance) });
		}
	}

	finishRecording(recordingId, successCount > 0);

	return {
		results,
		summary: { total: count, succeeded: successCount, failed: failureCount },
		sourceInstance: instancePath,
	};
}

function smartDuplicate(requestData: Record<string, unknown>) {
	return performSmartDuplicate(requestData, true);
}

function massDuplicate(requestData: Record<string, unknown>) {
	const duplications = requestData.duplications as Record<string, unknown>[];
	if (!duplications || !typeIs(duplications, "table") || (duplications as defined[]).size() === 0) {
		return { error: "Duplications array is required" };
	}

	const allResults: Record<string, unknown>[] = [];
	let totalSuccess = 0;
	let totalFailures = 0;
	const recordingId = beginRecording("Mass duplicate operations");

	for (const duplication of duplications) {
		const result = performSmartDuplicate(duplication, false) as { summary?: { succeeded: number; failed: number } };
		allResults.push(result as unknown as Record<string, unknown>);
		if (result.summary) {
			totalSuccess += result.summary.succeeded;
			totalFailures += result.summary.failed;
		}
	}

	finishRecording(recordingId, totalSuccess > 0);

	return {
		results: allResults,
		summary: { total: totalSuccess + totalFailures, succeeded: totalSuccess, failed: totalFailures },
	};
}

function controlAudioAnimation(data: Record<string, unknown>): unknown {
	const action = data.action as string;
	const targetPath = data.target_path as string;
	const parent = getInstanceByPath(targetPath);

	if (!parent) return { error: `Target path not found: ${targetPath}` };

	const [ok, result] = pcall(() => {
		if (action === "insert_sound") {
			const sound = new Instance("Sound");
			sound.SoundId = (data.sound_id as string) || "";
			sound.Parent = parent;
			return { success: true, path: getInstancePath(sound) };
		} else if (action === "play_sound") {
			const sound = parent.IsA("Sound") ? parent : parent.FindFirstChildWhichIsA("Sound");
			if (sound) {
				(sound as Sound).Play();
				return { success: true };
			}
			return { error: "Sound not found at target" };
		} else if (action === "stop_sound") {
			const sound = parent.IsA("Sound") ? parent : parent.FindFirstChildWhichIsA("Sound");
			if (sound) {
				(sound as Sound).Stop();
				return { success: true };
			}
			return { error: "Sound not found at target" };
		} else if (action === "insert_animator") {
			const animator = new Instance("Animator");
			animator.Parent = parent;
			return { success: true, path: getInstancePath(animator) };
		} else if (action === "load_animation") {
			const animator = parent.IsA("Animator") ? parent : parent.FindFirstChildWhichIsA("Animator");
			if (animator) {
				const anim = new Instance("Animation");
				anim.AnimationId = (data.animation_id as string) || "";
				const track = (animator as Animator).LoadAnimation(anim);
				return { success: true, trackName: track.Name };
			}
			return { error: "Animator not found at target" };
		} else if (action === "list_animations") {
			const anims = parent.GetDescendants().filter((inst) => inst.IsA("Animation"));
			return {
				animations: anims.map((a) => ({ name: a.Name, id: (a as Animation).AnimationId, path: getInstancePath(a) })),
			};
		}
		return { error: `Unknown action: ${action}` };
	});

	if (!ok) return { error: tostring(result) };
	return result;
}

// === Feature 20: Auto Placer ===
function autoPlace(data: Record<string, unknown>): unknown {
	const action = data.action as string;
	const sourcePath = data.source_path as string;
	const source = getInstanceByPath(sourcePath);
	if (!source) return { error: `Source object not found: ${sourcePath}` };

	const recordingId = beginRecording(`Auto place: ${action}`);

	const [ok, result] = pcall(() => {
		if (action === "scatter") {
			const regionData = data.target_region as Record<string, Record<string, number>> | undefined;
			const region = regionData || { position: { x: 0, y: 0, z: 0 }, size: { x: 10, y: 0, z: 10 } };
			const count = (data.count as number) || 10;
			const results: string[] = [];
			for (let i = 0; i < count; i++) {
				const clone = source.Clone();
				const rx = (region.position?.x ?? 0) + (math.random() - 0.5) * (region.size?.x ?? 10);
				const rz = (region.position?.z ?? 0) + (math.random() - 0.5) * (region.size?.z ?? 10);
				const ry = (region.position?.y ?? 0);
				if (clone.IsA("BasePart")) {
					clone.Position = new Vector3(rx, ry, rz);
				} else if (clone.IsA("Model")) {
					clone.MoveTo(new Vector3(rx, ry, rz));
				}
				clone.Parent = source.Parent;
				results.push(getInstancePath(clone));
			}
			return { success: true, count: results.size(), paths: results };
		} else if (action === "place_in_grid") {
			const spacing = (data.spacing as number) || 10;
			const count = (data.count as number) || 5;
			const results: string[] = [];
			for (let x = 0; x < count; x++) {
				for (let z = 0; z < count; z++) {
					const clone = source.Clone();
					const pos = new Vector3(x * spacing, 0, z * spacing);
					if (clone.IsA("BasePart")) clone.Position = pos;
					else if (clone.IsA("Model")) clone.MoveTo(pos);
					clone.Parent = source.Parent;
					results.push(getInstancePath(clone));
				}
			}
			return { success: true, count: results.size(), paths: results };
		} else if (action === "align_to_surface") {
			const targets = source.GetChildren().filter((o) => o.IsA("BasePart"));
			for (const t of targets) {
				const part = t as BasePart;
				const ray = new Ray(part.Position, new Vector3(0, -500, 0));
				const [hit, pos] = game.Workspace.FindPartOnRay(ray, part);
				if (hit) part.Position = pos.add(new Vector3(0, part.Size.Y / 2, 0));
			}
			return { success: true };
		}
		return { error: `Unknown action: ${action}` };
	});

	finishRecording(recordingId, ok);
	if (!ok) return { error: tostring(result) };
	return result;
}

// === Feature 21: Mirror Tool ===
function mirrorInstances(data: Record<string, unknown>): unknown {
	const action = data.action as string;
	const paths = (data.paths as string[]) || [];
	const pivotData = data.pivot as Record<string, number> | undefined;
	const pivot = pivotData || { x: 0, y: 0, z: 0 };
	const pivotVec = new Vector3(pivot.x ?? 0, pivot.y ?? 0, pivot.z ?? 0);

	const recordingId = beginRecording(`Mirror: ${action}`);
	const results: string[] = [];

	const [ok, err] = pcall(() => {
		for (const p of paths) {
			const inst = getInstanceByPath(p);
			if (inst && inst.IsA("BasePart")) {
				const clone = inst.Clone();
				const rel = inst.Position.sub(pivotVec);
				let mir = rel;
				if (action === "mirror_x") mir = new Vector3(-rel.X, rel.Y, rel.Z);
				else if (action === "mirror_y") mir = new Vector3(rel.X, -rel.Y, rel.Z);
				else if (action === "mirror_z") mir = new Vector3(rel.X, rel.Y, -rel.Z);
				clone.Position = pivotVec.add(mir);
				clone.Parent = inst.Parent;
				results.push(getInstancePath(clone));
			}
		}
	});

	finishRecording(recordingId, ok);
	if (!ok) return { error: tostring(err) };
	return { success: true, mirroredCount: results.size(), paths: results };
}

// === Feature 27: Naming Convention Fixer ===
function fixNaming(data: Record<string, unknown>): unknown {
	const action = data.action as string;
	const targetPath = data.target_path as string;
	const root = getInstanceByPath(targetPath);
	if (!root) return { error: "Target path not found" };

	const recordingId = beginRecording(`Fix naming: ${action}`);

	const toPascal = (s: string) => s.gsub("(%a)([%w]*)", (f: string, r: string) => f.upper() + r.lower())[0].gsub("%s+", "")[0];
	const toSnake = (s: string) => s.gsub("%s+", "_")[0].lower();

	const [ok] = pcall(() => {
		const all = root.GetDescendants();
		for (const inst of all) {
			if (action === "rename_to_pascal") inst.Name = toPascal(inst.Name);
			else if (action === "rename_to_snake") inst.Name = toSnake(inst.Name);
		}
	});

	finishRecording(recordingId, ok);
	return { success: ok };
}

// === Feature 28: Cutscene Builder ===
const keyframes: Array<{ time: number; cframe: CFrame; fov: number }> = [];

function buildCutscene(data: Record<string, unknown>): unknown {
	const action = data.action as string;

	if (action === "create_keyframe") {
		const cfData = data.cframe as Record<string, Record<string, number>> | undefined;
		const cf = cfData || { pos: { x: 0, y: 0, z: 0 }, look: { x: 0, y: 0, z: 1 } };
		keyframes.push({
			time: (data.time_seconds as number) || 0,
			cframe: new CFrame(cf.pos?.x ?? 0, cf.pos?.y ?? 0, cf.pos?.z ?? 0),
			fov: (data.fov as number) || 70,
		});
		return { success: true, keyframeCount: keyframes.size() };
	} else if (action === "list_keyframes") {
		return { success: true, keyframes };
	} else if (action === "clear_cutscene") {
		keyframes.clear();
		return { success: true };
	}

	return { error: `Unknown action: ${action}` };
}

function diffInstances(requestData: Record<string, unknown>) {
	const action = requestData.action as string;
	const pathA = requestData.path_a as string;
	const pathB = requestData.path_b as string;
	const targetPath = requestData.target_path as string;

	if (action === "compare_two") {
		const instA = getInstanceByPath(pathA);
		const instB = getInstanceByPath(pathB);
		if (!instA || !instB) return { error: "One or both instances not found" };

		const diffs: Array<{ property: string; valueA: string; valueB: string }> = [];
		const props = ["Name", "ClassName", "Parent", "Position", "Size", "Color", "Transparency", "CanCollide", "Anchored"];

		for (const prop of props) {
			const [okA, valA] = pcall(() => (instA as unknown as { [key: string]: unknown })[prop]);
			const [okB, valB] = pcall(() => (instB as unknown as { [key: string]: unknown })[prop]);

			if (okA && okB && tostring(valA) !== tostring(valB)) {
				diffs.push({ property: prop, valueA: tostring(valA), valueB: tostring(valB) });
			}
		}
		return { success: true, diffs };
	} else if (action === "compare_to_default") {
		const inst = getInstanceByPath(pathA);
		if (!inst) return { error: "Instance not found" };

		const [defOk, def] = pcall(() => new Instance(inst.ClassName as keyof CreatableInstances));
		if (!defOk || !def) return { error: `Cannot create default instance for ${inst.ClassName}` };

		const diffs: Array<{ property: string; current: string; default: string }> = [];
		const props = ["Transparency", "CanCollide", "Anchored", "CanQuery", "CanTouch", "CastShadow"];

		for (const prop of props) {
			const [okC, valC] = pcall(() => (inst as unknown as { [key: string]: unknown })[prop]);
			const [okD, valD] = pcall(() => (def as unknown as { [key: string]: unknown })[prop]);

			if (okC && okD && tostring(valC) !== tostring(valD)) {
				diffs.push({ property: prop, current: tostring(valC), default: tostring(valD) });
			}
		}
		def.Destroy();
		return { success: true, diffs };
	} else if (action === "find_modified") {
		const root = getInstanceByPath(targetPath || "game.Workspace");
		if (!root) return { error: "Target path not found" };

		const modified: Array<{ path: string; className: string; modifiedProps: string[] }> = [];
		const all = root.GetDescendants();
		const maxScan = 500;
		const scanCount = math.min(all.size(), maxScan);

		for (let i = 0; i < scanCount; i++) {
			const inst = all[i];
			const [ok, def] = pcall(() => new Instance(inst.ClassName as keyof CreatableInstances));
			if (!ok || !def) continue;

			const diffs: string[] = [];
			const props = ["Transparency", "CanCollide", "Anchored"];
			for (const prop of props) {
				const [okC, valC] = pcall(() => (inst as unknown as { [key: string]: unknown })[prop]);
				const [okD, valD] = pcall(() => (def as unknown as { [key: string]: unknown })[prop]);
				if (okC && okD && tostring(valC) !== tostring(valD)) diffs.push(prop);
			}
			if (diffs.size() > 0) {
				modified.push({ path: getInstancePath(inst), className: inst.ClassName, modifiedProps: diffs });
			}
			def.Destroy();
		}
		return { success: true, modifiedCount: modified.size(), scanned: scanCount, modified };
	}

	return { error: `Unknown action: ${action}` };
}

// === UI Studio ===
function buildUi(requestData: Record<string, unknown>) {
	const parentPath = requestData.parent as string;
	const uiTree = requestData.ui as Record<string, unknown>;

	if (!parentPath || !uiTree) {
		return { error: "parent and ui are required" };
	}

	const parentInstance = getInstanceByPath(parentPath);
	if (!parentInstance) {
		return { error: `Parent not found: ${parentPath}` };
	}

	const recordingId = beginRecording("Build UI");
	const createdPaths: string[] = [];
	let errorCount = 0;

	function createUiNode(node: Record<string, unknown>, parent: Instance): boolean {
		const className = node.class as string;
		const name = node.name as string | undefined;
		const properties = (node.properties as Record<string, unknown>) ?? {};
		const children = (node.children as Array<Record<string, unknown>>) ?? [];

		if (!className) {
			errorCount++;
			return false;
		}

		const [success, instance] = pcall(() => {
			const inst = new Instance(className as keyof CreatableInstances);
			if (name) inst.Name = name;

			for (const [propName, propValue] of pairs(properties)) {
				pcall(() => {
					const converted = convertPropertyValue(inst, propName as string, propValue);
					(inst as unknown as { [key: string]: unknown })[propName as string] = converted;
				});
			}

			inst.Parent = parent;
			return inst;
		});

		if (!success || !instance) {
			errorCount++;
			return false;
		}

		createdPaths.push(getInstancePath(instance));

		for (const child of children) {
			createUiNode(child, instance);
		}

		return true;
	}

	createUiNode(uiTree, parentInstance);

	if (createdPaths.size() > 0) {
		finishRecording(recordingId, true, "build_ui");
		return {
			success: true,
			created: createdPaths.size(),
			errors: errorCount,
			rootPath: createdPaths[0],
			allPaths: createdPaths,
		};
	} else {
		finishRecording(recordingId, false);
		return { error: "Failed to create any UI elements", errors: errorCount };
	}
}

export = {
	createObject,
	deleteObject,
	massCreateObjects,
	massCreateObjectsWithProperties,
	smartDuplicate,
	massDuplicate,
	controlAudioAnimation,
	autoPlace,
	mirrorInstances,
	fixNaming,
	buildCutscene,
	diffInstances,
	buildUi,
};
