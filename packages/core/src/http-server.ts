import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { RobloxStudioTools } from './tools/index.js';
import { BridgeService } from './bridge-service.js';
import { TOOL_DEFINITIONS } from './tools/definitions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type ToolHandler = (tools: RobloxStudioTools, body: any) => Promise<any>;

const TOOL_HANDLERS: Record<string, ToolHandler> = {
  get_file_tree: (tools, body) => tools.getFileTree(body.path),
  search_files: (tools, body) => tools.searchFiles(body.query, body.searchType),
  get_place_info: (tools) => tools.getPlaceInfo(),
  get_services: (tools, body) => tools.getServices(body.serviceName),
  search_objects: (tools, body) => tools.searchObjects(body.query, body.searchType, body.propertyName),
  get_instance_properties: (tools, body) => tools.getInstanceProperties(body.instancePath, body.excludeSource),
  get_instance_children: (tools, body) => tools.getInstanceChildren(body.instancePath),
  search_by_property: (tools, body) => tools.searchByProperty(body.propertyName, body.propertyValue),
  get_class_info: (tools, body) => tools.getClassInfo(body.className),
  get_project_structure: (tools, body) => tools.getProjectStructure(body.path, body.maxDepth, body.scriptsOnly),
  set_property: (tools, body) => tools.setProperty(body.instancePath, body.propertyName, body.propertyValue),
  mass_set_property: (tools, body) => tools.massSetProperty(body.paths, body.propertyName, body.propertyValue),
  mass_get_property: (tools, body) => tools.massGetProperty(body.paths, body.propertyName),
  create_object: (tools, body) => tools.createObject(body.className, body.parent, body.name, body.properties),
  create_object_with_properties: (tools, body) => tools.createObject(body.className, body.parent, body.name, body.properties),
  mass_create_objects: (tools, body) => tools.massCreateObjects(body.objects),
  mass_create_objects_with_properties: (tools, body) => tools.massCreateObjects(body.objects),
  delete_object: (tools, body) => tools.deleteObject(body.instancePath),
  smart_duplicate: (tools, body) => tools.smartDuplicate(body.instancePath, body.count, body.options),
  mass_duplicate: (tools, body) => tools.massDuplicate(body.duplications),
  grep_scripts: (tools, body) => tools.grepScripts(body.pattern, {
    caseSensitive: body.caseSensitive,
    usePattern: body.usePattern,
    contextLines: body.contextLines,
    maxResults: body.maxResults,
    maxResultsPerScript: body.maxResultsPerScript,
    filesOnly: body.filesOnly,
    path: body.path,
    classFilter: body.classFilter,
  }),
  get_script_source: (tools, body) => tools.getScriptSource(body.instancePath, body.startLine, body.endLine, body.dataModel),
  set_script_source: (tools, body) => tools.setScriptSource(body.instancePath, body.source, body.dataModel),
  edit_script_lines: (tools, body) => tools.editScriptLines(body.instancePath, body.old_string, body.new_string, body.dataModel),
  insert_script_lines: (tools, body) => tools.insertScriptLines(body.instancePath, body.afterLine, body.newContent),
  delete_script_lines: (tools, body) => tools.deleteScriptLines(body.instancePath, body.startLine, body.endLine),
  upload_decal: (tools, body) => tools.uploadDecal(body.filePath, body.assetName, body.description),
  simulate_mouse_input: (tools, body) => tools.simulateMouseInput(body),
  simulate_keyboard_input: (tools, body) => tools.simulateKeyboardInput(body),
  character_navigation: (tools, body) => tools.characterNavigation(body),
  find_and_replace_in_scripts: (tools, body) => tools.findAndReplaceInScripts(body),
  get_connected_instances: (tools, body) => tools.getConnectedInstances(body),
  get_script_analysis: (tools, body) => tools.getScriptAnalysis(body),
  get_output_log: (tools, body) => tools.getOutputLog(body),
  get_attribute: (tools, body) => tools.getAttribute(body.instancePath, body.attributeName),
  set_attribute: (tools, body) => tools.setAttribute(body.instancePath, body.attributeName, body.attributeValue, body.valueType),
  get_attributes: (tools, body) => tools.getAttributes(body.instancePath),
  delete_attribute: (tools, body) => tools.deleteAttribute(body.instancePath, body.attributeName),
  get_tags: (tools, body) => tools.getTags(body.instancePath),
  add_tag: (tools, body) => tools.addTag(body.instancePath, body.tagName),
  remove_tag: (tools, body) => tools.removeTag(body.instancePath, body.tagName),
  get_tagged: (tools, body) => tools.getTagged(body.tagName),
  get_selection: (tools) => tools.getSelection(),
  execute_luau: (tools, body) => tools.executeLuau(body.code),
  start_playtest: (tools, body) => tools.startPlaytest(body.mode),
  stop_playtest: (tools) => tools.stopPlaytest(),
  get_playtest_output: (tools) => tools.getPlaytestOutput(),
  export_build: (tools, body) => tools.exportBuild(body.instancePath, body.outputId, body.style),
  create_build: (tools, body) => tools.createBuild(body.id, body.style, body.palette, body.parts, body.bounds),
  generate_build: (tools, body) => tools.generateBuild(body.id, body.style, body.palette, body.code, body.seed),
  import_build: (tools, body) => tools.importBuild(body.buildData, body.targetPath, body.position),
  list_library: (tools, body) => tools.listLibrary(body.style),
  search_materials: (tools, body) => tools.searchMaterials(body.query, body.maxResults),
  get_build: (tools, body) => tools.getBuild(body.id),
  import_scene: (tools, body) => tools.importScene(body.sceneData, body.targetPath),
  undo: (tools) => tools.undo(),
  redo: (tools) => tools.redo(),
  search_assets: (tools, body) => tools.searchAssets(body.assetType, body.query, body.maxResults, body.sortBy, body.verifiedCreatorsOnly),
  get_asset_details: (tools, body) => tools.getAssetDetails(body.assetId),
  get_asset_thumbnail: (tools, body) => tools.getAssetThumbnail(body.assetId, body.size),
  insert_asset: (tools, body) => tools.insertAssetV2 ? tools.insertAssetV2(body) : tools.insertAsset(body.assetId, body.parentPath, body.position),
  preview_asset: (tools, body) => tools.previewAsset(body.assetId, body.includeProperties, body.maxDepth),
  capture_screenshot: (tools) => tools.captureScreenshot(),
  capture_viewport: (tools, body) => tools.captureViewport(body.action, body.highlight_path, body.resolution),
  history_control: (tools, body) => tools.historyControl(body.action, body.waypoint_name),
  control_selection: (tools, body) => tools.controlSelection(body.action, body.paths, body.properties),
  validate_pathfinding: (tools, body) => tools.validatePathfinding(body.action, body.start, body.goal, body.agent_params),
  analyze_performance: (tools, body) => tools.analyzePerformance(body.action, body.target_path, body.iterations),
  check_collisions: (tools, body) => tools.checkCollisions(body),
  manage_datastore: (tools, body) => tools.manageDatastore(body),
  build_library: (tools, body) => tools.buildLibrary(body),
  run_tests: (tools, body) => tools.runTests(body),
  generate_terrain: (tools, body) => tools.generateTerrain(body),
  control_lighting: (tools, body) => tools.controlLighting(body),
  sync_project: (tools, body) => tools.syncProject(body),
  control_audio_animation: (tools, body) => tools.controlAudioAnimation(body),
  manage_places: (tools, body) => tools.managePlaces(body),
  monitor_remotes: (tools, body) => tools.monitorRemotes(body),
  map_dependencies: (tools, body) => tools.mapDependencies(body),
  find_variable_leaks: (tools, body) => tools.findVariableLeaks(body),
  scan_anticheat: (tools, body) => tools.scanAnticheat(body),
  auto_place: (tools, body) => tools.autoPlace(body),
  mirror_instances: (tools, body) => tools.mirrorInstances(body),
  snap_to_grid: (tools, body) => tools.snapToGrid(body),
  paint_surfaces: (tools, body) => tools.paintSurfaces(body),
  track_changes: (tools, body) => tools.trackChanges(body),
  manage_backups: (tools, body) => tools.manageBackups(body),
  insert_comments: (tools, body) => tools.insertComments(body),
  fix_naming: (tools, body) => tools.fixNaming(body),
  build_cutscene: (tools, body) => tools.buildCutscene(body),
  generate_lod: (tools, body) => tools.generateLod(body),
  simulate_physics: (tools, body) => tools.simulatePhysics(body),
  build_ui: (tools, body) => tools.buildUi(body),
  capture_ui: (tools, body) => tools.captureUi(body),
  get_ui_templates: (tools, body) => tools.getUiTemplates(body),
  sync_project_enhanced: (tools, body) => tools.syncProjectEnhanced(body),
  generate_test_report: (tools, body) => tools.generateTestReport(body),
  check_ui_design: (tools, body) => tools.checkUiDesign(body),
};

