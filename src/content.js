// Everything the crates reveal lives here. Edit this file to update the portfolio;
// the level only refers to items by id.
// NOTE: placeholder copy for the proof of concept.

export const profile = {
  name: 'Rizky',
  role: 'Backend & IoT Engineer'
};

export const items = [
  {
    id: 'about',
    kind: 'About',
    title: `Hi, I'm ${profile.name}`,
    body: 'Backend and IoT engineer. I build the servers that devices talk to: auth, data pipelines and the dashboards on top.',
    tags: ['Backend', 'IoT', 'Infra']
  },
  {
    id: 'project-mtls',
    kind: 'Project',
    title: 'Device auth with mTLS',
    body: 'Certificate-based authentication for field devices, so every gateway proves who it is before it can send data.',
    tags: ['NestJS', 'mTLS', 'PostgreSQL']
  },
  {
    id: 'project-rbac',
    kind: 'Project',
    title: 'Role-based access for a monitoring console',
    body: 'Route guards and per-role views so operators, admins and viewers each see only what they need.',
    tags: ['NestJS', 'RBAC', 'SSR']
  },
  {
    id: 'project-anomaly',
    kind: 'Project',
    title: 'Anomaly detection pipeline',
    body: 'Batch and streaming jobs that flag unusual sensor readings and fill gaps in time series data.',
    tags: ['Python', 'Time series', 'Docker']
  },
  {
    id: 'project-island',
    kind: 'Project',
    title: 'This island',
    body: 'A playable portfolio built with Three.js and Vite. No engine, no physics library, just a small game loop.',
    tags: ['Three.js', 'Vite', 'WebGL'],
    links: [{ label: 'Source', url: 'https://github.com/rzkykhrllh' }]
  },
  {
    id: 'skills',
    kind: 'Skills',
    title: 'What I work with',
    body: 'Backend: NestJS, Node.js, Python. Data: PostgreSQL, MongoDB. Infra: Docker, Linux, CI. Devices: MQTT, mTLS gateways.',
    tags: ['NestJS', 'Python', 'PostgreSQL', 'Docker', 'MQTT']
  },
  {
    id: 'contact',
    kind: 'Contact',
    title: 'Say hello',
    body: 'Open to interesting backend and IoT work.',
    links: [
      { label: 'GitHub', url: 'https://github.com/rzkykhrllh' },
      { label: 'LinkedIn', url: '#' },
      { label: 'Email', url: 'mailto:you@example.com' }
    ]
  }
];

export const itemById = Object.fromEntries(items.map(i => [i.id, i]));
