// Everything the crates reveal lives here. Edit this file to update the portfolio;
// the level only refers to items by id. Source: dev.byairu.com.

export const profile = {
  name: 'Airu',
  role: 'Software Engineer'
};

const links = {
  email: { label: 'Email', url: 'mailto:m.rizky.khairullah@gmail.com' },
  github: { label: 'GitHub', url: 'https://github.com/Rzkykhrllh' },
  linkedin: { label: 'LinkedIn', url: 'https://www.linkedin.com/in/airu/' },
  cv: { label: 'CV', url: 'https://drive.google.com/drive/folders/19NOp4kRA3MVpH47GCEOIpFU9GO5jFj-T?usp=sharing' },
  site: { label: 'Website', url: 'https://dev.byairu.com' },
  photos: { label: 'Photography', url: 'https://byairu.com' }
};

export const items = [
  {
    id: 'about',
    kind: 'About',
    title: "Hi, I'm Airu",
    body: 'Software engineer in Tokyo with 3 years of experience and a strong backend focus. I take projects from research through design, development and deployment, mostly APIs, ML job orchestration and the infrastructure that keeps it all running.',
    tags: ['Backend', 'Data platforms', 'Tokyo'],
    links: [links.cv, links.site]
  },
  {
    id: 'ncj-traffic-api',
    kind: 'Experience',
    title: 'Net Chart Japan · traffic map API, 2–3 s to 0.1 s',
    body: 'Software Engineer on the Traffic Counting team since Jan 2024. Cut response times of a map-based traffic visualisation by 95–97% by moving from on-demand computation to scheduled batch precomputation, with failure detection and Slack alerting.',
    tags: ['FastAPI', 'Vue.js', 'Rundeck', 'Django']
  },
  {
    id: 'ncj-ml-platform',
    kind: 'Experience',
    title: 'Net Chart Japan · internal ML platform',
    body: 'Designed the architecture and workflows of an ML platform from experimentation to production: 23 scheduled Rundeck jobs with retries and failure handling for repeatable training, evaluation and experiment tracking.',
    tags: ['JupyterHub', 'MLflow', 'MinIO', 'Rundeck']
  },
  {
    id: 'ncj-monitoring',
    kind: 'Experience',
    title: 'Net Chart Japan · monitoring for 20+ services',
    body: 'Built centralised monitoring for 3 VMs running 20+ Docker services: Prometheus scraping (node-exporter, cAdvisor, blackbox), Grafana dashboards and Slack alerts for host, container and endpoint health. Also built Django APIs for traffic dashboards, load-tested with JMeter.',
    tags: ['Prometheus', 'Grafana', 'Docker', 'Django']
  },
  {
    id: 'tiket',
    kind: 'Experience',
    title: 'Tiket.com · Frontend Developer intern',
    body: 'Feb–Dec 2022, Loyalty & Reviews team in Jakarta. Shipped 7 features across the loyalty page, review form and review list, and added tests and Storybook docs for 4+ key components.',
    tags: ['Next.js', 'React', 'TypeScript', 'GraphQL', 'Jest']
  },
  {
    id: 'early',
    kind: 'Experience',
    title: 'BIGIO.ID and Universitas Gadjah Mada',
    body: "Frontend intern at BIGIO.ID (2021–22), building Biofarma's partnership monitoring site with React and Redux. Before that, teaching assistant for Algorithms and Data Structures at UGM, two classes of 40+ students.",
    tags: ['React', 'Redux', 'Material UI', 'Teaching']
  },
  {
    id: 'yomeru',
    kind: 'Project',
    title: 'Yomeru',
    body: 'Learn Japanese by reading. Save texts, click words to add them to a vocabulary bank with meanings, furigana and notes, and watch your vocabulary grow as you read.',
    tags: ['Next.js', 'TypeScript', 'Express.js', 'PostgreSQL', 'Prisma'],
    links: [{ label: 'Source', url: 'https://github.com/Rzkykhrllh/yomeru-app' }]
  },
  {
    id: 'nihongo-popup',
    kind: 'Project',
    title: 'Nihongo Popup',
    body: 'A Chrome extension that turns a Google Sheet into Japanese flashcards. Kanji pop up while you work: recall the reading, flip, grade yourself. Data stays local; built for keeping vocabulary fresh without breaking flow.',
    tags: ['JavaScript', 'Chrome Extension', 'Google Sheets'],
    links: [{ label: 'Source', url: 'https://github.com/Rzkykhrllh/flashcard-popup' }]
  },
  {
    id: 'photo-site',
    kind: 'Project',
    title: 'Photography portfolio website',
    body: 'End-to-end photography site with a custom admin panel for content and collections, built for clean design, responsive layout and fast delivery of high-resolution images.',
    tags: ['Next.js', 'Tailwind CSS', 'Midtrans API'],
    links: [{ label: 'Live', url: 'https://byairu.com/' }, { label: 'Source', url: 'https://github.com/Rzkykhrllh/airu-portfolio-web' }]
  },
  {
    id: 'into-ugm',
    kind: 'Project',
    title: 'Into UGM 2022',
    body: 'Event website for an academic event by IKAGAMASS UGM: promotion, registration, tryout submissions and online payments. Handled over 1,000 transactions during the event.',
    tags: ['Next.js', 'Tailwind CSS', 'Midtrans API'],
    links: [{ label: 'Source', url: 'https://github.com/Rzkykhrllh/IntoUgm2022' }]
  },
  {
    id: 'island',
    kind: 'Project',
    title: 'This island',
    body: 'A playable portfolio built with Three.js and Vite. No game engine or physics library: a custom game loop, procedural scenery, synthesised sound, and levels that can be built in Blender.',
    tags: ['Three.js', 'WebGL', 'Vite'],
    links: [{ label: 'Source', url: 'https://github.com/Rzkykhrllh/web-3d-platformer' }]
  },
  {
    id: 'skills',
    kind: 'Skills',
    title: 'What I work with',
    body: 'Backend: Node.js, Express, Python, FastAPI, Django, PostgreSQL, MongoDB. DevOps: Docker, Grafana, Prometheus, Rundeck, GitHub Actions. Frontend: TypeScript, React, Next.js, Vue.js, Tailwind CSS.',
    tags: ['Python', 'FastAPI', 'Django', 'Node.js', 'PostgreSQL', 'Docker', 'React']
  },
  {
    id: 'contact',
    kind: 'Contact',
    title: "Let's work together",
    body: 'Based in Tokyo and open to new opportunities. Have a project in mind, or just want to say hi?',
    links: [links.email, links.linkedin, links.github, links.cv]
  },
  {
    id: 'photography',
    kind: 'Bonus',
    title: 'Behind the camera',
    body: 'When not writing code I take photos. The photography site above is where they live.',
    links: [links.photos, { label: 'Instagram', url: 'https://www.instagram.com/frame_by_airu/' }]
  }
];

export const itemById = Object.fromEntries(items.map(i => [i.id, i]));
