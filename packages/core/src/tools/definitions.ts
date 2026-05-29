export type ToolCategory = 'read' | 'write';

export interface ToolDefinition {
  name: string;
  description: string;
  category: ToolCategory;
  inputSchema: object;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  // === File & Instance Browsing ===
  {
    name: 'get_file_tree',
    category: 'read',
    description: 'Get instance hierarchy tree. DO NOT scan game root automatically. Target specific services.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Root path (default: game root)'
        },
        dataModel: {
          type: 'string',
          enum: ['edit', 'server', 'client'],
          description: 'Target DataModel context (default: edit)'
        }
      }
    }
  },
  {
    name: 'search_files',
    category: 'read',
    description: 'Search instances. MAX 100 results. Use focused searches by script name/path instead of broad queries.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Name, class, or code pattern'
        },
        searchType: {
          type: 'string',
          enum: ['name', 'type', 'content'],
          description: 'Search mode (default: name)'
        }
      },
      required: ['query']
    }
  },

  // === Place & Service Info ===
  {
    name: 'get_place_info',
    category: 'read',
    description: 'Get place ID, name, and game settings',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_services',
    category: 'read',
    description: 'Get available services and their children',
    inputSchema: {
      type: 'object',
      properties: {
        serviceName: {
          type: 'string',
          description: 'Specific service name'
        }
      }
    }
  },
  {
    name: 'search_objects',
    category: 'read',
    description: 'Find instances by name, class, or properties',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query'
        },
        searchType: {
          type: 'string',
          enum: ['name', 'class', 'property'],
          description: 'Search mode (default: name)'
        },
        propertyName: {
          type: 'string',
          description: 'Property name when searchType is "property"'
        }
      },
      required: ['query']
    }
  },

  // === Instance Inspection ===
  {
    name: 'get_instance_properties',
    category: 'read',
    description: 'Get all properties of an instance',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path (dot notation)'
        },
        excludeSource: {
          type: 'boolean',
          description: 'For scripts, return SourceLength/LineCount instead of full source (default: false)'
        },
        dataModel: {
          type: 'string',
          enum: ['edit', 'server', 'client'],
          description: 'Target DataModel context (default: edit)'
        }
      },
      required: ['instancePath']
    }
  },
  {
    name: 'get_instance_children',
    category: 'read',
    description: 'Get children and their class types',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path (dot notation)'
        }
      },
      required: ['instancePath']
    }
  },
  {
    name: 'search_by_property',
    category: 'read',
    description: 'Find objects with specific property values',
    inputSchema: {
      type: 'object',
      properties: {
        propertyName: {
          type: 'string',
          description: 'Property name'
        },
        propertyValue: {
          type: 'string',
          description: 'Value to match'
        }
      },
      required: ['propertyName', 'propertyValue']
    }
  },
  {
    name: 'get_class_info',
    category: 'read',
    description: 'Get properties/methods for a class',
    inputSchema: {
      type: 'object',
      properties: {
        className: {
          type: 'string',
          description: 'Roblox class name'
        }
      },
      required: ['className']
    }
  },

  // === Project Structure ===
  {
    name: 'get_project_structure',
    category: 'read',
    description: 'Get game hierarchy tree. STRICT RULES: Use maxDepth=1 or 2. NEVER scan the entire project. Only read targeted services (e.g. game.ServerScriptService). Stop deep reasoning if token usage is high.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Root path (default: workspace root)'
        },
        maxDepth: {
          type: 'number',
          description: 'Max traversal depth (default: 3)'
        },
        scriptsOnly: {
          type: 'boolean',
          description: 'Show only scripts (default: false)'
        }
      }
    }
  },

  // === Property Write ===
  {
    name: 'set_property',
    category: 'write',
    description: 'Set a property on an instance',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path (dot notation)'
        },
        propertyName: {
          type: 'string',
          description: 'Property name'
        },
        propertyValue: {
          description: 'Value to set (string, number, boolean, or object for Vector3/Color3/UDim2)'
        },
        dataModel: {
          type: 'string',
          enum: ['edit', 'server', 'client'],
          description: 'Target DataModel context (default: edit)'
        }
      },
      required: ['instancePath', 'propertyName', 'propertyValue']
    }
  },
  {
    name: 'mass_set_property',
    category: 'write',
    description: 'Set a property on multiple instances',
    inputSchema: {
      type: 'object',
      properties: {
        paths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Instance paths'
        },
        propertyName: {
          type: 'string',
          description: 'Property name'
        },
        propertyValue: {
          description: 'Value to set (string, number, boolean, or object for Vector3/Color3/UDim2)'
        }
      },
      required: ['paths', 'propertyName', 'propertyValue']
    }
  },
  {
    name: 'mass_get_property',
    category: 'read',
    description: 'Get a property from multiple instances',
    inputSchema: {
      type: 'object',
      properties: {
        paths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Instance paths'
        },
        propertyName: {
          type: 'string',
          description: 'Property name'
        }
      },
      required: ['paths', 'propertyName']
    }
  },

  // === Object Creation/Deletion ===
  {
    name: 'create_object',
    category: 'write',
    description: 'Create a new instance. Optionally set properties on creation.',
    inputSchema: {
      type: 'object',
      properties: {
        className: {
          type: 'string',
          description: 'Roblox class name'
        },
        parent: {
          type: 'string',
          description: 'Parent instance path'
        },
        name: {
          type: 'string',
          description: 'Optional name'
        },
        properties: {
          type: 'object',
          description: 'Properties to set on creation'
        },
        dataModel: {
          type: 'string',
          enum: ['edit', 'server', 'client'],
          description: 'Target DataModel context (default: edit)'
        }
      },
      required: ['className', 'parent']
    }
  },
  {
    name: 'mass_create_objects',
    category: 'write',
    description: 'Create multiple instances. Each can have optional properties.',
    inputSchema: {
      type: 'object',
      properties: {
        objects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              className: {
                type: 'string',
                description: 'Roblox class name'
              },
              parent: {
                type: 'string',
                description: 'Parent instance path'
              },
              name: {
                type: 'string',
                description: 'Optional name'
              },
              properties: {
                type: 'object',
                description: 'Properties to set on creation'
              }
            },
            required: ['className', 'parent']
          },
          description: 'Objects to create'
        }
      },
      required: ['objects']
    }
  },
  {
    name: 'delete_object',
    category: 'write',
    description: 'Delete an instance',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path (dot notation)'
        }
      },
      required: ['instancePath']
    }
  },

  // === Duplication ===
  {
    name: 'smart_duplicate',
    category: 'write',
    description: 'Duplicate with naming, positioning, and property variations',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path (dot notation)'
        },
        count: {
          type: 'number',
          description: 'Number of duplicates'
        },
        options: {
          type: 'object',
          properties: {
            namePattern: {
              type: 'string',
              description: 'Name pattern ({n} placeholder)'
            },
            positionOffset: {
              type: 'array',
              items: { type: 'number' },
              description: 'X, Y, Z offset per duplicate'
            },
            rotationOffset: {
              type: 'array',
              items: { type: 'number' },
              description: 'X, Y, Z rotation offset'
            },
            scaleOffset: {
              type: 'array',
              items: { type: 'number' },
              description: 'X, Y, Z scale multiplier'
            },
            propertyVariations: {
              type: 'object',
              description: 'Property name to array of values'
            },
            targetParents: {
              type: 'array',
              items: { type: 'string' },
              description: 'Different parent per duplicate'
            }
          }
        }
      },
      required: ['instancePath', 'count']
    }
  },
  {
    name: 'mass_duplicate',
    category: 'write',
    description: 'Batch smart_duplicate operations',
    inputSchema: {
      type: 'object',
      properties: {
        duplications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              instancePath: {
                type: 'string',
                description: 'Instance path (dot notation)'
              },
              count: {
                type: 'number',
                description: 'Number of duplicates'
              },
              options: {
                type: 'object',
                properties: {
                  namePattern: {
                    type: 'string',
                    description: 'Name pattern ({n} placeholder)'
                  },
                  positionOffset: {
                    type: 'array',
                    items: { type: 'number' },
                    description: 'X, Y, Z offset per duplicate'
                  },
                  rotationOffset: {
                    type: 'array',
                    items: { type: 'number' },
                    description: 'X, Y, Z rotation offset'
                  },
                  scaleOffset: {
                    type: 'array',
                    items: { type: 'number' },
                    description: 'X, Y, Z scale multiplier'
                  },
                  propertyVariations: {
                    type: 'object',
                    description: 'Property name to array of values'
                  },
                  targetParents: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Different parent per duplicate'
                  }
                }
              }
            },
            required: ['instancePath', 'count']
          },
          description: 'Duplication operations'
        }
      },
      required: ['duplications']
    }
  },

  // === Script Read/Write ===
  {
    name: 'get_script_source',
    category: 'read',
    description: 'Get script source. Returns "source" and "numberedSource" (line-numbered). Use startLine/endLine for large scripts.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Script instance path'
        },
        startLine: {
          type: 'number',
          description: 'Start line (1-indexed)'
        },
        endLine: {
          type: 'number',
          description: 'End line (inclusive)'
        }
      },
      required: ['instancePath']
    }
  },
  {
    name: 'set_script_source',
    category: 'write',
    description: 'Replace entire script source. For partial edits use edit/insert/delete_script_lines.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Script instance path'
        },
        source: {
          type: 'string',
          description: 'New source code'
        }
      },
      required: ['instancePath', 'source']
    }
  },
  {
    name: 'edit_script_lines',
    category: 'write',
    description: 'Replace all occurrences of old_string with new_string in a script. For line-based edits, use set_script_source or insert/delete_script_lines.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Script instance path'
        },
        old_string: {
          type: 'string',
          description: 'String to find and replace'
        },
        new_string: {
          type: 'string',
          description: 'Replacement string'
        }
      },
      required: ['instancePath', 'old_string', 'new_string']
    }
  },
  {
    name: 'insert_script_lines',
    category: 'write',
    description: 'Insert lines after a given line number (0 = beginning).',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Script instance path'
        },
        afterLine: {
          type: 'number',
          description: 'Insert after this line (0 = beginning)'
        },
        newContent: {
          type: 'string',
          description: 'Content to insert'
        }
      },
      required: ['instancePath', 'newContent']
    }
  },
  {
    name: 'delete_script_lines',
    category: 'write',
    description: 'Delete a range of lines. 1-indexed, inclusive.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Script instance path'
        },
        startLine: {
          type: 'number',
          description: 'Start line (1-indexed)'
        },
        endLine: {
          type: 'number',
          description: 'End line (inclusive)'
        }
      },
      required: ['instancePath', 'startLine', 'endLine']
    }
  },

  // === Attributes ===
  {
    name: 'get_attribute',
    category: 'read',
    description: 'Get an attribute value',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path (dot notation)'
        },
        attributeName: {
          type: 'string',
          description: 'Attribute name'
        }
      },
      required: ['instancePath', 'attributeName']
    }
  },
  {
    name: 'set_attribute',
    category: 'write',
    description: 'Set an attribute. Supports primitives, Vector3, Color3, UDim2, BrickColor.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path (dot notation)'
        },
        attributeName: {
          type: 'string',
          description: 'Attribute name'
        },
        attributeValue: {
          description: 'Value (string, number, boolean, or object for Vector3/Color3/UDim2)'
        },
        valueType: {
          type: 'string',
          description: 'Type hint if needed'
        }
      },
      required: ['instancePath', 'attributeName', 'attributeValue']
    }
  },
  {
    name: 'get_attributes',
    category: 'read',
    description: 'Get all attributes on an instance',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path (dot notation)'
        }
      },
      required: ['instancePath']
    }
  },
  {
    name: 'delete_attribute',
    category: 'write',
    description: 'Delete an attribute',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path (dot notation)'
        },
        attributeName: {
          type: 'string',
          description: 'Attribute name'
        }
      },
      required: ['instancePath', 'attributeName']
    }
  },

  // === Tags ===
  {
    name: 'get_tags',
    category: 'read',
    description: 'Get all tags on an instance',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path (dot notation)'
        }
      },
      required: ['instancePath']
    }
  },
  {
    name: 'add_tag',
    category: 'write',
    description: 'Add a tag',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path (dot notation)'
        },
        tagName: {
          type: 'string',
          description: 'Tag name'
        }
      },
      required: ['instancePath', 'tagName']
    }
  },
  {
    name: 'remove_tag',
    category: 'write',
    description: 'Remove a tag',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Instance path (dot notation)'
        },
        tagName: {
          type: 'string',
          description: 'Tag name'
        }
      },
      required: ['instancePath', 'tagName']
    }
  },
  {
    name: 'get_tagged',
    category: 'read',
    description: 'Get all instances with a specific tag',
    inputSchema: {
      type: 'object',
      properties: {
        tagName: {
          type: 'string',
          description: 'Tag name'
        }
      },
      required: ['tagName']
    }
  },

  // === Selection ===
  {
    name: 'get_selection',
    category: 'read',
    description: 'Get all currently selected objects',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // === Luau Execution ===
  {
    name: 'execute_luau',
    category: 'write',
    description: 'Execute Luau code in plugin context. Use print()/warn() for output. Return value is captured.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Luau code to execute'
        }
      },
      required: ['code']
    }
  },

  // === Script Search ===
  {
    name: 'grep_scripts',
    category: 'read',
    description: 'Ripgrep-inspired search across all script sources. Supports literal and Lua pattern matching, context lines, early termination, and results grouped by script with line/column numbers.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Search pattern (literal string or Lua pattern)'
        },
        caseSensitive: {
          type: 'boolean',
          description: 'Case-sensitive search (default: false)'
        },
        usePattern: {
          type: 'boolean',
          description: 'Use Lua pattern matching instead of literal (default: false)'
        },
        contextLines: {
          type: 'number',
          description: 'Number of context lines before/after each match (default: 0)'
        },
        maxResults: {
          type: 'number',
          description: 'Max total matches before stopping (default: 100)'
        },
        maxResultsPerScript: {
          type: 'number',
          description: 'Max matches per script (like rg -m)'
        },
        filesOnly: {
          type: 'boolean',
          description: 'Only return matching script paths, not line details (default: false)'
        },
        path: {
          type: 'string',
          description: 'Subtree to search (e.g. "game.ServerScriptService")'
        },
        classFilter: {
          type: 'string',
          enum: ['Script', 'LocalScript', 'ModuleScript'],
          description: 'Only search scripts of this class type'
        }
      },
      required: ['pattern']
    }
  },

  // === Playtest ===
  {
    name: 'start_playtest',
    category: 'read',
    description: 'Start playtest. Captures print/warn/error via LogService. Poll with get_playtest_output, end with stop_playtest.',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['play', 'run'],
          description: 'Play mode'
        }
      },
      required: ['mode']
    }
  },
  {
    name: 'stop_playtest',
    category: 'read',
    description: 'Stop playtest and return all captured output.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_playtest_output',
    category: 'read',
    description: 'Poll output buffer without stopping. Returns isRunning and captured messages.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // === Undo/Redo ===
  {
    name: 'undo',
    category: 'write',
    description: 'Undo the last change in Roblox Studio. Uses ChangeHistoryService to reverse the most recent operation.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'redo',
    category: 'write',
    description: 'Redo the last undone change in Roblox Studio. Uses ChangeHistoryService to reapply the most recently undone operation.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // === Build Library ===
  {
    name: 'export_build',
    category: 'read',
    description: 'Export a Model/Folder into a compact, token-efficient build JSON format and auto-save it to the local build library. The output contains a palette (unique BrickColor+Material combos mapped to short keys) and compact part arrays with positions normalized relative to the bounding box center. The file is saved to build-library/{style}/{id}.json automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'Path to the Model or Folder to export (dot notation)'
        },
        outputId: {
          type: 'string',
          description: 'Build ID for the output (e.g. "medieval/cottage_01"). Defaults to style/instance_name.'
        },
        style: {
          type: 'string',
          enum: ['medieval', 'modern', 'nature', 'scifi', 'misc'],
          description: 'Style category for the build (default: misc)'
        }
      },
      required: ['instancePath']
    }
  },
  {
    name: 'create_build',
    category: 'write',
    description: 'Create a new build model from scratch and save it to the library. Define parts using compact arrays [posX, posY, posZ, sizeX, sizeY, sizeZ, rotX, rotY, rotZ, paletteKey, shape?, transparency?]. Palette maps short keys to [BrickColor, Material] pairs. The build is saved and can be referenced by import_build or import_scene.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Build ID including style prefix (e.g. "medieval/torch_01", "nature/bush_small")'
        },
        style: {
          type: 'string',
          enum: ['medieval', 'modern', 'nature', 'scifi', 'misc'],
          description: 'Style category'
        },
        palette: {
          type: 'object',
          description: 'Map of short keys to [BrickColor, Material] or [BrickColor, Material, MaterialVariant] tuples. E.g. {"a": ["Dark stone grey", "Concrete"], "b": ["Brown", "Wood", "MyCustomWood"]}'
        },
        parts: {
          type: 'array',
          description: 'Array of part arrays. Each: [posX, posY, posZ, sizeX, sizeY, sizeZ, rotX, rotY, rotZ, paletteKey, shape?, transparency?]. Shapes: Block (default), Wedge, Cylinder, Ball, CornerWedge.',
          items: {
            type: 'array',
            items: {
              anyOf: [{ type: 'number' }, { type: 'string' }]
            }
          }
        },
        bounds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Optional bounding box [X, Y, Z]. Auto-computed if omitted.'
        }
      },
      required: ['id', 'style', 'palette', 'parts']
    }
  },
  {
    name: 'generate_build',
    category: 'write',
    description: `Procedurally generate a build via JS code. ALWAYS generate the entire scene in ONE call — never split into multiple small builds. PREFER high-level primitives over manual loops. No comments. No unnecessary variables. Maximize build detail per line.

EDITING: When modifying an existing build, call get_build first to retrieve the original code. Then make ONLY the targeted changes the user requested — do not rewrite unchanged code. Pass the modified code to generate_build.

HIGH-LEVEL (use these first — each replaces 5-20 lines):
  room(x,y,z, w,h,d, wallKey, floorKey?, ceilKey?, wallThickness?) - Complete enclosed room (floor+ceiling+4 walls)
  roof(x,y,z, w,d, style, key, overhang?) - style: "flat"|"gable"|"hip"
  stairs(x1,y1,z1, x2,y2,z2, width, key) - Auto-generates steps between two points
  column(x,y,z, height, radius, key, capKey?) - Cylinder with base+capital
  pew(x,y,z, w,d, seatKey, legKey?) - Bench with seat+backrest+legs
  arch(x,y,z, w,h, thickness, key, segments?) - Curved archway
  fence(x1,z1, x2,z2, y, key, postSpacing?) - Fence with posts+rails

BASIC:
  part(x,y,z, sx,sy,sz, key, shape?, transparency?)
  rpart(x,y,z, sx,sy,sz, rx,ry,rz, key, shape?, transparency?)
  wall(x1,z1, x2,z2, height, thickness, key) — vertical plane from (x1,z1) to (x2,z2)
  floor(x1,z1, x2,z2, y, thickness, key) — horizontal plane at height y, corners (x1,z1)-(x2,z2). NOT fill — only takes 2D corners+y, not 3D points
  fill(x1,y1,z1, x2,y2,z2, key, [ux,uy,uz]?) — 3D volume between two 3D points
  beam(x1,y1,z1, x2,y2,z2, thickness, key)

IMPORTANT: Palette keys must match exactly. Use only keys defined in your palette object, not color names.
CUSTOM MATERIALS: Use search_materials to find MaterialVariant names, then reference them as the 3rd palette element: {"a": ["Color", "BaseMaterial", "VariantName"]}.

REPETITION:
  row(x,y,z, count, spacingX, spacingZ, fn(i,cx,cy,cz))
  grid(x,y,z, countX, countZ, spacingX, spacingZ, fn(ix,iz,cx,cy,cz))

Shapes: Block(default), Wedge, Cylinder, Ball, CornerWedge. Max 10000 parts. Math and rng() available.
CYLINDER AXIS: Roblox cylinders extend along the X axis. For upright cylinders, use size (height, diameter, diameter) with rz=90. The column() primitive handles this automatically.

EXAMPLE — compact cabin (17 lines):
room(0,0,0,8,4,6,"a","b","a")
roof(0,4,0,8,6,"gable","c")
wall(-4,0,-2,4,0,-2,4,1,"a")
part(0,2,3,3,3,0.3,"a","Block",0.4)
row(-2,0,-1,3,0,2,(i,cx,cy,cz)=>{pew(cx,0,cz,3,2,"d")})
column(-3,0,-2,4,0.5,"a","b")
column(3,0,-2,4,0.5,"a","b")
part(0,2,0,2,1,1,"b")`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Build ID including style prefix (e.g. "medieval/church_01")'
        },
        style: {
          type: 'string',
          enum: ['medieval', 'modern', 'nature', 'scifi', 'misc'],
          description: 'Style category'
        },
        palette: {
          type: 'object',
          description: 'Map of short keys to [BrickColor, Material] or [BrickColor, Material, MaterialVariant] tuples. E.g. {"a": ["Dark stone grey", "Cobblestone"], "b": ["Brown", "WoodPlanks", "MyCustomWood"]}. MaterialVariant is optional — use it to reference custom materials from MaterialService.'
        },
        code: {
          type: 'string',
          description: 'JavaScript code using the primitives above to generate parts procedurally'
        },
        seed: {
          type: 'number',
          description: 'Optional seed for deterministic rng() output (default: 42)'
        }
      },
      required: ['id', 'style', 'palette', 'code']
    }
  },
  {
    name: 'import_build',
    category: 'write',
    description: 'Import a build into Roblox Studio. Accepts either a full build data object OR a library ID string (e.g. "medieval/church_01") to load from the build library. When using generate_build or create_build, pass the build ID string instead of the full data.',
    inputSchema: {
      type: 'object',
      properties: {
        buildData: {
          description: 'Either a build data object (with palette, parts, etc.) OR a library ID string (e.g. "medieval/church_01") to load from the build library'
        },
        targetPath: {
          type: 'string',
          description: 'Parent instance path where the model will be created'
        },
        position: {
          type: 'array',
          items: { type: 'number' },
          description: 'World position offset [X, Y, Z]'
        }
      },
      required: ['buildData', 'targetPath']
    }
  },
  {
    name: 'list_library',
    category: 'read',
    description: 'List available builds in the local build library. Returns build IDs, styles, bounds, and part counts. Optionally filter by style.',
    inputSchema: {
      type: 'object',
      properties: {
        style: {
          type: 'string',
          enum: ['medieval', 'modern', 'nature', 'scifi', 'misc'],
          description: 'Filter by style category'
        }
      }
    }
  },
  {
    name: 'search_materials',
    category: 'read',
    description: 'Search for MaterialVariant instances in MaterialService by name. Use this to find custom materials before using them in generate_build or create_build palettes. Returns material names and their base material types.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query to match against material names (case-insensitive). Leave empty to list all.'
        },
        maxResults: {
          type: 'number',
          description: 'Max results to return (default: 50)'
        }
      }
    }
  },
  {
    name: 'get_build',
    category: 'read',
    description: 'Get a build from the library by ID. Returns metadata, palette, and generator code (if the build was created with generate_build). IMPORTANT: When the user asks to modify an existing build, ALWAYS call get_build first to retrieve the original code, then make targeted edits to only the relevant lines, and call generate_build with the modified code. Never rewrite the entire code from scratch — only change what the user asked to change.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Build ID (e.g. "medieval/church_01")'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'import_scene',
    category: 'write',
    description: 'Import a full scene layout. Provide a scene with model references (resolved from library) and placement data. Each model is placed at the specified position/rotation. Can also include inline custom builds.',
    inputSchema: {
      type: 'object',
      properties: {
        sceneData: {
          type: 'object',
          description: 'Scene layout object with: models (map of key to library build ID), place (array of [key, position, rotation?]), and optional custom (array of inline build objects with name, position, palette, parts)',
          properties: {
            models: {
              type: 'object',
              description: 'Map of short keys to library build IDs (e.g. {"A": "medieval/cottage_01"})'
            },
            place: {
              type: 'array',
              description: 'Array of placements. Preferred format: {modelKey, position:[x,y,z], rotation?:[x,y,z]}. Legacy tuple format [modelKey, [x,y,z], [rotX?,rotY?,rotZ?]] is also accepted.',
              items: {
                anyOf: [
                  {
                    type: 'object',
                    additionalProperties: false,
                    required: ['modelKey', 'position'],
                    properties: {
                      modelKey: {
                        type: 'string'
                      },
                      position: {
                        type: 'array',
                        items: { type: 'number' }
                      },
                      rotation: {
                        type: 'array',
                        items: { type: 'number' }
                      }
                    }
                  },
                  {
                    type: 'array',
                    items: {
                      anyOf: [
                        {
                          type: 'string'
                        },
                        {
                          type: 'array',
                          items: { type: 'number' }
                        }
                      ]
                    }
                  }
                ]
              }
            },
            custom: {
              type: 'array',
              description: 'Array of inline custom builds with {n: name, o: [x,y,z], palette: {...}, parts: [...]}',
              items: { type: 'object' }
            }
          }
        },
        targetPath: {
          type: 'string',
          description: 'Parent instance path for the scene (default: game.Workspace)'
        }
      },
      required: ['sceneData']
    }
  },

  // === Asset Tools ===
  {
    name: 'search_assets',
    category: 'read',
    description: 'Search the Creator Store (Roblox marketplace) for assets by type and keywords. Requires ROBLOX_OPEN_CLOUD_API_KEY env var.',
    inputSchema: {
      type: 'object',
      properties: {
        assetType: {
          type: 'string',
          enum: ['Audio', 'Model', 'Decal', 'Plugin', 'MeshPart', 'Video', 'FontFamily'],
          description: 'Type of asset to search for'
        },
        query: {
          type: 'string',
          description: 'Search keywords'
        },
        maxResults: {
          type: 'number',
          description: 'Max results to return (default: 25)'
        },
        sortBy: {
          type: 'string',
          enum: ['Relevance', 'Trending', 'Top', 'AudioDuration', 'CreateTime', 'UpdatedTime', 'Ratings'],
          description: 'Sort order (default: Relevance)'
        },
        verifiedCreatorsOnly: {
          type: 'boolean',
          description: 'Only show assets from verified creators (default: false)'
        }
      },
      required: ['assetType']
    }
  },
  {
    name: 'get_asset_details',
    category: 'read',
    description: 'Get detailed marketplace metadata for a specific asset (creator info, votes, description, pricing). Requires ROBLOX_OPEN_CLOUD_API_KEY env var.',
    inputSchema: {
      type: 'object',
      properties: {
        assetId: {
          type: 'number',
          description: 'The Roblox asset ID'
        }
      },
      required: ['assetId']
    }
  },
  {
    name: 'get_asset_thumbnail',
    category: 'read',
    description: 'Get the thumbnail image for an asset as base64 PNG, suitable for vision LLMs. Requires ROBLOX_OPEN_CLOUD_API_KEY env var.',
    inputSchema: {
      type: 'object',
      properties: {
        assetId: {
          type: 'number',
          description: 'The Roblox asset ID'
        },
        size: {
          type: 'string',
          enum: ['150x150', '420x420', '768x432'],
          description: 'Thumbnail size (default: 420x420)'
        }
      },
      required: ['assetId']
    }
  },
  {
    name: 'preview_asset',
    category: 'read',
    description: 'Preview a Roblox asset without permanently inserting it. Loads the asset, builds a hierarchy tree with properties and summary stats, then destroys it. Useful for inspecting asset contents before insertion.',
    inputSchema: {
      type: 'object',
      properties: {
        assetId: {
          type: 'number',
          description: 'The Roblox asset ID to preview'
        },
        includeProperties: {
          type: 'boolean',
          description: 'Include detailed properties for each instance (default: true)'
        },
        maxDepth: {
          type: 'number',
          description: 'Max hierarchy traversal depth (default: 10)'
        }
      },
      required: ['assetId']
    }
  },
  {
    name: 'capture_screenshot',
    category: 'read',
    description: 'Capture a screenshot of the Roblox Studio viewport and return it as a PNG image. Requires EditableImage API to be enabled: Game Settings > Security > "Allow Mesh / Image APIs". Only works in Edit mode with the viewport visible.',
    inputSchema: {
      type: 'object',
      properties: {},
    }
  },
  {
    name: 'capture_viewport',
    category: 'read',
    description: 'Take a screenshot of the current Studio viewport. Can optionally include an overlay/highlight for a specific instance.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['capture', 'capture_with_overlay'],
          description: 'Action to perform'
        },
        highlight_path: {
          type: 'string',
          description: 'Instance path to highlight in capture_with_overlay'
        },
        resolution: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Resolution level'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'insert_asset',
    category: 'write',
    description: 'Insert assets from the Creator Store or create specific asset-based instances.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['insert_by_id', 'search_and_insert', 'insert_mesh', 'insert_image_label'],
          description: 'Action to perform'
        },
        asset_id: {
          type: 'number',
          description: 'Asset ID for insert_by_id'
        },
        assetId: {
          type: 'number',
          description: 'Legacy Asset ID (for backward compatibility)'
        },
        target_path: {
          type: 'string',
          description: 'Path where the asset should be inserted'
        },
        parentPath: {
          type: 'string',
          description: 'Legacy parent path (for backward compatibility)'
        },
        keyword: {
          type: 'string',
          description: 'Keyword for search_and_insert'
        },
        mesh_id: {
          type: 'string',
          description: 'MeshId for insert_mesh'
        },
        texture_id: {
          type: 'string',
          description: 'TextureId for insert_mesh'
        },
        image_id: {
          type: 'string',
          description: 'ImageId for insert_image_label'
        },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' }
          },
          description: 'Optional world position to place the asset'
        }
      }
    }
  },
  {
    name: 'history_control',
    category: 'write',
    description: 'Control undo/redo history and waypoints in Studio.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['undo', 'redo', 'set_waypoint', 'get_waypoints'],
          description: 'Action to perform'
        },
        waypoint_name: {
          type: 'string',
          description: 'Name for the waypoint in set_waypoint'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'control_selection',
    category: 'write',
    description: 'Manage Studio selection and camera focus.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['select', 'add_to_selection', 'clear_selection', 'get_selection', 'focus_camera_on'],
          description: 'Action to perform'
        },
        paths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Instance paths for selection'
        },
        properties: {
          type: 'array',
          items: { type: 'string' },
          description: 'Properties to return in get_selection'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'validate_pathfinding',
    category: 'read',
    description: 'Check paths and visualize pathfinding in the workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['check_path', 'get_waypoints', 'visualize_path'],
          description: 'Action to perform'
        },
        start: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' }
          },
          required: ['x', 'y', 'z'],
          description: 'Start position'
        },
        goal: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' }
          },
          required: ['x', 'y', 'z'],
          description: 'Goal position'
        },
        agent_params: {
          type: 'object',
          description: 'Agent parameters for PathfindingService'
        }
      },
      required: ['action', 'start', 'goal']
    }
  },
  {
    name: 'analyze_performance',
    category: 'read',
    description: 'Analyze game performance, script complexity, and mesh optimization.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['get_stats', 'find_heavy_scripts', 'find_duplicate_meshes', 'get_render_stats', 'benchmark_script'],
          description: 'Action to perform'
        },
        target_path: {
          type: 'string',
          description: 'Script path for benchmark_script'
        },
        iterations: {
          type: 'number',
          description: 'Number of iterations for benchmark_script'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'check_collisions',
    category: 'read',
    description: 'Check for part collisions and overlaps in the workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['find_overlapping', 'check_two_parts', 'find_all_intersections', 'set_collision_group'],
          description: 'Action to perform'
        },
        path_a: {
          type: 'string',
          description: 'First part path'
        },
        path_b: {
          type: 'string',
          description: 'Second part path'
        },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' }
          },
          description: 'Region center'
        },
        size: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' }
          },
          description: 'Region size'
        },
        collision_group: {
          type: 'string',
          description: 'Collision group name'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'manage_datastore',
    category: 'write',
    description: 'Manage DataStore values. ONLY works in Studio Test/Run mode with API access enabled.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['get_value', 'set_value', 'remove_value', 'list_keys', 'increment_value'],
          description: 'Action to perform'
        },
        store_name: {
          type: 'string',
          description: 'DataStore name'
        },
        key: {
          type: 'string',
          description: 'DataStore key'
        },
        value: {
          description: 'Value to set'
        },
        prefix: {
          type: 'string',
          description: 'Prefix for list_keys'
        },
        delta: {
          type: 'number',
          description: 'Delta for increment_value'
        }
      },
      required: ['action', 'store_name']
    }
  },
  {
    name: 'build_library',
    category: 'write',
    description: 'Advanced build library operations for exporting and importing complex structures.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['export_selection', 'export_path', 'import_build', 'list_saved_builds', 'save_build'],
          description: 'Action to perform'
        },
        target_path: {
          type: 'string',
          description: 'Target path for import'
        },
        build_name: {
          type: 'string',
          description: 'Name for the build'
        },
        json_data: {
          type: 'string',
          description: 'JSON data for save_build/import_build'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'run_tests',
    category: 'read',
    description: 'Run Luau tests and property assertions in Studio.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['run_script_test', 'run_all_tests', 'get_last_results', 'assert_property'],
          description: 'Action to perform'
        },
        script_path: {
          type: 'string',
          description: 'Path to the test script'
        },
        instance_path: {
          type: 'string',
          description: 'Instance path for assert_property'
        },
        property_name: {
          type: 'string',
          description: 'Property name for assert_property'
        },
        expected_value: {
          description: 'Expected value for assert_property'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'generate_terrain',
    category: 'write',
    description: 'Generate and modify terrain in Roblox Studio.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['fill', 'flatten', 'generate_heightmap', 'clear'],
          description: 'Action to perform'
        },
        material: {
          type: 'string',
          description: 'Terrain material (e.g. Grass, Rock, Water)'
        },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' }
          },
          required: ['x', 'y', 'z']
        },
        size: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' }
          },
          required: ['x', 'y', 'z']
        },
        shape: {
          type: 'string',
          enum: ['block', 'cylinder'],
          description: 'Shape for filling (default: block)'
        }
      },
      required: ['action', 'position', 'size']
    }
  },
  {
    name: 'control_lighting',
    category: 'write',
    description: 'Manage Studio lighting, atmosphere, and environmental presets.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['set_property', 'set_atmosphere', 'apply_preset', 'get_state'],
          description: 'Action to perform'
        },
        property: {
          type: 'string',
          description: 'Lighting or Atmosphere property name'
        },
        value: {
          description: 'Property value'
        },
        preset: {
          type: 'string',
          enum: ['sunset', 'midnight', 'noon', 'rainy', 'foggy', 'space'],
          description: 'Environment preset'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'sync_project',
    category: 'write',
    description: 'Bidirectional synchronization between Studio scripts and local files.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['export_to_local', 'import_from_local', 'get_sync_status', 'watch_mode'],
          description: 'Action to perform'
        },
        local_path: {
          type: 'string',
          description: 'Absolute local file system path'
        },
        instance_path: {
          type: 'string',
          description: 'Studio instance path (e.g. game.ServerScriptService)'
        }
      },
      required: ['action', 'local_path']
    }
  },
  {
    name: 'control_audio_animation',
    category: 'write',
    description: 'Manage sounds and animations in Roblox Studio.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: [
            'insert_sound', 'set_sound_properties', 'play_sound', 'stop_sound',
            'insert_animator', 'load_animation', 'list_animations'
          ],
          description: 'Action to perform'
        },
        target_path: {
          type: 'string',
          description: 'Parent path for the sound or animation'
        },
        sound_id: {
          type: 'string',
          description: 'Roblox sound ID'
        },
        animation_id: {
          type: 'string',
          description: 'Roblox animation ID'
        },
        properties: {
          type: 'object',
          description: 'Additional properties (Volume, Pitch, etc.)'
        }
      },
      required: ['action', 'target_path']
    }
  },

  // === Remote Event Monitor ===
  {
    name: 'monitor_remotes',
    category: 'read',
    description: 'Monitor RemoteEvent and RemoteFunction activity',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['list_remotes', 'log_fires', 'stop_logging', 'get_logs'],
          description: 'Action to perform'
        },
        remote_path: {
          type: 'string',
          description: 'Optional: Target a specific remote'
        },
        duration_seconds: {
          type: 'number',
          description: 'Optional: Duration to log for'
        }
      },
      required: ['action']
    }
  },

  // === Script Dependency Mapper ===
  {
    name: 'map_dependencies',
    category: 'read',
    description: 'Map require() dependencies between scripts',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['get_dependencies', 'get_dependents', 'build_full_map', 'find_circular'],
          description: 'Action to perform'
        },
        script_path: {
          type: 'string',
          description: 'Script instance path'
        }
      },
      required: ['action']
    }
  },

  // === Variable Leak Finder ===
  {
    name: 'find_variable_leaks',
    category: 'read',
    description: 'Find global variable leaks (missing local keyword) in scripts',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['scan_script', 'scan_all', 'suggest_fixes'],
          description: 'Action to perform'
        },
        script_path: {
          type: 'string',
          description: 'Script instance path'
        }
      },
      required: ['action']
    }
  },

  // === Anti-Cheat Scanner ===
  {
    name: 'scan_anticheat',
    category: 'read',
    description: 'Scan scripts for suspicious patterns or exploit vulnerabilities',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['scan_suspicious', 'scan_exploits', 'get_report'],
          description: 'Action to perform'
        },
        target_path: {
          type: 'string',
          description: 'Optional: Subtree to scan'
        }
      },
      required: ['action']
    }
  },

  // === Auto Placer ===
  {
    name: 'auto_place',
    category: 'write',
    description: 'Procedurally place objects in grids, patterns, or scattered regions',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['scatter', 'place_in_grid', 'place_along_path', 'align_to_surface'],
          description: 'Action to perform'
        },
        source_path: {
          type: 'string',
          description: 'Path to the object to duplicate'
        },
        target_region: {
          type: 'object',
          properties: {
            position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } } },
            size: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } } }
          }
        },
        count: { type: 'number' },
        spacing: { type: 'number' },
        waypoints: { type: 'array', items: { type: 'object' } }
      },
      required: ['action']
    }
  },

  // === Mirror Tool ===
  {
    name: 'mirror_instances',
    category: 'write',
    description: 'Mirror parts or models across an axis',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['mirror_x', 'mirror_y', 'mirror_z', 'mirror_and_weld'],
          description: 'Action to perform'
        },
        paths: { type: 'array', items: { type: 'string' } },
        pivot: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } }
        }
      },
      required: ['action', 'paths']
    }
  },

  // === Grid Snapper ===
  {
    name: 'snap_to_grid',
    category: 'write',
    description: 'Snap objects to position or rotation grids',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['snap_selection', 'snap_path', 'snap_rotation', 'set_grid_size'],
          description: 'Action to perform'
        },
        paths: { type: 'array', items: { type: 'string' } },
        grid_size: { type: 'number' },
        rotation_snap: { type: 'number' }
      },
      required: ['action']
    }
  },

  // === Decal & Texture Painter ===
  {
    name: 'paint_surfaces',
    category: 'write',
    description: 'Apply decals and textures to part surfaces',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['apply_decal', 'apply_texture', 'remove_decals', 'paint_all_faces'],
          description: 'Action to perform'
        },
        target_path: { type: 'string' },
        decal_id: { type: 'string' },
        texture_id: { type: 'string' },
        faces: { type: 'array', items: { type: 'string' } },
        studs_u: { type: 'number' },
        studs_v: { type: 'number' }
      },
      required: ['action', 'target_path']
    }
  },

  // === Changelog Tracker ===
  {
    name: 'track_changes',
    category: 'read',
    description: 'Track and export a history of MCP tool operations',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['start_tracking', 'stop_tracking', 'get_changelog', 'save_changelog', 'clear_changelog'],
          description: 'Action to perform'
        },
        file_path: { type: 'string' }
      },
      required: ['action']
    }
  },

  // === Backup Manager ===
  {
    name: 'manage_backups',
    category: 'write',
    description: 'Create and restore game state backups',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['create_backup', 'list_backups', 'restore_backup', 'auto_backup'],
          description: 'Action to perform'
        },
        backup_name: { type: 'string' },
        confirm: { type: 'boolean' },
        interval: { type: 'number' }
      },
      required: ['action']
    }
  },

  // === Comment Inserter ===
  {
    name: 'insert_comments',
    category: 'write',
    description: 'Auto-generate or strip script comments',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['comment_script', 'comment_functions', 'comment_all', 'remove_comments'],
          description: 'Action to perform'
        },
        script_path: { type: 'string' },
        author_name: { type: 'string' }
      },
      required: ['action']
    }
  },

  // === Naming Convention Fixer ===
  {
    name: 'fix_naming',
    category: 'write',
    description: 'Enforce naming conventions (PascalCase, camelCase, snake_case)',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['rename_to_pascal', 'rename_to_camel', 'rename_to_snake', 'find_bad_names', 'preview_renames'],
          description: 'Action to perform'
        },
        target_path: { type: 'string' },
        convention: { type: 'string' },
        dry_run: { type: 'boolean' }
      },
      required: ['action', 'target_path']
    }
  },

  // === Cutscene Builder ===
  {
    name: 'build_cutscene',
    category: 'write',
    description: 'Create and preview camera cutscenes',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['create_keyframe', 'list_keyframes', 'preview_cutscene', 'export_cutscene', 'clear_cutscene'],
          description: 'Action to perform'
        },
        time_seconds: { type: 'number' },
        cframe: { type: 'object' },
        fov: { type: 'number' },
        tween_style: { type: 'string' }
      },
      required: ['action']
    }
  },


  // === Physics Simulator ===
  {
    name: 'simulate_physics',
    category: 'read',
    description: 'Run physics simulations and stability checks',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['preview_fall', 'check_stability', 'get_mass', 'find_unanchored', 'anchor_all'],
          description: 'Action to perform'
        },
        target_path: { type: 'string' },
        duration_seconds: { type: 'number' }
      },
      required: ['action']
    }
  },

  // === Advanced Generation ===
  {
    name: 'generate_script',
    category: 'write',
    description: 'Smart script generator for boilerplate and common patterns',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['generate_module', 'generate_service', 'generate_handler', 'generate_datastore'],
          description: 'Action to perform'
        },
        script_name: {
          type: 'string',
          description: 'Name for the new script'
        },
        parent_path: {
          type: 'string',
          description: 'Where to create the script'
        },
        author_name: {
          type: 'string',
          description: 'Name to include in the header'
        }
      },
      required: ['action', 'script_name', 'parent_path']
    }
  },

  // === Advanced Analysis ===
  {
    name: 'diff_instances',
    category: 'read',
    description: 'Compare instances and properties for differences',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['compare_two', 'compare_to_default', 'find_modified', 'export_diff'],
          description: 'Action to perform'
        },
        path_a: {
          type: 'string',
          description: 'First instance path'
        },
        path_b: {
          type: 'string',
          description: 'Second instance path'
        },
        target_path: {
          type: 'string',
          description: 'Subtree to scan for find_modified'
        },
        include_children: {
          type: 'boolean',
          description: 'Recursively compare children'
        }
      },
      required: ['action']
    }
  },

  // === AI Integration ===
  {
    name: 'build_context',
    category: 'read',
    description: 'Build optimized context for AI prompt generation',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['get_full_context', 'get_script_context', 'get_selection_context', 'estimate_tokens'],
          description: 'Action to perform'
        },
        script_path: {
          type: 'string',
          description: 'Target script for get_script_context'
        },
        max_depth: {
          type: 'number',
          description: 'Max tree depth for context'
        },
        include_sources: {
          type: 'boolean',
          description: 'Whether to include script sources'
        }
      },
      required: ['action']
    }
  },

  // === Bulk Operations ===
  {
    name: 'batch_execute',
    category: 'write',
    description: 'Execute multiple tool calls in a single request. Runs sequentially, returns all results. Saves tokens by batching operations.',
    inputSchema: {
      type: 'object',
      properties: {
        operations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tool: { type: 'string', description: 'Tool name to execute' },
              params: { type: 'object', description: 'Parameters for the tool' }
            },
            required: ['tool']
          },
          description: 'List of tool calls to execute sequentially'
        }
      },
      required: ['operations']
    }
  },
  {
    name: 'bulk_get_scripts',
    category: 'read',
    description: 'Read multiple script sources in a single call. More token-efficient than calling get_script_source multiple times.',
    inputSchema: {
      type: 'object',
      properties: {
        scripts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Script instance path' },
              startLine: { type: 'number', description: 'Optional start line (1-indexed)' },
              endLine: { type: 'number', description: 'Optional end line (inclusive)' }
            },
            required: ['path']
          },
          description: 'List of scripts to read'
        }
      },
      required: ['scripts']
    }
  },
  {
    name: 'bulk_set_properties',
    category: 'write',
    description: 'Set different properties on different instances in a single call. More token-efficient than calling set_property multiple times.',
    inputSchema: {
      type: 'object',
      properties: {
        operations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Instance path' },
              property: { type: 'string', description: 'Property name' },
              value: { description: 'Property value (number, string, or object for Vector3/Color3/UDim2/CFrame)' }
            },
            required: ['path', 'property', 'value']
          },
          description: 'List of property changes to apply'
        }
      },
      required: ['operations']
    }
  },

  // === Multi-Place Management ===
  {
    name: 'manage_places',
    category: 'read',
    description: 'Manage multiple Roblox Studio places. List connected places, switch active place, get place info.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['list_places', 'get_active_place', 'switch_place', 'set_place_name'],
          description: 'Action to perform'
        },
        placeId: {
          type: 'number',
          description: 'Roblox PlaceId (for switch_place and set_place_name)'
        },
        placeName: {
          type: 'string',
          description: 'Friendly name for the place (for set_place_name)'
        }
      },
      required: ['action']
    }
  },

  // === UI Studio ===
  {
    name: 'build_ui',
    category: 'write',
    description: 'Create a complete UI hierarchy from a JSON tree. Single call creates ScreenGui, Frames, TextLabels, Buttons, etc. Supports UDim2, Color3, Vector2 properties.',
    inputSchema: {
      type: 'object',
      properties: {
        parent: {
          type: 'string',
          description: 'Parent instance path (e.g., game.StarterGui)'
        },
        ui: {
          type: 'object',
          description: 'UI tree structure. Each node has: class (required), name, properties, children (array of child nodes)',
          properties: {
            class: { type: 'string', description: 'Roblox UI class (ScreenGui, Frame, TextLabel, TextButton, ImageLabel, etc.)' },
            name: { type: 'string', description: 'Instance name' },
            properties: { type: 'object', description: 'Properties to set (Size, Position, BackgroundColor3, etc.)' },
            children: { type: 'array', description: 'Child UI elements (nested same structure)' }
          },
          required: ['class']
        }
      },
      required: ['parent', 'ui']
    }
  },
  {
    name: 'capture_ui',
    category: 'read',
    description: 'Capture a screenshot of the current game UI for preview. Returns base64 image data.',
    inputSchema: {
      type: 'object',
      properties: {
        width: { type: 'number', description: 'Image width (default: 1920)' },
        height: { type: 'number', description: 'Image height (default: 1080)' }
      }
    }
  },
  {
    name: 'get_ui_templates',
    category: 'read',
    description: 'Get pre-built UI templates for common patterns (health_bar, inventory_grid, dialog_box, hotbar, scoreboard, notification). Returns JSON that can be passed to build_ui.',
    inputSchema: {
      type: 'object',
      properties: {
        template: {
          type: 'string',
          enum: ['health_bar', 'inventory_grid', 'dialog_box', 'hotbar', 'scoreboard', 'notification', 'all'],
          description: 'Template name or "all" for all templates'
        }
      },
      required: ['template']
    }
  },

  // === Bidirectional Sync ===
  {
    name: 'sync_project_enhanced',
    category: 'write',
    description: 'Bidirectional sync between Studio scripts and local files. Setup sync, detect changes, push to Studio, or pull to local.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['setup_sync', 'get_changes', 'sync_to_studio', 'sync_to_local', 'toggle_auto_sync'],
          description: 'Sync action to perform'
        },
        project_dir: { type: 'string', description: 'Local project directory path (for setup_sync)' },
        sync_roots: {
          type: 'array',
          items: { type: 'string' },
          description: 'Instance paths to sync (e.g., ["game.ServerScriptService", "game.ReplicatedStorage"])'
        },
        auto_sync: { type: 'boolean', description: 'Enable automatic sync on file changes' },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Instance paths to sync to Studio (for sync_to_studio)'
        },
        scripts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Instance paths to sync to local (for sync_to_local). Empty = all.'
        }
      },
      required: ['action']
    }
  },

  // === Test Report ===
  {
    name: 'generate_test_report',
    category: 'write',
    description: 'Run a playtest, collect logs and errors, generate a local test report file. Returns JSON summary and saves readable report to disk.',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['play', 'run'],
          description: 'Playtest mode (default: run)'
        },
        duration: {
          type: 'number',
          description: 'How long to run playtest in seconds before collecting results (default: 5)'
        },
        output_path: {
          type: 'string',
          description: 'Local file path to save report (default: ./test-report.json)'
        },
        test_name: {
          type: 'string',
          description: 'Name for this test run'
        }
      }
    }
  },

  // === UI Design Check ===
  {
    name: 'check_ui_design',
    category: 'read',
    description: 'Analyze existing UI in StarterGui. Check layout, readability, touch targets, safe areas, accessibility. Returns suggestions for improvement.',
    inputSchema: {
      type: 'object',
      properties: {
        instancePath: {
          type: 'string',
          description: 'UI root path to analyze (e.g., game.StarterGui.MyGui). If not specified, analyzes all of StarterGui.'
        },
        checks: {
          type: 'array',
          items: { type: 'string', enum: ['layout', 'readability', 'touch_targets', 'safe_areas', 'accessibility', 'all'] },
          description: 'Which checks to run (default: all)'
        }
      }
    }
  }
];

export const getReadOnlyTools = () => TOOL_DEFINITIONS.filter(t => t.category === 'read');
export const getAllTools = () => [...TOOL_DEFINITIONS];
