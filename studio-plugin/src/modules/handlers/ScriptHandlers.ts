import { HttpService } from "@rbxts/services";
import Utils from "../Utils";
import Recording from "../Recording";

const ScriptEditorService = game.GetService("ScriptEditorService");
const { getInstancePath, getInstanceByPath, readScriptSource, splitLines, joinLines } = Utils;
const { beginRecording, finishRecording } = Recording;

function normalizeEscapes(s: string): string {
	let result = s;
	result = result.gsub("\\n", "\n")[0];
	result = result.gsub("\\t", "\t")[0];
	result = result.gsub("\\r", "\r")[0];
	result = result.gsub('\\"', '"')[0];
	result = result.gsub("\\\\", "\\")[0];
	return result;
}

function getScriptSource(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	const startLine = requestData.startLine as number | undefined;
	const endLine = requestData.endLine as number | undefined;

	if (!instancePath) return { error: "Instance path is required" };

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };
	if (!instance.IsA("LuaSourceContainer")) {
		return { error: `Instance is not a script-like object: ${instance.ClassName}` };
	}

	const [success, result] = pcall(() => {
		const fullSource = readScriptSource(instance);
		const [lines, hasTrailingNewline] = splitLines(fullSource);
		const totalLineCount = lines.size();

		let sourceToReturn = fullSource;
		let returnedStartLine = 1;
		let returnedEndLine = totalLineCount;

		if (startLine !== undefined || endLine !== undefined) {
			const actualStartLine = math.max(1, startLine ?? 1);
			const actualEndLine = math.min(lines.size(), endLine ?? lines.size());

			const selectedLines: string[] = [];
			for (let i = actualStartLine; i <= actualEndLine; i++) {
				selectedLines.push(lines[i - 1] ?? "");
			}

			sourceToReturn = selectedLines.join("\n");
			if (hasTrailingNewline && actualEndLine === lines.size() && sourceToReturn.sub(-1) !== "\n") {
				sourceToReturn += "\n";
			}
			returnedStartLine = actualStartLine;
			returnedEndLine = actualEndLine;
		}

		const numberedLines: string[] = [];
		const linesToNumber = startLine !== undefined ? splitLines(sourceToReturn)[0] : lines;
		const lineOffset = returnedStartLine - 1;
		for (let i = 0; i < linesToNumber.size(); i++) {
			numberedLines.push(`${i + 1 + lineOffset}: ${linesToNumber[i]}`);
		}
		const numberedSource = numberedLines.join("\n");

		const resp: Record<string, unknown> = {
			instancePath,
			className: instance.ClassName,
			name: instance.Name,
			source: sourceToReturn,
			numberedSource,
			sourceLength: fullSource.size(),
			lineCount: totalLineCount,
			startLine: returnedStartLine,
			endLine: returnedEndLine,
			isPartial: startLine !== undefined || endLine !== undefined,
			truncated: false,
		};

		if (startLine === undefined && endLine === undefined && fullSource.size() > 15000) {
			const truncatedLines: string[] = [];
			const truncatedNumberedLines: string[] = [];
			const maxLines = math.min(250, lines.size());
			for (let i = 0; i < maxLines; i++) {
				truncatedLines.push(lines[i]);
				truncatedNumberedLines.push(`${i + 1}: ${lines[i]}`);
			}
			resp.source = truncatedLines.join("\n");
			resp.numberedSource = truncatedNumberedLines.join("\n");
			resp.truncated = true;
			resp.endLine = maxLines;
			resp.note = "Script truncated to first 250 lines (optimized for token efficiency). Use startLine/endLine parameters to read specific sections.";
		}

		if (instance.IsA("BaseScript")) {
			resp.enabled = instance.Enabled;
		}
		return resp;
	});

	if (success) {
		return result;
	} else {
		return { error: `Failed to get script source: ${result}` };
	}
}

