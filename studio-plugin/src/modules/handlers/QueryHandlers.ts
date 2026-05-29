import Utils from "../Utils";
import Recording from "../Recording";

const { getInstancePath, getInstanceByPath, readScriptSource } = Utils;
const { beginRecording, finishRecording } = Recording;

interface TreeNode {
	name: string;
	className: string;
	path?: string;
	children: TreeNode[];
	hasSource?: boolean;
	scriptType?: string;
	enabled?: boolean;
}

function getFileTree(requestData: Record<string, unknown>) {
	const path = (requestData.path as string) ?? "";
	const startInstance = getInstanceByPath(path);

	if (!startInstance) {
		return { error: `Path not found: ${path}` };
	}

	function buildTree(instance: Instance, depth: number): TreeNode {
		if (depth > 10) {
			return { name: instance.Name, className: instance.ClassName, children: [] };
		}

		const node: TreeNode = {
			name: instance.Name,
			className: instance.ClassName,
			path: getInstancePath(instance),
			children: [],
		};

		if (instance.IsA("LuaSourceContainer")) {
			node.hasSource = true;
			node.scriptType = instance.ClassName;
			if (instance.IsA("BaseScript")) {
				node.enabled = instance.Enabled;
			}
		}

		for (const child of instance.GetChildren()) {
			node.children.push(buildTree(child, depth + 1));
		}

		return node;
	}

	return {
		tree: buildTree(startInstance, 0),
		timestamp: tick(),
	};
}

function searchFiles(requestData: Record<string, unknown>) {
	const query = requestData.query as string;
	const searchType = (requestData.searchType as string) ?? "name";

	if (!query) return { error: "Query is required" };

	const results: { name: string; className: string; path: string; hasSource: boolean; enabled?: boolean }[] = [];

	function searchRecursive(instance: Instance, depth: number) {
		if (results.size() >= 100 || depth > 10) return;
		let match = false;

		if (searchType === "name") {
			match = instance.Name.lower().find(query.lower())[0] !== undefined;
		} else if (searchType === "type") {
			match = instance.ClassName.lower().find(query.lower())[0] !== undefined;
		} else if (searchType === "content" && instance.IsA("LuaSourceContainer")) {
			match = readScriptSource(instance).lower().find(query.lower())[0] !== undefined;
		}

		if (match) {
			const entry: { name: string; className: string; path: string; hasSource: boolean; enabled?: boolean } = {
				name: instance.Name,
				className: instance.ClassName,
				path: getInstancePath(instance),
				hasSource: instance.IsA("LuaSourceContainer"),
			};
			if (instance.IsA("BaseScript")) {
				entry.enabled = instance.Enabled;
			}
			results.push(entry);
		}

		for (const child of instance.GetChildren()) {
			searchRecursive(child, depth + 1);
		}
	}

	searchRecursive(game, 0);

	return { results, query, searchType, count: results.size() };
}

function getPlaceInfo(_requestData: Record<string, unknown>) {
	return {
		placeName: game.Name,
		placeId: game.PlaceId,
		gameId: game.GameId,
		jobId: game.JobId,
		workspace: {
			name: game.Workspace.Name,
			className: game.Workspace.ClassName,
		},
	};
}

function getServices(requestData: Record<string, unknown>) {
	const serviceName = requestData.serviceName as string | undefined;

	if (serviceName) {
		const [ok, service] = pcall(() => game.GetService(serviceName as keyof Services));
		if (ok && service) {
			return {
				service: {
					name: service.Name,
					className: service.ClassName,
					path: getInstancePath(service as Instance),
					childCount: (service as Instance).GetChildren().size(),
				},
			};
		} else {
			return { error: `Service not found: ${serviceName}` };
		}
	} else {
		const services: { name: string; className: string; path: string; childCount: number }[] = [];
		const commonServices = [
			"Workspace", "Players", "StarterGui", "StarterPack", "StarterPlayer",
			"ReplicatedStorage", "ServerStorage", "ServerScriptService",
			"HttpService", "TeleportService", "DataStoreService",
		];

		for (const svcName of commonServices) {
			const [ok, service] = pcall(() => game.GetService(svcName as keyof Services));
			if (ok && service) {
				services.push({
					name: service.Name,
					className: service.ClassName,
					path: getInstancePath(service as Instance),
					childCount: (service as Instance).GetChildren().size(),
				});
			}
		}

		return { services };
	}
}

