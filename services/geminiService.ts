import { GoogleGenAI, Schema, Type, FunctionDeclaration, Content, Part } from "@google/genai";
import { UserPreferences, Itinerary, AppSettings } from "../types";
import { McpClient } from "./mcpService";
import { AMAP_TOOLS, executeAmapTool } from "./amapTools";

// Helper: Clean JSON
const cleanJsonString = (str: string) => {
  return str.replace(/^```json\s*/, '').replace(/\s*```$/, '');
};

// Helper: Calculate duration
const calculateDays = (start: string, end: string): number => {
    const d1 = new Date(start);
    const d2 = new Date(end);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
};

// 1. Crawler Interface
async function fetchFromCrawler(url: string, destination: string): Promise<string> {
    try {
        const response = await fetch(`${url}/search?keyword=${encodeURIComponent(destination + " 旅游攻略")}`);
        if (!response.ok) return "";
        const data = await response.json();
        return JSON.stringify(data).slice(0, 5000); 
    } catch (e) {
        console.warn("Crawler connection failed", e);
        return "";
    }
}

// 2. Schema Definition (Shared)
const itinerarySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    tripTitle: { type: Type.STRING },
    summary: { type: Type.STRING },
    totalCostEstimate: { type: Type.STRING },
    days: { 
      type: Type.ARRAY, 
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER },
          date: { type: Type.STRING, description: "YYYY-MM-DD" },
          weatherForecast: { type: Type.STRING },
          activities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                location: { 
                    type: Type.OBJECT, 
                    properties: { 
                        lat: {type: Type.NUMBER}, 
                        lng: {type: Type.NUMBER}, 
                        name: {type: Type.STRING},
                        address: {type: Type.STRING}
                    } 
                },
                costEstimate: { type: Type.STRING },
                category: { type: Type.STRING },
                confidenceScore: { type: Type.NUMBER },
                source: { type: Type.STRING }
              }
            }
          }
        }
      }
    },
    flightSuggestion: {
      type: Type.OBJECT,
      properties: { airline: { type: Type.STRING }, price: { type: Type.STRING }, notes: { type: Type.STRING } }
    },
    hotelSuggestion: {
      type: Type.OBJECT,
      properties: { 
          name: { type: Type.STRING }, 
          rating: { type: Type.STRING }, 
          pricePerNight: { type: Type.STRING },
          location: { 
            type: Type.OBJECT, 
            properties: { lat: {type: Type.NUMBER}, lng: {type: Type.NUMBER}, name: {type: Type.STRING} } 
          }
      }
    }
  }
};

// 3. Validation
export const validateAIConnection = async (settings: AppSettings): Promise<{success: boolean, message: string, models?: string[]}> => {
  try {
    if (settings.provider === 'gemini') {
      if (!settings.geminiApiKey) return { success: false, message: "请输入 Gemini API Key" };
      const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });
      await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Hi",
        config: { maxOutputTokens: 1 }
      });
      return { success: true, message: "Gemini Key 验证通过" };
    } else {
      if (!settings.openaiApiKey) return { success: false, message: "请输入 OpenAI API Key" };
      try {
          const response = await fetch(`${settings.openaiBaseUrl}/models`, {
              method: 'GET',
              headers: { 'Authorization': `Bearer ${settings.openaiApiKey}` }
          });
          if (response.ok) {
              const data = await response.json();
              if (data && Array.isArray(data.data)) {
                  const models = data.data.map((m: any) => m.id);
                  return { success: true, message: `连接成功，发现 ${models.length} 个模型`, models };
              }
          }
      } catch (e) {}
      
      const response = await fetch(`${settings.openaiBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.openaiApiKey}`
          },
          body: JSON.stringify({
            model: settings.openaiModel || "gpt-3.5-turbo",
            messages: [{ role: "user", content: "Hi" }],
            max_tokens: 1
          })
      });
      if (!response.ok) throw new Error("API Test Failed");
      return { success: true, message: "OpenAI 接口连接成功" };
    }
  } catch (e: any) {
    return { success: false, message: `连接失败: ${e.message}` };
  }
};

