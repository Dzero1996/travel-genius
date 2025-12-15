import { GoogleGenAI, Schema, Type } from "@google/genai";
import { UserPreferences, Itinerary, AppSettings } from "../types";

// Helper: Clean JSON
const cleanJsonString = (str: string) => {
  return str.replace(/^```json\s*/, '').replace(/\s*```$/, '');
};

// 1. Definition of the Crawler Interface (Simulating connection to the Python backend)
async function fetchFromCrawler(url: string, destination: string): Promise<string> {
    try {
        // In a real scenario, this hits the deployed `little_red_book` Python API
        const response = await fetch(`${url}/search?keyword=${encodeURIComponent(destination + " 旅游攻略")}`);
        if (!response.ok) return "";
        const data = await response.json();
        return JSON.stringify(data).slice(0, 5000); // Limit context window
    } catch (e) {
        console.warn("Crawler connection failed, falling back to internal knowledge", e);
        return "";
    }
}

// 2. Gemini Schema Definition
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

// 3. Test Connection Function
export const testAIConnection = async (settings: AppSettings): Promise<{success: boolean, message: string}> => {
  try {
    if (settings.provider === 'gemini') {
      if (!settings.geminiApiKey) return { success: false, message: "请输入 Gemini API Key" };
      const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });
      await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Hello",
      });
      return { success: true, message: "Gemini 连接成功！" };
    } else {
      if (!settings.openaiApiKey) return { success: false, message: "请输入 OpenAI API Key" };
      const response = await fetch(`${settings.openaiBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.openaiApiKey}`
          },
          body: JSON.stringify({
            model: settings.openaiModel || "gpt-3.5-turbo",
            messages: [{ role: "user", content: "Hello" }],
            max_tokens: 5
          })
      });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || response.statusText);
      }
      return { success: true, message: "OpenAI 接口连接成功！" };
    }
  } catch (e: any) {
    return { success: false, message: `连接失败: ${e.message}` };
  }
};

// 4. Main Generator Function
export const generateItinerary = async (prefs: UserPreferences, settings: AppSettings): Promise<Itinerary> => {
  
  // -- Strategy 1: External Crawler Data Injection --
  let crawlerData = "";
  if (settings.crawlerUrl) {
      crawlerData = await fetchFromCrawler(settings.crawlerUrl, prefs.destination);
  }

  const systemPrompt = `
    你是一个基于大数据的智能旅游规划 Agent。
    用户需要去 ${prefs.destination} 旅行 ${prefs.duration} 天。
    
    【核心任务】：
    1. 你必须扮演"小红书 (XiaoHongShu)"资深博主，规划必须包含"网红打卡"、"避雷指南"、"本地人推荐"。
    2. 如果有提供爬虫数据，优先参考爬虫数据。如果没有，请利用你的搜索能力获取最新信息。
    3. 每个地点必须提供经纬度(lat, lng)，用于高德地图展示。
    4. 预算: ${prefs.budget}，人数: ${prefs.travelers}，风格: ${prefs.style}，兴趣: ${prefs.interests.join(", ")}。
  `;

  // -- Provider: Google Gemini --
  if (settings.provider === 'gemini') {
      if (!settings.geminiApiKey) throw new Error("请配置 Gemini API Key");
      
      const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });
      
      // We use 'gemini-2.5-flash' combined with Google Search Tool to simulate the "Crawler"
      // because searching "site:xiaohongshu.com" yields real XHS results.
      const prompt = `
         请规划行程。
         ${crawlerData ? `参考这些真实爬取的小红书笔记数据: ${crawlerData}` : `请使用 Google Search 搜索 "site:xiaohongshu.com ${prefs.destination} 旅游攻略 避雷" 获取最新真实笔记。`}
         必须以 JSON 格式返回。
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: itinerarySchema,
            // Gemini Grounding: This effectively acts as our web crawler
            tools: [{ googleSearch: {} }] 
        }
      });
      
      const text = response.text;
      if (!text) throw new Error("Gemini 返回为空");
      return JSON.parse(text) as Itinerary;
  } 
  
  // -- Provider: OpenAI Compatible --
  else {
      if (!settings.openaiApiKey || !settings.openaiBaseUrl) throw new Error("请配置 OpenAI 参数");

      const prompt = `
        ${systemPrompt}
        
        ${crawlerData ? `【参考爬虫数据】: ${crawlerData}` : `请基于你掌握的互联网知识，模拟搜索小红书热门笔记。`}

        请严格按照以下 JSON 格式返回（不要Markdown代码块）：
        {
            "tripTitle": "...",
            "summary": "...",
            "totalCostEstimate": "...",
            "days": [ { "day": 1, "weatherForecast": "...", "activities": [ { "time": "...", "title": "...", "description": "...", "location": {"lat": 0.0, "lng": 0.0, "name": "...", "address": "..."}, "costEstimate": "...", "category": "food", "confidenceScore": 90, "source": "小红书" } ] } ],
            "flightSuggestion": {...},
            "hotelSuggestion": {...}
        }
      `;

      const response = await fetch(`${settings.openaiBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.openaiApiKey}`
          },
          body: JSON.stringify({
            model: settings.openaiModel || "gpt-3.5-turbo",
            messages: [
              { role: "system", content: "你是一个专业的旅游规划助手，只返回 JSON。" },
              { role: "user", content: prompt }
            ],
            temperature: 0.7,
            response_format: { type: "json_object" }
          })
      });

      if (!response.ok) {
         const err = await response.json();
         throw new Error(`OpenAI Error: ${err.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return JSON.parse(cleanJsonString(data.choices[0].message.content));
  }
};