function setScriptSource(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	const newSource = requestData.source as string;

	if (!instancePath || !newSource) return { error: "Instance path and source are required" };

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };
	if (!instance.IsA("LuaSourceContainer")) {
		return { error: `Instance is not a script-like object: ${instance.ClassName}` };
	}

	const sourceToSet = normalizeEscapes(newSource);
	const recordingId = beginRecording(`Set script source: ${instance.Name}`);

	const [updateSuccess, updateResult] = pcall(() => {
		const oldSourceLength = readScriptSource(instance).size();

		ScriptEditorService.UpdateSourceAsync(instance, () => sourceToSet);

		return {
			success: true, instancePath,
			oldSourceLength, newSourceLength: sourceToSet.size(),
			method: "UpdateSourceAsync",
			message: "Script source updated successfully (editor-safe)",
		};
	});

	if (updateSuccess) {
		finishRecording(recordingId, true);
		return updateResult;
	}

	const [directSuccess, directResult] = pcall(() => {
		const oldSource = (instance as unknown as { Source: string }).Source;
		(instance as unknown as { Source: string }).Source = sourceToSet;

		return {
			success: true, instancePath,
			oldSourceLength: oldSource.size(), newSourceLength: sourceToSet.size(),
			method: "direct",
			message: "Script source updated successfully (direct assignment)",
		};
	});

	if (directSuccess) {
		finishRecording(recordingId, true);
		return directResult;
	}

	const [replaceSuccess, replaceResult] = pcall(() => {
		const parent = instance.Parent;
		const name = instance.Name;
		const className = instance.ClassName;
		const wasBaseScript = instance.IsA("BaseScript");
		const enabled = wasBaseScript ? instance.Enabled : undefined;

		const newScript = new Instance(className as keyof CreatableInstances) as LuaSourceContainer;
		newScript.Name = name;
		(newScript as unknown as { Source: string }).Source = sourceToSet;
		if (wasBaseScript && enabled !== undefined) {
			(newScript as BaseScript).Enabled = enabled;
		}

		newScript.Parent = parent;
		instance.Destroy();

		return {
			success: true,
			instancePath: getInstancePath(newScript),
			method: "replace",
			message: "Script replaced successfully with new source",
		};
	});

	if (replaceSuccess) {
		finishRecording(recordingId, true);
		return replaceResult;
	}

	finishRecording(recordingId, false);
	return {
		error: `Failed to set script source. UpdateSourceAsync failed: ${updateResult}. Direct assignment failed: ${directResult}. Replace method failed: ${replaceResult}`,
	};
}

function editScriptLines(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	const old_string = requestData.old_string as string;
	const new_string = requestData.new_string as string;

	if (!instancePath || old_string === undefined || new_string === undefined) {
		return { error: "Instance path, old_string, and new_string are required" };
	}

	const normalizedOld = normalizeEscapes(old_string);
	const normalizedNew = normalizeEscapes(new_string);

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };
	if (!instance.IsA("LuaSourceContainer")) {
		return { error: `Instance is not a script-like object: ${instance.ClassName}` };
	}

	const recordingId = beginRecording(`Edit script: ${instance.Name}`);

	const [success, result] = pcall(() => {
		const source = readScriptSource(instance);
		// Simple literal replacement
		const [newSource, count] = source.gsub(normalizedOld.gsub("([%^%$%(%)%%%.%[%]%*%+%-%?])", "%%%1")[0], normalizedNew.gsub("%%", "%%%%")[0]);

		if (count === 0) {
			error(`String not found in script: ${normalizedOld}`);
		}

		ScriptEditorService.UpdateSourceAsync(instance, () => newSource);

		return {
			success: true, instancePath,
			replacements: count,
			message: `Successfully replaced ${count} occurrence(s)`,
		};
	});

	if (success) {
		finishRecording(recordingId, true);
		return result;
	}
	finishRecording(recordingId, false);
	return { error: `Failed to edit script: ${result}` };
}