// 4. Test Gen
export const testAIGeneration = async (settings: AppSettings): Promise<{success: boolean, message: string}> => {
  try {
    const prompt = "请回复: Test OK";
    if (settings.provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      return { success: true, message: `Gemini 回复: ${response.text?.trim().slice(0, 20)}` };
    } else {
      const response = await fetch(`${settings.openaiBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.openaiApiKey}`
          },
          body: JSON.stringify({
            model: settings.openaiModel || "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 10
          })
      });
      const data = await response.json();
      return { success: true, message: `模型回复: ${data.choices?.[0]?.message?.content?.slice(0, 20)}` };
    }
  } catch (e: any) {
    return { success: false, message: `生成测试失败: ${e.message}` };
  }
};

// 5. Generate Itinerary (Main)
export const generateItinerary = async (prefs: UserPreferences, settings: AppSettings): Promise<Itinerary> => {
  const destinationStr = prefs.destinations.map(d => d.name).join('、');
  const duration = calculateDays(prefs.startDate, prefs.endDate);

  // Strategy 1: External Crawler
  let crawlerData = "";
  if (settings.crawlerUrl) {
      crawlerData = await fetchFromCrawler(settings.crawlerUrl, destinationStr);
  }

  // Strategy 2: MCP Tools Setup (External SSE)
  let mcpTools: FunctionDeclaration[] = [];
  let mcpClient: McpClient | null = null;
  let mcpStatusMsg = "";

  if (settings.enableMcp && settings.mcpEndpoint) {
      try {
          mcpClient = new McpClient(settings.mcpEndpoint);
          await mcpClient.connect();
          mcpTools = await mcpClient.listTools();
          mcpStatusMsg += `[External MCP] 已连接，加载了 ${mcpTools.length} 个外部工具。\n`;
      } catch (e) {
          console.error("MCP Setup Failed:", e);
          mcpStatusMsg += "[External MCP] 连接失败。\n";
      }
  }

  // Strategy 3: Built-in Amap MCP
  let builtInTools: FunctionDeclaration[] = [];
  if (settings.amapWebServiceKey) {
      builtInTools = AMAP_TOOLS;
      mcpStatusMsg += `[Built-in Amap MCP] 已启用高德地图工具 (天气、POI搜索)。\n`;
  }

  const systemPrompt = `
    你是一个智能旅游规划 Agent。
    行程信息：
    - 目的地: ${destinationStr} (如果是多个，请合理安排顺序)
    - 时间: ${prefs.startDate} 至 ${prefs.endDate} (共 ${duration} 天)
    - 预算: ${prefs.budget}
    - 人数: ${prefs.travelers}
    - 风格: ${prefs.style}
    - 兴趣: ${prefs.interests.join(", ")}
    - 额外要求: ${prefs.additionalRequirements || "无"}

    【核心规则】：
    1. 扮演"小红书"资深博主，包含网红打卡、避雷、本地推荐。
    2. 必须提供精确经纬度(lat, lng)适配高德地图。
    3. 如果是多目的地，请根据地理位置合理规划动线。
    4. 严格输出 JSON 格式。
    5. 若启用了工具，请积极调用工具查询天气、寻找真实POI信息，以确保行程真实性。
    ${mcpStatusMsg}
  `;

  if (settings.provider === 'gemini') {
      if (!settings.geminiApiKey) throw new Error("请配置 Gemini API Key");
      const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });
      
      const prompt = `请规划行程。${crawlerData ? `参考数据: ${crawlerData}` : `使用 Google Search 搜索 "site:xiaohongshu.com ${destinationStr} 旅游攻略 避雷"。`}`;

      // Build Tool Config
      const toolsConfig: any[] = [{ googleSearch: {} }];
      
      const allFunctionDecls = [...mcpTools, ...builtInTools];
      if (allFunctionDecls.length > 0) {
          toolsConfig.push({ functionDeclarations: allFunctionDecls });
      }

      // Initial Message
      const history: Content[] = [
         { role: 'user', parts: [{ text: prompt }] }
      ];

      // Interaction Loop (Model -> Tool -> Model -> Final)
      const maxTurns = 10;
      let finalItinerary: Itinerary | null = null;
      
      for (let i = 0; i < maxTurns; i++) {
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: history,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json", 
                responseSchema: itinerarySchema, 
                tools: toolsConfig
            }
        });

        const call = response.functionCalls?.[0]; // Check for tool calls
        
        if (call) {
            // 1. Add Model's Turn
            history.push(response.candidates[0].content);

            // 2. Execute Tool
            let toolResult = "";
            let toolName = call.name;

            // Handle Built-in Amap Tools
            if (toolName.startsWith("amap_")) {
                 toolResult = await executeAmapTool(toolName, call.args, settings.amapWebServiceKey || "");
            } 
            // Handle External MCP Tools
            else if (mcpClient) {
                try {
                    const result = await mcpClient.callTool(call.name, call.args);
                    toolResult = typeof result === 'string' ? result : JSON.stringify(result);
                } catch (err: any) {
                    toolResult = `Error executing external tool ${call.name}: ${err.message}`;
                }
            } else {
                toolResult = "Error: Tool not found or client not connected.";
            }

            // 3. Add Tool Response to History
            history.push({
                role: 'tool',
                parts: [{
                    functionResponse: {
                        name: call.name,
                        response: { result: toolResult }
                    }
                }]
            });
            
        } else {
            // No tool call, assume final answer (JSON)
            if (response.text) {
                try {
                    finalItinerary = JSON.parse(response.text) as Itinerary;
                    break; 
                } catch (e) {
                    console.warn("Failed to parse JSON", e);
                    throw new Error("Gemini returned invalid JSON");
                }
            } else {
               throw new Error("Gemini returned empty response");
            }
        }
      }

      if (mcpClient) mcpClient.disconnect();
      if (!finalItinerary) throw new Error("Failed to generate valid itinerary after multiple turns.");
      return finalItinerary;

  } else {
      // OpenAI Logic (Simplified - MCP not fully implemented for OpenAI path in this demo)
      if (!settings.openaiApiKey) throw new Error("请配置 OpenAI 参数");
      const prompt = `${systemPrompt}\n\n请返回符合 Schema 的 JSON。${crawlerData ? `参考: ${crawlerData}` : ''}`;

      const response = await fetch(`${settings.openaiBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.openaiApiKey}`
          },
          body: JSON.stringify({
            model: settings.openaiModel || "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            response_format: { type: "json_object" }
          })
      });

      if (!response.ok) throw new Error("OpenAI Error");
      const data = await response.json();
      return JSON.parse(cleanJsonString(data.choices[0].message.content));
  }
};

