import { StudioHttpClient } from './studio-client.js';
import { BridgeService } from '../bridge-service.js';
import { runBuildExecutor } from './build-executor.js';
import { OpenCloudClient } from '../opencloud-client.js';
import { rgbaToPng } from '../png-encoder.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class RobloxStudioTools {
  private client: StudioHttpClient;
  private openCloudClient: OpenCloudClient;

  constructor(bridge: BridgeService) {
    this.client = new StudioHttpClient(bridge);
    this.openCloudClient = new OpenCloudClient();
  }

  setDataModel(dataModel: string | undefined) {
    this.client.setDataModel(dataModel);
  }


  async getFileTree(path: string = '') {
    const response = await this.client.request('/api/file-tree', { path });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async searchFiles(query: string, searchType: string = 'name') {
    const response = await this.client.request('/api/search-files', { query, searchType });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }


  async getPlaceInfo() {
    const response = await this.client.request('/api/place-info', {});
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async getServices(serviceName?: string) {
    const response = await this.client.request('/api/services', { serviceName });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async searchObjects(query: string, searchType: string = 'name', propertyName?: string) {
    const response = await this.client.request('/api/search-objects', {
      query,
      searchType,
      propertyName
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }


  async getInstanceProperties(instancePath: string, excludeSource?: boolean) {
    if (!instancePath) {
      throw new Error('Instance path is required for get_instance_properties');
    }
    const response = await this.client.request('/api/instance-properties', { instancePath, excludeSource });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async getInstanceChildren(instancePath: string) {
    if (!instancePath) {
      throw new Error('Instance path is required for get_instance_children');
    }
    const response = await this.client.request('/api/instance-children', { instancePath });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async searchByProperty(propertyName: string, propertyValue: string) {
    if (!propertyName || !propertyValue) {
      throw new Error('Property name and value are required for search_by_property');
    }
    const response = await this.client.request('/api/search-by-property', {
      propertyName,
      propertyValue
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async getClassInfo(className: string) {
    if (!className) {
      throw new Error('Class name is required for get_class_info');
    }
    const response = await this.client.request('/api/class-info', { className });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }


  async getProjectStructure(path?: string, maxDepth?: number, scriptsOnly?: boolean) {
    const response = await this.client.request('/api/project-structure', {
      path,
      maxDepth,
      scriptsOnly
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }



  async setProperty(instancePath: string, propertyName: string, propertyValue: any) {
    if (!instancePath || !propertyName) {
      throw new Error('Instance path and property name are required for set_property');
    }
    const response = await this.client.request('/api/set-property', {
      instancePath,
      propertyName,
      propertyValue
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async massSetProperty(paths: string[], propertyName: string, propertyValue: any) {
    if (!paths || paths.length === 0 || !propertyName) {
      throw new Error('Paths array and property name are required for mass_set_property');
    }
    const response = await this.client.request('/api/mass-set-property', {
      paths,
      propertyName,
      propertyValue
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async massGetProperty(paths: string[], propertyName: string) {
    if (!paths || paths.length === 0 || !propertyName) {
      throw new Error('Paths array and property name are required for mass_get_property');
    }
    const response = await this.client.request('/api/mass-get-property', {
      paths,
      propertyName
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }


  async createObject(className: string, parent: string, name?: string, properties?: Record<string, any>) {
    if (!className || !parent) {
      throw new Error('Class name and parent are required for create_object');
    }
    const response = await this.client.request('/api/create-object', {
      className,
      parent,
      name,
      properties
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async massCreateObjects(objects: Array<{className: string, parent: string, name?: string, properties?: Record<string, any>}>) {
    if (!objects || objects.length === 0) {
      throw new Error('Objects array is required for mass_create_objects');
    }
    const hasProperties = objects.some(o => o.properties && Object.keys(o.properties).length > 0);
    const endpoint = hasProperties ? '/api/mass-create-objects-with-properties' : '/api/mass-create-objects';
    const response = await this.client.request(endpoint, { objects });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async deleteObject(instancePath: string) {
    if (!instancePath) {
      throw new Error('Instance path is required for delete_object');
    }
    const response = await this.client.request('/api/delete-object', { instancePath });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }


  async smartDuplicate(
    instancePath: string,
    count: number,
    options?: {
      namePattern?: string;
      positionOffset?: [number, number, number];
      rotationOffset?: [number, number, number];
      scaleOffset?: [number, number, number];
      propertyVariations?: Record<string, any[]>;
      targetParents?: string[];
    }
  ) {
    if (!instancePath || count < 1) {
      throw new Error('Instance path and count > 0 are required for smart_duplicate');
    }
    const response = await this.client.request('/api/smart-duplicate', {
      instancePath,
      count,
      options
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async massDuplicate(
    duplications: Array<{
      instancePath: string;
      count: number;
      options?: {
        namePattern?: string;
        positionOffset?: [number, number, number];
        rotationOffset?: [number, number, number];
        scaleOffset?: [number, number, number];
        propertyVariations?: Record<string, any[]>;
        targetParents?: string[];
      }
    }>
  ) {
    if (!duplications || duplications.length === 0) {
      throw new Error('Duplications array is required for mass_duplicate');
    }
    const response = await this.client.request('/api/mass-duplicate', { duplications });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }


  async getScriptSource(instancePath: string, startLine?: number, endLine?: number, dataModel?: string) {
    if (!instancePath) {
      throw new Error('Instance path is required for get_script_source');
    }
    const response = await this.client.request('/api/get-script-source', { instancePath, startLine, endLine, dataModel });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async setScriptSource(instancePath: string, source: string, dataModel?: string) {
    if (!instancePath || typeof source !== 'string') {
      throw new Error('Instance path and source code string are required for set_script_source');
    }
    const response = await this.client.request('/api/set-script-source', { instancePath, source, dataModel });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }


  async editScriptLines(instancePath: string, old_string: string, new_string: string, dataModel?: string) {
    if (!instancePath || old_string === undefined || new_string === undefined) {
      throw new Error('Instance path, old_string, and new_string are required for edit_script_lines');
    }
    const response = await this.client.request('/api/edit-script-lines', { instancePath, old_string, new_string, dataModel });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async insertScriptLines(instancePath: string, afterLine: number, newContent: string) {
    if (!instancePath || typeof newContent !== 'string') {
      throw new Error('Instance path and newContent are required for insert_script_lines');
    }
    const response = await this.client.request('/api/insert-script-lines', { instancePath, afterLine: afterLine || 0, newContent });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async deleteScriptLines(instancePath: string, startLine: number, endLine: number) {
    if (!instancePath || !startLine || !endLine) {
      throw new Error('Instance path, startLine, and endLine are required for delete_script_lines');
    }
    const response = await this.client.request('/api/delete-script-lines', { instancePath, startLine, endLine });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }


  async grepScripts(
    pattern: string,
    options?: {
      caseSensitive?: boolean;
      usePattern?: boolean;
      contextLines?: number;
      maxResults?: number;
      maxResultsPerScript?: number;
      filesOnly?: boolean;
      path?: string;
      classFilter?: string;
    }
  ) {
    if (!pattern) {
      throw new Error('Pattern is required for grep_scripts');
    }
    const response = await this.client.request('/api/grep-scripts', {
      pattern,
      ...options
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async getAttribute(instancePath: string, attributeName: string) {
    if (!instancePath || !attributeName) {
      throw new Error('Instance path and attribute name are required for get_attribute');
    }
    const response = await this.client.request('/api/get-attribute', { instancePath, attributeName });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async setAttribute(instancePath: string, attributeName: string, attributeValue: any, valueType?: string) {
    if (!instancePath || !attributeName) {
      throw new Error('Instance path and attribute name are required for set_attribute');
    }
    const response = await this.client.request('/api/set-attribute', { instancePath, attributeName, attributeValue, valueType });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async getAttributes(instancePath: string) {
    if (!instancePath) {
      throw new Error('Instance path is required for get_attributes');
    }
    const response = await this.client.request('/api/get-attributes', { instancePath });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async deleteAttribute(instancePath: string, attributeName: string) {
    if (!instancePath || !attributeName) {
      throw new Error('Instance path and attribute name are required for delete_attribute');
    }
    const response = await this.client.request('/api/delete-attribute', { instancePath, attributeName });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }


  async getTags(instancePath: string) {
    if (!instancePath) {
      throw new Error('Instance path is required for get_tags');
    }
    const response = await this.client.request('/api/get-tags', { instancePath });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async addTag(instancePath: string, tagName: string) {
    if (!instancePath || !tagName) {
      throw new Error('Instance path and tag name are required for add_tag');
    }
    const response = await this.client.request('/api/add-tag', { instancePath, tagName });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async removeTag(instancePath: string, tagName: string) {
    if (!instancePath || !tagName) {
      throw new Error('Instance path and tag name are required for remove_tag');
    }
    const response = await this.client.request('/api/remove-tag', { instancePath, tagName });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async getTagged(tagName: string) {
    if (!tagName) {
      throw new Error('Tag name is required for get_tagged');
    }
    const response = await this.client.request('/api/get-tagged', { tagName });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async getSelection() {
    const response = await this.client.request('/api/get-selection', {});
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async executeLuau(code: string, timeoutMs: number = 120000) {
    if (!code) {
      throw new Error('Code is required for execute_luau');
    }

    // Retry logic: try up to 2 times with increasing timeout
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const currentTimeout = attempt === 0 ? timeoutMs : timeoutMs * 2;
        const response = await this.client.request('/api/execute-luau', { code }, currentTimeout);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response)
          }]
        };
      } catch (err: any) {
        lastError = err;
        if (!err.message?.includes('timeout') || attempt === 1) throw err;
        // Wait 500ms before retry on timeout
        await new Promise(r => setTimeout(r, 500));
      }
    }
    throw lastError;
  }

  async startPlaytest(mode: string) {
    if (mode !== 'play' && mode !== 'run') {
      throw new Error('mode must be "play" or "run"');
    }
    const response = await this.client.request('/api/start-playtest', { mode });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async stopPlaytest() {
    const response = await this.client.request('/api/stop-playtest', {});
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async getPlaytestOutput() {
    const response = await this.client.request('/api/get-playtest-output', {});
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async undo() {
    const response = await this.client.request('/api/undo', {});
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async redo() {
    const response = await this.client.request('/api/redo', {});
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }


  private static findLibraryPath(): string {
    // 1. First search relative to script location (handles monorepo or standard install)
    // packages/core/src/tools/index.ts (source) or packages/core/dist/tools/index.js (compiled)
    // Go up 3 levels to reach the root of the project/package
    const scriptRoot = path.resolve(__dirname, '../../../');
    const rootCandidate = path.join(scriptRoot, 'build-library');
    if (fs.existsSync(rootCandidate)) return rootCandidate;

    // 2. Next, search up from the CWD (useful for users running from their project root)
    let dir = process.cwd();
    for (let i = 0; i < 6; i++) {
      const candidate = path.join(dir, 'build-library');
      if (fs.existsSync(candidate)) return candidate;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }

    // 3. Last fallback: ensure a library exists, but try-catch in case of restricted dirs
    try {
      const fallback = path.join(process.cwd(), 'build-library');
      if (!fs.existsSync(fallback)) {
        fs.mkdirSync(fallback, { recursive: true });
      }
      return fallback;
    } catch {
      // If we can't write to CWD, use OS temp dir to prevent server crash
      const tempPath = path.join(os.tmpdir(), 'roblox-mcp-library');
      if (!fs.existsSync(tempPath)) {
        fs.mkdirSync(tempPath, { recursive: true });
      }
      return tempPath;
    }
  }

  private static readonly LIBRARY_PATH = RobloxStudioTools.findLibraryPath();

  async exportBuild(instancePath: string, outputId?: string, style: string = 'misc') {
    if (!instancePath) {
      throw new Error('Instance path is required for export_build');
    }
    const response = await this.client.request('/api/export-build', {
      instancePath,
      outputId,
      style
    }) as any;

    // Auto-save to library
    if (response && response.success && response.buildData) {
      const buildData = response.buildData;
      const buildId = buildData.id || `${style}/exported`;
      const filePath = path.join(RobloxStudioTools.LIBRARY_PATH, `${buildId}.json`);
      const dirPath = path.dirname(filePath);

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(buildData, null, 2));
      response.savedTo = filePath;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async createBuild(
    id: string,
    style: string,
    palette: Record<string, [string, string]>,
    parts: any[][],
    bounds?: [number, number, number]
  ) {
    if (!id || !palette || !parts || parts.length === 0) {
      throw new Error('id, palette, and parts are required for create_build');
    }

    // Validate part arrays have at least 10 elements (pos3 + size3 + rot3 + paletteKey)
    for (let i = 0; i < parts.length; i++) {
      if (!Array.isArray(parts[i]) || parts[i].length < 10) {
        throw new Error(`Part ${i} must have at least 10 elements: [posX, posY, posZ, sizeX, sizeY, sizeZ, rotX, rotY, rotZ, paletteKey]`);
      }
    }

    // Auto-compute bounds if not provided
    const computedBounds = bounds || this.computeBounds(parts);

    const buildData = { id, style, bounds: computedBounds, palette, parts };

    const filePath = path.join(RobloxStudioTools.LIBRARY_PATH, `${id}.json`);
    const dirPath = path.dirname(filePath);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(buildData, null, 2));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            id,
            style,
            bounds: computedBounds,
            partCount: parts.length,
            paletteKeys: Object.keys(palette),
            savedTo: filePath
          })
        }
      ]
    };
  }

  private computeBounds(parts: any[][]): [number, number, number] {
    let maxX = 0, maxY = 0, maxZ = 0;
    for (const p of parts) {
      const px = Math.abs(p[0]) + p[3] / 2;
      const py = Math.abs(p[1]) + p[4] / 2;
      const pz = Math.abs(p[2]) + p[5] / 2;
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
      maxZ = Math.max(maxZ, pz);
    }
    return [
      Math.round(maxX * 2 * 10) / 10,
      Math.round(maxY * 2 * 10) / 10,
      Math.round(maxZ * 2 * 10) / 10
    ];
  }

  async generateBuild(
    id: string,
    style: string,
    palette: Record<string, [string, string]>,
    code: string,
    seed?: number
  ) {
    if (!id || !palette || !code) {
      throw new Error('id, palette, and code are required for generate_build');
    }

    // Validate palette
    for (const [key, value] of Object.entries(palette)) {
      if (!Array.isArray(value) || value.length < 2 || value.length > 3) {
        throw new Error(`Palette key "${key}" must map to [BrickColor, Material] or [BrickColor, Material, MaterialVariant]`);
      }
    }

    // Run the build executor
    const result = runBuildExecutor(code, palette, seed);

    const buildData: Record<string, any> = {
      id,
      style,
      bounds: result.bounds,
      palette,
      parts: result.parts,
      generatorCode: code,
    };
    if (seed !== undefined) buildData.generatorSeed = seed;

    const filePath = path.join(RobloxStudioTools.LIBRARY_PATH, `${id}.json`);
    const dirPath = path.dirname(filePath);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(buildData, null, 2));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            id,
            style,
            bounds: result.bounds,
            partCount: result.partCount,
            paletteKeys: Object.keys(palette),
            savedTo: filePath
          })
        }
      ]
    };
  }

  async importBuild(buildData: Record<string, any> | string, targetPath: string, position?: [number, number, number]) {
    if (!buildData || !targetPath) {
      throw new Error('buildData (or library ID string) and targetPath are required for import_build');
    }

    // If buildData is a string, treat it as a library ID and load the file
    let resolved: Record<string, any>;
    if (typeof buildData === 'string') {
      const filePath = path.join(RobloxStudioTools.LIBRARY_PATH, `${buildData}.json`);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Build not found in library: ${buildData}`);
      }
      resolved = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } else if (buildData.id && !buildData.parts) {
      // Object with just an id — try loading from library
      const filePath = path.join(RobloxStudioTools.LIBRARY_PATH, `${buildData.id}.json`);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Build not found in library: ${buildData.id}`);
      }
      resolved = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } else {
      resolved = buildData;
    }

    const response = await this.client.request('/api/import-build', {
      buildData: resolved,
      targetPath,
      position
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async listLibrary(style?: string) {
    const libraryPath = RobloxStudioTools.LIBRARY_PATH;
    const styles = style ? [style] : ['medieval', 'modern', 'nature', 'scifi', 'misc'];
    const builds: Array<{ id: string; style: string; bounds: number[]; partCount: number }> = [];

    for (const s of styles) {
      const dirPath = path.join(libraryPath, s);
      if (!fs.existsSync(dirPath)) continue;

      const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(dirPath, file), 'utf-8');
          const data = JSON.parse(content);
          builds.push({
            id: data.id || `${s}/${file.replace('.json', '')}`,
            style: data.style || s,
            bounds: data.bounds || [0, 0, 0],
            partCount: Array.isArray(data.parts) ? data.parts.length : 0
          });
        } catch {
          // Skip invalid JSON files
        }
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ builds, total: builds.length })
        }
      ]
    };
  }

  async searchMaterials(query?: string, maxResults?: number) {
    const response = await this.client.request('/api/search-materials', {
      query: query ?? '',
      maxResults: maxResults ?? 50
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  async getBuild(id: string) {
    if (!id) {
      throw new Error('Build ID is required for get_build');
    }

    const filePath = path.join(RobloxStudioTools.LIBRARY_PATH, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Build not found in library: ${id}`);
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Return metadata + code (but not the full parts array to save tokens)
    const result: Record<string, any> = {
      id: data.id,
      style: data.style,
      bounds: data.bounds,
      partCount: Array.isArray(data.parts) ? data.parts.length : 0,
      paletteKeys: data.palette ? Object.keys(data.palette) : [],
      palette: data.palette,
    };

    if (data.generatorCode) {
      result.generatorCode = data.generatorCode;
      result.generatorSeed = data.generatorSeed;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result)
        }
      ]
    };
  }

  async importScene(
    sceneData: {
      models?: Record<string, string>;
      place?: Array<
        [string, number[], number[]?]
        | { modelKey: string; position: number[]; rotation?: number[] }
      >;
      custom?: Array<{ n: string; o: number[]; palette: Record<string, [string, string]>; parts: any[][] }>;
    },
    targetPath: string = 'game.Workspace'
  ) {
    if (!sceneData) {
      throw new Error('sceneData is required for import_scene');
    }

    const libraryPath = RobloxStudioTools.LIBRARY_PATH;
    const expandedBuilds: Array<{ buildData: Record<string, any>; position: number[]; rotation: number[]; name: string }> = [];

    // Resolve model references from library
    const modelMap = sceneData.models || {};
    const placements = sceneData.place || [];

    const isVec3Tuple = (value: unknown): value is [number, number, number] => {
      return Array.isArray(value)
        && value.length === 3
        && value.every(component => typeof component === 'number' && Number.isFinite(component));
    };

    for (const [placementIndex, placement] of placements.entries()) {
      let modelKey: string;
      let position: [number, number, number];
      let rotation: [number, number, number] | undefined;
      let validatedKeyPath: string;

      if (Array.isArray(placement)) {
        if (placement.length < 2 || placement.length > 3) {
          throw new Error(
            `Invalid sceneData.place[${placementIndex}]: expected [modelKey, [x,y,z], [rotX?,rotY?,rotZ?]]`
          );
        }
        const [tupleModelKey, tuplePosition, tupleRotation] = placement;
        if (typeof tupleModelKey !== 'string' || tupleModelKey.trim() === '') {
          throw new Error(`Invalid sceneData.place[${placementIndex}][0]: model key must be a non-empty string`);
        }
        modelKey = tupleModelKey.trim();
        validatedKeyPath = `sceneData.place[${placementIndex}][0]`;
        if (!isVec3Tuple(tuplePosition)) {
          throw new Error(`Invalid sceneData.place[${placementIndex}][1]: position must be a numeric [x,y,z] tuple`);
        }
        position = tuplePosition;
        if (tupleRotation !== undefined) {
          if (!isVec3Tuple(tupleRotation)) {
            throw new Error(
              `Invalid sceneData.place[${placementIndex}][2]: rotation must be a numeric [x,y,z] tuple when provided`
            );
          }
          rotation = tupleRotation;
        }
      } else if (placement && typeof placement === 'object') {
        const placementRecord = placement as Record<string, unknown>;
        const objectModelKey = placementRecord.modelKey;
        const objectPosition = placementRecord.position;
        const objectRotation = placementRecord.rotation;
        if (typeof objectModelKey !== 'string' || objectModelKey.trim() === '') {
          throw new Error(`Invalid sceneData.place[${placementIndex}].modelKey: model key must be a non-empty string`);
        }
        if (!isVec3Tuple(objectPosition)) {
          throw new Error(`Invalid sceneData.place[${placementIndex}].position: must be a numeric [x,y,z] tuple`);
        }
        if (objectRotation !== undefined && !isVec3Tuple(objectRotation)) {
          throw new Error(
            `Invalid sceneData.place[${placementIndex}].rotation: must be a numeric [x,y,z] tuple when provided`
          );
        }
        modelKey = objectModelKey.trim();
        validatedKeyPath = `sceneData.place[${placementIndex}].modelKey`;
        position = objectPosition;
        rotation = objectRotation as [number, number, number] | undefined;
      } else {
        throw new Error(
          `Invalid sceneData.place[${placementIndex}]: expected an object placement or [modelKey, [x,y,z], [rotX?,rotY?,rotZ?]] tuple`
        );
      }

      const buildId = modelMap[modelKey];
      if (!buildId) {
        throw new Error(
          `Invalid ${validatedKeyPath}: model key "${modelKey}" is not defined in sceneData.models`
        );
      }

      // Load build data from library
      const filePath = path.join(libraryPath, `${buildId}.json`);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Build not found in library: ${buildId}`);
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const buildData = JSON.parse(content);
      const buildName = buildId.split('/').pop() || buildId;

      expandedBuilds.push({
        buildData,
        position,
        rotation: rotation || [0, 0, 0],
        name: buildName
      });
    }

    // Add custom inline builds
    const customs = sceneData.custom || [];
    for (const custom of customs) {
      expandedBuilds.push({
        buildData: {
          palette: custom.palette,
          parts: custom.parts
        },
        position: custom.o || [0, 0, 0],
        rotation: [0, 0, 0],
        name: custom.n || 'Custom'
      });
    }

    if (expandedBuilds.length === 0) {
      throw new Error('No builds to import — check model references and library');
    }

    // Send expanded builds to plugin
    const response = await this.client.request('/api/import-scene', {
      expandedBuilds,
      targetPath
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }


  // === Asset Tools ===

  async searchAssets(
    assetType: string,
    query?: string,
    maxResults?: number,
    sortBy?: string,
    verifiedCreatorsOnly?: boolean
  ) {
    if (!this.openCloudClient.hasAuth()) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: 'Authentication (ROBLOX_OPEN_CLOUD_API_KEY or ROBLOX_COOKIE) is not set. Set it to use asset tools.' })
        }]
      };
    }

    const response = await this.openCloudClient.searchAssets({
      searchCategoryType: assetType as any,
      query,
      maxPageSize: maxResults,
      sortCategory: sortBy as any,
      includeOnlyVerifiedCreators: verifiedCreatorsOnly,
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response)
      }]
    };
  }

  async getAssetDetails(assetId: number) {
    if (!assetId) {
      throw new Error('Asset ID is required for get_asset_details');
    }
    if (!this.openCloudClient.hasAuth()) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: 'Authentication (ROBLOX_OPEN_CLOUD_API_KEY or ROBLOX_COOKIE) is not set. Set it to use asset tools.' })
        }]
      };
    }

    const response = await this.openCloudClient.getAssetDetails(assetId);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response)
      }]
    };
  }

  async getAssetThumbnail(assetId: number, size?: string) {
    if (!assetId) {
      throw new Error('Asset ID is required for get_asset_thumbnail');
    }
    if (!this.openCloudClient.hasAuth()) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: 'Authentication (ROBLOX_OPEN_CLOUD_API_KEY or ROBLOX_COOKIE) is not set. Set it to use asset tools.' })
        }]
      };
    }

    const result = await this.openCloudClient.getAssetThumbnail(assetId, size as any);
    if (!result) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: 'Thumbnail not available for this asset' })
        }]
      };
    }

    return {
      content: [{
        type: 'image',
        data: result.base64,
        mimeType: result.mimeType,
      }]
    };
  }

  async insertAsset(assetId: number, parentPath?: string, position?: { x: number; y: number; z: number }) {
    if (!assetId) {
      throw new Error('Asset ID is required for insert_asset');
    }
    const response = await this.client.request('/api/insert-asset', {
      assetId,
      parentPath: parentPath || 'game.Workspace',
      position
    });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response)
      }]
    };
  }

  async previewAsset(assetId: number, includeProperties?: boolean, maxDepth?: number) {
    if (!assetId) {
      throw new Error('Asset ID is required for preview_asset');
    }
    const response = await this.client.request('/api/preview-asset', {
      assetId,
      includeProperties: includeProperties ?? true,
      maxDepth: maxDepth ?? 10
    });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response)
      }]
    };
  }

  async captureScreenshot() {
    const response = await this.client.request('/api/capture-screenshot', {}) as {
      success?: boolean;
      error?: string;
      width?: number;
      height?: number;
      data?: string;
    };

    if (response.error) {
      return {
        content: [{
          type: 'text',
          text: response.error,
        }]
      };
    }

    if (!response.data || !response.width || !response.height) {
      throw new Error('Screenshot response missing data, width, or height');
    }

    const rgbaBuffer = Buffer.from(response.data, 'base64');
    const pngBuffer = rgbaToPng(rgbaBuffer, response.width, response.height);

    return {
      content: [{
        type: 'image',
        data: pngBuffer.toString('base64'),
        mimeType: 'image/png',
      }]
    };
  }

  async captureViewport(action: string, highlight_path?: string, resolution?: string) {
    const response = await this.client.request('/api/capture-viewport', { action, highlight_path, resolution }) as any;
    
    if (response.error) {
      return { content: [{ type: 'text', text: response.error }] };
    }

    if (response.data && response.width && response.height) {
      const rgbaBuffer = Buffer.from(response.data, 'base64');
      const pngBuffer = rgbaToPng(rgbaBuffer, response.width, response.height);
      return {
        content: [{
          type: 'image',
          data: pngBuffer.toString('base64'),
          mimeType: 'image/png',
        }]
      };
    }

    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async insertAssetV2(params: any) {
    if (params.action === 'search_and_insert') {
      if (!this.openCloudClient.hasAuth()) {
        throw new Error('ROBLOX_OPEN_CLOUD_API_KEY is required for search_and_insert');
      }
      const searchResponse = await this.openCloudClient.searchAssets({
        searchCategoryType: 'Model',
        query: params.keyword,
        maxPageSize: 1
      });
      if (searchResponse.creatorStoreAssets && searchResponse.creatorStoreAssets.length > 0) {
        const assetId = searchResponse.creatorStoreAssets[0].asset?.id;
        if (assetId) {
          const insertResponse = await this.client.request('/api/insert-asset-v2', {
            action: 'insert_by_id',
            asset_id: assetId,
            target_path: params.target_path
          });
          return { content: [{ type: 'text', text: JSON.stringify(insertResponse) }] };
        }
      }
      return { content: [{ type: 'text', text: 'No assets found for keyword: ' + params.keyword }] };
    }
    const response = await this.client.request('/api/insert-asset-v2', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async historyControl(action: string, waypoint_name?: string) {
    const response = await this.client.request('/api/history-control', { action, waypoint_name });
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async controlSelection(action: string, paths?: string[], properties?: string[]) {
    const response = await this.client.request('/api/control-selection', { action, paths, properties });
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async validatePathfinding(action: string, start: any, goal: any, agent_params?: any) {
    const response = await this.client.request('/api/validate-pathfinding', { action, start, goal, agent_params });
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async analyzePerformance(action: string, target_path?: string, iterations?: number) {
    const response = await this.client.request('/api/analyze-performance', { action, target_path, iterations });
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async checkCollisions(params: any) {
    const response = await this.client.request('/api/check-collisions', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async manageDatastore(params: any) {
    const response = await this.client.request('/api/manage-datastore', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async buildLibrary(params: any) {
    if (params.action === 'save_build') {
      const buildName = params.build_name || 'unnamed_build';
      const buildsDir = path.join(RobloxStudioTools.LIBRARY_PATH, 'saved-builds');
      if (!fs.existsSync(buildsDir)) fs.mkdirSync(buildsDir, { recursive: true });
      const filePath = path.join(buildsDir, `${buildName}.json`);
      fs.writeFileSync(filePath, params.json_data || '{}');
      return { content: [{ type: 'text', text: `Build saved to ${filePath}` }] };
    } else if (params.action === 'list_saved_builds') {
      const buildsDir = path.join(RobloxStudioTools.LIBRARY_PATH, 'saved-builds');
      if (!fs.existsSync(buildsDir)) return { content: [{ type: 'text', text: 'No builds found' }] };
      const files = fs.readdirSync(buildsDir).filter(f => f.endsWith('.json'));
      return { content: [{ type: 'text', text: JSON.stringify(files) }] };
    }
    const response = await this.client.request('/api/build-library-advanced', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async runTests(params: any) {
    const response = await this.client.request('/api/run-tests', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async generateTerrain(params: any) {
    const response = await this.client.request('/api/generate-terrain', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async controlLighting(params: any) {
    const response = await this.client.request('/api/control-lighting', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async syncProject(params: any) {
    const { action, local_path, instance_path } = params;
    
    if (action === 'export_to_local') {
      const response = await this.client.request('/api/sync-project', { action: 'get_scripts', instance_path }) as any;
      if (response.scripts) {
        for (const script of response.scripts) {
          const relativePath = script.path.replace(instance_path + '.', '').replace(/\./g, '/');
          const fullPath = path.join(local_path, relativePath + '.lua');
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, script.source);
        }
        return { content: [{ type: 'text', text: `Exported ${response.scripts.length} scripts to ${local_path}` }] };
      }
    } else if (action === 'import_from_local') {
      const walk = (dir: string): string[] => {
        let results: string[] = [];
        const list = fs.readdirSync(dir);
        list.forEach(file => {
          file = path.join(dir, file);
          const stat = fs.statSync(file);
          if (stat && stat.isDirectory()) results = results.concat(walk(file));
          else if (file.endsWith('.lua') || file.endsWith('.luau')) results.push(file);
        });
        return results;
      };
      
      const files = walk(local_path);
      const updates = [];
      for (const file of files) {
        const source = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(local_path, file).replace(/\.(lua|luau)$/, '').replace(/\\/g, '.');
        const scriptPath = instance_path ? `${instance_path}.${relativePath}` : relativePath;
        updates.push({ path: scriptPath, source });
      }
      
      const response = await this.client.request('/api/sync-project', { action: 'update_scripts', updates });
      return { content: [{ type: 'text', text: JSON.stringify(response) }] };
    }

    const response = await this.client.request('/api/sync-project', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async controlAudioAnimation(params: any) {
    const response = await this.client.request('/api/control-audio-animation', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async monitorRemotes(params: any) {
    const response = await this.client.request('/api/monitor-remotes', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async mapDependencies(params: any) {
    const response = await this.client.request('/api/map-dependencies', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async findVariableLeaks(params: any) {
    const response = await this.client.request('/api/find-variable-leaks', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async scanAnticheat(params: any) {
    const response = await this.client.request('/api/scan-anticheat', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async autoPlace(params: any) {
    const response = await this.client.request('/api/auto-place', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async mirrorInstances(params: any) {
    const response = await this.client.request('/api/mirror-instances', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async snapToGrid(params: any) {
    const response = await this.client.request('/api/snap-to-grid', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async paintSurfaces(params: any) {
    const response = await this.client.request('/api/paint-surfaces', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async trackChanges(params: any) {
    const response = await this.client.request('/api/track-changes', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async manageBackups(params: any) {
    const response = await this.client.request('/api/manage-backups', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async insertComments(params: any) {
    const response = await this.client.request('/api/insert-comments', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async fixNaming(params: any) {
    const response = await this.client.request('/api/fix-naming', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async buildCutscene(params: any) {
    const response = await this.client.request('/api/build-cutscene', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async generateLod(params: any) {
    const response = await this.client.request('/api/generate-lod', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async simulatePhysics(params: any) {
    const response = await this.client.request('/api/simulate-physics', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async generateScript(params: any) {
    const response = await this.client.request('/api/generate-script', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async diffInstances(params: any) {
    const response = await this.client.request('/api/diff-instances', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async buildContext(params: any) {
    const response = await this.client.request('/api/build-context', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async uploadDecal(filePath: string, assetName: string, description: string = '') {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const fileBuffer = fs.readFileSync(filePath);
    const response = await this.openCloudClient.uploadDecal(fileBuffer, assetName, description);
    return {
      content: [{
        type: 'text',
        text: `Successfully uploaded decal: ${assetName} (ID: ${response.assetId})`
      }]
    };
  }

  async simulateMouseInput(params: any) {
    const response = await this.client.request('/api/simulate-mouse-input', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async simulateKeyboardInput(params: any) {
    const response = await this.client.request('/api/simulate-keyboard-input', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async characterNavigation(params: any) {
    const response = await this.client.request('/api/character-navigation', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async findAndReplaceInScripts(params: any) {
    const response = await this.client.request('/api/find-and-replace-in-scripts', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async getConnectedInstances(params: any) {
    const response = await this.client.request('/api/get-connected-instances', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async getScriptAnalysis(params: any) {
    const response = await this.client.request('/api/get-script-analysis', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async getOutputLog(params: any) {
    const response = await this.client.request('/api/get-output-log', params);
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  // === Bulk Operations ===

  async batchExecute(operations: any[]) {
    const results: Array<{ success: boolean; data?: any; error?: string }> = [];
    let succeeded = 0;
    let failed = 0;

    for (const op of operations) {
      try {
        const toolName = op.tool;
        const params = op.params || {};
        const handler = (this as any)[this.getMethodName(toolName)];
        if (!handler) {
          results.push({ success: false, error: `Unknown tool: ${toolName}` });
          failed++;
          continue;
        }
        const result = await handler.call(this, params);
        const text = result?.content?.[0]?.text;
        if (text) {
          try {
            const parsed = JSON.parse(text);
            if (parsed.error) {
              results.push({ success: false, error: parsed.error });
              failed++;
            } else {
              results.push({ success: true, data: parsed });
              succeeded++;
            }
          } catch {
            results.push({ success: true, data: text });
            succeeded++;
          }
        } else {
          results.push({ success: true, data: result });
          succeeded++;
        }
      } catch (err: any) {
        results.push({ success: false, error: err.message || String(err) });
        failed++;
      }
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          results,
          summary: { total: operations.length, succeeded, failed }
        })
      }]
    };
  }

  private getMethodName(toolName: string): string {
    const map: Record<string, string> = {
      'get_file_tree': 'getFileTree',
      'search_files': 'searchFiles',
      'get_place_info': 'getPlaceInfo',
      'get_services': 'getServices',
      'search_objects': 'searchObjects',
      'get_instance_properties': 'getInstanceProperties',
      'get_instance_children': 'getInstanceChildren',
      'search_by_property': 'searchByProperty',
      'get_class_info': 'getClassInfo',
      'get_project_structure': 'getProjectStructure',
      'set_property': 'setProperty',
      'mass_set_property': 'massSetProperty',
      'mass_get_property': 'massGetProperty',
      'create_object': 'createObject',
      'mass_create_objects': 'massCreateObjects',
      'delete_object': 'deleteObject',
      'smart_duplicate': 'smartDuplicate',
      'mass_duplicate': 'massDuplicate',
      'get_script_source': 'getScriptSource',
      'set_script_source': 'setScriptSource',
      'edit_script_lines': 'editScriptLines',
      'insert_script_lines': 'insertScriptLines',
      'delete_script_lines': 'deleteScriptLines',
      'find_and_replace_in_scripts': 'findAndReplaceInScripts',
      'get_connected_instances': 'getConnectedInstances',
      'get_script_analysis': 'getScriptAnalysis',
      'get_output_log': 'getOutputLog',
      'get_attribute': 'getAttribute',
      'set_attribute': 'setAttribute',
      'get_attributes': 'getAttributes',
      'delete_attribute': 'deleteAttribute',
      'get_tags': 'getTags',
      'add_tag': 'addTag',
      'remove_tag': 'removeTag',
      'get_tagged': 'getTagged',
      'get_selection': 'getSelection',
      'execute_luau': 'executeLuau',
      'undo': 'undo',
      'redo': 'redo',
      'start_playtest': 'startPlaytest',
      'stop_playtest': 'stopPlaytest',
      'get_playtest_output': 'getPlaytestOutput',
      'generate_terrain': 'generateTerrain',
      'control_lighting': 'controlLighting',
      'insert_asset': 'insertAsset',
      'preview_asset': 'previewAsset',
      'capture_screenshot': 'captureScreenshot',
      'capture_viewport': 'captureViewport',
      'bulk_get_scripts': 'bulkGetScripts',
      'bulk_set_properties': 'bulkSetProperties',
    };
    return map[toolName] || toolName;
  }

  async bulkGetScripts(scripts: Array<{ path: string; startLine?: number; endLine?: number }>) {
    const results: Array<{ path: string; success: boolean; source?: string; error?: string }> = [];

    for (const script of scripts) {
      try {
        const result = await this.getScriptSource(script.path, script.startLine, script.endLine);
        const text = result?.content?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed.error) {
            results.push({ path: script.path, success: false, error: parsed.error });
          } else {
            results.push({ path: script.path, success: true, source: parsed.source });
          }
        } else {
          results.push({ path: script.path, success: false, error: 'No response' });
        }
      } catch (err: any) {
        results.push({ path: script.path, success: false, error: err.message || String(err) });
      }
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          results,
          summary: { total: scripts.length, succeeded: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length }
        })
      }]
    };
  }

  async bulkSetProperties(operations: Array<{ path: string; property: string; value: any }>) {
    const results: Array<{ path: string; property: string; success: boolean; error?: string }> = [];

    for (const op of operations) {
      try {
        const result = await this.setProperty(op.path, op.property, op.value);
        const text = result?.content?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed.error) {
            results.push({ path: op.path, property: op.property, success: false, error: parsed.error });
          } else {
            results.push({ path: op.path, property: op.property, success: true });
          }
        } else {
          results.push({ path: op.path, property: op.property, success: false, error: 'No response' });
        }
      } catch (err: any) {
        results.push({ path: op.path, property: op.property, success: false, error: err.message || String(err) });
      }
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          results,
          summary: { total: operations.length, succeeded: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length }
        })
      }]
    };
  }

  // === Multi-Place Management ===

  async managePlaces(params: any) {
    const action = params?.action || 'list_places';
    const response = await this.client.request('/places', { action, placeId: params?.placeId, placeName: params?.placeName });
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  // === UI Studio ===

  async buildUi(params: any) {
    const response = await this.client.request('/api/build-ui', {
      parent: params?.parent,
      ui: params?.ui,
    });
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async captureUi(params: any) {
    const response = await this.client.request('/api/capture-screenshot', {
      width: params?.width || 1920,
      height: params?.height || 1080,
    });
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  async getUiTemplates(params: any) {
    const templateName = params?.template || 'all';
    const templates: Record<string, any> = {
      health_bar: {
        class: "ScreenGui",
        name: "HealthBarUI",
        properties: { ResetOnSpawn: false, ZIndexBehavior: "Sibling" },
        children: [
          {
            class: "Frame",
            name: "HealthBar",
            properties: {
              Size: { X: { Scale: 0.3, Offset: 0 }, Y: { Scale: 0.04, Offset: 0 } },
              Position: { X: { Scale: 0.02, Offset: 0 }, Y: { Scale: 0.93, Offset: 0 } },
              BackgroundColor3: [0.15, 0.15, 0.15],
              BorderSizePixel: 0,
            },
            children: [
              {
                class: "Frame",
                name: "Fill",
                properties: {
                  Size: { X: { Scale: 1, Offset: 0 }, Y: { Scale: 1, Offset: 0 } },
                  BackgroundColor3: [0.2, 0.8, 0.2],
                  BorderSizePixel: 0,
                },
                children: [
                  { class: "UICorner", properties: { CornerRadius: { X: { Scale: 0, Offset: 8 }, Y: { Scale: 0, Offset: 8 } } } }
                ]
              },
              { class: "UICorner", properties: { CornerRadius: { X: { Scale: 0, Offset: 8 }, Y: { Scale: 0, Offset: 8 } } } },
              {
                class: "TextLabel",
                name: "HealthText",
                properties: {
                  Size: { X: { Scale: 1, Offset: 0 }, Y: { Scale: 1, Offset: 0 } },
                  BackgroundTransparency: 1,
                  Text: "100/100",
                  TextColor3: [1, 1, 1],
                  TextSize: 14,
                  Font: "GothamBold",
                }
              }
            ]
          }
        ]
      },
      inventory_grid: {
        class: "ScreenGui",
        name: "InventoryUI",
        properties: { ResetOnSpawn: false, ZIndexBehavior: "Sibling" },
        children: [
          {
            class: "Frame",
            name: "InventoryPanel",
            properties: {
              Size: { X: { Scale: 0.4, Offset: 0 }, Y: { Scale: 0.5, Offset: 0 } },
              Position: { X: { Scale: 0.3, Offset: 0 }, Y: { Scale: 0.25, Offset: 0 } },
              BackgroundColor3: [0.12, 0.12, 0.15],
              BorderSizePixel: 0,
            },
            children: [
              { class: "UICorner", properties: { CornerRadius: { X: { Scale: 0, Offset: 12 }, Y: { Scale: 0, Offset: 12 } } } },
              {
                class: "TextLabel",
                name: "Title",
                properties: {
                  Size: { X: { Scale: 1, Offset: 0 }, Y: { Scale: 0.1, Offset: 0 } },
                  BackgroundTransparency: 1,
                  Text: "Inventory",
                  TextColor3: [1, 1, 1],
                  TextSize: 20,
                  Font: "GothamBold",
                }
              },
              {
                class: "Frame",
                name: "Grid",
                properties: {
                  Size: { X: { Scale: 0.95, Offset: 0 }, Y: { Scale: 0.85, Offset: 0 } },
                  Position: { X: { Scale: 0.025, Offset: 0 }, Y: { Scale: 0.12, Offset: 0 } },
                  BackgroundTransparency: 1,
                },
                children: [
                  {
                    class: "UIGridLayout",
                    properties: {
                      CellSize: { X: { Scale: 0, Offset: 60 }, Y: { Scale: 0, Offset: 60 } },
                      CellPadding: { X: { Scale: 0, Offset: 8 }, Y: { Scale: 0, Offset: 8 } },
                      SortOrder: "LayoutOrder",
                    }
                  }
                ]
              }
            ]
          }
        ]
      },
      dialog_box: {
        class: "ScreenGui",
        name: "DialogUI",
        properties: { ResetOnSpawn: false, ZIndexBehavior: "Sibling" },
        children: [
          {
            class: "Frame",
            name: "DialogFrame",
            properties: {
              Size: { X: { Scale: 0.5, Offset: 0 }, Y: { Scale: 0.2, Offset: 0 } },
              Position: { X: { Scale: 0.25, Offset: 0 }, Y: { Scale: 0.75, Offset: 0 } },
              BackgroundColor3: [0.1, 0.1, 0.12],
              BorderSizePixel: 0,
            },
            children: [
              { class: "UICorner", properties: { CornerRadius: { X: { Scale: 0, Offset: 12 }, Y: { Scale: 0, Offset: 12 } } } },
              {
                class: "TextLabel",
                name: "SpeakerName",
                properties: {
                  Size: { X: { Scale: 0.3, Offset: 0 }, Y: { Scale: 0.25, Offset: 0 } },
                  Position: { X: { Scale: 0.02, Offset: 0 }, Y: { Scale: 0.05, Offset: 0 } },
                  BackgroundTransparency: 1,
                  Text: "NPC",
                  TextColor3: [0.4, 0.7, 1],
                  TextSize: 16,
                  Font: "GothamBold",
                  TextXAlignment: "Left",
                }
              },
              {
                class: "TextLabel",
                name: "DialogText",
                properties: {
                  Size: { X: { Scale: 0.96, Offset: 0 }, Y: { Scale: 0.45, Offset: 0 } },
                  Position: { X: { Scale: 0.02, Offset: 0 }, Y: { Scale: 0.3, Offset: 0 } },
                  BackgroundTransparency: 1,
                  Text: "Hello, adventurer!",
                  TextColor3: [0.9, 0.9, 0.9],
                  TextSize: 18,
                  Font: "Gotham",
                  TextXAlignment: "Left",
                  TextWrapped: true,
                }
              },
              {
                class: "TextButton",
                name: "ContinueBtn",
                properties: {
                  Size: { X: { Scale: 0.15, Offset: 0 }, Y: { Scale: 0.25, Offset: 0 } },
                  Position: { X: { Scale: 0.82, Offset: 0 }, Y: { Scale: 0.7, Offset: 0 } },
                  BackgroundColor3: [0.2, 0.5, 1],
                  Text: "Continue",
                  TextColor3: [1, 1, 1],
                  TextSize: 14,
                  Font: "GothamBold",
                  BorderSizePixel: 0,
                },
                children: [
                  { class: "UICorner", properties: { CornerRadius: { X: { Scale: 0, Offset: 6 }, Y: { Scale: 0, Offset: 6 } } } }
                ]
              }
            ]
          }
        ]
      },
      hotbar: {
        class: "ScreenGui",
        name: "HotbarUI",
        properties: { ResetOnSpawn: false, ZIndexBehavior: "Sibling" },
        children: [
          {
            class: "Frame",
            name: "Hotbar",
            properties: {
              Size: { X: { Scale: 0.4, Offset: 0 }, Y: { Scale: 0.08, Offset: 0 } },
              Position: { X: { Scale: 0.3, Offset: 0 }, Y: { Scale: 0.9, Offset: 0 } },
              BackgroundColor3: [0.12, 0.12, 0.15],
              BorderSizePixel: 0,
            },
            children: [
              { class: "UICorner", properties: { CornerRadius: { X: { Scale: 0, Offset: 8 }, Y: { Scale: 0, Offset: 8 } } } },
              {
                class: "UIListLayout",
                properties: {
                  FillDirection: "Horizontal",
                  HorizontalAlignment: "Center",
                  Padding: { X: { Scale: 0, Offset: 4 }, Y: { Scale: 0, Offset: 0 } },
                }
              }
            ]
          }
        ]
      },
      notification: {
        class: "ScreenGui",
        name: "NotificationUI",
        properties: { ResetOnSpawn: false, ZIndexBehavior: "Sibling" },
        children: [
          {
            class: "Frame",
            name: "NotificationContainer",
            properties: {
              Size: { X: { Scale: 0.3, Offset: 0 }, Y: { Scale: 0.4, Offset: 0 } },
              Position: { X: { Scale: 0.68, Offset: 0 }, Y: { Scale: 0.05, Offset: 0 } },
              BackgroundTransparency: 1,
            },
            children: [
              {
                class: "UIListLayout",
                properties: {
                  SortOrder: "LayoutOrder",
                  VerticalAlignment: "Top",
                  Padding: { X: { Scale: 0, Offset: 8 }, Y: { Scale: 0, Offset: 8 } },
                }
              }
            ]
          }
        ]
      },
      scoreboard: {
        class: "ScreenGui",
        name: "ScoreboardUI",
        properties: { ResetOnSpawn: false, ZIndexBehavior: "Sibling" },
        children: [
          {
            class: "Frame",
            name: "Scoreboard",
            properties: {
              Size: { X: { Scale: 0.25, Offset: 0 }, Y: { Scale: 0.5, Offset: 0 } },
              Position: { X: { Scale: 0.73, Offset: 0 }, Y: { Scale: 0.25, Offset: 0 } },
              BackgroundColor3: [0.1, 0.1, 0.12],
              BorderSizePixel: 0,
            },
            children: [
              { class: "UICorner", properties: { CornerRadius: { X: { Scale: 0, Offset: 10 }, Y: { Scale: 0, Offset: 10 } } } },
              {
                class: "TextLabel",
                name: "Title",
                properties: {
                  Size: { X: { Scale: 1, Offset: 0 }, Y: { Scale: 0.08, Offset: 0 } },
                  BackgroundTransparency: 1,
                  Text: "Players",
                  TextColor3: [1, 1, 1],
                  TextSize: 18,
                  Font: "GothamBold",
                }
              },
              {
                class: "ScrollingFrame",
                name: "PlayerList",
                properties: {
                  Size: { X: { Scale: 0.95, Offset: 0 }, Y: { Scale: 0.88, Offset: 0 } },
                  Position: { X: { Scale: 0.025, Offset: 0 }, Y: { Scale: 0.1, Offset: 0 } },
                  BackgroundTransparency: 1,
                  ScrollBarThickness: 4,
                  BorderSizePixel: 0,
                },
                children: [
                  {
                    class: "UIListLayout",
                    properties: {
                      SortOrder: "LayoutOrder",
                      Padding: { X: { Scale: 0, Offset: 4 }, Y: { Scale: 0, Offset: 4 } },
                    }
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    if (templateName === 'all') {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, templates }) }] };
    }

    const template = templates[templateName];
    if (!template) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown template: ${templateName}` }) }] };
    }

    return { content: [{ type: 'text', text: JSON.stringify({ success: true, template: { [templateName]: template } }) }] };
  }

  // === Bidirectional Sync ===

  async syncProjectEnhanced(params: any) {
    const action = params?.action || 'get_changes';
    const response = await this.client.request('/sync', {
      action,
      projectDir: params?.project_dir,
      syncRoots: params?.sync_roots,
      autoSync: params?.auto_sync,
      files: params?.files,
      scripts: params?.scripts,
    });
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  }

  // === Test Report ===

  async generateTestReport(params: any) {
    const mode = params?.mode || 'run';
    const duration = params?.duration || 5;
    const outputPath = params?.output_path || './test-report.json';
    const testName = params?.test_name || `Test Run ${new Date().toISOString()}`;

    try {
      // Start playtest
      await this.client.request('/api/start-playtest', { mode });

      // Wait for playtest to run
      await new Promise(resolve => setTimeout(resolve, duration * 1000));

      // Collect output logs
      const logs = await this.client.request('/api/get-playtest-output', {});

      // Stop playtest
      await this.client.request('/api/stop-playtest', {});

      // Collect errors and warnings
      const outputLogs = await this.client.request('/api/get-output-log', { filter: 'All', limit: 200 });

      const errors = (outputLogs?.logs || []).filter((l: any) => l.messageType === 'Error' || l.messageType === '3');
      const warnings = (outputLogs?.logs || []).filter((l: any) => l.messageType === 'Warning' || l.messageType === '2');

      const report = {
        testName,
        timestamp: new Date().toISOString(),
        mode,
        duration,
        success: errors.length === 0,
        summary: {
          totalLogs: outputLogs?.logs?.length || 0,
          errors: errors.length,
          warnings: warnings.length,
          playtestOutput: (logs?.output || []).length,
        },
        errors: errors.map((l: any) => ({ message: l.message, timestamp: l.timestamp })),
        warnings: warnings.map((l: any) => ({ message: l.message, timestamp: l.timestamp })),
        playtestOutput: logs?.output || [],
      };

      // Save report to local file
      try {
        fs.writeFileSync(path.resolve(outputPath), JSON.stringify(report, null, 2), 'utf-8');

        // Also save readable version
        const readablePath = outputPath.replace('.json', '.txt');
        let readable = `Test Report: ${testName}\n`;
        readable += `${'='.repeat(60)}\n`;
        readable += `Timestamp: ${report.timestamp}\n`;
        readable += `Mode: ${mode}\n`;
        readable += `Duration: ${duration}s\n`;
        readable += `Result: ${report.success ? 'PASS' : 'FAIL'}\n\n`;
        readable += `Summary:\n`;
        readable += `  Total Logs: ${report.summary.totalLogs}\n`;
        readable += `  Errors: ${report.summary.errors}\n`;
        readable += `  Warnings: ${report.summary.warnings}\n`;
        readable += `  Playtest Output: ${report.summary.playtestOutput}\n\n`;

        if (errors.length > 0) {
          readable += `Errors:\n`;
          errors.forEach((e: any) => { readable += `  - ${e.message}\n`; });
          readable += '\n';
        }
        if (warnings.length > 0) {
          readable += `Warnings:\n`;
          warnings.forEach((w: any) => { readable += `  - ${w.message}\n`; });
          readable += '\n';
        }
        if ((logs?.output || []).length > 0) {
          readable += `Playtest Output:\n`;
          (logs.output || []).forEach((o: any) => { readable += `  [${o.type || 'info'}] ${o.message}\n`; });
        }

        fs.writeFileSync(path.resolve(readablePath), readable, 'utf-8');
      } catch (fileErr) {
        // File write failed, still return JSON
      }

      return { content: [{ type: 'text', text: JSON.stringify(report) }] };
    } catch (err: any) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }] };
    }
  }

  // === UI Design Check ===

  async checkUiDesign(params: any) {
    const instancePath = params?.instancePath || 'game.StarterGui';
    const checks = params?.checks || ['all'];

    try {
      // Get all UI instances
      const treeResult = await this.client.request('/api/file-tree', { path: instancePath, maxDepth: 5 });
      const propsResult = await this.client.request('/api/get-instance-properties', { instancePath, excludeSource: true });

      const suggestions: Array<{ severity: string; category: string; path: string; message: string }> = [];

      // Helper to get UI tree
      const collectUiInstances = (node: any, path: string): Array<{ path: string; className: string; properties: any }> => {
        const result: Array<{ path: string; className: string; properties: any }> = [];
        if (node) {
          result.push({ path, className: node.className || '', properties: node.properties || {} });
          if (node.children) {
            for (const child of node.children) {
              const childPath = `${path}.${child.name || 'Unknown'}`;
              result.push(...collectUiInstances(child, childPath));
            }
          }
        }
        return result;
      };

      const uiInstances = collectUiInstances(treeResult, instancePath);
      const runAll = checks.includes('all');

      for (const inst of uiInstances) {
        const cls = inst.className;
        const props = inst.properties;

        // Touch target check
        if (runAll || checks.includes('touch_targets')) {
          if (cls === 'TextButton' || cls === 'ImageButton') {
            const size = props.Size;
            if (size && typeof size === 'object' && size.X && size.Y) {
              const offsetW = size.X.Offset || 0;
              const offsetH = size.Y.Offset || 0;
              const scaleW = size.X.Scale || 0;
              const scaleH = size.Y.Scale || 0;
              if (offsetW < 44 || offsetH < 44) {
                suggestions.push({
                  severity: 'warning',
                  category: 'touch_targets',
                  path: inst.path,
                  message: `Button too small for touch (${offsetW}x${offsetH} offset). Minimum recommended: 44x44 pixels.`
                });
              }
            }
          }
        }

        // Readability check
        if (runAll || checks.includes('readability')) {
          if (cls === 'TextLabel' || cls === 'TextButton') {
            const textSize = props.TextSize;
            if (textSize && typeof textSize === 'number' && textSize < 14) {
              suggestions.push({
                severity: 'warning',
                category: 'readability',
                path: inst.path,
                message: `TextSize ${textSize} may be too small for readability. Minimum recommended: 14px.`
              });
            }
            const textColor = props.TextColor3;
            const bgColor = props.BackgroundColor3;
            if (textColor && bgColor && typeof textColor === 'object' && typeof bgColor === 'object') {
              // Simple contrast check
              const tLum = 0.299 * (textColor[0] || 0) + 0.587 * (textColor[1] || 0) + 0.114 * (textColor[2] || 0);
              const bLum = 0.299 * (bgColor[0] || 0) + 0.587 * (bgColor[1] || 0) + 0.114 * (bgColor[2] || 0);
              const contrast = Math.abs(tLum - bLum);
              if (contrast < 0.3) {
                suggestions.push({
                  severity: 'warning',
                  category: 'readability',
                  path: inst.path,
                  message: `Low contrast between text and background (contrast: ${contrast.toFixed(2)}). Consider increasing contrast.`
                });
              }
            }
          }
        }

        // Safe areas check
        if (runAll || checks.includes('safe_areas')) {
          if (cls === 'Frame' || cls === 'TextButton' || cls === 'TextLabel' || cls === 'ImageLabel') {
            const pos = props.Position;
            if (pos && typeof pos === 'object' && pos.X && pos.Y) {
              const scaleW = pos.X.Scale || 0;
              const scaleH = pos.Y.Scale || 0;
              if (scaleW < 0.02 || scaleH < 0.02) {
                suggestions.push({
                  severity: 'info',
                  category: 'safe_areas',
                  path: inst.path,
                  message: `Element too close to screen edge (Position: ${scaleW.toFixed(2)}, ${scaleH.toFixed(2)}). Consider safe area margins.`
                });
              }
            }
          }
        }

        // Accessibility check
        if (runAll || checks.includes('accessibility')) {
          if (cls === 'TextButton' || cls === 'ImageButton') {
            if (!props.AutoButtonColor && !props.Active) {
              suggestions.push({
                severity: 'info',
                category: 'accessibility',
                path: inst.path,
                message: `Button has no visual feedback (AutoButtonColor=false, Active=false). Users won't see hover/press states.`
              });
            }
          }
        }

        // Layout check
        if (runAll || checks.includes('layout')) {
          if (cls === 'Frame' || cls === 'ScrollingFrame') {
            const children = inst.properties?.children || [];
            const hasLayout = children.some((c: any) =>
              c.className === 'UIListLayout' || c.className === 'UIGridLayout' || c.className === 'UIPageLayout'
            );
            if (children.length > 3 && !hasLayout) {
              suggestions.push({
                severity: 'info',
                category: 'layout',
                path: inst.path,
                message: `Container has ${children.length} children but no layout constraint. Consider adding UIListLayout or UIGridLayout.`
              });
            }
          }
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            instancePath,
            checks: runAll ? ['all'] : checks,
            totalInstances: uiInstances.length,
            suggestions,
            summary: {
              total: suggestions.length,
              warnings: suggestions.filter(s => s.severity === 'warning').length,
              info: suggestions.filter(s => s.severity === 'info').length,
            }
          })
        }]
      };
    } catch (err: any) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }] };
    }
  }
}
