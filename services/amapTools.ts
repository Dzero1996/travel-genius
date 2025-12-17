import { FunctionDeclaration, Type } from "@google/genai";

// Define the tools available to the AI
export const AMAP_TOOLS: FunctionDeclaration[] = [
  {
    name: "amap_weather",
    description: "查询指定城市的实时天气或预报。当用户询问天气、气温、穿衣建议或进行行程规划时使用。",
    parameters: {
      type: Type.OBJECT,
      properties: {
        city: {
          type: Type.STRING,
          description: "城市名称，例如：'北京市', '上海', '成都'。"
        },
        extensions: {
            type: Type.STRING,
            description: "可选值: 'base' (实况) 或 'all' (预报)，默认为 'all'",
            enum: ['base', 'all']
        }
      },
      required: ["city"]
    }
  },
  {
    name: "amap_poi_search",
    description: "搜索特定城市的地点、景点、餐厅、酒店或设施信息。当需要查找具体位置、评分、地址或推荐地点时使用。",
    parameters: {
      type: Type.OBJECT,
      properties: {
        keywords: {
          type: Type.STRING,
          description: "搜索关键词，如 '故宫', '川菜', '五星级酒店'"
        },
        city: {
            type: Type.STRING,
            description: "城市名称，如 '北京'"
        }
      },
      required: ["keywords", "city"]
    }
  }
];

// Helper: Convert city name to adcode (needed for weather API)
async function getAdcode(cityName: string, key: string): Promise<string> {
    try {
        const url = `https://restapi.amap.com/v3/config/district?keywords=${encodeURIComponent(cityName)}&subdistrict=0&key=${key}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === '1' && data.districts && data.districts.length > 0) {
            return data.districts[0].adcode;
        }
    } catch (e) {
        console.error("Failed to get adcode", e);
    }
    return cityName; // Fallback to name if lookup fails, though weather API usually strictly needs adcode
}

// Execute the tools
export async function executeAmapTool(name: string, args: any, apiKey: string): Promise<string> {
    if (!apiKey) return "Error: Amap Web Service API Key (MCP Key) is not configured in settings.";

    const baseUrl = "https://restapi.amap.com/v3";
    
    try {
        if (name === "amap_weather") {
            const { city, extensions = 'all' } = args;
            
            // Weather API requires adcode, not name.
            let adcode = city;
            if (!/^\d+$/.test(city)) {
                 adcode = await getAdcode(city, apiKey);
            }

            const url = `${baseUrl}/weather/weatherInfo?city=${adcode}&extensions=${extensions}&key=${apiKey}`;
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.status === '1') {
                return JSON.stringify(data.forecasts || data.lives);
            }
            return JSON.stringify(data);
        }

        if (name === "amap_poi_search") {
            const { keywords, city } = args;
            // Place Text Search
            const url = `${baseUrl}/place/text?keywords=${encodeURIComponent(keywords)}&city=${encodeURIComponent(city)}&children=1&offset=10&page=1&extensions=all&key=${apiKey}`;
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.status === '1' && data.pois) {
                // Simplify output to save tokens
                const simplified = data.pois.map((p: any) => ({
                    name: p.name,
                    location: p.location, // lat,lng string
                    address: p.address,
                    type: p.type,
                    rating: p.biz_ext?.rating,
                    cost: p.biz_ext?.cost
                }));
                return JSON.stringify(simplified);
            }
            return JSON.stringify(data);
        }

        return `Error: Unknown tool name '${name}'`;
    } catch (e: any) {
        return `Error executing Amap tool ${name}: ${e.message}. Note: Browser may block direct calls to Amap Web API due to CORS if not proxied.`;
    }
}