function searchObjects(requestData: Record<string, unknown>) {
	const query = requestData.query as string;
	const searchType = (requestData.searchType as string) ?? "name";
	const propertyName = requestData.propertyName as string | undefined;

	if (!query) return { error: "Query is required" };

	const results: { name: string; className: string; path: string }[] = [];

	function searchRecursive(instance: Instance, depth: number) {
		if (results.size() >= 100 || depth > 10) return;
		let match = false;

		if (searchType === "name") {
			match = instance.Name.lower().find(query.lower())[0] !== undefined;
		} else if (searchType === "class") {
			match = instance.ClassName.lower().find(query.lower())[0] !== undefined;
		} else if (searchType === "property" && propertyName) {
			const [success, value] = pcall(() => tostring((instance as unknown as Record<string, unknown>)[propertyName]));
			if (success) {
				match = (value as string).lower().find(query.lower())[0] !== undefined;
			}
		}

		if (match) {
			results.push({
				name: instance.Name,
				className: instance.ClassName,
				path: getInstancePath(instance),
			});
		}

		for (const child of instance.GetChildren()) {
			searchRecursive(child, depth + 1);
		}
	}

	searchRecursive(game, 0);

	return { results, query, searchType, count: results.size() };
}

function getInstanceProperties(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	const excludeSource = (requestData.excludeSource as boolean) ?? false;
	if (!instancePath) return { error: "Instance path is required" };

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };

	const properties: Record<string, unknown> = {};
	const [success, result] = pcall(() => {
		const basicProps = ["Name", "ClassName", "Parent"];
		for (const prop of basicProps) {
			const [propSuccess, propValue] = pcall(() => {
				const val = (instance as unknown as Record<string, unknown>)[prop];
				if (prop === "Parent" && val) return getInstancePath(val as Instance);
				if (val === undefined) return "nil";
				return tostring(val);
			});
			if (propSuccess) properties[prop] = propValue;
		}

		const commonProps = [
			"Size", "Position", "Rotation", "CFrame", "Anchored", "CanCollide",
			"Transparency", "BrickColor", "Material", "Color", "Text", "TextColor3",
			"BackgroundColor3", "Image", "ImageColor3", "Visible", "Active", "ZIndex",
			"BorderSizePixel", "BackgroundTransparency", "ImageTransparency",
			"TextTransparency", "Value", "Enabled", "Brightness", "Range", "Shadows",
			"Face", "SurfaceType",
		];

		for (const prop of commonProps) {
			const [propSuccess, propValue] = pcall(() => {
				const val = (instance as unknown as Record<string, unknown>)[prop];
				if (typeOf(val) === "UDim2") {
					const udim = val as UDim2;
					return {
						X: { Scale: udim.X.Scale, Offset: udim.X.Offset },
						Y: { Scale: udim.Y.Scale, Offset: udim.Y.Offset },
						_type: "UDim2",
					};
				}
				return tostring(val);
			});
			if (propSuccess) properties[prop] = propValue;
		}

		if (instance.IsA("LuaSourceContainer")) {
			if (!excludeSource) {
				properties.Source = readScriptSource(instance);
			} else {
				const src = readScriptSource(instance);
				properties.SourceLength = src.size();
				properties.LineCount = Utils.splitLines(src)[0].size();
			}
			if (instance.IsA("BaseScript")) {
				properties.Enabled = tostring(instance.Enabled);
			}
		}

		if (instance.IsA("Part")) {
			properties.Shape = tostring(instance.Shape);
		}

		if (instance.IsA("BasePart")) {
			properties.TopSurface = tostring(instance.TopSurface);
			properties.BottomSurface = tostring(instance.BottomSurface);
		}

		if (instance.IsA("MeshPart")) {
			properties.MeshId = tostring(instance.MeshId);
			properties.TextureID = tostring(instance.TextureID);
		}

		if (instance.IsA("SpecialMesh")) {
			properties.MeshId = tostring(instance.MeshId);
			properties.TextureId = tostring(instance.TextureId);
			properties.MeshType = tostring(instance.MeshType);
		}

		if (instance.IsA("Sound")) {
			properties.SoundId = tostring(instance.SoundId);
			properties.TimeLength = tostring(instance.TimeLength);
			properties.IsPlaying = tostring(instance.IsPlaying);
		}

		if (instance.IsA("Animation")) {
			properties.AnimationId = tostring(instance.AnimationId);
		}

		if (instance.IsA("Decal") || instance.IsA("Texture")) {
			properties.Texture = tostring((instance as Decal | Texture).Texture);
		}

		if (instance.IsA("Shirt")) {
			properties.ShirtTemplate = tostring(instance.ShirtTemplate);
		} else if (instance.IsA("Pants")) {
			properties.PantsTemplate = tostring(instance.PantsTemplate);
		} else if (instance.IsA("ShirtGraphic")) {
			properties.Graphic = tostring(instance.Graphic);
		}

		properties.ChildCount = tostring(instance.GetChildren().size());
	});

	if (success) {
		return { instancePath, className: instance.ClassName, properties };
	} else {
		return { error: `Failed to get properties: ${result}` };
	}
}

