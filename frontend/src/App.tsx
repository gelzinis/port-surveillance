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
  Settings,
  Network,
  BarChart3,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
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

  useEffect(() => {
    fetch(`${API_URL}/api/analytics/overview`)
      .then((res) => res.json())
      .then(setAnalytics)
      .catch(console.error);

    fetch(`${API_URL}/api/events?limit=10`)
      .then((res) => res.json())
      .then(setEvents)
      .catch(console.error);

    fetch(`${API_URL}/api/cameras`)
      .then((res) => res.json())
      .then(setCameras)
      .catch(console.error);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      default:
        return 'text-green-500';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Events Today</div>
          <div className="text-3xl font-bold text-white">{analytics?.events_today || 0}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Events This Week</div>
          <div className="text-3xl font-bold text-white">{analytics?.events_week || 0}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Active Cameras</div>
          <div className="text-3xl font-bold text-white">{analytics?.cameras_active || 0}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">System Status</div>
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle size={20} />
            <span>Operational</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Events</h2>
          <div className="space-y-2">
            {events.length === 0 ? (
              <p className="text-gray-400">No events yet</p>
            ) : (
              events.slice(0, 5).map((event) => (
                <div key={event.id} className="flex items-center justify-between bg-gray-700 rounded p-3">
                  <div>
                    <div className="text-white font-medium">{event.event_type}</div>
                    <div className="text-sm text-gray-400">
                      {event.object_class} • {new Date(event.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className={getSeverityColor(event.severity)}>
                    {event.severity.toUpperCase()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-white mb-4">Camera Status</h2>
          <div className="space-y-2">
            {cameras.length === 0 ? (
              <p className="text-gray-400">No cameras configured</p>
            ) : (
              cameras.map((camera) => (
                <div key={camera.id} className="flex items-center justify-between bg-gray-700 rounded p-3">
                  <div>
                    <div className="text-white font-medium">{camera.name}</div>
                    <div className="text-sm text-gray-400">
                      {camera.camera_id} • {camera.location || 'N/A'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {camera.enabled ? (
                      <CheckCircle size={16} className="text-green-500" />
                    ) : (
                      <XCircle size={16} className="text-red-500" />
                    )}
                  </div>
                </div>
              ))
            )}
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
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
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

      <div className="space-y-2">
        {cameras.map((camera) => (
          <div key={camera.id} className="bg-gray-800 rounded-lg p-4 flex justify-between items-center">
            <div>
              <div className="text-white font-medium">{camera.name}</div>
              <div className="text-sm text-gray-400">
                ID: {camera.camera_id} • {camera.location || 'No location'} •{' '}
                {camera.is_demo ? 'Demo' : 'Live'}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {camera.enabled ? (
                <CheckCircle size={16} className="text-green-500" />
              ) : (
                <XCircle size={16} className="text-red-500" />
              )}
              <button
                onClick={() => handleDelete(camera.camera_id)}
                className="text-red-500 hover:text-red-400"
              >
                Delete
              </button>
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
    if (filter.camera_id) url += `&camera_id=${filter.camera_id}`;
    if (filter.event_type) url += `&event_type=${filter.event_type}`;
    fetch(url)
      .then((res) => res.json())
      .then(setEvents)
      .catch(console.error);
  }, [filter]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Events</h1>

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Filter by camera ID..."
          value={filter.camera_id}
          onChange={(e) => setFilter({ ...filter, camera_id: e.target.value })}
          className="bg-gray-800 text-white rounded px-3 py-2"
        />
        <input
          type="text"
          placeholder="Filter by event type..."
          value={filter.event_type}
          onChange={(e) => setFilter({ ...filter, event_type: e.target.value })}
          className="bg-gray-800 text-white rounded px-3 py-2"
        />
      </div>

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="text-left p-3 text-gray-400">Event ID</th>
              <th className="text-left p-3 text-gray-400">Type</th>
              <th className="text-left p-3 text-gray-400">Object</th>
              <th className="text-left p-3 text-gray-400">Confidence</th>
              <th className="text-left p-3 text-gray-400">Direction</th>
              <th className="text-left p-3 text-gray-400">Severity</th>
              <th className="text-left p-3 text-gray-400">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-t border-gray-700">
                <td className="p-3 text-white">{event.event_id}</td>
                <td className="p-3 text-white">{event.event_type}</td>
                <td className="p-3 text-white">{event.object_class}</td>
                <td className="p-3 text-white">{(event.confidence * 100).toFixed(1)}%</td>
                <td className="p-3 text-white">{event.direction || '-'}</td>
                <td className="p-3 text-white">{event.severity}</td>
                <td className="p-3 text-white">
                  {new Date(event.created_at).toLocaleString()}
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
  const [showForm, setShowForm] = useState(false);
  const [newRule, setNewRule] = useState({
    rule_id: '',
    name: '',
    event_type: 'object_detected',
    object_classes: ['ship', 'boat'],
    confidence_threshold: 0.5,
    cooldown_seconds: 60,
    severity: 'medium',
    enabled: true,
    take_snapshot: true,
  });

  useEffect(() => {
    fetch(`${API_URL}/api/rules`)
      .then((res) => res.json())
      .then(setRules)
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule),
      });
      if (res.ok) {
        const created = await res.json();
        setRules([...rules, created]);
        setShowForm(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Rules</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          {showForm ? 'Cancel' : 'Add Rule'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Rule ID</label>
              <input
                type="text"
                value={newRule.rule_id}
                onChange={(e) => setNewRule({ ...newRule, rule_id: e.target.value })}
                className="w-full bg-gray-700 text-white rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <input
                type="text"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                className="w-full bg-gray-700 text-white rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Event Type</label>
              <select
                value={newRule.event_type}
                onChange={(e) => setNewRule({ ...newRule, event_type: e.target.value })}
                className="w-full bg-gray-700 text-white rounded px-3 py-2"
              >
                <option value="object_detected">Object Detected</option>
                <option value="zone_entry">Zone Entry</option>
                <option value="line_crossing">Line Crossing</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Severity</label>
              <select
                value={newRule.severity}
                onChange={(e) => setNewRule({ ...newRule, severity: e.target.value })}
                className="w-full bg-gray-700 text-white rounded px-3 py-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
            Create Rule
          </button>
        </form>
      )}

      <div className="space-y-2">
        {rules.map((rule) => (
          <div key={rule.id} className="bg-gray-800 rounded-lg p-4 flex justify-between items-center">
            <div>
              <div className="text-white font-medium">{rule.name}</div>
              <div className="text-sm text-gray-400">
                {rule.rule_id} • {rule.event_type} • {rule.object_classes.join(', ')}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">{rule.severity}</span>
              {rule.enabled ? (
                <CheckCircle size={16} className="text-green-500" />
              ) : (
                <XCircle size={16} className="text-red-500" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Integrations() {
  const [digifortUrl, setDigifortUrl] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  const testConnection = async () => {
    try {
      const res = await fetch(`${API_URL}/api/integrations/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ digifort_url: digifortUrl }),
      });
      const data = await res.json();
      setTestResult(data.status);
    } catch (err) {
      setTestResult('error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Integrations</h1>

      <div className="bg-gray-800 rounded-lg p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">Digifort VMS Integration</h2>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Digifort URL</label>
          <input
            type="text"
            value={digifortUrl}
            onChange={(e) => setDigifortUrl(e.target.value)}
            className="w-full bg-gray-700 text-white rounded px-3 py-2"
            placeholder="http://localhost:8080"
          />
        </div>

        <button
          onClick={testConnection}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Test Connection
        </button>

        {testResult && (
          <div className={testResult === 'success' ? 'text-green-500' : 'text-red-500'}>
            {testResult === 'success' ? 'Connection successful!' : 'Connection failed'}
          </div>
        )}
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-4">TCP Virtual Sensor</h2>
        <p className="text-gray-400">
          Listen on port 8080 for TCP virtual sensor notifications (emulator mode)
        </p>
      </div>
    </div>
  );
}

function Settings() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <div className="bg-gray-800 rounded-lg p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white">System Configuration</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Demo Mode</label>
            <input type="checkbox" className="w-4 h-4" defaultChecked />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">YOLO Model</label>
            <select
              className="w-full bg-gray-700 text-white rounded px-3 py-2"
              defaultValue="yolov8n"
            >
              <option value="yolov8n">YOLOv8 Nano</option>
              <option value="yolov8s">YOLOv8 Small</option>
              <option value="yolov8m">YOLOv8 Medium</option>
            </select>
          </div>
        </div>

        <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
          Save Settings
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-4">Health Check</h2>
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
    { path: '/cameras', icon: Camera, label: 'Cameras' },
    { path: '/events', icon: Bell, label: 'Events' },
    { path: '/rules', icon: Shield, label: 'Rules' },
    { path: '/integrations', icon: Network, label: 'Integrations' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="w-64 bg-gray-900 min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white">Port Surveillance</h1>
        <p className="text-sm text-gray-400">AI Platform</p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded ${
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
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex bg-gray-900 min-h-screen">
        <Sidebar />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cameras" element={<Cameras />} />
            <Route path="/events" element={<Events />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}