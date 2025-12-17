export enum TravelStyle {
  RELAXED = '休闲度假',
  ADVENTURE = '户外探险',
  CULTURAL = '人文历史',
  FOODIE = '特种兵美食',
  PACKED = '网红打卡'
}

export type AIProvider = 'gemini' | 'openai';

export interface AppSettings {
  // General AI Settings
  provider: AIProvider;
  
  // Gemini Specific
  geminiApiKey: string;
  
  // OpenAI Specific
  openaiBaseUrl: string;
  openaiApiKey: string;
  openaiModel: string;

  // Crawler Settings
  crawlerUrl?: string; 

  // MCP Settings
  enableMcp: boolean;
  mcpEndpoint: string; // SSE Endpoint
  
  // Map Settings
  amapKey: string; // JS API Key
  amapSecurityCode?: string;
  amapWebServiceKey?: string; // Web Service Key for Amap MCP Tools
}

export interface DestinationItem {
  id: string;
  name: string;
}

export interface UserPreferences {
  destinations: DestinationItem[]; // Changed from single string to array
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  budget: string;
  travelers: number;
  style: string; // Changed from enum to string to allow custom input
  interests: string[];
  additionalRequirements: string; // New field
}

export interface Location {
  lat: number;
  lng: number;
  name: string;
  description?: string;
  address?: string;
}

export interface Activity {
  time: string;
  title: string;
  description: string;
  location: Location;
  costEstimate: string;
  category: 'sightseeing' | 'food' | 'transport' | 'hotel' | 'activity';
  confidenceScore: number; 
  source?: string; 
}

export interface DayPlan {
  day: number;
  date?: string; // New field for specific date display
  weatherForecast: string;
  activities: Activity[];
}

export interface Itinerary {
  tripTitle: string;
  summary: string;
  totalCostEstimate: string;
  days: DayPlan[];
  flightSuggestion: {
    airline: string;
    price: string;
    notes: string;
  };
  hotelSuggestion: {
    name: string;
    rating: string;
    pricePerNight: string;
    location: Location;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  isUpdating?: boolean;
}

export interface ProcessingLog {
  id: string;
  message: string;
  status: 'pending' | 'active' | 'completed';
  timestamp: number;
}