function findAndReplaceInScripts(requestData: Record<string, unknown>) {
	const findPattern = requestData.find_pattern as string;
	const replaceWith = requestData.replace_with as string;
	const pathScope = (requestData.path_scope as string) || "game";
	const caseSensitive = requestData.case_sensitive as boolean;
	const isPattern = requestData.is_pattern as boolean;

	const root = getInstanceByPath(pathScope);
	if (!root) return { error: `Scope path not found: ${pathScope}` };

	const scripts: LuaSourceContainer[] = [];
	for (const obj of root.GetDescendants()) {
		if (obj.IsA("LuaSourceContainer")) scripts.push(obj);
	}
	if (root.IsA("LuaSourceContainer")) scripts.push(root);

	const results: Array<{ path: string; replacements: number }> = [];
	let totalReplacements = 0;

	const findEscaped = isPattern ? findPattern : findPattern.gsub("([%^%$%(%)%%%.%[%]%*%+%-%?])", "%%%1")[0];
	const replaceEscaped = replaceWith.gsub("%%", "%%%%")[0];

	for (const s of scripts) {
		const source = readScriptSource(s);
		const [newSource, count] = source.gsub(findEscaped, replaceEscaped);
		if (count > 0) {
			pcall(() => ScriptEditorService.UpdateSourceAsync(s, () => newSource));
			results.push({ path: getInstancePath(s), replacements: count });
			totalReplacements += count;
		}
	}

	return { success: true, totalReplacements, affectedScripts: results.size(), details: results };
}

function getScriptAnalysis(requestData: Record<string, unknown>) {
	const scriptPath = requestData.scriptPath as string;
	const instance = getInstanceByPath(scriptPath);
	if (!instance || !instance.IsA("LuaSourceContainer")) return { error: "Invalid script path" };

	// GetScriptAnalysisAsync returns a table of analysis results
	const [success, result] = pcall(() => {
		const service = ScriptEditorService as unknown as { GetScriptAnalysisAsync: (inst: Instance) => unknown };
		return service.GetScriptAnalysisAsync(instance);
	});
	if (success) {
		return { success: true, analysis: result };
	}
	return { error: `Analysis failed: ${result}` };
}

function insertScriptLines(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	const afterLine = (requestData.afterLine as number) ?? 0;
	let newContent = requestData.newContent as string;

	if (!instancePath || !newContent) return { error: "Instance path and newContent are required" };

	newContent = normalizeEscapes(newContent);

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };
	if (!instance.IsA("LuaSourceContainer")) {
		return { error: `Instance is not a script-like object: ${instance.ClassName}` };
	}

	const recordingId = beginRecording(`Insert script lines after line ${afterLine}: ${instance.Name}`);

	const [success, result] = pcall(() => {
		const [lines, hadTrailingNewline] = splitLines(readScriptSource(instance));
		const totalLines = lines.size();

		if (afterLine < 0 || afterLine > totalLines) error(`afterLine out of range (0-${totalLines})`);

		const [newLines] = splitLines(newContent);
		const resultLines: string[] = [];

		for (let i = 0; i < afterLine; i++) resultLines.push(lines[i]);
		for (const line of newLines) resultLines.push(line);
		for (let i = afterLine; i < totalLines; i++) resultLines.push(lines[i]);

		const newSource = joinLines(resultLines, hadTrailingNewline);
		ScriptEditorService.UpdateSourceAsync(instance, () => newSource);

		return {
			success: true, instancePath,
			insertedAfterLine: afterLine,
			linesInserted: newLines.size(),
			newLineCount: resultLines.size(),
			message: "Script lines inserted successfully",
		};
	});

	if (success) {
		finishRecording(recordingId, true);
		return result;
	}
	finishRecording(recordingId, false);
	return { error: `Failed to insert script lines: ${result}` };
}