export function createHttpServer(tools: RobloxStudioTools, bridge: BridgeService, allowedTools?: Set<string>) {
  const app = express();
  let pluginConnected = false;
  let mcpServerActive = false;
  let mcpServerStartTime = 0;
  let targetPlaceId: number | null = null;

  // Place tracking: placeId → { dataModel, lastSeen, placeName, placeId }
  const connectedPlaces = new Map<number, { dataModel: string; lastSeen: number; placeName: string; placeId: number }>();

  const activityLogsByPlace = new Map<number, Array<{time: string, type: string, message: string, details: string, before?: any, after?: any}>>();
  (app as any).addActivityLog = (type: string, message: string, details: string = '', before?: any, after?: any) => {
    const placeId = (app as any).currentPlaceId || 0;
    if (!activityLogsByPlace.has(placeId)) {
      activityLogsByPlace.set(placeId, []);
    }
    const log = activityLogsByPlace.get(placeId)!;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const entry: any = { time, type, message, details };
    if (before !== undefined) entry.before = before;
    if (after !== undefined) entry.after = after;
    log.unshift(entry);
    if (log.length > 50) log.pop();
  };
  const proxyInstances = new Set<string>();

  // Bidirectional Sync State
  interface SyncConfig {
    projectDir: string;
    syncRoots: string[];
    autoSync: boolean;
  }
  interface FileHash { hash: string; mtime: number; }
  const syncState = {
    config: null as SyncConfig | null,
    fileHashes: new Map<string, FileHash>(), // filePath → hash
    studioHashes: new Map<string, string>(), // instancePath → hash
    watcher: null as fs.FSWatcher | null,
  };

  function computeHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0;
    }
    return hash.toString(36);
  }

  function instancePathToFile(instancePath: string): string | null {
    const config = syncState.config;
    if (!config) return null;
    const cleaned = instancePath.replace(/^game\./, '');
    for (const root of config.syncRoots) {
      const rootCleaned = root.replace(/^game\./, '');
      if (cleaned.startsWith(rootCleaned + '.') || cleaned === rootCleaned) {
        const relative = cleaned.substring(rootCleaned.length).replace(/^\./, '');
        const parts = relative.split('.');
        const fileName = parts.pop() + '.lua';
        const dirParts = [rootCleaned, ...parts];
        return path.join(config.projectDir, ...dirParts, fileName);
      }
    }
    return null;
  }

  function fileToInstancePath(filePath: string): string | null {
    const config = syncState.config;
    if (!config) return null;
    const relative = path.relative(config.projectDir, filePath).replace(/\\/g, '/');
    const parts = relative.split('/');
    if (parts.length < 2) return null;
    const rootDir = parts[0];
    const fileName = parts[parts.length - 1];
    const scriptName = fileName.replace(/\.lua$/, '');
    const middleParts = parts.slice(1, -1);
    return `game.${rootDir}${middleParts.length ? '.' + middleParts.join('.') : ''}.${scriptName}`;
  }

  function scanLocalFiles(): Map<string, FileHash> {
    const results = new Map<string, FileHash>();
    const config = syncState.config;
    if (!config || !fs.existsSync(config.projectDir)) return results;

    function walkDir(dir: string) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walkDir(fullPath);
          } else if (entry.name.endsWith('.lua')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            results.set(fullPath, { hash: computeHash(content), mtime: Date.now() });
          }
        }
      } catch {}
    }
    walkDir(config.projectDir);
    return results;
  }

  function startFileWatcher() {
    const config = syncState.config;
    if (!config) return;
    if (syncState.watcher) syncState.watcher.close();

    try {
      syncState.watcher = fs.watch(config.projectDir, { recursive: true }, (eventType, fileName) => {
        if (!fileName || !fileName.endsWith('.lua')) return;
        const fullPath = path.join(config.projectDir, fileName);
        if (!fs.existsSync(fullPath)) return;

        const content = fs.readFileSync(fullPath, 'utf-8');
        const newHash = computeHash(content);
        const oldEntry = syncState.fileHashes.get(fullPath);

        if (!oldEntry || oldEntry.hash !== newHash) {
          syncState.fileHashes.set(fullPath, { hash: newHash, mtime: Date.now() });
          const instancePath = fileToInstancePath(fullPath);
          if (instancePath && config.autoSync) {
            (app as any).addActivityLog?.('sync', `File changed: ${fileName}`, `Auto-syncing to ${instancePath}`);
          }
        }
      });
    } catch {}
  }

  function stopFileWatcher() {
    if (syncState.watcher) {
      syncState.watcher.close();
      syncState.watcher = null;
    }
  }

  // Sync endpoint
  app.post('/sync', async (req, res) => {
    const { action, projectDir, syncRoots, autoSync, files, scripts } = req.body;

    if (action === 'setup_sync') {
      if (!projectDir) { res.status(400).json({ error: 'projectDir required' }); return; }
      syncState.config = { projectDir, syncRoots: syncRoots || ['game.ServerScriptService', 'game.ReplicatedStorage'], autoSync: autoSync ?? false };
      syncState.fileHashes = scanLocalFiles();
      if (syncState.config.autoSync) startFileWatcher();
      res.json({ success: true, config: syncState.config, fileCount: syncState.fileHashes.size });
    } else if (action === 'get_changes') {
      if (!syncState.config) { res.status(400).json({ error: 'Sync not configured. Call setup_sync first.' }); return; }

      const currentFiles = scanLocalFiles();
      const localChanges: Array<{ file: string; path: string }> = [];
      for (const [filePath, fileHash] of currentFiles) {
        const old = syncState.fileHashes.get(filePath);
        if (!old || old.hash !== fileHash.hash) {
          const instancePath = fileToInstancePath(filePath);
          if (instancePath) localChanges.push({ file: path.basename(filePath), path: instancePath });
        }
      }

      // Studio changes are detected via plugin (call get_scripts and compare)
      const studioResult = await tools.syncProject({ action: 'get_scripts', instance_path: 'game' } as any);
      const studioText = studioResult?.content?.[0]?.text;
      let studioChanges: Array<{ path: string; source: string }> = [];
      if (studioText) {
        try {
          const parsed = JSON.parse(studioText);
          if (parsed.scripts) {
            for (const script of parsed.scripts) {
              const newHash = computeHash(script.source);
              const oldHash = syncState.studioHashes.get(script.path);
              if (oldHash && oldHash !== newHash) {
                studioChanges.push({ path: script.path, source: script.source });
              }
              syncState.studioHashes.set(script.path, newHash);
            }
          }
        } catch {}
      }

      const conflicts = localChanges.filter(lc => studioChanges.some(sc => sc.path === lc.path));
      res.json({ success: true, localChanges, studioChanges: studioChanges.map(s => ({ path: s.path })), conflicts });
    } else if (action === 'sync_to_studio') {
      if (!syncState.config) { res.status(400).json({ error: 'Sync not configured.' }); return; }
      const targetFiles = files || [];
      const updates: Array<{ path: string; source: string }> = [];
      for (const instancePath of targetFiles) {
        const filePath = instancePathToFile(instancePath);
        if (filePath && fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          updates.push({ path: instancePath, source: content });
          syncState.fileHashes.set(filePath, { hash: computeHash(content), mtime: Date.now() });
        }
      }
      if (updates.length > 0) {
        const result = await tools.syncProject({ action: 'update_scripts', updates } as any);
        const text = result?.content?.[0]?.text;
        res.json(text ? JSON.parse(text) : { success: true, updatedCount: updates.length });
      } else {
        res.json({ success: true, updatedCount: 0 });
      }
    } else if (action === 'sync_to_local') {
      if (!syncState.config) { res.status(400).json({ error: 'Sync not configured.' }); return; }
      const targetScripts = scripts || [];
      const result = await tools.syncProject({ action: 'get_scripts', instance_path: 'game' } as any);
      const text = result?.content?.[0]?.text;
      let written = 0;
      if (text) {
        try {
          const parsed = JSON.parse(text);
          if (parsed.scripts) {
            for (const script of parsed.scripts) {
              if (targetScripts.length > 0 && !targetScripts.includes(script.path)) continue;
              const filePath = instancePathToFile(script.path);
              if (filePath) {
                const dir = path.dirname(filePath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(filePath, script.source, 'utf-8');
                syncState.fileHashes.set(filePath, { hash: computeHash(script.source), mtime: Date.now() });
                syncState.studioHashes.set(script.path, computeHash(script.source));
                written++;
              }
            }
          }
        } catch {}
      }
      res.json({ success: true, written });
    } else if (action === 'toggle_auto_sync') {
      if (!syncState.config) { res.status(400).json({ error: 'Sync not configured.' }); return; }
      syncState.config.autoSync = autoSync ?? !syncState.config.autoSync;
      if (syncState.config.autoSync) startFileWatcher(); else stopFileWatcher();
      res.json({ success: true, autoSync: syncState.config.autoSync });
    } else {
      res.status(400).json({ error: `Unknown action: ${action}` });
    }
  });

  const setMCPServerActive = (active: boolean) => {
    mcpServerActive = active;
    if (active) {
      mcpServerStartTime = Date.now();
    } else {
      mcpServerStartTime = 0;
    }
  };

  const isMCPServerActive = () => {
    return mcpServerActive;
  };

  const isPluginConnected = () => {
    return pluginConnected;
  };

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Rate limiting: 450 requests per minute per IP
  const RATE_LIMIT = 450;
  const RATE_WINDOW_MS = 60 * 1000; // 1 minute
  const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap) {
      if (now - entry.windowStart > RATE_WINDOW_MS * 2) {
        rateLimitMap.delete(ip);
      }
    }
  }, 30000);

  app.use((req, res, next) => {
    if (req.path === '/dashboard' || req.path === '/health') {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let entry = rateLimitMap.get(ip);

    if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
      entry = { count: 0, windowStart: now };
      rateLimitMap.set(ip, entry);
    }

    entry.count++;

    if (entry.count > RATE_LIMIT) {
      res.setHeader('Retry-After', Math.ceil((entry.windowStart + RATE_WINDOW_MS - now) / 1000));
      return res.status(429).json({
        error: 'Rate limit exceeded',
        limit: RATE_LIMIT,
        windowMs: RATE_WINDOW_MS,
        retryAfterMs: entry.windowStart + RATE_WINDOW_MS - now,
      });
    }

    next();
  });

  app.get('/dashboard', (req, res) => {
    const searchPaths = [
      path.join(__dirname, 'roblox-mcp-dashboard.html'),
      path.join(process.cwd(), 'roblox-mcp-dashboard.html'),
      path.join(process.cwd(), 'dist', 'roblox-mcp-dashboard.html'),
      path.join(process.cwd(), 'packages', 'robloxstudio-mcp-remake', 'dist', 'roblox-mcp-dashboard.html')
    ];

    let dashboardPath = '';
    for (const p of searchPaths) {
      if (fs.existsSync(p)) {
        dashboardPath = p;
        break;
      }
    }

    if (dashboardPath) {
      res.sendFile(dashboardPath);
    } else {
      res.status(404).send(`Dashboard file not found. Searched in: ${searchPaths.join(', ')}. Please ensure roblox-mcp-dashboard.html is available.`);
    }
  });

  app.get('/tools', (req, res) => {
    const availableTools = allowedTools 
      ? TOOL_DEFINITIONS.filter(t => allowedTools.has(t.name))
      : TOOL_DEFINITIONS;
    res.json({ tools: availableTools });
  });

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'ItsQuentar Roblox Plugin Remake',
      pluginConnected,
      mcpServerActive: isMCPServerActive(),
      uptime: mcpServerActive ? Date.now() - mcpServerStartTime : 0,
      proxyInstanceCount: proxyInstances.size
    });
  });


  app.post('/ready', (req, res) => {
    pluginConnected = true;
    res.json({ success: true });
  });


  app.post('/disconnect', (req, res) => {
    pluginConnected = false;
    bridge.clearAllPendingRequests();
    res.json({ success: true });
  });

  app.get('/poll', (req, res) => {
    if (!pluginConnected) {
      pluginConnected = true;
    }

    const targetModel = (req.query.dataModel as string) || 'edit';
    const placeId = parseInt(req.query.placeId as string) || 0;

    // Mark plugin as alive for this DataModel
    bridge.markPluginSeen(targetModel);

    // Track connected places
    if (placeId > 0) {
      const existing = connectedPlaces.get(placeId);
      connectedPlaces.set(placeId, {
        dataModel: targetModel,
        lastSeen: Date.now(),
        placeName: existing?.placeName || `Place ${placeId}`,
        placeId,
      });
    }

    if (!isMCPServerActive()) {
      res.status(503).json({
        error: 'MCP server not connected',
        pluginConnected: true,
        mcpConnected: false,
        request: null
      });
      return;
    }

    bridge.getPendingRequest(targetModel, true).then((pendingRequest) => {
      if (pendingRequest) {
        res.json({
          request: pendingRequest.request,
          requestId: pendingRequest.requestId,
          mcpConnected: true,
          pluginConnected: true,
          proxyInstanceCount: proxyInstances.size
        });
      } else {
        res.json({
          request: null,
          mcpConnected: true,
          pluginConnected: true,
          proxyInstanceCount: proxyInstances.size
        });
      }
    });
  });

  app.post('/response', (req, res) => {
    const { requestId, response, error } = req.body;

    if (error) {
      bridge.rejectRequest(requestId, error);
    } else {
      bridge.resolveRequest(requestId, response);
    }

    res.json({ success: true });
  });

  app.post('/proxy', async (req, res) => {
    const { endpoint, data, proxyInstanceId } = req.body;

    if (!endpoint) {
      res.status(400).json({ error: 'endpoint is required' });
      return;
    }

    if (proxyInstanceId) {
      proxyInstances.add(proxyInstanceId);
    }

    try {
      const response = await bridge.sendRequest(endpoint, data);
      res.json({ response });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Proxy request failed' });
    }
  });

  // Clean up stale places (no poll for 30 seconds)
  setInterval(() => {
    const now = Date.now();
    for (const [placeId, place] of connectedPlaces) {
      if (now - place.lastSeen > 30000) {
        connectedPlaces.delete(placeId);
      }
    }
  }, 10000);

  // Manage places endpoint
  app.post('/places', (req, res) => {
    const { action, placeId: reqPlaceId, placeName } = req.body;

    if (action === 'list_places') {
      const places = Array.from(connectedPlaces.values()).map(p => ({
        placeId: p.placeId,
        placeName: p.placeName,
        dataModel: p.dataModel,
        lastSeen: p.lastSeen,
        isActive: p.placeId === targetPlaceId,
        isStale: Date.now() - p.lastSeen > 10000,
      }));
      res.json({ success: true, places, activePlaceId: targetPlaceId });
    } else if (action === 'switch_place') {
      if (reqPlaceId && connectedPlaces.has(reqPlaceId)) {
        targetPlaceId = reqPlaceId;
        res.json({ success: true, activePlaceId: targetPlaceId });
      } else {
        res.status(400).json({ error: `Place ${reqPlaceId} not found` });
      }
    } else if (action === 'get_active_place') {
      const active = targetPlaceId ? connectedPlaces.get(targetPlaceId) : null;
      res.json({
        success: true,
        activePlaceId: targetPlaceId,
        place: active || null,
      });
    } else if (action === 'set_place_name') {
      if (reqPlaceId && connectedPlaces.has(reqPlaceId)) {
        connectedPlaces.get(reqPlaceId)!.placeName = placeName || `Place ${reqPlaceId}`;
        res.json({ success: true });
      } else {
        res.status(400).json({ error: `Place ${reqPlaceId} not found` });
      }
    } else {
      res.status(400).json({ error: `Unknown action: ${action}` });
    }
  });

  app.get('/status', (req, res) => {
    // Auto-select first place if no target set
    if (!targetPlaceId && connectedPlaces.size > 0) {
      const firstPlaceId = connectedPlaces.keys().next().value;
      if (firstPlaceId !== undefined) {
        targetPlaceId = firstPlaceId;
      }
    }

    const activePlace = targetPlaceId ? connectedPlaces.get(targetPlaceId) : null;
    const currentPlaceId = targetPlaceId || (app as any).currentPlaceId || 0;

    res.json({
      pluginConnected: isPluginConnected(),
      mcpServerActive: isMCPServerActive(),
      isSyncing: (app as any).isSyncing || false,
      uptime: mcpServerActive ? Date.now() - mcpServerStartTime : 0,
      lastAgent: (app as any).lastAgent || 'None',
      activityLog: activityLogsByPlace.get(currentPlaceId) || [],
      config: {
        projectName: process.env.ROBLOX_PROJECT_NAME || 'ItsQuentar Roblox Plugin Remake',
        projectPath: process.cwd()
      },
      placeId: currentPlaceId,
      connectedPlaces: Array.from(connectedPlaces.values()).map(p => ({
        placeId: p.placeId,
        placeName: p.placeName,
        dataModel: p.dataModel,
        isActive: p.placeId === targetPlaceId,
      })),
      activePlaceId: targetPlaceId,
    });
  });

  // Tools that benefit from before/after tracking
  const TRACKED_TOOLS: Record<string, 'property' | 'script' | 'create' | 'delete' | 'attribute'> = {
    'set_property': 'property',
    'set_script_source': 'script',
    'edit_script_lines': 'script',
    'insert_script_lines': 'script',
    'delete_script_lines': 'script',
    'create_object': 'create',
    'delete_object': 'delete',
    'set_attribute': 'attribute',
    'delete_attribute': 'attribute',
  };

  async function captureBeforeState(toolName: string, body: any): Promise<any> {
    const trackType = TRACKED_TOOLS[toolName];
    if (!trackType) return undefined;

    try {
      if (trackType === 'property' && body.instancePath && body.propertyName) {
        const result = await TOOL_HANDLERS['get_instance_properties']?.(tools, { instancePath: body.instancePath, excludeSource: true });
        if (result?.properties) {
          return { property: body.propertyName, value: result.properties[body.propertyName] };
        }
      } else if (trackType === 'script' && body.instancePath) {
        const result = await TOOL_HANDLERS['get_script_source']?.(tools, { instancePath: body.instancePath });
        if (result?.source) {
          return { source: result.source.substring(0, 500) + (result.source.length > 500 ? '...' : '') };
        }
      } else if (trackType === 'delete' && body.instancePath) {
        const result = await TOOL_HANDLERS['get_instance_properties']?.(tools, { instancePath: body.instancePath, excludeSource: true });
        if (result?.properties) {
          return { className: result.properties.ClassName, name: result.properties.Name };
        }
      } else if (trackType === 'attribute' && body.instancePath && body.attributeName) {
        const result = await TOOL_HANDLERS['get_attributes']?.(tools, { instancePath: body.instancePath });
        if (result?.attributes) {
          return { attribute: body.attributeName, value: result.attributes[body.attributeName] };
        }
      }
    } catch {
      // Ignore capture errors
    }
    return undefined;
  }

  function captureAfterState(toolName: string, body: any, result: any): any {
    const trackType = TRACKED_TOOLS[toolName];
    if (!trackType) return undefined;

    if (trackType === 'property') {
      return { property: body.propertyName, value: body.propertyValue };
    } else if (trackType === 'script') {
      if (toolName === 'set_script_source' && body.source) {
        return { source: body.source.substring(0, 500) + (body.source.length > 500 ? '...' : '') };
      }
      return { action: toolName, applied: result?.success === true };
    } else if (trackType === 'create') {
      return { className: body.className, name: body.name, parent: body.parent };
    } else if (trackType === 'delete') {
      return { deleted: true };
    } else if (trackType === 'attribute') {
      if (toolName === 'delete_attribute') {
        return { attribute: body.attributeName, deleted: true };
      }
      return { attribute: body.attributeName, value: body.attributeValue };
    }
    return undefined;
  }

  app.post('/mcp/:toolName', async (req, res) => {
    const { toolName } = req.params;

    const agent = req.body.agent || req.headers['x-agent-id'] || 'Dashboard User';
    (app as any).lastAgent = agent;

    // Capture before state for tracked tools
    const beforeState = await captureBeforeState(toolName, req.body);

    const handler = TOOL_HANDLERS[toolName];
    if (!handler) {
      res.status(404).json({ error: `Tool handler for '${toolName}' not found.` });
      return;
    }

    try {
      const result = await handler(tools, req.body);

      // Capture after state for tracked tools
      const afterState = captureAfterState(toolName, req.body, result);

      if ((app as any).addActivityLog) {
        let logType = 'activity';
        if (toolName.includes('script')) logType = 'script';
        else if (toolName.includes('property') || toolName.includes('object')) logType = 'prop';

        const agentPrefix = agent === 'Dashboard User' ? 'User' : 'AI';
        let logMsg = `${agentPrefix}: ${toolName.replace(/_/g, ' ')}`;

        if (toolName === 'create_object') {
          const n = req.body.name || req.body.className;
          const p = req.body.parent;
          logMsg = `${agentPrefix}: Add Object ${p}.${n}`;
        } else if (toolName === 'set_script_source') {
          logMsg = `${agentPrefix}: Update Script ${req.body.instancePath}`;
        } else if (toolName === 'sync_project') {
          logType = 'script';
          const syncAction = req.body.action || 'sync';
          logMsg = `${agentPrefix}: Project ${syncAction.replace(/_/g, ' ')}`;
          if (req.body.instance_path) logMsg += ` on ${req.body.instance_path}`;
        } else if (req.body && req.body.instancePath) {
          logMsg += ` on ${req.body.instancePath}`;
        } else if (req.body && req.body.query) {
          logMsg += ` for ${req.body.query}`;
        }

        (app as any).addActivityLog(logType, logMsg, JSON.stringify(req.body), beforeState, afterState);
      }

      if (toolName === 'get_place_info' && result.placeId) {
        (app as any).currentPlaceId = result.placeId;
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });


  (app as any).isPluginConnected = isPluginConnected;
  (app as any).setMCPServerActive = setMCPServerActive;
  (app as any).isMCPServerActive = isMCPServerActive;

  return app;
}

/**
 * Attempt to bind an Express app to a port, using an explicit http.Server
 * so that EADDRINUSE errors are properly caught.
 */
export function listenWithRetry(
  app: express.Express,
  host: string,
  startPort: number,
  maxAttempts: number = 5
): Promise<{ server: http.Server; port: number }> {
  return new Promise(async (resolve, reject) => {
    for (let i = 0; i < maxAttempts; i++) {
      const port = startPort + i;
      try {
        const server = await bindPort(app, host, port);
        resolve({ server, port });
        return;
      } catch (err: any) {
        if (err.code === 'EADDRINUSE') {
          console.error(`Port ${port} in use, trying next...`);
          continue;
        }
        reject(err);
        return;
      }
    }
    reject(new Error(`All ports ${startPort}-${startPort + maxAttempts - 1} are in use. Stop some MCP server instances and retry.`));
  });
}

function bindPort(app: express.Express, host: string, port: number): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    const onError = (err: NodeJS.ErrnoException) => {
      server.removeListener('error', onError);
      reject(err);
    };
    server.once('error', onError);
    server.listen(port, host, () => {
      server.removeListener('error', onError);
      resolve(server);
    });
  });
}