function getInstanceChildren(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	if (!instancePath) return { error: "Instance path is required" };

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };

	const children: { name: string; className: string; path: string; hasChildren: boolean; hasSource: boolean; enabled?: boolean }[] = [];
	for (const child of instance.GetChildren()) {
		const entry: { name: string; className: string; path: string; hasChildren: boolean; hasSource: boolean; enabled?: boolean } = {
			name: child.Name,
			className: child.ClassName,
			path: getInstancePath(child),
			hasChildren: child.GetChildren().size() > 0,
			hasSource: child.IsA("LuaSourceContainer"),
		};
		if (child.IsA("BaseScript")) {
			entry.enabled = child.Enabled;
		}
		children.push(entry);
	}

	return { instancePath, children, count: children.size() };
}

function searchByProperty(requestData: Record<string, unknown>) {
	const propertyName = requestData.propertyName as string;
	const propertyValue = requestData.propertyValue as string;

	if (!propertyName || !propertyValue) {
		return { error: "Property name and value are required" };
	}

	const results: { name: string; className: string; path: string; propertyValue: string }[] = [];

	function searchRecursive(instance: Instance, depth: number) {
		if (results.size() >= 100 || depth > 10) return;
		const [success, value] = pcall(() => tostring((instance as unknown as Record<string, unknown>)[propertyName]));
		if (success && (value as string).lower().find(propertyValue.lower())[0] !== undefined) {
			results.push({
				name: instance.Name,
				className: instance.ClassName,
				path: getInstancePath(instance),
				propertyValue: value as string,
			});
		}
		for (const child of instance.GetChildren()) {
			searchRecursive(child, depth + 1);
		}
	}

	searchRecursive(game, 0);
	return { propertyName, propertyValue, results, count: results.size() };
}

function getClassInfo(requestData: Record<string, unknown>) {
	const className = requestData.className as string;
	if (!className) return { error: "Class name is required" };

	let [success, tempInstance] = pcall(() => new Instance(className as keyof CreatableInstances));
	let isService = false;

	if (!success) {
		const [serviceSuccess, serviceInstance] = pcall(() =>
			game.GetService(className as keyof Services),
		);
		if (serviceSuccess && serviceInstance) {
			success = true;
			tempInstance = serviceInstance as unknown as Instance;
			isService = true;
		}
	}

	if (!success) return { error: `Invalid class name: ${className}` };

	const classInfo: {
		className: string;
		isService: boolean;
		properties: string[];
		methods: string[];
		events: string[];
	} = { className, isService, properties: [], methods: [], events: [] };

	const commonProps = [
		"Name", "ClassName", "Parent", "Size", "Position", "Rotation", "CFrame",
		"Anchored", "CanCollide", "Transparency", "BrickColor", "Material", "Color",
		"Text", "TextColor3", "BackgroundColor3", "Image", "ImageColor3", "Visible",
		"Active", "ZIndex", "BorderSizePixel", "BackgroundTransparency",
		"ImageTransparency", "TextTransparency", "Value", "Enabled", "Brightness",
		"Range", "Shadows",
	];

	for (const prop of commonProps) {
		const [propSuccess] = pcall(() => (tempInstance as unknown as Record<string, unknown>)[prop]);
		if (propSuccess) classInfo.properties.push(prop);
	}

	const commonMethods = [
		"Destroy", "Clone", "FindFirstChild", "FindFirstChildOfClass",
		"GetChildren", "IsA", "IsAncestorOf", "IsDescendantOf", "WaitForChild",
	];

	for (const method of commonMethods) {
		const [methodSuccess] = pcall(() => (tempInstance as unknown as Record<string, unknown>)[method]);
		if (methodSuccess) classInfo.methods.push(method);
	}

	if (!isService) {
		(tempInstance as Instance).Destroy();
	}

	return classInfo;
}

