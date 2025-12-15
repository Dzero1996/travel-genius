import React, { useEffect, useRef, useState } from 'react';
import { Itinerary, Activity, AppSettings } from '../types';
import { Loader2, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';

interface MapComponentProps {
  itinerary: Itinerary | null;
  selectedDay: number;
  settings: AppSettings;
}

declare global {
  interface Window {
    AMap: any;
    _AMapSecurityConfig: any;
  }
}

const MapComponent: React.FC<MapComponentProps> = ({ itinerary, selectedDay, settings }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Manual Script Loader Strategy
  // We use this instead of @amap/amap-jsapi-loader because in some sandboxed iframes (like Google IDX),
  // AMap throws a SecurityError when accessing window.top. The official loader catches this and rejects.
  // However, often the AMap global object IS created despite the error. 
  // We poll for window.AMap to be resilient.
  useEffect(() => {
    if (!settings.amapKey) {
        setStatus('idle');
        return;
    }

    // If AMap is already loaded and key matches, reuse it
    if (window.AMap && mapInstanceRef.current) {
        renderItinerary();
        return;
    }

    setStatus('loading');
    setErrorMessage('');

    let isMounted = true;
    let pollInterval: any = null;

    const loadMap = async () => {
        // 1. Setup Security Config (Crucial for newer AMap versions)
        window._AMapSecurityConfig = {
            securityJsCode: settings.amapSecurityCode || '',
        };

        // 2. Check if script exists, if not inject it
        if (!document.getElementById('amap-manual-script')) {
            const script = document.createElement('script');
            script.id = 'amap-manual-script';
            script.type = 'text/javascript';
            script.async = true;
            // Add callback to URL although we rely on polling mostly
            script.src = `https://webapi.amap.com/maps?v=2.0&key=${settings.amapKey}&plugin=AMap.ToolBar,AMap.Scale,AMap.MoveAnimation`;
            
            // We ignore script.onerror here because SecurityError might trigger it 
            // even if the script successfully defined window.AMap
            
            document.head.appendChild(script);
        }

        // 3. Poll for AMap Object
        // This bypasses the "Script error" / "SecurityError" causing promise rejection
        let attempts = 0;
        const maxAttempts = 50; // 10 seconds (50 * 200ms)

        pollInterval = setInterval(() => {
            if (window.AMap && window.AMap.Map) {
                clearInterval(pollInterval);
                if (isMounted) {
                    setStatus('success');
                    initMap();
                }
            } else {
                attempts++;
                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    if (isMounted) {
                         // Check if it's likely the specific SecurityError
                         setStatus('error');
                         setErrorMessage("地图加载超时。\n当前环境（如预览沙箱）可能限制了地图组件的权限。");
                    }
                }
            }
        }, 200);
    };

    loadMap();

    return () => {
        isMounted = false;
        if (pollInterval) clearInterval(pollInterval);
    };
  }, [settings.amapKey, settings.amapSecurityCode]);

  // Initialize Map Instance
  const initMap = () => {
      if (!mapContainerRef.current || !window.AMap) return;
      
      try {
          // If map already exists, clear it
          if (mapInstanceRef.current) {
             // mapInstanceRef.current.destroy(); // Destroying causes issues in React strict mode re-renders
             mapInstanceRef.current.clearMap();
          } else {
              const map = new window.AMap.Map(mapContainerRef.current, {
                  zoom: 11,
                  center: [116.397428, 39.90923],
                  viewMode: '2D',
                  resizeEnable: true
              });
              
              map.on('complete', () => {
                  console.log("Map Loaded Successfully");
              });

              if (window.AMap.ToolBar) map.addControl(new window.AMap.ToolBar());
              if (window.AMap.Scale) map.addControl(new window.AMap.Scale());

              mapInstanceRef.current = map;
          }
          
          renderItinerary();
      } catch (e: any) {
          console.error("Init Map Instance Failed", e);
          setStatus('error');
          setErrorMessage(`地图渲染失败: ${e.message}`);
      }
  };

  // Handle Itinerary Updates
  useEffect(() => {
    if (mapInstanceRef.current && status === 'success') {
        renderItinerary();
    }
  }, [itinerary, selectedDay, status]);

  const renderItinerary = () => {
    if (!mapInstanceRef.current || !window.AMap || !itinerary) return;

    const AMap = window.AMap;
    const map = mapInstanceRef.current;

    map.clearMap();
    markersRef.current = [];

    const activeActivities: Activity[] = [];
    itinerary.days.forEach(d => {
        if (selectedDay === 0 || d.day === selectedDay) {
            activeActivities.push(...d.activities);
        }
    });

    // 1. Plot Hotel
    if (itinerary.hotelSuggestion?.location) {
         const { lat, lng, name } = itinerary.hotelSuggestion.location;
         if (lat && lng) {
            const content = `
                <div style="position: relative; display: flex; justify-content: center;">
                   <div style="background-color: #4f46e5; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">H</div>
                   <div style="position: absolute; bottom: -4px; width: 8px; height: 8px; background-color: #4f46e5; transform: rotate(45deg);"></div>
                </div>
            `;
            const marker = new AMap.Marker({
                position: [lng, lat],
                content: content,
                offset: new AMap.Pixel(-16, -32),
                title: name,
                zIndex: 100
            });
            
            marker.setLabel({
                offset: new AMap.Pixel(0, -5),  
                content: `<div style="padding: 2px 5px; background: white; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.2); font-size: 10px;">${name}</div>`,  
                direction: 'top' 
            });
            
            map.add(marker);
            markersRef.current.push(marker);
         }
    }

    // 2. Plot Activities
    const path: any[] = [];
    activeActivities.forEach((act, index) => {
        if(act.location?.lat && act.location?.lng) {
            const { lat, lng } = act.location;
            const position = [lng, lat];
            path.push(position);

            const color = act.category === 'food' ? '#f97316' : '#14b8a6';
            const content = `
                <div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    ${index + 1}
                </div>
            `;

            const marker = new AMap.Marker({
                position: position,
                content: content,
                offset: new AMap.Pixel(-12, -12),
                title: act.title,
                zIndex: 50
            });

            marker.on('click', () => {
                const infoWindow = new AMap.InfoWindow({
                    content: `
                        <div style="font-size:12px; padding:4px; color:black; min-width: 150px;">
                            <div style="font-weight:bold; margin-bottom: 2px;">${act.title}</div>
                            <div style="color:#666; margin-bottom: 2px;">${act.time}</div>
                            <div style="font-size: 10px; color: #888;">${act.category === 'food' ? '美食' : '景点'}</div>
                        </div>
                    `,
                    offset: new AMap.Pixel(0, -15)
                });
                infoWindow.open(map, marker.getPosition());
            });

            map.add(marker);
            markersRef.current.push(marker);
        }
    });

    // 3. Draw Line
    if (path.length > 1) {
        const polyline = new AMap.Polyline({
            path: path,
            isOutline: true,
            outlineColor: '#fff',
            borderWeight: 2,
            strokeColor: "#0f766e", 
            strokeOpacity: 0.8,
            strokeWeight: 4,
            strokeStyle: "dashed",
            strokeDasharray: [8, 4],
            lineJoin: 'round',
            lineCap: 'round',
            zIndex: 40,
        });
        map.add(polyline);
    }

    // 4. Fit View
    if (markersRef.current.length > 0) {
        map.setFitView(null, false, [60, 60, 60, 60]);
    }
  };

  if (!settings.amapKey) {
      return (
          <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-slate-100 text-slate-500 rounded-lg border-2 border-dashed border-slate-300">
              <div className="text-center p-4">
                  <p className="font-bold mb-1">地图未配置</p>
                  <p className="text-xs">请点击右上角"设置"填写高德地图 Key (Web JS API)</p>
              </div>
          </div>
      )
  }

  return (
    <div className="w-full h-full min-h-[400px] relative rounded-xl overflow-hidden shadow-inner bg-slate-200">
        {status === 'loading' && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-100/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2 text-teal-600">
                    <Loader2 className="animate-spin" size={24} />
                    <span className="text-sm font-medium">地图服务连接中...</span>
                </div>
            </div>
        )}
        
        {status === 'error' && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-red-50/90 backdrop-blur-sm p-6">
                <div className="flex flex-col items-center gap-2 text-red-600 text-center">
                    <AlertTriangle size={32} />
                    <span className="font-bold">加载失败</span>
                    <span className="text-xs text-red-500 whitespace-pre-line max-w-xs leading-relaxed">{errorMessage}</span>
                    <div className="text-[10px] text-red-400 mt-2 p-2 bg-red-100 rounded border border-red-200 text-left w-full">
                        <strong>报错详情：</strong>
                        <p className="mb-1">SecurityError: Blocked a frame from accessing a cross-origin frame.</p>
                        <p>原因：您可能正在受限的预览环境(Sandbox)中运行。该环境禁止高德地图脚本访问父窗口进行安全校验。</p>
                    </div>
                    <button 
                        onClick={() => window.open(window.location.href, '_blank')}
                        className="mt-4 px-4 py-2 bg-white border border-red-200 rounded text-xs hover:bg-red-50 flex items-center gap-1 shadow-sm"
                    >
                        <ExternalLink size={12}/> 在新窗口打开尝试
                    </button>
                     <button 
                        onClick={() => window.location.reload()}
                        className="mt-2 px-4 py-2 bg-transparent text-slate-500 rounded text-xs hover:text-slate-700 flex items-center gap-1"
                    >
                        <RefreshCw size={12}/> 刷新页面
                    </button>
                </div>
            </div>
        )}

        <div ref={mapContainerRef} className="w-full h-full z-10" />
    </div>
  );
};

export default MapComponent;