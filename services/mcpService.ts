import { FunctionDeclaration, Schema, Type } from "@google/genai";

// Simple JSON-RPC 2.0 Types
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class McpClient {
  private eventSource: EventSource | null = null;
  private postEndpoint: string | null = null;
  private isConnected: boolean = false;
  private requestId: number = 0;

  constructor(private sseUrl: string) {}

  /**
   * Connect to the MCP Server via SSE
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.eventSource = new EventSource(this.sseUrl);

        this.eventSource.onopen = () => {
          console.log("MCP: SSE Connection Opened");
        };

        this.eventSource.onerror = (err) => {
          console.error("MCP: SSE Connection Error", err);
          this.isConnected = false;
          // If we haven't connected yet, reject
          if (!this.postEndpoint) reject(new Error("Failed to connect to MCP SSE endpoint"));
        };

        // Listen for the 'endpoint' event which tells us where to POST messages
        this.eventSource.addEventListener("endpoint", async (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            // Handle relative or absolute URLs
            const baseUrl = new URL(this.sseUrl);
            this.postEndpoint = new URL(data, baseUrl).toString();
            console.log("MCP: Received POST endpoint:", this.postEndpoint);

            // Once we have the endpoint, we initialize the session
            await this.initialize();
            this.isConnected = true;
            resolve();
          } catch (e) {
            reject(e);
          }
        });

      } catch (e) {
        reject(e);
      }
    });
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
  }

  /**
   * Send JSON-RPC Initialization Handshake
   */
  private async initialize() {
    const response = await this.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {
        sampling: {},
      },
      clientInfo: {
        name: "TravelGenius",
        version: "1.0.0",
      },
    });

    // Send initialized notification
    await this.sendNotification("notifications/initialized");
    return response;
  }

  /**
   * Fetch available tools from MCP Server
   */
  async listTools(): Promise<FunctionDeclaration[]> {
    if (!this.isConnected || !this.postEndpoint) {
      throw new Error("MCP Client not connected");
    }

    const response = await this.sendRequest("tools/list", {});
    const mcpTools = response.tools || [];

    // Convert MCP Tools to Gemini FunctionDeclarations
    return mcpTools.map((tool: any) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema ? this.convertJsonSchemaToGeminiSchema(tool.inputSchema) : undefined,
    }));
  }

  /**
   * Call a specific tool on the MCP Server
   */
  async callTool(name: string, args: any): Promise<any> {
    if (!this.isConnected) throw new Error("MCP Client not connected");
    
    console.log(`MCP: Calling tool ${name} with`, args);
    const response = await this.sendRequest("tools/call", {
      name: name,
      arguments: args,
    });
    
    // MCP tool call returns { content: [ { type: 'text', text: '...' } ], isError: boolean }
    if (response.isError) {
        throw new Error(response.content?.[0]?.text || "Unknown MCP Tool Error");
    }

    // Extract text content result
    const textContent = response.content?.find((c: any) => c.type === 'text')?.text;
    return textContent ? JSON.parse(JSON.stringify(textContent)) : "Success"; 
  }

  /**
   * Helper: Send JSON-RPC Request via HTTP POST
   */
  private async sendRequest(method: string, params: any): Promise<any> {
    if (!this.postEndpoint) throw new Error("No POST endpoint established");

    this.requestId++;
    const payload: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: this.requestId,
      method,
      params,
    };

    const res = await fetch(this.postEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
        throw new Error(`MCP Transport Error: ${res.statusText}`);
    }

    const data: JsonRpcResponse = await res.json();
    if (data.error) {
      throw new Error(`MCP Protocol Error (${data.error.code}): ${data.error.message}`);
    }
    return data.result;
  }

  private async sendNotification(method: string, params: any = {}) {
    if (!this.postEndpoint) return;
    const payload: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: this.requestId++, // ID is optional for notifications but kept for structure
      method,
      params,
    };
    await fetch(this.postEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
  }

  /**
   * Helper: Convert standard JSON Schema (MCP) to Gemini Type Schema
   * Gemini uses a specific subset/naming for schemas (Type enum vs string 'type')
   */
  private convertJsonSchemaToGeminiSchema(schema: any): Schema {
    // Basic mapping, can be expanded
    const mapType = (t: string): Type => {
        switch(t) {
            case 'string': return Type.STRING;
            case 'number': return Type.NUMBER;
            case 'integer': return Type.INTEGER;
            case 'boolean': return Type.BOOLEAN;
            case 'array': return Type.ARRAY;
            case 'object': return Type.OBJECT;
            default: return Type.STRING;
        }
    };

    const newSchema: Schema = {
        type: mapType(schema.type),
        description: schema.description,
        nullable: schema.nullable
    };

    if (schema.type === 'object' && schema.properties) {
        newSchema.properties = {};
        for (const key in schema.properties) {
            newSchema.properties[key] = this.convertJsonSchemaToGeminiSchema(schema.properties[key]);
        }
        if (schema.required) {
            newSchema.required = schema.required;
        }
    }

    if (schema.type === 'array' && schema.items) {
        newSchema.items = this.convertJsonSchemaToGeminiSchema(schema.items);
    }

    if (schema.enum) {
        newSchema.enum = schema.enum;
    }

    return newSchema;
  }
}