function getProjectStructure(requestData: Record<string, unknown>) {
	const startPath = (requestData.path as string) ?? "";
	const maxDepth = (requestData.maxDepth as number) ?? 3;
	const showScriptsOnly = (requestData.scriptsOnly as boolean) ?? false;

	if (startPath === "" || startPath === "game") {
		const services: Record<string, unknown>[] = [];
		const mainServices = [
			"Workspace", "ServerScriptService", "ServerStorage", "ReplicatedStorage",
			"StarterGui", "StarterPack", "StarterPlayer", "Players",
		];

		for (const serviceName of mainServices) {
			const [svcOk, service] = pcall(() => game.GetService(serviceName as keyof Services));
			if (svcOk && service) {
				services.push({
					name: service.Name,
					className: service.ClassName,
					path: getInstancePath(service as Instance),
					childCount: (service as Instance).GetChildren().size(),
					hasChildren: (service as Instance).GetChildren().size() > 0,
				});
			}
		}

		return {
			type: "service_overview",
			services,
			timestamp: tick(),
			note: "Use path parameter to explore specific locations (e.g., 'game.ServerScriptService')",
		};
	}

	const startInstance = getInstanceByPath(startPath);
	if (!startInstance) return { error: `Path not found: ${startPath}` };

	function getStructure(instance: Instance, depth: number): Record<string, unknown> {
		if (depth > maxDepth) {
			return {
				name: instance.Name,
				className: instance.ClassName,
				path: getInstancePath(instance),
				childCount: instance.GetChildren().size(),
				hasMore: true,
				note: "Max depth reached - use this path to explore further",
			};
		}

		const node: Record<string, unknown> = {
			name: instance.Name,
			className: instance.ClassName,
			path: getInstancePath(instance),
			children: [] as Record<string, unknown>[],
		};

		if (instance.IsA("LuaSourceContainer")) {
			node.hasSource = true;
			node.scriptType = instance.ClassName;
			if (instance.IsA("BaseScript")) {
				node.enabled = instance.Enabled;
			}
		}

		if (instance.IsA("GuiObject")) {
			node.visible = instance.Visible;
			if (instance.IsA("Frame") || instance.IsA("ScreenGui")) {
				node.guiType = "container";
			} else if (instance.IsA("TextLabel") || instance.IsA("TextButton")) {
				node.guiType = "text";
				const textInst = instance as TextLabel | TextButton;
				if (textInst.Text !== "") node.text = textInst.Text;
			} else if (instance.IsA("ImageLabel") || instance.IsA("ImageButton")) {
				node.guiType = "image";
			}
		}

		let children = instance.GetChildren();
		if (showScriptsOnly) {
			children = children.filter(
				(child) => child.IsA("BaseScript") || child.IsA("Folder") || child.IsA("ModuleScript"),
			);
		}

		const nodeChildren = node.children as Record<string, unknown>[];
		const childCount = children.size();
		if (childCount > 20 && depth < maxDepth) {
			const classGroups = new Map<string, Instance[]>();
			for (const child of children) {
				const cn = child.ClassName;
				if (!classGroups.has(cn)) classGroups.set(cn, []);
				classGroups.get(cn)!.push(child);
			}

			const childSummary: Record<string, unknown>[] = [];
			classGroups.forEach((classChildren, cn) => {
				childSummary.push({
					className: cn,
					count: classChildren.size(),
					examples: [classChildren[0]?.Name, classChildren[1]?.Name],
				});
			});
			node.childSummary = childSummary;

			classGroups.forEach((classChildren, cn) => {
				const limit = math.min(3, classChildren.size());
				for (let i = 0; i < limit; i++) {
					nodeChildren.push(getStructure(classChildren[i], depth + 1));
				}
				if (classChildren.size() > 3) {
					nodeChildren.push({
						name: `... ${classChildren.size() - 3} more ${cn} objects`,
						className: "MoreIndicator",
						path: `${getInstancePath(instance)} [${cn} children]`,
						note: "Use specific path to explore these objects",
					});
				}
			});
		} else {
			for (const child of children) {
				nodeChildren.push(getStructure(child, depth + 1));
			}
		}

		return node;
	}

	const result = getStructure(startInstance, 0);
	result.requestedPath = startPath;
	result.maxDepth = maxDepth;
	result.scriptsOnly = showScriptsOnly;
	result.timestamp = tick();

	return result;
}

interface JointLike {
	Part0: BasePart | undefined;
	Part1: BasePart | undefined;
}

function getConnectedInstances(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	const connectionType = (requestData.connectionType as string) || "touches";

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };

	const results: string[] = [];
	if (instance.IsA("BasePart")) {
		if (connectionType === "touches") {
			for (const p of instance.GetTouchingParts()) results.push(getInstancePath(p));
		} else if (connectionType === "joints") {
			for (const j of instance.GetJoints()) {
				const joint = j as unknown as JointLike;
				if (joint.Part0 === instance && joint.Part1) results.push(getInstancePath(joint.Part1));
				else if (joint.Part1 === instance && joint.Part0) results.push(getInstancePath(joint.Part0));
			}
		} else if (connectionType === "welds") {
			for (const j of instance.GetDescendants()) {
				if (j.IsA("Weld") || j.IsA("ManualWeld") || j.IsA("WeldConstraint")) {
					const w = j as unknown as JointLike;
					if (w.Part0 === instance && w.Part1) results.push(getInstancePath(w.Part1));
					else if (w.Part1 === instance && w.Part0) results.push(getInstancePath(w.Part0));
				}
			}
		}
	}

	return { success: true, instancePath, connectionType, count: results.size(), connected: results };
}

