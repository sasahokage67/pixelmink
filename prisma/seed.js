const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  await prisma.xCreditTransaction.deleteMany();
  await prisma.report.deleteMany();
  await prisma.review.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.userAchievement.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.progress.deleteMany();
  await prisma.testAttempt.deleteMany();
  await prisma.question.deleteMany();
  await prisma.test.deleteMany();
  await prisma.seminarRecording.deleteMany();
  await prisma.seminarQuestion.deleteMany();
  await prisma.seminarMessage.deleteMany();
  await prisma.seminarParticipant.deleteMany();
  await prisma.seminar.deleteMany();
  await prisma.session.deleteMany();
  await prisma.call.deleteMany();
  await prisma.messageReaction.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationMember.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.match.deleteMany();
  await prisma.userSkill.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding Skills...');
  const skillsData = [
    { name: 'Python', category: 'CODING', description: 'General purpose programming, automation and scripting', icon: 'terminal' },
    { name: 'PyTorch & AI', category: 'AI_ML', description: 'Deep learning frameworks, tensors and training neural nets', icon: 'cpu' },
    { name: 'Prompt Engineering & LLMs', category: 'AI_ML', description: 'RAG architecture, fine-tuning, OpenAI, Claude, local Ollama', icon: 'sparkles' },
    { name: 'Rust', category: 'CODING', description: 'Systems programming with strict memory safety guarantees', icon: 'shield' },
    { name: 'UI/UX Design', category: 'DESIGN', description: 'User-centered product design, wireframing, UX research', icon: 'layout' },
    { name: 'Figma & Design Systems', category: 'DESIGN', description: 'Tokens, auto-layout, interactive prototypes, component libraries', icon: 'figma' },
    { name: 'DaVinci Resolve', category: 'VIDEO_EDITING', description: 'Color grading, Fairlight audio, Cut & Edit pages', icon: 'film' },
    { name: 'Blender 3D', category: 'DESIGN', description: 'Hard-surface modeling, geometry nodes, Eevee & Cycles rendering', icon: 'box' },
    { name: 'React & Next.js', category: 'CODING', description: 'Modern App Router, Server Components, SSR, state management', icon: 'code' },
    { name: 'TypeScript', category: 'CODING', description: 'Strict type systems, generics, compile-time safety', icon: 'file-code' },
    { name: 'Docker & Containers', category: 'DEVOPS', description: 'Multi-stage builds, rootless containers, compose stacks', icon: 'container' },
    { name: 'Kubernetes', category: 'DEVOPS', description: 'Cluster orchestration, Helm, ingress controllers, GitOps', icon: 'server' },
    { name: 'Computer Vision & OpenCV', category: 'AI_ML', description: 'Image filtering, object detection YOLO, facial recognition', icon: 'eye' },
    { name: 'PostgreSQL & SQL', category: 'COMPUTER_SCIENCE', description: 'Query optimization, indexes, window functions, relational modeling', icon: 'database' },
    { name: 'Golang', category: 'CODING', description: 'High-concurrency microservices, goroutines, channels', icon: 'zap' },
    { name: 'Cybersecurity & Pentest', category: 'COMPUTER_SCIENCE', description: 'Network security, reverse engineering, web vulnerabilities', icon: 'lock' },
    { name: 'Unity & C#', category: 'CODING', description: 'Game physics, shaders, component architecture, VR/AR', icon: 'gamepad-2' },
    { name: 'Unreal Engine 5', category: 'DESIGN', description: 'Nanite, Lumen, Blueprints, high-fidelity C++ game dev', icon: 'monitor' },
    { name: 'Linear Algebra & 3D Math', category: 'MATH', description: 'Matrix transformations, quaternions, vectors for graphics and AI', icon: 'binary' },
    { name: 'English for IT', category: 'COMPUTER_SCIENCE', description: 'Tech vocabulary, tech interviews, async team communication', icon: 'globe' },
    { name: 'Technical Writing', category: 'COMPUTER_SCIENCE', description: 'API docs, RFC proposals, architectural decision records (ADR)', icon: 'book-open' },
    { name: 'Git & GitHub Workflows', category: 'DEVOPS', description: 'Interactive rebase, bisect, branching strategies, CI actions', icon: 'git-branch' },
    { name: 'Swift & iOS', category: 'CODING', description: 'SwiftUI, Combine, native iOS applications', icon: 'smartphone' },
    { name: 'Flutter & Dart', category: 'CODING', description: 'Cross-platform mobile and desktop interfaces', icon: 'layers' },
    { name: 'Sound Design & Audio', category: 'VIDEO_EDITING', description: 'Foley, EQ, compression, mastering for video and games', icon: 'volume-2' },
  ];

  const skillMap = {};
  for (const s of skillsData) {
    const created = await prisma.skill.create({ data: s });
    skillMap[s.name] = created.id;
  }

  console.log('Seeding Achievements...');
  const achievementsList = [
    { code: 'FIRST_SESSION', title: 'First Session', description: 'Completed your first 1-on-1 peer exchange session', icon: 'flame' },
    { code: 'FIRST_SKILL_LEARNED', title: 'First Skill Learned', description: 'Mastered your first learning milestone', icon: 'graduation-cap' },
    { code: 'HOURS_TEACHING_10', title: '10 Hours Teaching', description: 'Dedicated over 10 hours teaching other developers', icon: 'brain' },
    { code: 'SUCCESSFUL_EXCHANGES_5', title: '5 Successful Exchanges', description: 'Completed 5 reciprocal skill exchange sessions', icon: 'handshake' },
    { code: 'SESSIONS_10', title: '10 Completed Sessions', description: 'Held 10 verified live learning sessions', icon: 'trophy' },
    { code: 'GLOBAL_LEARNER', title: 'Global Learner', description: 'Connected with peers across 3 different continents', icon: 'globe' },
    { code: 'FIRST_SEMINAR', title: 'First Seminar', description: 'Hosted or attended an educational seminar on XCHANGE', icon: 'mic' },
  ];

  const achievementMap = {};
  for (const a of achievementsList) {
    const created = await prisma.achievement.create({ data: a });
    achievementMap[a.code] = created.id;
  }

  console.log('Seeding Users & Profiles...');
  const defaultPassword = await bcrypt.hash('password123', 10);

  const rawUsers = [
    {
      email: 'alex@xchange.dev',
      role: 'MENTOR',
      profile: {
        name: 'Alex Voronov',
        avatar: '',
        bio: 'Senior Python & PyTorch Engineer at deep-tech lab. Loving math, algorithms and async systems.',
        location: 'Belgrade, Serbia',
        languages: 'English (Fluent), Russian (Native)',
        teachingHours: 32.5,
        learningHours: 18.0,
        rating: 4.95,
        reviewsCount: 28,
        verified: true,
        timezone: 'UTC+1',
        xCredits: 12,
        availability: 'Mon, Wed, Fri 18:00 - 21:00 CET',
      },
      teach: [
        { skill: 'Python', level: 'EXPERT', desc: 'Metaclasses, asyncio, profiling, performance tuning', avail: 'Weekday evenings' },
        { skill: 'PyTorch & AI', level: 'ADVANCED', desc: 'Custom autograd, transformers, quantization', avail: 'Weekends' },
      ],
      learn: [
        { skill: 'English for IT', level: 'INTERMEDIATE', goal: 'Confidently pitch tech architecture to US founders' },
        { skill: 'Prompt Engineering & LLMs', level: 'BEGINNER', goal: 'Master agentic workflows and tool-calling evaluation' },
      ],
    },
    {
      email: 'amina@xchange.dev',
      role: 'MENTOR',
      profile: {
        name: 'Amina Al-Mansoor',
        avatar: '',
        bio: 'AI Product Specialist & Bilingual Tech Lead. Helping engineers communicate crystal-clear in English.',
        location: 'Dubai, UAE',
        languages: 'English (Native), Arabic (Native), French (B2)',
        teachingHours: 44.0,
        learningHours: 12.0,
        rating: 4.98,
        reviewsCount: 39,
        verified: true,
        timezone: 'UTC+4',
        xCredits: 19,
        availability: 'Tue, Thu, Sat 17:00 - 20:00 GST',
      },
      teach: [
        { skill: 'English for IT', level: 'EXPERT', desc: 'Pronunciation, architectural interviews, negotiation' },
        { skill: 'Prompt Engineering & LLMs', level: 'ADVANCED', desc: 'DSPy, structured outputs, evaluation pipelines' },
      ],
      learn: [
        { skill: 'Python', level: 'BEGINNER', goal: 'Write clean Python scripts for local LLM pipelines' },
        { skill: 'PostgreSQL & SQL', level: 'INTERMEDIATE', goal: 'Vector databases (pgvector) and complex queries' },
      ],
    },
    {
      email: 'daniel@xchange.dev',
      role: 'USER',
      profile: {
        name: 'Daniel Richter',
        avatar: '',
        bio: 'Systems programmer obsessed with zero-cost abstractions, memory safety and low latency.',
        location: 'Berlin, Germany',
        languages: 'English (Fluent), German (Native)',
        teachingHours: 21.0,
        learningHours: 16.5,
        rating: 4.90,
        reviewsCount: 17,
        verified: true,
        timezone: 'UTC+2',
        xCredits: 7,
        availability: 'Mon, Thu 19:00 - 22:00 CET',
      },
      teach: [
        { skill: 'Rust', level: 'EXPERT', desc: 'Lifetimes, concurrency, unsafe, Tokio async runtime' },
      ],
      learn: [
        { skill: 'UI/UX Design', level: 'BEGINNER', goal: 'Design clean developer tools and web dashboards' },
        { skill: 'Figma & Design Systems', level: 'BEGINNER', goal: 'Master auto-layout and components' },
      ],
    },
    {
      email: 'sara@xchange.dev',
      role: 'MENTOR',
      profile: {
        name: 'Sara Lindqvist',
        avatar: '',
        bio: 'Principal Product Designer. Minimalist interface craft, typography and design tokens.',
        location: 'Stockholm, Sweden',
        languages: 'English (Fluent), Swedish (Native)',
        teachingHours: 36.0,
        learningHours: 24.0,
        rating: 4.96,
        reviewsCount: 31,
        verified: true,
        timezone: 'UTC+2',
        xCredits: 14,
        availability: 'Daily 16:00 - 19:00 CET',
      },
      teach: [
        { skill: 'UI/UX Design', level: 'EXPERT', desc: 'Design systems, information hierarchy, micro-interactions' },
        { skill: 'Figma & Design Systems', level: 'EXPERT', desc: 'Variables, modes, atomic components, dev handoff' },
      ],
      learn: [
        { skill: 'Rust', level: 'BEGINNER', goal: 'Understand WebAssembly compiling from Rust' },
        { skill: 'React & Next.js', level: 'INTERMEDIATE', goal: 'Bridge gap between Figma tokens and Tailwind CSS' },
      ],
    },
    {
      email: 'marcus@xchange.dev',
      role: 'USER',
      profile: {
        name: 'Marcus Brody',
        avatar: '',
        bio: 'Commercial Video Editor & Colorist. Cut spots for tech brands, specializing in DaVinci Resolve.',
        location: 'London, UK',
        languages: 'English (Native)',
        teachingHours: 28.0,
        learningHours: 19.0,
        rating: 4.88,
        reviewsCount: 22,
        verified: true,
        timezone: 'UTC+0',
        xCredits: 9,
        availability: 'Wed, Sat 14:00 - 18:00 GMT',
      },
      teach: [
        { skill: 'DaVinci Resolve', level: 'EXPERT', desc: 'Color space transforms, node trees, ACES workflow' },
        { skill: 'Sound Design & Audio', level: 'ADVANCED', desc: 'Dialogue cleanup, multiband compression' },
      ],
      learn: [
        { skill: 'Blender 3D', level: 'BEGINNER', goal: 'Create 3D product motion graphics for commercial edits' },
      ],
    },
    {
      email: 'maya@xchange.dev',
      role: 'USER',
      profile: {
        name: 'Maya Chen',
        avatar: '',
        bio: '3D Artist and Technical Animator. Geometry nodes, procedural materials and stylized renders.',
        location: 'Toronto, Canada',
        languages: 'English (Fluent), Mandarin (Native)',
        teachingHours: 30.5,
        learningHours: 22.0,
        rating: 4.92,
        reviewsCount: 26,
        verified: true,
        timezone: 'UTC-4',
        xCredits: 11,
        availability: 'Weekends 12:00 - 18:00 EST',
      },
      teach: [
        { skill: 'Blender 3D', level: 'EXPERT', desc: 'Hard surface, procedural textures, lighting techniques' },
        { skill: 'Linear Algebra & 3D Math', level: 'INTERMEDIATE', desc: 'Vector projections, quaternion rotations' },
      ],
      learn: [
        { skill: 'DaVinci Resolve', level: 'BEGINNER', goal: 'Master cinematic post-color grading for 3D renders' },
      ],
    },
    {
      email: 'elena@xchange.dev',
      role: 'MENTOR',
      profile: {
        name: 'Elena Rostova',
        avatar: '',
        bio: 'Staff Frontend Architect. Deep understanding of Next.js App Router, React concurrency & performance.',
        location: 'Vilnius, Lithuania',
        languages: 'English (Fluent), Russian (Native)',
        teachingHours: 52.0,
        learningHours: 14.0,
        rating: 4.97,
        reviewsCount: 45,
        verified: true,
        timezone: 'UTC+2',
        xCredits: 22,
        availability: 'Tue, Thu 18:00 - 21:00 EET',
      },
      teach: [
        { skill: 'React & Next.js', level: 'EXPERT', desc: 'RSC architecture, streaming, suspense, bundle reduction' },
        { skill: 'TypeScript', level: 'EXPERT', desc: 'Template literal types, conditional types, type gymnastics' },
      ],
      learn: [
        { skill: 'Docker & Containers', level: 'INTERMEDIATE', goal: 'Production container optimization and secrets management' },
        { skill: 'Kubernetes', level: 'BEGINNER', goal: 'Understand Helm charts and ingress routing' },
      ],
    },
    {
      email: 'kenji@xchange.dev',
      role: 'MENTOR',
      profile: {
        name: 'Kenji Sato',
        avatar: '',
        bio: 'Site Reliability Engineer & Kubernetes Operator contributor. Keeping clusters resilient 24/7.',
        location: 'Tokyo, Japan',
        languages: 'English (Fluent), Japanese (Native)',
        teachingHours: 39.0,
        learningHours: 20.0,
        rating: 4.93,
        reviewsCount: 33,
        verified: true,
        timezone: 'UTC+9',
        xCredits: 15,
        availability: 'Sat, Sun 10:00 - 15:00 JST',
      },
      teach: [
        { skill: 'Docker & Containers', level: 'EXPERT', desc: 'Multi-arch builds, security scanning, minimal base images' },
        { skill: 'Kubernetes', level: 'EXPERT', desc: 'Custom Resource Definitions, operators, network policies' },
      ],
      learn: [
        { skill: 'React & Next.js', level: 'BEGINNER', goal: 'Build internal observability dashboards with Next.js' },
      ],
    },
    {
      email: 'david@xchange.dev',
      role: 'USER',
      profile: {
        name: 'David Vance',
        avatar: '',
        bio: 'Computer Vision Engineer. Real-time inference on edge devices (Jetson, Coral) and camera calibrations.',
        location: 'Austin, USA',
        languages: 'English (Native)',
        teachingHours: 19.5,
        learningHours: 15.0,
        rating: 4.87,
        reviewsCount: 16,
        verified: false,
        timezone: 'UTC-5',
        xCredits: 6,
        availability: 'Mon, Wed 19:00 - 21:00 CST',
      },
      teach: [
        { skill: 'Computer Vision & OpenCV', level: 'EXPERT', desc: 'Edge detection, feature matching, YOLOv8 fine-tuning' },
      ],
      learn: [
        { skill: 'Sound Design & Audio', level: 'BEGINNER', goal: 'Audio processing and sound design for video demos' },
      ],
    },
    {
      email: 'liam@xchange.dev',
      role: 'USER',
      profile: {
        name: 'Liam Gallagher',
        avatar: '',
        bio: 'Backend engineer building high-throughput payment gateways with Go and distributed locks.',
        location: 'Dublin, Ireland',
        languages: 'English (Native)',
        teachingHours: 24.0,
        learningHours: 17.0,
        rating: 4.89,
        reviewsCount: 19,
        verified: true,
        timezone: 'UTC+0',
        xCredits: 8,
        availability: 'Weekday mornings 08:00 - 10:00 GMT',
      },
      teach: [
        { skill: 'Golang', level: 'EXPERT', desc: 'Goroutines, context propagation, pprof profiling' },
        { skill: 'PostgreSQL & SQL', level: 'ADVANCED', desc: 'Partitioning, transaction isolation levels, indexing' },
      ],
      learn: [
        { skill: 'PyTorch & AI', level: 'BEGINNER', goal: 'Build recommendation models for financial transactions' },
      ],
    },
    {
      email: 'roman@xchange.dev',
      role: 'USER',
      profile: {
        name: 'Roman Koster',
        avatar: '',
        bio: 'Offensive Security Researcher & Binary Exploitation enthusiast. CTF player.',
        location: 'Warsaw, Poland',
        languages: 'English (Fluent), Polish (Native)',
        teachingHours: 22.0,
        learningHours: 18.0,
        rating: 4.91,
        reviewsCount: 18,
        verified: true,
        timezone: 'UTC+1',
        xCredits: 7,
        availability: 'Fri, Sat 20:00 - 23:00 CET',
      },
      teach: [
        { skill: 'Cybersecurity & Pentest', level: 'EXPERT', desc: 'GDB, Ghidra, web exploit payloads, fuzzing' },
      ],
      learn: [
        { skill: 'Unity & C#', level: 'BEGINNER', goal: 'Build small indie game prototypes in Unity' },
      ],
    },
    {
      email: 'anna@xchange.dev',
      role: 'USER',
      profile: {
        name: 'Anna Kowalska',
        avatar: '',
        bio: 'Game Developer creating indie puzzle games in Unity. Passionate about procedural generation.',
        location: 'Krakow, Poland',
        languages: 'English (Fluent), Polish (Native)',
        teachingHours: 26.0,
        learningHours: 21.0,
        rating: 4.89,
        reviewsCount: 20,
        verified: true,
        timezone: 'UTC+1',
        xCredits: 9,
        availability: 'Wed, Sun 17:00 - 20:00 CET',
      },
      teach: [
        { skill: 'Unity & C#', level: 'EXPERT', desc: 'ScriptableObjects, physics 2D/3D, animation state machines' },
      ],
      learn: [
        { skill: 'Cybersecurity & Pentest', level: 'BEGINNER', goal: 'Learn anti-cheat techniques and network security' },
      ],
    },
    {
      email: 'victor@xchange.dev',
      role: 'USER',
      profile: {
        name: 'Victor Vance',
        avatar: '',
        bio: 'Unreal Engine 5 Technical Artist. Working on AAA game environments, Lumen lighting and Niagara VFX.',
        location: 'Montreal, Canada',
        languages: 'English (Fluent), French (Native)',
        teachingHours: 31.0,
        learningHours: 27.0,
        rating: 4.94,
        reviewsCount: 25,
        verified: true,
        timezone: 'UTC-4',
        xCredits: 10,
        availability: 'Tue, Thu 18:00 - 21:00 EST',
      },
      teach: [
        { skill: 'Unreal Engine 5', level: 'EXPERT', desc: 'Niagara particles, Lumen global illumination, Blueprints' },
      ],
      learn: [
        { skill: 'Linear Algebra & 3D Math', level: 'INTERMEDIATE', goal: 'Deepen knowledge of quaternion transforms and custom shader math' },
      ],
    },
    {
      email: 'maria@xchange.dev',
      role: 'MENTOR',
      profile: {
        name: 'Dr. Maria Santos',
        avatar: '',
        bio: 'Applied Mathematician & Lecturer. Simplifying complex linear algebra, matrices and eigenvectors.',
        location: 'Madrid, Spain',
        languages: 'English (Fluent), Spanish (Native)',
        teachingHours: 48.0,
        learningHours: 16.0,
        rating: 4.99,
        reviewsCount: 42,
        verified: true,
        timezone: 'UTC+1',
        xCredits: 20,
        availability: 'Mon, Wed 15:00 - 18:00 CET',
      },
      teach: [
        { skill: 'Linear Algebra & 3D Math', level: 'EXPERT', desc: 'SVD, Eigenvalues, affine projections, tensor calculus' },
      ],
      learn: [
        { skill: 'Unreal Engine 5', level: 'BEGINNER', goal: 'Simulate physical differential equations inside UE5' },
      ],
    },
    {
      email: 'artem@xchange.dev',
      role: 'USER',
      profile: {
        name: 'Artem Sokolov',
        avatar: '',
        bio: 'Senior iOS Engineer. Building smooth 120fps animations and CoreData offline-first architectures.',
        location: 'Tbilisi, Georgia',
        languages: 'English (B2), Russian (Native)',
        teachingHours: 23.0,
        learningHours: 19.5,
        rating: 4.90,
        reviewsCount: 19,
        verified: true,
        timezone: 'UTC+4',
        xCredits: 8,
        availability: 'Weekday evenings 19:00 - 22:00',
      },
      teach: [
        { skill: 'Swift & iOS', level: 'EXPERT', desc: 'SwiftUI, Combine, Instruments profiling, async/await' },
      ],
      learn: [
        { skill: 'PyTorch & AI', level: 'BEGINNER', goal: 'CoreML on-device machine learning models for mobile' },
      ],
    },
    {
      email: 'kira@xchange.dev',
      role: 'USER',
      profile: {
        name: 'Kira Novak',
        avatar: '',
        bio: 'Mobile Product Designer. Creating human interfaces for iOS and Android with Figma tokens.',
        location: 'Prague, Czechia',
        languages: 'English (Fluent), Czech (Native)',
        teachingHours: 25.0,
        learningHours: 23.0,
        rating: 4.88,
        reviewsCount: 21,
        verified: true,
        timezone: 'UTC+2',
        xCredits: 7,
        availability: 'Tue, Fri 16:00 - 19:00 CET',
      },
      teach: [
        { skill: 'Figma & Design Systems', level: 'ADVANCED', desc: 'Component variants, auto-layout, mobile guidelines' },
        { skill: 'UI/UX Design', level: 'ADVANCED', desc: 'Mobile usability testing, micro-copy, onboarding UX' },
      ],
      learn: [
        { skill: 'Swift & iOS', level: 'BEGINNER', goal: 'Build interactive prototypes directly in SwiftUI code' },
      ],
    },
    {
      email: 'chloe@xchange.dev',
      role: 'USER',
      profile: {
        name: 'Chloe Dupont',
        avatar: '',
        bio: 'Staff Technical Writer. Writing developer documentation that developers actually love to read.',
        location: 'Paris, France',
        languages: 'English (Fluent), French (Native)',
        teachingHours: 29.0,
        learningHours: 15.0,
        rating: 4.95,
        reviewsCount: 24,
        verified: true,
        timezone: 'UTC+1',
        xCredits: 11,
        availability: 'Mon, Thu 14:00 - 17:00 CET',
      },
      teach: [
        { skill: 'Technical Writing', level: 'EXPERT', desc: 'OpenAPI specs, docs-as-code, clear technical prose' },
        { skill: 'Git & GitHub Workflows', level: 'ADVANCED', desc: 'Clean commit history, PR descriptions, automation' },
      ],
      learn: [
        { skill: 'Golang', level: 'BEGINNER', goal: 'Build custom CLI tools for markdown documentation validation' },
      ],
    },
    {
      email: 'admin@xchange.dev',
      role: 'ADMIN',
      profile: {
        name: 'XCHANGE Admin',
        avatar: '',
        bio: 'Platform Administrator & Safety Moderator. Reach out for system assistance or partnership.',
        location: 'Global Platform',
        languages: 'English, Russian, German',
        teachingHours: 100.0,
        learningHours: 50.0,
        rating: 5.0,
        reviewsCount: 80,
        verified: true,
        timezone: 'UTC+0',
        xCredits: 999,
        availability: '24/7 System Moderation',
      },
      teach: [
        { skill: 'Python', level: 'EXPERT', desc: 'Architecture, scalable platforms' },
      ],
      learn: [
        { skill: 'Rust', level: 'EXPERT', goal: 'High performance kernel modules' },
      ],
    },
  ];

  const userMap = {};
  for (const u of rawUsers) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        password: defaultPassword,
        role: u.role,
        profile: {
          create: u.profile,
        },
      },
    });
    userMap[u.email] = user.id;

    // Attach skills
    for (const ts of u.teach) {
      if (skillMap[ts.skill]) {
        await prisma.userSkill.create({
          data: {
            userId: user.id,
            skillId: skillMap[ts.skill],
            type: 'TEACH',
            level: ts.level,
            description: ts.desc || '',
            teachingAvailability: ts.avail || 'Flexible',
          },
        });
      }
    }
    for (const ls of u.learn) {
      if (skillMap[ls.skill]) {
        await prisma.userSkill.create({
          data: {
            userId: user.id,
            skillId: skillMap[ls.skill],
            type: 'LEARN',
            level: ls.level,
            learningGoal: ls.goal || '',
          },
        });
      }
    }

    // Attach base achievements
    await prisma.userAchievement.create({
      data: {
        userId: user.id,
        achievementId: achievementMap['FIRST_SESSION'],
      },
    });
    if (u.profile.teachingHours >= 10) {
      await prisma.userAchievement.create({
        data: {
          userId: user.id,
          achievementId: achievementMap['HOURS_TEACHING_10'],
        },
      });
    }
  }

  console.log('Seeding Direct & Circular Matches...');
  // 1. Alex <-> Amina (Perfect 96% Match: Alex teaches Python, Amina teaches English + Prompt Eng)
  await prisma.match.create({
    data: {
      userAId: userMap['alex@xchange.dev'],
      userBId: userMap['amina@xchange.dev'],
      score: 96,
      status: 'ACCEPTED',
      reason: '🔥 Perfect Match: Reciprocal skill exchange (Python ↔ English for IT & Prompt Eng)',
    },
  });

  // 2. Daniel <-> Sara (Perfect 94% Match: Daniel teaches Rust, Sara teaches UI/UX Design)
  await prisma.match.create({
    data: {
      userAId: userMap['daniel@xchange.dev'],
      userBId: userMap['sara@xchange.dev'],
      score: 94,
      status: 'ACCEPTED',
      reason: '🔥 Perfect Match: Reciprocal skill exchange (Rust ↔ UI/UX Design & Figma)',
    },
  });

  // 3. Marcus <-> Maya (Perfect 92% Match: Marcus teaches DaVinci Resolve, Maya teaches Blender 3D)
  await prisma.match.create({
    data: {
      userAId: userMap['marcus@xchange.dev'],
      userBId: userMap['maya@xchange.dev'],
      score: 92,
      status: 'ACCEPTED',
      reason: '🔥 Perfect Match: Reciprocal skill exchange (DaVinci Resolve ↔ Blender 3D)',
    },
  });

  // 4. Elena <-> Kenji (95% Match: Elena teaches React/Next.js, Kenji teaches Docker/Kubernetes)
  await prisma.match.create({
    data: {
      userAId: userMap['elena@xchange.dev'],
      userBId: userMap['kenji@xchange.dev'],
      score: 95,
      status: 'ACCEPTED',
      reason: '🔥 Perfect Match: Frontend Architecture ↔ DevOps Infrastructure',
    },
  });

  // 5. Roman <-> Anna (93% Match: Roman teaches Cybersecurity, Anna teaches Unity)
  await prisma.match.create({
    data: {
      userAId: userMap['roman@xchange.dev'],
      userBId: userMap['anna@xchange.dev'],
      score: 93,
      status: 'ACCEPTED',
      reason: '🔥 Perfect Match: Pentest/Security ↔ Unity Game Development',
    },
  });

  // 6. Victor <-> Maria (95% Match: Victor teaches Unreal Engine 5, Maria teaches 3D Math)
  await prisma.match.create({
    data: {
      userAId: userMap['victor@xchange.dev'],
      userBId: userMap['maria@xchange.dev'],
      score: 95,
      status: 'ACCEPTED',
      reason: '🔥 Perfect Match: Unreal Engine 5 ↔ Linear Algebra & 3D Math',
    },
  });

  // 7. Artem <-> Kira (91% Match: Artem teaches Swift/iOS, Kira teaches Figma)
  await prisma.match.create({
    data: {
      userAId: userMap['artem@xchange.dev'],
      userBId: userMap['kira@xchange.dev'],
      score: 91,
      status: 'PENDING',
      reason: '🔥 Strong Synergy: Swift Native iOS ↔ Design Systems Tokens',
    },
  });

  console.log('Seeding Real Conversations & Messages...');
  // Conversation between Alex and Amina
  const conv1 = await prisma.conversation.create({
    data: {
      title: 'Alex Voronov & Amina Al-Mansoor',
      isGroup: false,
      members: {
        create: [
          { userId: userMap['alex@xchange.dev'] },
          { userId: userMap['amina@xchange.dev'] },
        ],
      },
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conv1.id,
        senderId: userMap['alex@xchange.dev'],
        content: 'Hi Amina! I saw your profile and your prompt engineering work. I am building a custom RAG pipeline in Python with PyTorch embeddings, but I need guidance on LLM eval benchmarks and polishing my spoken English for the upcoming tech demo.',
        messageType: 'TEXT',
        isRead: true,
        createdAt: new Date(Date.now() - 3600000 * 24),
      },
      {
        conversationId: conv1.id,
        senderId: userMap['amina@xchange.dev'],
        content: 'Hey Alex! Perfect timing. I am currently rewriting my data extraction scripts into Python and would love a deep dive into asyncio and custom embeddings. We have a 96% match score!',
        messageType: 'TEXT',
        isRead: true,
        createdAt: new Date(Date.now() - 3600000 * 23),
      },
      {
        conversationId: conv1.id,
        senderId: userMap['alex@xchange.dev'],
        content: "Awesome! Let's schedule a 60-min exchange session tomorrow. I can walk you through asyncio event loops and memory profiling first, then we can practice the tech interview questions.",
        messageType: 'TEXT',
        isRead: true,
        createdAt: new Date(Date.now() - 3600000 * 5),
      },
      {
        conversationId: conv1.id,
        senderId: userMap['amina@xchange.dev'],
        content: "Here is the sample evaluation prompt dataset I've prepared for our session: https://github.com/example/eval-dataset. Looking forward to our call!",
        messageType: 'TEXT',
        isRead: false,
        createdAt: new Date(Date.now() - 3600000 * 1),
      },
    ],
  });

  // Conversation between Daniel and Sara
  const conv2 = await prisma.conversation.create({
    data: {
      title: 'Daniel Richter & Sara Lindqvist',
      isGroup: false,
      members: {
        create: [
          { userId: userMap['daniel@xchange.dev'] },
          { userId: userMap['sara@xchange.dev'] },
        ],
      },
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conv2.id,
        senderId: userMap['sara@xchange.dev'],
        content: 'Daniel, your explanation of Rust ownership in the community channel was so clear! I am designing a WebAssembly dev tool in Figma and want to understand how WASM memory layout works under the hood.',
        messageType: 'TEXT',
        isRead: true,
        createdAt: new Date(Date.now() - 3600000 * 12),
      },
      {
        conversationId: conv2.id,
        senderId: userMap['daniel@xchange.dev'],
        content: "Thanks Sara! In exchange, I desperately need help designing the UI for my terminal CLI documentation website. I want that clean Drinkit-inspired minimalist aesthetic.",
        messageType: 'TEXT',
        isRead: true,
        createdAt: new Date(Date.now() - 3600000 * 8),
      },
    ],
  });

  console.log('Seeding Scheduled Sessions...');
  await prisma.session.create({
    data: {
      teacherId: userMap['alex@xchange.dev'],
      studentId: userMap['amina@xchange.dev'],
      skillId: skillMap['Python'],
      title: 'AsyncIO & Deep Python Profiling',
      scheduledAt: new Date(Date.now() + 3600000 * 24),
      duration: 60,
      format: 'VIDEO',
      status: 'CONFIRMED',
      notes: 'Prepare memory leaks test repo and flamegraphs.',
      meetingLink: 'call_room_alex_amina_py',
    },
  });

  await prisma.session.create({
    data: {
      teacherId: userMap['amina@xchange.dev'],
      studentId: userMap['alex@xchange.dev'],
      skillId: skillMap['English for IT'],
      title: 'Technical Presentation & System Design English',
      scheduledAt: new Date(Date.now() + 3600000 * 48),
      duration: 60,
      format: 'VIDEO',
      status: 'CONFIRMED',
      notes: 'Simulate architectural review with US tech leads.',
      meetingLink: 'call_room_amina_alex_en',
    },
  });

  console.log('Seeding Massive Seminars...');
  const sem1 = await prisma.seminar.create({
    data: {
      hostId: userMap['alex@xchange.dev'],
      title: 'Fine-Tuning Open Source LLMs on Consumer GPUs (Llama 3 & Qwen)',
      description: 'Hands-on live seminar covering LoRA/QLoRA quantization, dataset preparation, Unsloth accelerations, and deploying on local hardware with zero latency penalties.',
      category: 'AI & MACHINE LEARNING',
      level: 'Intermediate → Advanced',
      language: 'English',
      date: 'Sept 30, 2026',
      time: '18:00 CET',
      duration: 90,
      maxParticipants: 500,
      participantCount: 347,
      isLive: true,
      status: 'LIVE',
    },
  });

  // Add sample seminar messages and questions
  await prisma.seminarMessage.createMany({
    data: [
      {
        seminarId: sem1.id,
        userId: userMap['alex@xchange.dev'],
        content: 'Welcome everyone! Today we will live-quantize an 8B model down to 4-bit and run benchmark inference. Feel free to post questions in the Q&A tab.',
        isPinned: true,
        isModerator: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 15),
      },
      {
        seminarId: sem1.id,
        userId: userMap['amina@xchange.dev'],
        content: 'The screen quality and audio latency are super crisp!',
        isPinned: false,
        isModerator: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 10),
      },
      {
        seminarId: sem1.id,
        userId: userMap['elena@xchange.dev'],
        content: 'Are we going to discuss token streaming back to Next.js via WebSockets?',
        isPinned: false,
        isModerator: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 5),
      },
    ],
  });

  await prisma.seminarQuestion.createMany({
    data: [
      {
        seminarId: sem1.id,
        userId: userMap['daniel@xchange.dev'],
        question: 'How do you handle context window degradation during fine-tuning on 8k sequences?',
        upvotes: 42,
        isAnswered: false,
        isAnsweringNow: true,
      },
      {
        seminarId: sem1.id,
        userId: userMap['sara@xchange.dev'],
        question: 'What is the minimum VRAM required to train 4-bit LoRA without out-of-memory errors?',
        upvotes: 29,
        isAnswered: true,
        isAnsweringNow: false,
      },
      {
        seminarId: sem1.id,
        userId: userMap['maya@xchange.dev'],
        question: 'Can this model generate structured JSON schema outputs reliably?',
        upvotes: 18,
        isAnswered: false,
        isAnsweringNow: false,
      },
    ],
  });

  // More seminars
  await prisma.seminar.create({
    data: {
      hostId: userMap['sara@xchange.dev'],
      title: 'Minimalist Design Systems for Developers (Drinkit & Linear Aesthetic)',
      description: 'Bridging Figma auto-layout and Tailwind CSS without slop. Information density, micro-interactions, monospace metrics, and high-contrast typography.',
      category: 'DESIGN & UI/UX',
      level: 'All Levels',
      language: 'English',
      date: 'Oct 02, 2026',
      time: '19:00 CET',
      duration: 60,
      maxParticipants: 500,
      participantCount: 412,
      isLive: false,
      status: 'UPCOMING',
    },
  });

  await prisma.seminar.create({
    data: {
      hostId: userMap['daniel@xchange.dev'],
      title: 'Rust Concurrency: Mastering Atomics, Mutexes & Lock-Free Data Structures',
      description: 'From Send and Sync traits to lock-free ring buffers in production systems. No boilerplate, pure engineering.',
      category: 'SYSTEMS & CODING',
      level: 'Advanced',
      language: 'English',
      date: 'Oct 04, 2026',
      time: '18:30 CET',
      duration: 75,
      maxParticipants: 400,
      participantCount: 289,
      isLive: false,
      status: 'UPCOMING',
    },
  });

  await prisma.seminar.create({
    data: {
      hostId: userMap['marcus@xchange.dev'],
      title: 'DaVinci Resolve 19: High-End Color Grading for Commercial Video',
      description: 'ACES color workflows, film emulation, power grades, and color separation for tech product showcases.',
      category: 'VIDEO EDITING & MEDIA',
      level: 'Intermediate',
      language: 'English',
      date: 'Oct 06, 2026',
      time: '17:00 GMT',
      duration: 80,
      maxParticipants: 300,
      participantCount: 198,
      isLive: false,
      status: 'UPCOMING',
    },
  });

  await prisma.seminar.create({
    data: {
      hostId: userMap['kenji@xchange.dev'],
      title: 'Production Kubernetes: Zero-Downtime Multi-Cluster Architecture',
      description: 'Real-world ingress setups, Cilium eBPF networking, GitOps with ArgoCD, and automated disaster failover.',
      category: 'DEVOPS & CLOUD',
      level: 'Advanced',
      language: 'English',
      date: 'Oct 08, 2026',
      time: '12:00 JST',
      duration: 90,
      maxParticipants: 500,
      participantCount: 450,
      isLive: false,
      status: 'UPCOMING',
    },
  });

  console.log('Seeding Proof of Learning Tests...');
  const pyTest = await prisma.test.create({
    data: {
      skillId: skillMap['Python'],
      title: 'Python Core & Concurrency Assessment',
      description: 'Verify your knowledge of memory management, generators, decorators and the Global Interpreter Lock (GIL).',
      level: 'Intermediate',
      questions: {
        create: [
          {
            question: 'What happens when a generator function encounters the "yield" keyword in Python?',
            optionA: 'The function terminates and frees its stack frame.',
            optionB: 'Execution pauses, current state is preserved, and the value is yielded to the caller.',
            optionC: 'A new thread is spawned to evaluate subsequent statements.',
            optionD: 'Python creates an asynchronous coroutine that runs on the event loop.',
            correctOption: 'B',
            explanation: 'yield suspends execution and yields the value, maintaining frame variables and execution pointer for next().',
          },
          {
            question: 'Which built-in module in Python is used for profiling memory allocations down to individual line numbers?',
            optionA: 'cProfile',
            optionB: 'tracemalloc',
            optionC: 'timeit',
            optionD: 'sys.getsizeof',
            correctOption: 'B',
            explanation: 'tracemalloc tracks memory blocks allocated by Python and can take snapshots to detect leaks.',
          },
          {
            question: 'What is the primary distinction between "asyncio.gather" and "asyncio.wait"?',
            optionA: 'gather only works with synchronous threads.',
            optionB: 'gather returns results in the order passed, whereas wait returns sets of completed and pending futures.',
            optionC: 'wait is deprecated since Python 3.8.',
            optionD: 'gather cancels tasks automatically on timeout.',
            correctOption: 'B',
            explanation: 'asyncio.gather returns an aggregate list of results in input order, while asyncio.wait provides detailed control over completed/pending tasks.',
          },
          {
            question: 'In Python 3.12+, what significant architectural option was introduced regarding the Global Interpreter Lock (GIL)?',
            optionA: 'GIL was completely removed with no option to re-enable.',
            optionB: 'Free-threaded mode (PEP 703) allowing disabling the GIL at build time.',
            optionC: 'GIL now runs in the GPU kernel.',
            optionD: 'GIL is restricted strictly to C-extensions.',
            correctOption: 'B',
            explanation: 'PEP 703 introduces experimental free-threading, allowing running Python threads concurrently on multiple CPU cores without the GIL.',
          },
          {
            question: 'What will "is" vs "==" evaluate for two separate lists with identical elements: a = [1, 2] and b = [1, 2]?',
            optionA: 'a == b is True, a is b is False',
            optionB: 'a == b is False, a is b is True',
            optionC: 'Both evaluate to True',
            optionD: 'Both evaluate to False',
            correctOption: 'A',
            explanation: '== compares value equality, whereas "is" checks memory identity (id(a) == id(b)). Two newly instantiated lists have different memory addresses.',
          },
        ],
      },
    },
  });

  // Seed user progress on Alex
  await prisma.progress.create({
    data: {
      userId: userMap['alex@xchange.dev'],
      skillId: skillMap['Python'],
      progressPercent: 92,
      hoursSpent: 32.5,
      streakDays: 8,
    },
  });

  await prisma.progress.create({
    data: {
      userId: userMap['alex@xchange.dev'],
      skillId: skillMap['PyTorch & AI'],
      progressPercent: 78,
      hoursSpent: 18.0,
      streakDays: 8,
    },
  });

  await prisma.progress.create({
    data: {
      userId: userMap['alex@xchange.dev'],
      skillId: skillMap['English for IT'],
      progressPercent: 64,
      hoursSpent: 12.0,
      streakDays: 5,
    },
  });

  // Seed XCredit transactions for Alex
  await prisma.xCreditTransaction.createMany({
    data: [
      {
        userId: userMap['alex@xchange.dev'],
        amount: 5,
        type: 'BONUS',
        description: 'Welcome onboard bonus credits',
      },
      {
        userId: userMap['alex@xchange.dev'],
        amount: 1,
        type: 'EARNED_TEACHING',
        description: 'Taught Python session (1 hour)',
      },
      {
        userId: userMap['alex@xchange.dev'],
        amount: 1,
        type: 'EARNED_TEACHING',
        description: 'Taught PyTorch workshop (1 hour)',
      },
      {
        userId: userMap['alex@xchange.dev'],
        amount: -1,
        type: 'SPENT_LEARNING',
        description: 'Learned English pronunciation from Amina (1 hour)',
      },
    ],
  });

  // Seed Notifications for Alex
  await prisma.notification.createMany({
    data: [
      {
        userId: userMap['alex@xchange.dev'],
        type: 'MATCH',
        title: '🔥 New Perfect Match Found!',
        message: 'Amina Al-Mansoor matches 96% with your learning goal (English ↔ Python).',
        link: '/matches',
        isRead: false,
      },
      {
        userId: userMap['alex@xchange.dev'],
        type: 'SESSION',
        title: 'Session Confirmed',
        message: 'Your 1-on-1 session with Amina is confirmed for tomorrow at 18:00 CET.',
        link: '/calendar',
        isRead: false,
      },
      {
        userId: userMap['alex@xchange.dev'],
        type: 'SEMINAR',
        title: 'Your Seminar is Live!',
        message: '347 attendees have joined "Fine-Tuning Open Source LLMs on Consumer GPUs".',
        link: `/seminars/${sem1.id}/live`,
        isRead: false,
      },
    ],
  });

  // Seed Reviews
  const sess = await prisma.session.findFirst();
  if (sess) {
    await prisma.review.create({
      data: {
        sessionId: sess.id,
        reviewerId: userMap['amina@xchange.dev'],
        revieweeId: userMap['alex@xchange.dev'],
        rating: 5,
        clarityScore: 5,
        understandScore: 5,
        wouldStudyAgain: true,
        comment: 'Alex has an exceptional teaching style! He broke down asyncio coroutines and event loops with visual diagrams that made instant sense.',
      },
    });
  }

  console.log('✅ Seed completed successfully with 18 users, 25 skills, matches, conversations, seminars, and quizzes!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
