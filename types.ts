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
  crawlerUrl?: string; // Optional: URL to the deployed python crawler (little_red_book)
  
  // Map Settings
  amapKey: string;
  amapSecurityCode?: string;
}

export interface UserPreferences {
  destination: string;
  duration: number;
  budget: string;
  travelers: number;
  style: TravelStyle;
  interests: string[];
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
  source?: string; // e.g., "小红书笔记"
}

export interface DayPlan {
  day: number;
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

export interface ProcessingLog {
  id: string;
  message: string;
  status: 'pending' | 'active' | 'completed';
  timestamp: number;
}