function getOutputLog(requestData: Record<string, unknown>) {
	const LogService = game.GetService("LogService");
	const filter = (requestData.filter as string) || "All";
	const limit = (requestData.limit as number) || 100;

	const logs = LogService.GetLogHistory();
	const results: Array<{ message: string; messageType: string; timestamp: number }> = [];

	const filterLower = filter.lower();
	for (let i = math.max(0, logs.size() - limit); i < logs.size(); i++) {
		const entry = logs[i];
		const msgType = tostring(entry.messageType).lower();

		if (filterLower !== "all" && msgType !== filterLower) continue;

		results.push({
			message: entry.message,
			messageType: tostring(entry.messageType),
			timestamp: entry.timestamp,
		});
	}

	return { success: true, count: results.size(), logs: results };
}

function grepScripts(requestData: Record<string, unknown>) {
	const pattern = requestData.pattern as string;
	if (!pattern) return { error: "pattern is required" };

	const caseSensitive = (requestData.caseSensitive as boolean) ?? false;
	const contextLines = (requestData.contextLines as number) ?? 0;
	const maxResults = (requestData.maxResults as number) ?? 100;
	const maxResultsPerScript = (requestData.maxResultsPerScript as number) ?? 0;
	const usePattern = (requestData.usePattern as boolean) ?? false;
	const filesOnly = (requestData.filesOnly as boolean) ?? false;
	const searchPath = (requestData.path as string) ?? "";
	const classFilter = requestData.classFilter as string | undefined;

	const startInstance = searchPath !== "" ? getInstanceByPath(searchPath) : game;
	if (!startInstance) return { error: `Path not found: ${searchPath}` };

	// Prepare pattern for matching
	const searchPattern = caseSensitive ? pattern : pattern.lower();

	interface LineMatch {
		line: number;
		column: number;
		text: string;
		before: string[];
		after: string[];
	}

	interface ScriptResult {
		instancePath: string;
		name: string;
		className: string;
		enabled?: boolean;
		matches: LineMatch[];
	}

	const results: ScriptResult[] = [];
	let totalMatches = 0;
	let scriptsSearched = 0;
	let hitLimit = false;

	function searchInstance(instance: Instance) {
		if (hitLimit) return;

		if (instance.IsA("LuaSourceContainer")) {
			// Apply class filter
			if (classFilter) {
				if (!instance.ClassName.lower().find(classFilter.lower())[0]) return;
			}

			scriptsSearched++;
			const source = readScriptSource(instance);
			const [lines] = Utils.splitLines(source);
			const scriptMatches: LineMatch[] = [];
			let scriptMatchCount = 0;

			for (let i = 0; i < lines.size(); i++) {
				if (hitLimit) break;
				if (maxResultsPerScript > 0 && scriptMatchCount >= maxResultsPerScript) break;

				const line = lines[i];
				const searchLine = caseSensitive ? line : line.lower();

				let matchStart: number | undefined;
				let matchEnd: number | undefined;

				if (usePattern) {
					[matchStart, matchEnd] = string.find(searchLine, searchPattern);
				} else {
					[matchStart, matchEnd] = string.find(searchLine, searchPattern, 1, true);
				}

				if (matchStart !== undefined) {
					scriptMatchCount++;
					totalMatches++;

					if (totalMatches > maxResults) {
						hitLimit = true;
						break;
					}

					if (!filesOnly) {
						// Gather context lines
						const before: string[] = [];
						const after: string[] = [];

						if (contextLines > 0) {
							const beforeStart = math.max(0, i - contextLines);
							for (let j = beforeStart; j < i; j++) {
								before.push(lines[j]);
							}
							const afterEnd = math.min(lines.size() - 1, i + contextLines);
							for (let j = i + 1; j <= afterEnd; j++) {
								after.push(lines[j]);
							}
						}

						scriptMatches.push({
							line: i + 1, // 1-indexed
							column: matchStart,
							text: line,
							before,
							after,
						});
					}
				}
			}

			if (scriptMatchCount > 0) {
				const scriptResult: ScriptResult = {
					instancePath: getInstancePath(instance),
					name: instance.Name,
					className: instance.ClassName,
					matches: scriptMatches,
				};
				if (instance.IsA("BaseScript")) {
					scriptResult.enabled = instance.Enabled;
				}
				results.push(scriptResult);
			}
		}

		for (const child of instance.GetChildren()) {
			if (hitLimit) return;
			searchInstance(child);
		}
	}

	searchInstance(startInstance);

	return {
		results,
		pattern,
		totalMatches: hitLimit ? `>${maxResults}` : totalMatches,
		scriptsSearched,
		scriptsMatched: results.size(),
		truncated: hitLimit,
		options: { caseSensitive, contextLines, usePattern, filesOnly, maxResults, maxResultsPerScript },
	};
}