function deleteScriptLines(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	const startLine = requestData.startLine as number;
	const endLine = requestData.endLine as number;

	if (!instancePath || !startLine || !endLine) {
		return { error: "Instance path, startLine, and endLine are required" };
	}

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };
	if (!instance.IsA("LuaSourceContainer")) {
		return { error: `Instance is not a script-like object: ${instance.ClassName}` };
	}

	const recordingId = beginRecording(`Delete script lines ${startLine}-${endLine}: ${instance.Name}`);

	const [success, result] = pcall(() => {
		const [lines, hadTrailingNewline] = splitLines(readScriptSource(instance));
		const totalLines = lines.size();

		if (startLine < 1 || startLine > totalLines) error(`startLine out of range (1-${totalLines})`);
		if (endLine < startLine || endLine > totalLines) error(`endLine out of range (${startLine}-${totalLines})`);

		const resultLines: string[] = [];
		for (let i = 0; i < startLine - 1; i++) resultLines.push(lines[i]);
		for (let i = endLine; i < totalLines; i++) resultLines.push(lines[i]);

		const newSource = joinLines(resultLines, hadTrailingNewline);
		ScriptEditorService.UpdateSourceAsync(instance, () => newSource);

		return {
			success: true, instancePath,
			deletedLines: { startLine, endLine },
			linesDeleted: endLine - startLine + 1,
			newLineCount: resultLines.size(),
			message: "Script lines deleted successfully",
		};
	});

	if (success) {
		finishRecording(recordingId, true);
		return result;
	}
	finishRecording(recordingId, false);
	return { error: `Failed to delete script lines: ${result}` };
}

function syncProject(data: Record<string, unknown>): unknown {
	const action = data.action as string;
	if (action === "get_scripts") {
		const startPath = (data.instance_path as string) || "game";
		const startInst = getInstanceByPath(startPath);
		if (!startInst) return { error: "Start instance not found" };

		const scripts: { path: string; source: string }[] = [];
		function findRecursive(inst: Instance) {
			if (inst.IsA("LuaSourceContainer")) {
				scripts.push({ path: getInstancePath(inst), source: readScriptSource(inst) });
			}
			for (const child of inst.GetChildren()) findRecursive(child);
		}
		findRecursive(startInst);
		return { scripts };
	} else if (action === "update_scripts") {
		const updates = (data.updates as { path: string; source: string }[]) || [];
		let count = 0;
		for (const update of updates) {
			const inst = getInstanceByPath(update.path);
			if (inst && inst.IsA("LuaSourceContainer")) {
				const [ok] = pcall(() => {
					ScriptEditorService.UpdateSourceAsync(inst, () => update.source);
				});
				if (ok) count++;
			}
		}
		return { success: true, updatedCount: count };
	}
	return { error: `Unknown action: ${action}` };
}

// === Feature 16: Remote Event Monitor ===
const remoteLogs: Array<{ remote: string; type: string; args: string; time: number }> = [];
const activeListeners: Map<Instance, RBXScriptConnection> = new Map();