// 6. Modify Itinerary (Chat Mode)
export const modifyItinerary = async (
    currentItinerary: Itinerary, 
    userInstruction: string, 
    settings: AppSettings
): Promise<Itinerary> => {
    
    const contextPrompt = `
    【当前行程 JSON】：
    ${JSON.stringify(currentItinerary).slice(0, 20000)} ... (已省略部分)

    【用户修改指令】：
    "${userInstruction}"

    【任务】：
    1. 基于用户指令修改上述 JSON 数据。
    2. 保持 JSON 结构完全一致（TripTitle, Days, Activities 等）。
    3. 如果用户要求增加地点，请自行补充经纬度和描述。
    4. 只返回修改后的 JSON，不要任何废话。
    `;

    if (settings.provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contextPrompt,
            config: {
                systemInstruction: "你是一个专业的行程修改助手。只输出 JSON。",
                responseMimeType: "application/json",
                responseSchema: itinerarySchema
            }
        });
        if (!response.text) throw new Error("修改失败");
        return JSON.parse(response.text) as Itinerary;
    } else {
        const response = await fetch(`${settings.openaiBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${settings.openaiApiKey}`
            },
            body: JSON.stringify({
              model: settings.openaiModel || "gpt-4-turbo", // Use a smart model for modification
              messages: [{ role: "user", content: contextPrompt }],
              temperature: 0.5,
              response_format: { type: "json_object" }
            })
        });
        if (!response.ok) throw new Error("修改请求失败");
        const data = await response.json();
        return JSON.parse(cleanJsonString(data.choices[0].message.content));
    }
};