function validatePathfinding(data: Record<string, unknown>): unknown {
	const PathfindingService = game.GetService("PathfindingService");
	const action = data.action as string;
	const start = data.start as { x: number; y: number; z: number };
	const goal = data.goal as { x: number; y: number; z: number };
	const agentParams = (data.agent_params as Record<string, unknown>) || {};

	const path = PathfindingService.CreatePath(agentParams);
	const startPos = new Vector3(start.x, start.y, start.z);
	const goalPos = new Vector3(goal.x, goal.y, goal.z);

	const [ok, result] = pcall(() => {
		path.ComputeAsync(startPos, goalPos);
		const waypoints = path.GetWaypoints();
		const success = path.Status === Enum.PathStatus.Success;

		if (action === "check_path") {
			return { success, status: tostring(path.Status), waypointCount: waypoints.size() };
		} else if (action === "get_waypoints") {
			return {
				success,
				waypoints: waypoints.map((w) => ({
					position: { x: w.Position.X, y: w.Position.Y, z: w.Position.Z },
					action: tostring(w.Action),
				})),
			};
		} else if (action === "visualize_path") {
			const folder = new Instance("Folder");
			folder.Name = "PathVisualization_" + tick();
			folder.Parent = game.Workspace;
			for (const w of waypoints) {
				const p = new Instance("Part");
				p.Size = new Vector3(1, 1, 1);
				p.Position = w.Position;
				p.Anchored = true;
				p.CanCollide = false;
				p.Color = Color3.fromRGB(0, 255, 0);
				p.Transparency = 0.5;
				p.Parent = folder;
			}
			task.delay(10, () => folder.Destroy());
			return { success, message: "Visualization created (auto-cleanup in 10s)", waypointCount: waypoints.size() };
		}
		return { error: `Unknown action: ${action}` };
	});

	if (!ok) return { error: tostring(result) };
	return result;
}

function analyzePerformance(data: Record<string, unknown>): unknown {
	const Stats = game.GetService("Stats");
	const action = data.action as string;

	if (action === "get_stats") {
		let instanceCount = 0;
		let scriptCount = 0;
		let partCount = 0;
		let modelCount = 0;

		function countRecursive(inst: Instance) {
			instanceCount++;
			if (inst.IsA("BasePart")) partCount++;
			if (inst.IsA("LuaSourceContainer")) scriptCount++;
			if (inst.IsA("Model")) modelCount++;
			for (const child of inst.GetChildren()) countRecursive(child);
		}
		countRecursive(game);

		return {
			instanceCount,
			scriptCount,
			partCount,
			modelCount,
			memoryUsageMb: Stats.GetTotalMemoryUsageMb(),
			heartbeat: Stats.HeartbeatTimeMs,
			physicsUpdate: Stats.PhysicsStepTimeMs,
		};
	} else if (action === "find_heavy_scripts") {
		const heavy: { path: string; lines: number; class: string }[] = [];
		function findRecursive(inst: Instance) {
			if (inst.IsA("LuaSourceContainer")) {
				const src = readScriptSource(inst);
				const lineCount = Utils.splitLines(src)[0].size();
				if (lineCount > 500) {
					heavy.push({ path: getInstancePath(inst), lines: lineCount, class: inst.ClassName });
				}
			}
			for (const child of inst.GetChildren()) findRecursive(child);
		}
		findRecursive(game);
		heavy.sort((a, b) => b.lines > a.lines);
		return { scripts: heavy };
	} else if (action === "find_duplicate_meshes") {
		const meshes = new Map<string, string[]>();
		function findRecursive(inst: Instance) {
			if (inst.IsA("MeshPart")) {
				const id = inst.MeshId;
				if (id !== "") {
					if (!meshes.has(id)) meshes.set(id, []);
					meshes.get(id)!.push(getInstancePath(inst));
				}
			}
			for (const child of inst.GetChildren()) findRecursive(child);
		}
		findRecursive(game.Workspace);
		const duplicates: Record<string, string[]> = {};
		meshes.forEach((paths, id) => {
			if (paths.size() > 1) duplicates[id] = paths;
		});
		return { duplicates };
	} else if (action === "get_render_stats") {
		const stats = Stats as unknown as { GetRenderDetails(): { GetStat(name: string): number } };
		return {
			drawCalls: stats.GetRenderDetails().GetStat("DrawCalls"),
			primitives: stats.GetRenderDetails().GetStat("Primitives"),
			shadowCasters: stats.GetRenderDetails().GetStat("ShadowCasters"),
		};
	} else if (action === "benchmark_script") {
		const path = data.target_path as string;
		const iterations = (data.iterations as number) || 10;
		const inst = getInstanceByPath(path);
		if (inst && inst.IsA("LuaSourceContainer")) {
			const source = readScriptSource(inst);
			const [fn, err] = loadstring(source);
			if (!fn) return { error: `Compile error: ${err}` };
			const times: number[] = [];
			for (let i = 0; i < iterations; i++) {
				const start = os.clock();
				const [ok, res] = pcall(fn);
				const finish = os.clock();
				if (!ok) return { error: `Execution error at iteration ${i}: ${tostring(res)}` };
				times.push(finish - start);
			}
			let total = 0;
			for (const t of times) total += t;
			return { averageTime: total / iterations, iterations, times };
		}
		return { error: "Script not found or invalid type" };
	}

	return { error: `Unknown action: ${action}` };
}