function monitorRemotes(requestData: Record<string, unknown>) {
	const action = requestData.action as string;

	if (action === "list_remotes") {
		const remotes: Array<{ path: string; className: string }> = [];
		const all = game.GetDescendants();
		for (const obj of all) {
			if (obj.IsA("RemoteEvent") || obj.IsA("RemoteFunction")) {
				remotes.push({ path: getInstancePath(obj), className: obj.ClassName });
			}
		}
		return { success: true, remotes };
	}

	if (action === "log_fires") {
		const remotePath = requestData.remote_path as string;
		const duration = (requestData.duration_seconds as number) || 30;

		const target = remotePath ? getInstanceByPath(remotePath) : undefined;
		const targets = target ? [target] : game.GetDescendants().filter((o) => o.IsA("RemoteEvent"));

		for (const obj of targets) {
			if (obj.IsA("RemoteEvent") && !activeListeners.has(obj)) {
				const conn = obj.OnServerEvent.Connect((player, ...args) => {
					remoteLogs.push({
						remote: getInstancePath(obj),
						type: "OnServerEvent",
						args: HttpService.JSONEncode(args),
						time: tick(),
					});
				});
				activeListeners.set(obj, conn);
			}
		}

		task.delay(duration, () => {
			for (const [obj, conn] of activeListeners) {
				conn.Disconnect();
			}
			activeListeners.clear();
		});

		return { success: true, message: `Logging started for ${duration}s` };
	}

	if (action === "get_logs") {
		return { success: true, logs: remoteLogs };
	}

	if (action === "stop_logging") {
		for (const [obj, conn] of activeListeners) {
			conn.Disconnect();
		}
		activeListeners.clear();
		return { success: true, message: "Logging stopped" };
	}

	return { error: `Unknown action: ${action}` };
}

// === Feature 17: Script Dependency Mapper ===
function mapDependencies(requestData: Record<string, unknown>) {
	const action = requestData.action as string;
	const scriptPath = requestData.script_path as string;

	if (action === "get_dependencies") {
		const instance = getInstanceByPath(scriptPath);
		if (!instance || !instance.IsA("LuaSourceContainer")) return { error: "Invalid script path" };

		const source = readScriptSource(instance);
		const deps: string[] = [];
		// Simple regex-like scan for require(path)
		for (const [match] of source.gmatch("require%s*%(%s*([^%)]+)%s*%)")) {
			deps.push(match as string);
		}
		return { success: true, dependencies: deps };
	}

	return { error: `Unknown action: ${action}` };
}

// === Feature 18: Variable Leak Finder ===
function findVariableLeaks(requestData: Record<string, unknown>) {
	const action = requestData.action as string;
	const scriptPath = requestData.script_path as string;

	const scan = (inst: LuaSourceContainer) => {
		const source = readScriptSource(inst);
		const [lines] = splitLines(source);
		const leaks: Array<{ line: number; content: string }> = [];
		let inBlockComment = false;

		lines.forEach((line, i) => {
			const trimmed = line.gsub("^%s+", "")[0] as string;

			if (inBlockComment) {
				if (trimmed.find("%]%]")[0]) inBlockComment = false;
				return;
			}
			if (trimmed.sub(1, 4) === "--[[") {
				if (!trimmed.find("%]%]")[0]) inBlockComment = true;
				return;
			}
			if (trimmed.sub(1, 2) === "--") return;

			const [match1] = string.match(line, "^%s*([%a_][%w_]*)%s*=");
			const [match2] = string.match(line, "^%s*(local)%s");
			const [match3] = string.match(line, "^%s*(function)%s");
			const [match4] = string.match(line, "%.");
			const [match5] = string.match(line, "^%s*(return)%s");
			const [match6] = string.match(line, "^%s*(end)");
			const [match7] = string.match(line, "^%s*(else)");
			const [match8] = string.match(line, "^%s*(elseif)%s");

			if (match1 && !match2 && !match3 && !match4 && !match5 && !match6 && !match7 && !match8) {
				leaks.push({ line: i + 1, content: trimmed.gsub("%s+$", "")[0] as string });
			}
		});
		return leaks;
	};

	if (action === "scan_script") {
		const instance = getInstanceByPath(scriptPath);
		if (!instance || !instance.IsA("LuaSourceContainer")) return { error: "Invalid script path" };
		return { success: true, leaks: scan(instance) };
	}

	return { error: `Unknown action: ${action}` };
}

