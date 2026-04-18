import React, { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from 'react-router-dom';
import {
  LayoutDashboard,
  Camera,
  Bell,
  Settings as SettingsIcon,
  Network,
  BarChart3,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Video,
  Eye,
  Clock,
  Zap,
  MapPin,
  Ship,
  Play,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Camera {
  id: number;
  camera_id: string;
  name: string;
  location: string | null;
  stream_url: string | null;
  enabled: boolean;
  is_demo: boolean;
  status: string;
  created_at: string;
}

interface Event {
  id: number;
  event_id: string;
  camera_id: number;
  object_class: string;
  confidence: number;
  direction: string | null;
  event_type: string;
  severity: string;
  created_at: string;
}

interface Rule {
  id: number;
  rule_id: string;
  name: string;
  camera_id: number | null;
  event_type: string;
  object_classes: string[];
  enabled: boolean;
  severity: string;
}

interface AnalyticsData {
  events_today: number;
  events_week: number;
  cameras_active: number;
  events_by_type: { type: string; count: number }[];
}

function Dashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [systemStatus, setSystemStatus] = useState<'online' | 'offline' | 'warning'>('online');

  useEffect(() => {
    fetch(`${API_URL}/api/analytics/overview`)
      .then((res) => res.json())
      .then(setAnalytics)
      .catch(console.error);

    fetch(`${API_URL}/api/events?limit=20`)
      .then((res) => res.json())
      .then(setEvents)
      .catch(console.error);

    fetch(`${API_URL}/api/cameras`)
      .then((res) => res.json())
      .then(setCameras)
      .catch(console.error);

    const interval = setInterval(() => {
      fetch(`${API_URL}/health`).then((res) => {
        if (res.ok) setSystemStatus('online');
      }).catch(() => setSystemStatus('offline'));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const todayEvents = events.filter(e => {
    const eventDate = new Date(e.created_at);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      default: return 'text-green-400';
    }
  };

  const getObjectIcon = (objClass: string) => {
    switch (objClass) {
      case 'ship': return <Ship size={16} />;
      default: return <Activity size={16} />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Port Surveillance</h1>
          <p className="text-gray-400">Real-time monitoring dashboard</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
          systemStatus === 'online' ? 'bg-green-900/30' : 'bg-red-900/30'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            systemStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`} />
          <span className={systemStatus === 'online' ? 'text-green-400' : 'text-red-400'}>
            {systemStatus === 'online' ? 'System Online' : 'System Offline'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 rounded-xl p-5 border border-blue-800/30">
          <div className="flex items-center justify-between mb-3">
            <Bell className="text-blue-400" size={24} />
            <span className="text-xs text-blue-400">Today</span>
          </div>
          <div className="text-4xl font-bold text-white">{analytics?.events_today || 0}</div>
          <div className="text-sm text-gray-400">Events detected</div>
        </div>

        <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 rounded-xl p-5 border border-purple-800/30">
          <div className="flex items-center justify-between mb-3">
            <BarChart3 className="text-purple-400" size={24} />
            <span className="text-xs text-purple-400">Week</span>
          </div>
          <div className="text-4xl font-bold text-white">{analytics?.events_week || 0}</div>
          <div className="text-sm text-gray-400">Total events</div>
        </div>

        <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 rounded-xl p-5 border border-green-800/30">
          <div className="flex items-center justify-between mb-3">
            <Video className="text-green-400" size={24} />
            <span className="text-xs text-green-400">Active</span>
          </div>
          <div className="text-4xl font-bold text-white">{analytics?.cameras_active || cameras.length}</div>
          <div className="text-sm text-gray-400">Cameras online</div>
        </div>

        <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/20 rounded-xl p-5 border border-orange-800/30">
          <div className="flex items-center justify-between mb-3">
            <AlertTriangle className="text-orange-400" size={24} />
            <span className="text-xs text-orange-400">Alerts</span>
          </div>
          <div className="text-4xl font-bold text-white">
            {events.filter(e => e.severity === 'high').length}
          </div>
          <div className="text-sm text-gray-400">High priority</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-800/50 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Clock size={20} className="text-blue-400" />
              Recent Activity
            </h2>
            <Link to="/events" className="text-sm text-blue-400 hover:text-blue-300">
              View all →
            </Link>
          </div>
          
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Activity size={48} className="mb-4 opacity-50" />
              <p>No events detected yet</p>
              <p className="text-sm">Monitoring incoming video streams...</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.slice(0, 10).map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      event.severity === 'high' ? 'bg-red-500/20' : 
                      event.severity === 'medium' ? 'bg-yellow-500/20' : 'bg-green-500/20'
                    }`}>
                      {getObjectIcon(event.object_class)}
                    </div>
                    <div>
                      <div className="text-white font-medium flex items-center gap-2">
                        {event.object_class}
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-600 text-gray-300">
                          {event.event_type}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        Camera #{event.camera_id} • {new Date(event.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${getSeverityText(event.severity)}`}>
                      {event.severity.toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {(event.confidence * 100).toFixed(0)}% confidence
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <Camera size={20} className="text-green-400" />
            Camera Status
          </h2>
          
          {cameras.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Camera size={32} className="mx-auto mb-3 opacity-50" />
              <p>No cameras configured</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cameras.slice(0, 5).map((camera) => (
                <div 
                  key={camera.id}
                  className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      camera.enabled ? 'bg-green-500' : 'bg-gray-500'
                    }`} />
                    <div>
                      <div className="text-white font-medium">{camera.name}</div>
                      <div className="text-sm text-gray-400 flex items-center gap-1">
                        <MapPin size={12} />
                        {camera.location || 'Unknown location'}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {camera.is_demo ? 'Demo' : 'Live'}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <Link 
            to="/cameras"
            className="block mt-4 text-center py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
          >
            Manage Cameras
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700">
          <h3 className="font-semibold text-white mb-3">Events by Type (Last 7 Days)</h3>
          <div className="flex flex-wrap gap-2">
            {analytics?.events_by_type?.length === 0 ? (
              <p className="text-gray-500 text-sm">No data yet</p>
            ) : (
              analytics?.events_by_type?.map((item, i) => (
                <span 
                  key={i}
                  className="px-3 py-1 bg-gray-700 rounded-full text-sm text-gray-300"
                >
                  {item.type}: {item.count}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700">
          <h3 className="font-semibold text-white mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Link to="/rules" className="px-3 py-1 bg-purple-600/50 hover:bg-purple-600 rounded text-sm text-white">
              Configure Rules
            </Link>
            <Link to="/integrations" className="px-3 py-1 bg-blue-600/50 hover:bg-blue-600 rounded text-sm text-white">
              Integrations
            </Link>
            <Link to="/settings" className="px-3 py-1 bg-gray-600/50 hover:bg-gray-600 rounded text-sm text-white">
              Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Cameras() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newCamera, setNewCamera] = useState({
    camera_id: '',
    name: '',
    location: '',
    stream_url: '',
    fps_target: 10,
    is_demo: false,
  });

  useEffect(() => {
    fetch(`${API_URL}/api/cameras`)
      .then((res) => res.json())
      .then(setCameras)
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/cameras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCamera),
      });
      if (res.ok) {
        const created = await res.json();
        setCameras([...cameras, created]);
        setShowForm(false);
        setNewCamera({
          camera_id: '',
          name: '',
          location: '',
          stream_url: '',
          fps_target: 10,
          is_demo: false,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (cameraId: string) => {
    try {
      await fetch(`${API_URL}/api/cameras/${cameraId}`, { method: 'DELETE' });
      setCameras(cameras.filter((c) => c.camera_id !== cameraId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Cameras</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          {showForm ? 'Cancel' : 'Add Camera'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Camera ID</label>
              <input
                type="text"
                value={newCamera.camera_id}
                onChange={(e) => setNewCamera({ ...newCamera, camera_id: e.target.value })}
                className="w-full bg-gray-700 text-white rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <input
                type="text"
                value={newCamera.name}
                onChange={(e) => setNewCamera({ ...newCamera, name: e.target.value })}
                className="w-full bg-gray-700 text-white rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Location</label>
              <input
                type="text"
                value={newCamera.location}
                onChange={(e) => setNewCamera({ ...newCamera, location: e.target.value })}
                className="w-full bg-gray-700 text-white rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Stream URL (RTSP)</label>
              <input
                type="text"
                value={newCamera.stream_url}
                onChange={(e) => setNewCamera({ ...newCamera, stream_url: e.target.value })}
                className="w-full bg-gray-700 text-white rounded px-3 py-2"
                placeholder="rtsp://..."
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">FPS Target</label>
              <input
                type="number"
                value={newCamera.fps_target}
                onChange={(e) => setNewCamera({ ...newCamera, fps_target: parseInt(e.target.value) })}
                className="w-full bg-gray-700 text-white rounded px-3 py-2"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newCamera.is_demo}
                onChange={(e) => setNewCamera({ ...newCamera, is_demo: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm text-gray-400">Demo Mode</label>
            </div>
          </div>
          <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
            Create Camera
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cameras.map((camera) => (
          <div key={camera.id} className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${camera.enabled ? 'bg-green-500' : 'bg-red-500'}`} />
                <div className="text-white font-medium">{camera.name}</div>
              </div>
              <button
                onClick={() => handleDelete(camera.camera_id)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Delete
              </button>
            </div>
            <div className="text-sm text-gray-400 space-y-1">
              <p>ID: {camera.camera_id}</p>
              <p>{camera.location || 'No location'}</p>
              <p className={camera.is_demo ? 'text-blue-400' : 'text-green-400'}>
                {camera.is_demo ? 'Demo Mode' : 'Live Stream'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filter, setFilter] = useState({ camera_id: '', event_type: '' });

  useEffect(() => {
    let url = `${API_URL}/api/events?limit=100`;
    fetch(url)
      .then((res) => res.json())
      .then(setEvents)
      .catch(console.error);
  }, [filter]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Events</h1>

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="text-left p-3 text-gray-400">Time</th>
              <th className="text-left p-3 text-gray-400">Camera</th>
              <th className="text-left p-3 text-gray-400">Type</th>
              <th className="text-left p-3 text-gray-400">Object</th>
              <th className="text-left p-3 text-gray-400">Confidence</th>
              <th className="text-left p-3 text-gray-400">Severity</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-t border-gray-700">
                <td className="p-3 text-white">{new Date(event.created_at).toLocaleString()}</td>
                <td className="p-3 text-white">#{event.camera_id}</td>
                <td className="p-3 text-white">{event.event_type}</td>
                <td className="p-3 text-white">{event.object_class}</td>
                <td className="p-3 text-white">{(event.confidence * 100).toFixed(1)}%</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    event.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                    event.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {event.severity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Rules() {
  const [rules, setRules] = useState<Rule[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/api/rules`)
      .then((res) => res.json())
      .then(setRules)
      .catch(console.error);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Rules</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rules.map((rule) => (
          <div key={rule.id} className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="text-white font-medium">{rule.name}</div>
              <div className={`w-2 h-2 rounded-full ${rule.enabled ? 'bg-green-500' : 'bg-gray-500'}`} />
            </div>
            <div className="text-sm text-gray-400">
              <p>{rule.rule_id}</p>
              <p>Event: {rule.event_type}</p>
              <p>Objects: {rule.object_classes.join(', ')}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Integrations() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Integrations</h1>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Digifort VMS</h2>
        <p className="text-gray-400">Connect to Digifort for event notifications</p>
        <div className="mt-4 text-sm text-gray-500">
          HTTP Endpoint: POST /api/virtual-sensor
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">TCP Sensor</h2>
        <p className="text-gray-400">Port 8080 for TCP notifications</p>
      </div>
    </div>
  );
}

function LiveStreams() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [imgKey, setImgKey] = useState(0);

  const STREAM_API = 'http://localhost:8001';

  useEffect(() => {
    fetch(`${API_URL}/api/cameras`)
      .then((res) => res.json())
      .then(setCameras)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (cameras.length > 0 && !selectedCamera) {
      setSelectedCamera(cameras[0]);
    }
  }, [cameras]);

  useEffect(() => {
    if (selectedCamera && selectedCamera.stream_url && !selectedCamera.is_demo) {
      fetch(`${STREAM_URL}/api/streams/${selectedCamera.camera_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rtsp_url: selectedCamera.stream_url })
      }).catch(console.error);
    }
  }, [selectedCamera]);

  useEffect(() => {
    if (selectedCamera && !selectedCamera.is_demo) {
      const interval = setInterval(() => {
        setImgKey(k => k + 1);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [selectedCamera]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Video className="text-blue-400" />
          Live Streams
        </h1>
        <div className="text-sm text-gray-400">
          {cameras.length} camera{cameras.length !== 1 ? 's' : ''} active
        </div>
      </div>

      {cameras.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Video size={64} className="mb-4 opacity-50" />
          <p className="text-xl">No cameras configured</p>
          <Link to="/cameras" className="mt-4 text-blue-400 hover:text-blue-300">
            Add a camera →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 bg-black rounded-xl overflow-hidden border border-gray-700 aspect-video">
            {selectedCamera ? (
              <div className="relative w-full h-full">
                {selectedCamera.is_demo ? (
                  <div className="flex items-center justify-center h-full bg-gray-900">
                    <div className="text-center">
                      <Video size={64} className="mx-auto mb-4 text-gray-600" />
                      <p className="text-white text-lg">{selectedCamera.name}</p>
                      <p className="text-gray-500 text-sm mt-2">Demo Mode - No live video</p>
                    </div>
                  </div>
                ) : (
                  <img
                    key={imgKey}
                    src={`${STREAM_API}/api/streams/${selectedCamera.camera_id}/frame.jpg?t=${imgKey}`}
                    alt={selectedCamera.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-white text-sm bg-black/50 px-2 py-1 rounded">Live</span>
                </div>
                <div className="absolute bottom-4 left-4 text-white text-sm bg-black/50 px-2 py-1 rounded">
                  {selectedCamera.name}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Select a camera to view
              </div>
            )}
          </div>

          <div className="space-y-2">
            {cameras.map((camera) => (
              <button
                key={camera.id}
                onClick={() => setSelectedCamera(camera)}
                className={`w-full p-3 rounded-lg text-left transition-colors ${
                  selectedCamera?.id === camera.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${camera.enabled ? 'bg-green-500' : 'bg-gray-500'}`} />
                  <span className="font-medium truncate">{camera.name}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {camera.is_demo ? 'Demo' : 'Live'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <h3 className="font-semibold text-white mb-2">Stream Information</h3>
        {selectedCamera && (
          <div className="text-sm text-gray-400 space-y-1">
            <p><span className="text-gray-500">Camera ID:</span> {selectedCamera.camera_id}</p>
            <p><span className="text-gray-500">Location:</span> {selectedCamera.location || 'Unknown'}</p>
            <p><span className="text-gray-500">Status:</span> {selectedCamera.enabled ? 'Online' : 'Offline'}</p>
            <p><span className="text-gray-500">Mode:</span> {selectedCamera.is_demo ? 'Demo' : 'Production'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SystemSettings() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <div className="bg-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">System Configuration</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Demo Mode</label>
            <input type="checkbox" className="w-4 h-4" defaultChecked />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">YOLO Model</label>
            <select className="w-full bg-gray-700 text-white rounded px-3 py-2" defaultValue="yolov8n">
              <option value="yolov8n">YOLOv8Nano</option>
              <option value="yolov8s">YOLOv8Small</option>
            </select>
          </div>
        </div>

        <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
          Save Settings
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Health</h2>
        <div className="flex items-center gap-2 text-green-500">
          <CheckCircle size={20} />
          <span>All services operational</span>
        </div>
      </div>
    </div>
  );
}

function Sidebar() {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/streams', icon: Play, label: 'Live Streams' },
    { path: '/cameras', icon: Camera, label: 'Cameras' },
    { path: '/events', icon: Bell, label: 'Events' },
    { path: '/rules', icon: Shield, label: 'Rules' },
    { path: '/integrations', icon: Network, label: 'Integrations' },
    { path: '/settings', icon: SettingsIcon, label: 'Settings' },
  ];

  return (
    <div className="w-64 bg-gray-900 min-h-screen p-4 border-r border-gray-800">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Ship className="text-blue-400" />
          Port Vision
        </h1>
        <p className="text-sm text-gray-400">AI Surveillance</p>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              location.pathname === item.path
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
        <div className="text-xs text-gray-500">
          v1.0.0 • Port Surveillance AI
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex bg-gray-900 min-h-screen">
        <Sidebar />
        <div className="flex-1 bg-gray-900 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/streams" element={<LiveStreams />} />
            <Route path="/cameras" element={<Cameras />} />
            <Route path="/events" element={<Events />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/settings" element={<SystemSettings />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}