function checkCollisions(data: Record<string, unknown>): unknown {
	const action = data.action as string;
	if (action === "find_overlapping") {
		const pos = data.position as { x: number; y: number; z: number };
		const size = data.size as { x: number; y: number; z: number };
		const results = game.Workspace.GetPartBoundsInBox(
			new CFrame(pos.x, pos.y, pos.z),
			new Vector3(size.x, size.y, size.z),
		);
		return { results: results.map((p: BasePart) => getInstancePath(p)), count: results.size() };
	} else if (action === "check_two_parts") {
		const partA = getInstanceByPath(data.path_a as string);
		const partB = getInstanceByPath(data.path_b as string);
		if (partA && partB && partA.IsA("BasePart") && partB.IsA("BasePart")) {
			const overlapping = partA.GetTouchingParts().includes(partB);
			return { overlapping };
		}
		return { error: "Parts not found or invalid type" };
	} else if (action === "set_collision_group") {
		const PhysicsService = game.GetService("PhysicsService");
		const part = getInstanceByPath(data.path_a as string);
		const groupName = data.collision_group as string;
		if (part && part.IsA("BasePart")) {
			part.CollisionGroup = groupName;
			return { success: true };
		}
		return { error: "Part not found or invalid type" };
	}
	return { error: `Unknown action: ${action}` };
}

function generateTerrain(data: Record<string, unknown>): unknown {
	const Terrain = game.Workspace.Terrain;
	const action = data.action as string;
	const pos = data.position as { x: number; y: number; z: number };
	const size = data.size as { x: number; y: number; z: number };
	const materialName = data.material as string;
	const material = Enum.Material.GetEnumItems().find((m) => m.Name === materialName) as Enum.Material;

	const regionCenter = new Vector3(pos.x, pos.y, pos.z);
	const regionSize = new Vector3(size.x, size.y, size.z);

	const [ok, result] = pcall(() => {
		if (action === "fill") {
			if (data.shape === "cylinder") {
				Terrain.FillCylinder(new CFrame(regionCenter), regionSize.Y, regionSize.X / 2, material);
			} else {
				Terrain.FillBlock(new CFrame(regionCenter), regionSize, material);
			}
		} else if (action === "flatten") {
			Terrain.FillBlock(new CFrame(regionCenter), regionSize, Enum.Material.Air);
		} else if (action === "clear") {
			Terrain.Clear();
		}
		return { success: true };
	});
	if (!ok) return { error: tostring(result) };
	return result;
}

function managePlaces(data: Record<string, unknown>): unknown {
	const action = data.action as string;
	if (action === "get_active_place") {
		return {
			name: game.Name,
			placeId: game.PlaceId,
			gameId: game.GameId,
			instanceCount: game.GetDescendants().size(),
		};
	}
	return { error: `Unknown action: ${action}` };
}