// === Feature 19: Anti-Cheat Scanner ===
function scanAnticheat(requestData: Record<string, unknown>) {
	const action = requestData.action as string;
	const targetPath = (requestData.target_path as string) || "game";

	if (action === "scan_suspicious") {
		const root = getInstanceByPath(targetPath);
		if (!root) return { error: "Target path not found" };

		const results: Array<{ path: string; findings: string[] }> = [];
		const all = root.GetDescendants();
		const scripts: LuaSourceContainer[] = [];
		for (const o of all) {
			if (o.IsA("LuaSourceContainer")) scripts.push(o);
		}

		const suspicious = ["loadstring", "getfenv", "setfenv", "rawget", "rawset", "HttpService:GetAsync"];

		for (const s of scripts) {
			const source = readScriptSource(s);
			const findings: string[] = [];
			for (const pattern of suspicious) {
				if (source.find(pattern)[0] !== undefined) {
					findings.push(pattern);
				}
			}
			if (findings.size() > 0) {
				results.push({ path: getInstancePath(s), findings });
			}
		}
		return { success: true, results };
	}

	return { error: `Unknown action: ${action}` };
}

// === Feature 26: Comment Inserter ===
function insertComments(requestData: Record<string, unknown>) {
	const action = requestData.action as string;
	const scriptPath = requestData.script_path as string;
	const author = (requestData.author_name as string) || "Gemini MCP";

	const instance = getInstanceByPath(scriptPath);
	if (!instance || !instance.IsA("LuaSourceContainer")) return { error: "Invalid script path" };

	const source = readScriptSource(instance);

	if (action === "comment_script") {
		const header = `--[[\n\tDescription: Auto-generated header\n\tAuthor: ${author}\n\tDate: ${os.date("%x")}\n--]]\n\n`;
		const newSource = header + source;
		const [ok] = pcall(() => {
			ScriptEditorService.UpdateSourceAsync(instance, () => newSource);
		});
		if (!ok) (instance as unknown as { Source: string }).Source = newSource;
		return { success: true, message: "Header added" };
	}

	if (action === "remove_comments") {
		const [lines] = splitLines(source);
		const newLines: string[] = [];
		let inBlockComment = false;

		for (const l of lines) {
			const trimmed = l.match("^%s*(.*)")[0] as string || "";

			if (inBlockComment) {
				if (trimmed.find("%]%]")[0]) {
					inBlockComment = false;
				}
				continue;
			}

			if (trimmed.sub(1, 4) === "--[[") {
				if (!trimmed.find("%]%]")[0]) {
					inBlockComment = true;
				}
				continue;
			}

			if (trimmed.sub(1, 2) === "--") continue;

			newLines.push(l);
		}

		const newSource = newLines.join("\n");
		const [ok] = pcall(() => {
			ScriptEditorService.UpdateSourceAsync(instance, () => newSource);
		});
		if (!ok) (instance as unknown as { Source: string }).Source = newSource;
		return { success: true, message: "Comments removed" };
	}

	return { error: `Unknown action: ${action}` };
}

function generateScript(requestData: Record<string, unknown>) {
	const action = requestData.action as string;
	const scriptName = requestData.script_name as string;
	const parentPath = requestData.parent_path as string;
	const author = (requestData.author_name as string) || "Gemini MCP";

	const parent = getInstanceByPath(parentPath);
	if (!parent) return { error: `Parent not found: ${parentPath}` };

	let className: keyof CreatableInstances = "Script";
	let source = "";

	if (action === "generate_module") {
		className = "ModuleScript";
		source = `--[[\n\tDescription: ${scriptName} module\n\tAuthor: ${author}\n\tDate: ${os.date("%x")}\n--]]\n\nlocal ${scriptName} = {}\n\nfunction ${scriptName}.init()\n\tprint("${scriptName} initialized")\nend\n\nreturn ${scriptName}\n`;
	} else if (action === "generate_service") {
		className = "Script";
		source = `--[[\n\tDescription: ${scriptName} Service\n\tAuthor: ${author}\n\tDate: ${os.date("%x")}\n--]]\n\nlocal ${scriptName} = {}\n${scriptName}.__index = ${scriptName}\n\nfunction ${scriptName}.new()\n\tlocal self = setmetatable({}, ${scriptName})\n\treturn self\nend\n\nfunction ${scriptName}:Init()\n\tprint("${scriptName} Service Initialized")\nend\n\nfunction ${scriptName}:Start()\n\tprint("${scriptName} Service Started")\nend\n\n-- Singleton Pattern\nlocal instance = ${scriptName}.new()\ninstance:Init()\ntask.spawn(function()\n\tinstance:Start()\nend)\n\nreturn instance\n`;
	} else if (action === "generate_handler") {
		className = "Script";
		source = `--[[\n\tDescription: ${scriptName} Remote Handler\n\tAuthor: ${author}\n\tDate: ${os.date("%x")}\n--]]\n\nlocal ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal Remote = ReplicatedStorage:FindFirstChild("${scriptName}") or Instance.new("RemoteEvent")\nRemote.Name = "${scriptName}"\nRemote.Parent = ReplicatedStorage\n\nlocal RATE_LIMIT = {} -- Type: {[Player]: {count: number, last: number}}\nlocal MAX_RATE = 5\n\nRemote.OnServerEvent.Connect((player: Player, ...args: any[]) => {\n\t-- Basic Rate Limiting\n\tlocal now = tick()\n\tlocal data = RATE_LIMIT[player as any] or {count: 0, last: now}\n\tif (now - data.last > 1) {\n\t\tdata.count = 0\n\t\tdata.last = now\n\t}\n\tdata.count += 1\n\tRATE_LIMIT[player as any] = data\n\n\tif (data.count > MAX_RATE) {\n\t\twarn("Rate limit exceeded for " .. player.Name)\n\t\treturn\n\tend\n\n\tprint("Received remote call from " .. player.Name)\n})\n`;
	} else if (action === "generate_datastore") {
		className = "ModuleScript";
		source = `--[[\n\tDescription: ${scriptName} DataStore Wrapper\n\tAuthor: ${author}\n\tDate: ${os.date("%x")}\n--]]\n\nlocal DataStoreService = game:GetService("DataStoreService")\nlocal Store = DataStoreService:GetDataStore("${scriptName}")\n\nlocal ${scriptName} = {}\n\nfunction ${scriptName}.Get(key: string)\n\tlocal success, result = pcall(() => {\n\t\treturn Store.GetAsync(key)\n\t})\n\tif success then\n\t\treturn result\n\telse\n\t\twarn("DataStore Get failed for " .. key .. ": " .. tostring(result))\n\t\treturn nil\n\tend\nend\n\nfunction ${scriptName}.Set(key: string, value: any)\n\tlocal success, result = pcall(() => {\n\t\tStore.SetAsync(key, value)\n\t})\n\tif not success then\n\t\twarn("DataStore Set failed for " .. key .. ": " .. tostring(result))\n\tend\n\treturn success\nend\n\nreturn ${scriptName}\n`;
	} else {
		return { error: `Unknown action: ${action}` };
	}

	const recordingId = beginRecording(`Generate script: ${scriptName}`);
	const [ok, inst] = pcall(() => {
		const newScript = new Instance(className) as LuaSourceContainer;
		newScript.Name = scriptName;
		(newScript as unknown as { Source: string }).Source = source;
		newScript.Parent = parent;
		return newScript;
	});

	if (ok) {
		finishRecording(recordingId, true);
		return { success: true, path: getInstancePath(inst), className };
	} else {
		finishRecording(recordingId, false);
		return { error: `Failed to create script: ${inst}` };
	}
}

export = {
	getScriptSource,
	setScriptSource,
	editScriptLines,
	insertScriptLines,
	deleteScriptLines,
	syncProject,
	monitorRemotes,
	mapDependencies,
	findVariableLeaks,
	scanAnticheat,
	insertComments,
	generateScript,
	findAndReplaceInScripts,
	getScriptAnalysis,
};