// === Feature 30: Physics Simulator ===
function simulatePhysics(data: Record<string, unknown>): unknown {
	const action = data.action as string;
	const targetPath = (data.target_path as string) || "game.Workspace";
	const target = getInstanceByPath(targetPath);
	if (!target) return { error: `Target not found: ${targetPath}` };

	if (action === "get_mass") {
		let totalMass = 0;
		for (const p of target.GetDescendants().filter((o) => o.IsA("BasePart"))) {
			totalMass += (p as BasePart).Mass;
		}
		if (target.IsA("BasePart")) totalMass += (target as BasePart).Mass;
		return { success: true, totalMass };
	}

	if (action === "find_unanchored") {
		const unanchored = target
			.GetDescendants()
			.filter((o) => o.IsA("BasePart") && !(o as BasePart).Anchored)
			.map((o) => getInstancePath(o));
		return { success: true, count: unanchored.size(), paths: unanchored };
	}

	if (action === "anchor_all") {
		const recordingId = beginRecording("Anchor all parts");
		let count = 0;
		for (const p of target.GetDescendants().filter((o) => o.IsA("BasePart"))) {
			(p as BasePart).Anchored = true;
			count++;
		}
		if (target.IsA("BasePart")) {
			(target as BasePart).Anchored = true;
			count++;
		}
		finishRecording(recordingId, true);
		return { success: true, anchoredCount: count };
	}

	return { error: `Unknown action: ${action}` };
}

function buildContext(requestData: Record<string, unknown>): any {
	const action = requestData.action as string;
	const scriptPath = requestData.script_path as string;

	if (action === "get_full_context") {
		let context = "=== GAME CONTEXT ===\n";
		context += `Name: ${game.Name}\nPlaceId: ${game.PlaceId}\nGameId: ${game.GameId}\n\n`;

		const mainServices = ["Workspace", "ReplicatedStorage", "ServerScriptService", "ServerStorage", "StarterGui", "StarterPack", "StarterPlayer"];
		for (const svcName of mainServices) {
			const svc = game.GetService(svcName as keyof Services);
			if (svc) {
				const children = (svc as Instance).GetChildren();
				context += `[${svcName}] (${children.size()} children)\n`;
				const limit = math.min(5, children.size());
				for (let i = 0; i < limit; i++) {
					context += `  - ${children[i].Name} (${children[i].ClassName})\n`;
				}
				if (children.size() > 5) context += `  ... and ${children.size() - 5} more\n`;
			}
		}

		let scriptCount = 0;
		for (const obj of game.GetDescendants()) {
			if (obj.IsA("LuaSourceContainer")) scriptCount++;
		}
		context += `\nTotal Scripts: ${scriptCount}\n`;

		return { success: true, context };
	} else if (action === "get_script_context") {
		const inst = getInstanceByPath(scriptPath);
		if (!inst || !inst.IsA("LuaSourceContainer")) return { error: "Invalid script path" };

		let context = `=== SCRIPT CONTEXT: ${scriptPath} ===\n`;
		context += `ClassName: ${inst.ClassName}\n`;
		if (inst.Parent) {
			context += `Parent: ${getInstancePath(inst.Parent)}\n\n`;
		} else {
			context += `Parent: nil\n\n`;
		}
		context += `--- SOURCE ---\n${readScriptSource(inst)}\n\n`;

		// Dependencies (simplified)
		const source = readScriptSource(inst);
		const deps: string[] = [];
		for (const [match] of source.gmatch("require%s*%(%s*([^%)]+)%s*%)")) {
			deps.push(match as string);
		}
		if (deps.size() > 0) {
			context += `--- DEPENDENCIES ---\n${deps.join("\n")}\n`;
		}

		return { success: true, context };
	} else if (action === "get_selection_context") {
		const Selection = game.GetService("Selection");
		const selected = Selection.Get();
		if (selected.size() === 0) return { success: true, context: "No instances selected." };

		let context = "=== SELECTION CONTEXT ===\n";
		for (const inst of selected) {
			context += `Path: ${getInstancePath(inst)}\nClassName: ${inst.ClassName}\n`;
			const children = inst.GetChildren();
			if (children.size() > 0) {
				context += `Children (${children.size()}):\n`;
				const limit = math.min(10, children.size());
				for (let i = 0; i < limit; i++) {
					context += `  - ${children[i].Name} (${children[i].ClassName})\n`;
				}
			}
			context += "\n";
		}
		return { success: true, context };
	} else if (action === "estimate_tokens") {
		const res = buildContext({ action: "get_full_context" }) as { context: string };
		return { success: true, estimatedTokens: math.ceil((res.context || "").size() / 4) }; // Rough estimate
	}

	return { error: `Unknown action: ${action}` };
}

export = {
	getFileTree,
	searchFiles,
	getPlaceInfo,
	getServices,
	searchObjects,
	getInstanceProperties,
	getInstanceChildren,
	searchByProperty,
	getClassInfo,
	getProjectStructure,
	getConnectedInstances,
	getOutputLog,
	grepScripts,
	validatePathfinding,
	analyzePerformance,
	checkCollisions,
	generateTerrain,
	managePlaces,
	simulatePhysics,
	buildContext,
};
