'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'ru' | 'kz' | 'en';

export interface Translations {
  [key: string]: {
    ru: string;
    kz: string;
    en: string;
  };
}

export const DICTIONARY: Translations = {
  // Brand & Slogan
  slogan: {
    en: 'Your skills for theirs. No money, just knowledge.',
    ru: 'Твои навыки в обмен на их. Без денег, только знания.',
    kz: 'Сенің білімің олардікіне. Ақшасыз, тек білім.',
  },
  protocol_tag: {
    en: 'PIXELMINK PROTOCOL v1.0 • COMPUTER SCIENCE BARTER',
    ru: 'ПРОТОКОЛ PIXELMINK v1.0 • БАРТЕР В COMPUTER SCIENCE',
    kz: 'PIXELMINK ХАТТАМАСЫ v1.0 • COMPUTER SCIENCE БАРТЕРІ',
  },
  // Navbar
  nav_simulator: {
    en: 'Protocol Simulator',
    ru: 'Симулятор бартера',
    kz: 'Бартер симуляторы',
  },
  nav_matrix: {
    en: 'CS Matrix',
    ru: 'Каталог навыков',
    kz: 'Дағдылар каталогы',
  },
  nav_rules: {
    en: 'How It Works',
    ru: 'Как это работает',
    kz: 'Қалай жұмыс істейді',
  },
  nav_activity: {
    en: 'Live Barters',
    ru: 'Живые обмены',
    kz: 'Тікелей алмасулар',
  },
  nav_manifesto: {
    en: 'Manifesto',
    ru: 'Манифест',
    kz: 'Манифест',
  },
  nav_signin: {
    en: 'Sign In',
    ru: 'Войти',
    kz: 'Кіру',
  },
  nav_register: {
    en: 'Register',
    ru: 'Регистрация',
    kz: 'Тіркелу',
  },
  nav_workspace: {
    en: 'Enter Workspace',
    ru: 'В платформу',
    kz: 'Платформаға өту',
  },
  nav_landing: {
    en: 'Main Page',
    ru: 'Главная страница',
    kz: 'Басты бет',
  },

  // Hero Section
  hero_title_1: {
    en: 'Your skills for theirs.',
    ru: 'Твои навыки в обмен на их.',
    kz: 'Сенің білімің олардікіне.',
  },
  hero_title_2: {
    en: 'No money, just knowledge.',
    ru: 'Без денег, только знания.',
    kz: 'Ақшасыз, тек білім.',
  },
  hero_desc: {
    en: 'The decentralized barter protocol for Computer Science, Low-Level Systems, AI/ML, and Software Craft. Teach what you master for 1 hour — unlock 1 hour of 1-on-1 mentorship with another senior peer. Zero fiat currency.',
    ru: 'Децентрализованный бартерный протокол для Computer Science, системного программирования, AI/ML и архитектуры. 1 час менторства = 1 час персонального обучения у другого сеньор-инженера. Без денег и подписок.',
    kz: 'Computer Science, жүйелік бағдарламалау, AI/ML және сәулет бойынша орталықсыздандырылған білім алмасу хаттамасы. 1 сағат үйреткеніңіз = желідегі басқа сеньор-маманнан 1 сағат жеке оқу. Ақшасыз және жазылымсыз.',
  },
  hero_btn_register: {
    en: 'Create Profile & Pick CS Skills',
    ru: 'Создать профиль и выбрать CS навыки',
    kz: 'Профиль жасап, CS дағдыларын таңдау',
  },
  hero_btn_explore: {
    en: 'Explore Active Peers',
    ru: 'Смотреть инженеров онлайн',
    kz: 'Инженерлерді онлайн көру',
  },
  hero_btn_matches: {
    en: 'Live Match Engine',
    ru: 'Алгоритм матчинга',
    kz: 'Матчинг алгоритмі',
  },

  // Startup Launch Specs (Authentic, no fake metrics)
  spec_stage_title: {
    en: 'Platform Status',
    ru: 'Статус платформы',
    kz: 'Платформа кезеңі',
  },
  spec_stage_val: {
    en: 'Public Launch v1.0',
    ru: 'Открытый запуск v1.0',
    kz: 'Ашық старт v1.0',
  },
  spec_model_title: {
    en: 'Barter Rule',
    ru: 'Принцип обмена',
    kz: 'Алмасу қағидаты',
  },
  spec_model_val: {
    en: '1 Hour = 1 Hour',
    ru: '1 час = 1 час',
    kz: '1 сағат = 1 сағат',
  },
  spec_cost_title: {
    en: 'Fiat Currency',
    ru: 'Фиатные деньги',
    kz: 'Ақшалай төлем',
  },
  spec_cost_val: {
    en: '$0 (Zero Money)',
    ru: '0 ₸ / 0 ₽ (Без денег)',
    kz: '0 ₸ (Ақшасыз)',
  },
  spec_stack_title: {
    en: 'Session Stack',
    ru: 'Связь и сессии',
    kz: 'Байланыс және бейне',
  },
  spec_stack_val: {
    en: 'P2P WebRTC Direct',
    ru: 'P2P WebRTC Direct',
    kz: 'P2P WebRTC Direct',
  },

  // Simulator
  sim_badge: {
    en: 'PROTOCOL SIMULATOR',
    ru: 'СИМУЛЯТОР ПРОТОКОЛА',
    kz: 'ХАТТАМА СИМУЛЯТОРЫ',
  },
  sim_title: {
    en: 'Reciprocal & Semantic Exchange Flow',
    ru: 'Реципрокный и семантический поток обмена',
    kz: 'Өзара және семантикалық алмасу ағыны',
  },
  sim_desc: {
    en: 'The engine evaluates reciprocal skill overlap and bio keyword similarity. Zero money transactions.',
    ru: 'Алгоритм вычисляет двустороннее совпадение навыков и пересечение ключевых слов в описании инженера.',
    kz: 'Алгоритм дағдылардың өзара сәйкестігін және инженердің биосындағы кілт сөздерді есептейді.',
  },
  sim_scenario_label: {
    en: 'Select Scenario:',
    ru: 'Сценарий обмена:',
    kz: 'Алмасу сценарийі:',
  },
  sim_scen_1: {
    en: 'Rust Systems ↔ PyTorch AI',
    ru: 'Rust Systems ↔ PyTorch AI',
    kz: 'Rust Systems ↔ PyTorch AI',
  },
  sim_scen_2: {
    en: 'LLM Fine-Tuning ↔ PostgreSQL',
    ru: 'LLM Fine-Tuning ↔ PostgreSQL',
    kz: 'LLM Fine-Tuning ↔ PostgreSQL',
  },
  sim_scen_3: {
    en: '3-Way Loop (A → B → C → A)',
    ru: 'Цикл 3-х узлов (A → B → C → A)',
    kz: '3-торап циклі (A → B → C → A)',
  },
  sim_match_tag: {
    en: 'PERFECT RECIPROCAL MATCH',
    ru: 'ИДЕАЛЬНЫЙ РЕЦИПРОКНЫЙ МАТЧ',
    kz: 'КЕМЕЛ ӨЗАРА СӘЙКЕСТІК',
  },
  sim_match_detail: {
    en: '1 hour Rust pair debugging = 1 hour PyTorch RAG architecture session.',
    ru: '1 час парного дебага на Rust = 1 час проектирования RAG на PyTorch.',
    kz: 'Rust тілінде 1 сағат жұптасып түзету = PyTorch RAG бойынша 1 сағат сабақ.',
  },
  sim_circular_title: {
    en: 'Circular Knowledge Graph Resolution',
    ru: 'Разрешение спроса через циклический граф',
    kz: 'Сұранысты циклдік граф арқылы шешу',
  },
  sim_circular_badge: {
    en: 'A → B → C → A Cycle',
    ru: 'Цикл A → B → C → A',
    kz: 'A → B → C → A циклі',
  },

  // Disciplines
  cat_tag: {
    en: 'KNOWLEDGE CATALOG',
    ru: 'КАТАЛОГ ЗНАНИЙ',
    kz: 'БІЛІМ КАТАЛОГЫ',
  },
  cat_title: {
    en: 'Core Technical Disciplines',
    ru: 'Инженерные направления Computer Science',
    kz: 'Computer Science инженерлік бағыттары',
  },
  cat_view_all: {
    en: 'View All Skills',
    ru: 'Все навыки',
    kz: 'Барлық дағдылар',
  },
  cat_active_peers: {
    en: 'peers active',
    ru: 'инженеров',
    kz: 'маман белсенді',
  },

  // Rules / How it works
  rules_tag: {
    en: 'PROTOCOL RULES',
    ru: 'ПРАВИЛА БАРТЕРА',
    kz: 'БАРТЕР ЕРЕЖЕЛЕРІ',
  },
  rules_title: {
    en: 'How Peer Barter Operates',
    ru: 'Как устроен процесс обмена',
    kz: 'Алмасу процесі қалай жүреді',
  },
  rule_1_title: {
    en: 'Vector Registration',
    ru: 'Векторная регистрация',
    kz: 'Векторлық тіркеу',
  },
  rule_1_desc: {
    en: 'Select your teaching skills and learning desires from the Computer Science catalog, plus bio focus.',
    ru: 'Укажите, чему вы можете обучать и что хотите изучить из CS каталога, а также ваш стек.',
    kz: 'CS каталогынан не үйрете алатыныңызды және нені меңгергіңіз келетінін таңдаңыз.',
  },
  rule_2_title: {
    en: 'Reciprocal Matching',
    ru: 'Реципрокный матчинг',
    kz: 'Өзара сәйкестендіру',
  },
  rule_2_desc: {
    en: 'Algorithmic scoring computes direct reciprocal overlap or 3-node circular barter loops.',
    ru: 'Алгоритм ищет прямое пересечение потребностей или выстраивает 3-стороннюю цепочку обмена.',
    kz: 'Алгоритм тікелей қажеттіліктердің сәйкестігін табады немесе 3 жақты алмасу тізбегін құрады.',
  },
  rule_3_title: {
    en: 'Live 1-on-1 WebRTC',
    ru: 'Парный WebRTC звонок',
    kz: 'Жұптық WebRTC қоңырауы',
  },
  rule_3_desc: {
    en: 'Encrypted peer audio, video, and screen sharing to review code, debug terminals, and study.',
    ru: 'Шифрованный видеозвонок со стримингом экрана для код-ревью, совместного дебага и разбора теории.',
    kz: 'Кодты тексеру, бірге жөндеу және теорияны талдау үшін экран көрсетілімі бар бейнеқоңырау.',
  },
  rule_4_title: {
    en: 'Proof & Credits',
    ru: 'Подтверждение и кредиты',
    kz: 'Дәлелдеу және кредиттер',
  },
  rule_4_desc: {
    en: 'Complete sessions to earn XCredits (1 hr taught = 1 hr learned) and pass verified mastery quizzes.',
    ru: '1 час обучения дает 1 XCredit для бронирования урока у любого эксперта + проверочные тесты.',
    kz: '1 сағат үйрету кез келген сарапшыдан сабақ алу үшін 1 XCredit береді + растау тесттері.',
  },

  // Live Barters Ticker
  ticker_title: {
    en: 'Live Network Barters',
    ru: 'Трансляция текущих обменов',
    kz: 'Ағымдағы алмасулар трансляциясы',
  },
  ticker_sub: {
    en: 'Real-time peer streams',
    ru: 'Прямой эфир платформы',
    kz: 'Платформаның тікелей эфирі',
  },

  // Manifesto CTA
  manifesto_title_1: {
    en: 'Stop Paying for Courses.',
    ru: 'Хватит платить за инфоцыганские курсы.',
    kz: 'Пайдасыз курстарға ақша шашпаңыз.',
  },
  manifesto_title_2: {
    en: 'Trade Your Engineering Knowledge.',
    ru: 'Обменивайся реальным инженерным опытом.',
    kz: 'Нақты инженерлік тәжірибемен алмасыңыз.',
  },
  manifesto_desc: {
    en: 'Join the pixelmink developer network. Connect with engineers worldwide across low-level systems, machine learning, and distributed infrastructure.',
    ru: 'Присоединяйся к сообществу pixelmink. Находи коллег по всему миру в сферах низкоуровневых систем, ML и распределенной инфраструктуры.',
    kz: 'pixelmink қауымдастығына қосылыңыз. Төменгі деңгейлі жүйелер, ML және инфрақұрылым салаларында әлем бойынша әріптестер табыңыз.',
  },
  manifesto_btn: {
    en: 'Create Your Account & Claim 5 XC',
    ru: 'Создать аккаунт и получить 5 XC',
    kz: 'Тіркелгі жасап, 5 XC алу',
  },
  manifesto_browse: {
    en: 'Browse Peer Graph',
    ru: 'Смотреть граф инженеров',
    kz: 'Инженерлер графы',
  },

  // Registration Form
  reg_identity_step: {
    en: '01 // Identity',
    ru: '01 // Профиль',
    kz: '01 // Профиль',
  },
  reg_skills_step: {
    en: '02 // CS Skills',
    ru: '02 // Навыки CS',
    kz: '02 // CS Дағдылары',
  },
  reg_bio_step: {
    en: '03 // Bio & Match',
    ru: '03 // Био и Матч',
    kz: '03 // Био және Матч',
  },
  reg_cred_title: {
    en: 'Developer Credentials',
    ru: 'Данные разработчика',
    kz: 'Әзірлеуші деректері',
  },
  reg_cred_desc: {
    en: 'Your handle is paired with a GitHub-style Identicon. No real photo required.',
    ru: 'Ваш никнейм генерирует пиксельный Identicon как на GitHub. Реальное фото не требуется.',
    kz: 'Никнейміңіз GitHub сияқты пиксельдік Identicon жасайды. Нақты фотосурет қажет емес.',
  },
  reg_name_label: {
    en: 'Full Name or Engineering Handle',
    ru: 'Имя или инженерный никнейм',
    kz: 'Аты-жөні немесе никнеймі',
  },
  reg_email_label: {
    en: 'Email Address',
    ru: 'Email адрес',
    kz: 'Email мекенжайы',
  },
  reg_pass_label: {
    en: 'Password',
    ru: 'Пароль',
    kz: 'Құпия сөз',
  },
  reg_btn_to_skills: {
    en: 'Proceed to CS Topics (02)',
    ru: 'Перейти к выбору навыков (02)',
    kz: 'Дағдыларды таңдауға өту (02)',
  },
  reg_matrix_title: {
    en: 'Skills Catalog (Ranked by Popularity)',
    ru: 'Каталог навыков (по популярности)',
    kz: 'Дағдылар каталогы (танымалдылығы бойынша)',
  },
  reg_matrix_desc: {
    en: 'Organized from most popular to specialized across Coding, Design, Video, and AI.',
    ru: 'Отсортировано от самых востребованных к нишевым: Кодинг, Дизайн, Монтаж и ИИ.',
    kz: 'Ең сұранысқа иеден бастап арнайыға дейін: Бағдарламалау, Дизайн, Монтаж және ЖИ.',
  },
  filter_all: {
    en: 'All',
    ru: 'Все',
    kz: 'Барлығы',
  },
  filter_coding: {
    en: '💻 Coding',
    ru: '💻 Кодинг',
    kz: '💻 Кодинг',
  },
  filter_design: {
    en: '🎨 Design & 3D',
    ru: '🎨 Дизайн',
    kz: '🎨 Дизайн',
  },
  filter_video: {
    en: '🎬 Video & Audio',
    ru: '🎬 Монтаж',
    kz: '🎬 Монтаж',
  },
  filter_ai: {
    en: '🤖 AI & ML',
    ru: '🤖 ИИ',
    kz: '🤖 ЖИ',
  },
  reg_can_teach: {
    en: 'I Can Teach',
    ru: 'Могу обучать',
    kz: 'Үйрете аламын',
  },
  reg_want_learn: {
    en: 'I Want to Learn',
    ru: 'Хочу изучить',
    kz: 'Үйренгім келеді',
  },
  reg_search_placeholder: {
    en: 'Search skills (e.g. Python, Figma, Premiere Pro, ChatGPT, Rust)...',
    ru: 'Поиск навыков (например, Python, Figma, Premiere Pro, ChatGPT, Blender)...',
    kz: 'Дағдыларды іздеу (мысалы, Python, Figma, Premiere Pro, ChatGPT, Blender)...',
  },
  reg_btn_to_bio: {
    en: 'Proceed to Bio & Matching (03)',
    ru: 'Перейти к био и матчингу (03)',
    kz: 'Био мен матчингке өту (03)',
  },
  reg_bio_title: {
    en: 'Engineering Bio & Semantic Match',
    ru: 'Инженерный стек и цели обучения',
    kz: 'Инженерлік стек және оқу мақсаттары',
  },
  reg_bio_desc: {
    en: 'Describe your tech background. The engine performs token intersection against other peers.',
    ru: 'Опишите ваши проекты и задачи. Алгоритм ищет семантические совпадения с коллегами.',
    kz: 'Жобаларыңыз бен міндеттеріңізді сипаттаңыз. Алгоритм әріптестермен сәйкестіктерді іздейді.',
  },
  reg_bio_label: {
    en: 'Engineering Bio / Current Focus',
    ru: 'О себе / Текущий стек и фокус',
    kz: 'Өзі туралы / Қазіргі стек және бағыт',
  },
  reg_bio_placeholder: {
    en: 'Describe what you are engineering or studying (e.g. distributed Raft consensus in Rust, PyTorch transformer fine-tuning)...',
    ru: 'Опишите, над чем работаете или что изучаете (например, распределенный консенсус Raft на Rust, дообучение трансформеров на PyTorch)...',
    kz: 'Немен жұмыс істеп жатқаныңызды немесе не оқып жатқаныңызды жазыңыз (мысалы, Rust-тағы Raft консенсусы, PyTorch трансформаторларын баптау)...',
  },
  reg_submit_btn: {
    en: 'Complete Profile & Claim 5 XC',
    ru: 'Завершить регистрацию и забрать 5 XC',
    kz: 'Тіркелуді аяқтап, 5 XC алу',
  },
  reg_already_have: {
    en: 'Already have an account?',
    ru: 'Уже есть аккаунт?',
    kz: 'Тіркелгіңіз бар ма?',
  },
  reg_identicon_preview: {
    en: 'Live Identicon Preview',
    ru: 'Превью Identicon в реальном времени',
    kz: 'Нақты уақыттағы Identicon превьюі',
  },
  reg_calc_power: {
    en: 'Network Match Synergy',
    ru: 'Совпадение с платформой',
    kz: 'Платформамен сәйкестік',
  },
  reg_instant_overlap: {
    en: 'Instant Network Overlap:',
    ru: 'Совпадение с сетью инженеров:',
    kz: 'Инженерлер желісімен сәйкестік:',
  },
  reg_extracted_keywords: {
    en: 'Extracted Bio Keywords (used in matching):',
    ru: 'Извлеченные ключевые слова из описания:',
    kz: 'Биодан алынған негізгі кілт сөздер:',
  },
  reg_bonus_badge: {
    en: 'Includes +5 XCredits to immediately book your first 1-on-1 session.',
    ru: 'Включает +5 XCredits для мгновенного бронирования вашей первой сессии.',
    kz: 'Алғашқы жеке сессияны бірден брондау үшін +5 XCredits беріледі.',
  },

  // Back button
  btn_back: {
    en: 'Back',
    ru: 'Назад',
    kz: 'Артқа',
  },

  // Login Page
  login_heading: {
    en: 'Sign in to your account',
    ru: 'Вход в аккаунт',
    kz: 'Тіркелгіге кіру',
  },
  login_email: {
    en: 'Email Address',
    ru: 'Email адрес',
    kz: 'Email мекенжайы',
  },
  login_password: {
    en: 'Password',
    ru: 'Пароль',
    kz: 'Құпия сөз',
  },
  login_submit: {
    en: 'Sign In',
    ru: 'Войти',
    kz: 'Кіру',
  },
  login_authenticating: {
    en: 'Authenticating...',
    ru: 'Проверка данных...',
    kz: 'Тексерілуде...',
  },
  login_demo_profiles: {
    en: '1-Click Demo Peer Profiles',
    ru: 'Быстрый вход в профили инженеров',
    kz: 'Инженерлер профиліне жылдам кіру',
  },
  login_dont_have: {
    en: "Don't have an account?",
    ru: 'Еще нет аккаунта?',
    kz: 'Тіркелгіңіз жоқ па?',
  },
  login_register_link: {
    en: 'Register and get 5 XC',
    ru: 'Зарегистрироваться и получить 5 XC',
    kz: 'Тіркеліп, 5 XC алу',
  },

  // FAQ Section
  faq_tag: {
    en: 'Knowledge Base & Questions',
    ru: 'База знаний и частые вопросы',
    kz: 'Білім базасы және жиі қойылатын сұрақтар',
  },
  faq_title: {
    en: 'Frequently Asked Questions',
    ru: 'Часто задаваемые вопросы',
    kz: 'Жиі қойылатын сұрақтар',
  },
  faq_desc: {
    en: 'Clear answers on how the barter protocol works, how peer safety is ensured, and how knowledge exchange operates.',
    ru: 'Подробные ответы о принципах бартерного протокола, безопасности участников и регламенте обмена знаниями.',
    kz: 'Бартерлік протокол қағидалары, қатысушылар қауіпсіздігі және білім алмасу ережелері бойынша нақты жауаптар.',
  },
  faq_q1: {
    en: 'How does moneyless skill exchange work?',
    ru: 'Как работает обмен навыками без денег?',
    kz: 'Ақшасыз дағды алмасу қалай жұмыс істейді?',
  },
  faq_a1: {
    en: 'The platform operates on a strict 1:1 time barter rule. For every hour you mentor or teach a peer in your strong domain (e.g., Rust, Python, System Architecture), you earn 1 credit to receive an hour of 1-on-1 mentorship in any technology you want to learn (e.g., PyTorch, DevOps, 3D). No subscriptions, no fiat payments.',
    ru: 'Платформа действует по строгому правилу взаимного бартера времени 1:1. За каждый час обучения другого инженера вашей ключевой технологии (например, Rust, Python, архитектура) вы получаете 1 час персонального менторства по интересующей вас теме (PyTorch, DevOps, UI/UX). Никаких подписок или фиатных платежей.',
    kz: 'Платформа уақытты 1:1 қатаң өзара бартерлік қағидасы бойынша жұмыс істейді. Басқа инженерге өз салаңыздан (мысалы, Rust, Python, жүйелік архитектура) 1 сағат үйреткеніңіз үшін, өзіңіз үйренгіңіз келетін тақырып бойынша (PyTorch, DevOps, UI/UX) 1 сағат жеке менторлық аласыз. Жазылымдар немесе ақшалай төлемдер мүлдем жоқ.',
  },
  faq_q2: {
    en: 'How are competence and skills verified?',
    ru: 'Как подтверждается квалификация участников?',
    kz: 'Қатысушылардың біліктілігі қалай расталады?',
  },
  faq_a2: {
    en: 'Skills are confirmed through practical technical assessments, public GitHub repository verification, and mutual peer reviews after each completed session. Low-quality or inactive participants lose platform match priority.',
    ru: 'Компетенции подтверждаются практическими тестами, привязкой публичных репозиториев GitHub и двусторонними рецензиями после каждой сессии. Недобросовестные участники теряют приоритет в алгоритме матчинга.',
    kz: 'Дағдылар тәжірибелік сынақтар, ашық GitHub репозиторийлері және әр өткізілген сессиядан кейінгі екіжақты бағалау арқылы расталады. Белсенді емес немесе жауапсыз қатысушылар сәйкестендіру алгоритміндегі басымдығын жоғалтады.',
  },
  faq_q3: {
    en: 'How do 1-on-1 exchange sessions take place?',
    ru: 'Как проходят сессии обмена?',
    kz: 'Алмасу сессиялары қалай өтеді?',
  },
  faq_a3: {
    en: 'Sessions are hosted directly in your browser via secure P2P WebRTC video calls with built-in interactive code sharing, screen demonstration, and shared notes. No third-party software installation required.',
    ru: 'Сессии проходят непосредственно в браузере через защищенный P2P WebRTC видеозвонок со встроенным совместным редактором кода, демонстрацией экрана и заметками. Установка сторонних программ не требуется.',
    kz: 'Сессиялар тікелей браузер ішінде қауіпсіз P2P WebRTC бейнебайланысы, бірлескен код редакторы, экран көрсету және жазбалар арқылы өтеді. Бөтен бағдарламаларды орнату қажет емес.',
  },
  faq_q4: {
    en: 'What if two engineers do not match directly?',
    ru: 'Что если у нас нет прямого совпадения навыков?',
    kz: 'Егер екі қатысушының дағдылары тікелей сәйкес келмесе ше?',
  },
  faq_a4: {
    en: 'pixelmink supports circular 3-way and multi-party routing (Node A teaches Node B, Node B teaches Node C, and Node C teaches Node A). You can always exchange time credits with the wider network even without a direct pair.',
    ru: 'pixelmink поддерживает кольцевую маршрутизацию (Узел A обучает Узел B, Узел B обучает Узел C, а Узел C обучает Узел A). Вы всегда можете обменять полученные часы со всей инженерной сетью платформы.',
    kz: 'pixelmink көп түйінді сақиналы бағыттауды қолдайды (A түйіні B-ге үйретеді, B түйіні C-ге үйретеді, ал C түйіні A-ға үйретеді). Тікелей сәйкестік болмаған күннің өзінде жиналған уақытты жалпы желімен оңай алмастыра аласыз.',
  },
  faq_q5: {
    en: 'How is user privacy and data protected?',
    ru: 'Как защищены мои персональные данные?',
    kz: 'Жеке деректер қалай қорғалады?',
  },
  faq_a5: {
    en: 'We collect minimal necessary profile data solely for matchmaking. Media streams during video sessions are strictly peer-to-peer and never recorded on our servers. Your data is never sold or shared with advertisers.',
    ru: 'Мы собираем только минимально необходимые данные профиля исключительно для алгоритма подбора менторов. Медиапотоки во время звонков передаются peer-to-peer и не записываются на серверах. Данные никогда не передаются рекламодателям.',
    kz: 'Біз тек менторларды таңдау үшін қажетті ең аз деректерді ғана жинаймыз. Қоңыраулар кезіндегі медиаағындар тек peer-to-peer арқылы беріледі және серверлерде жазылмайды. Деректер жарнама берушілерге ешқашан сатылмайды.',
  },

  // Bottom Panel & Footer Navigation
  footer_brand_desc: {
    en: 'P2P Computer Science & Skill Barter Platform. Your skills for theirs. No money, just knowledge.',
    ru: 'P2P-платформа обмена навыками в Computer Science. Ваши навыки в обмен на их. Никаких денег, только знания.',
    kz: 'Computer Science саласындағы P2P дағды алмасу платформасы. Сіздің біліміңіз олардың біліміне. Ақшасыз, тек таза білім.',
  },
  footer_col_platform: {
    en: 'Platform',
    ru: 'Платформа',
    kz: 'Платформа',
  },
  footer_col_legal: {
    en: 'Legal & Privacy',
    ru: 'Конфиденциальность и право',
    kz: 'Құпиялылық және құқық',
  },
  footer_col_resources: {
    en: 'Resources',
    ru: 'Ресурсы',
    kz: 'Ресурстар',
  },
  footer_privacy: {
    en: 'Privacy Policy',
    ru: 'Условия конфиденциальности',
    kz: 'Құпиялылық саясаты',
  },
  footer_terms: {
    en: 'Terms of Use',
    ru: 'Правила платформы',
    kz: 'Пайдалану ережелері',
  },
  footer_faq: {
    en: 'FAQ',
    ru: 'FAQ & Вопросы',
    kz: 'Жиі қойылатын сұрақтар',
  },
  footer_rights: {
    en: 'All rights reserved.',
    ru: 'Все права защищены.',
    kz: 'Барлық құқықтар қорғалған.',
  },
  footer_open_source: {
    en: 'Open Source on GitHub',
    ru: 'Открытый код на GitHub',
    kz: 'GitHub-тағы ашық бастапқы код',
  },

  // Privacy Policy Page
  privacy_title: {
    en: 'Privacy Policy & Terms',
    ru: 'Условия конфиденциальности',
    kz: 'Құпиялылық саясаты мен шарттары',
  },
  privacy_subtitle: {
    en: 'How pixelmink protects your privacy, personal information, and peer-to-peer data.',
    ru: 'Как pixelmink защищает вашу приватность, персональные данные и P2P-сессии.',
    kz: 'pixelmink сіздің құпиялылығыңызды, жеке деректеріңізді және P2P-сессияларыңызды қалай қорғайды.',
  },
  privacy_last_updated: {
    en: 'Effective date: September 2026',
    ru: 'Действует с: Сентябрь 2026',
    kz: 'Қолданылу мерзімі: Қыркүйек 2026',
  },
  privacy_sec1_title: {
    en: '1. Core Principles & Zero Commercialization',
    ru: '1. Основные принципы и отказ от коммерциализации',
    kz: '1. Негізгі қағидаттар және коммерцияландырудан бас тарту',
  },
  privacy_sec1_desc: {
    en: 'pixelmink is built around moneyless, peer-to-peer engineering skill barter. We do not monetize your data, run commercial ad-tracking, or sell user records to third-party data brokers.',
    ru: 'pixelmink построен вокруг некоммерческого P2P-обмена инженерными знаниями. Мы не монетизируем ваши данные, не внедряем коммерческие рекламные трекеры и не передаем сведения брокерам данных.',
    kz: 'pixelmink инженерлік білімді ақшасыз P2P алмасуға негізделген. Біз деректеріңізді сатпаймыз, коммерциялық жарнамалық трекерлерді қолданбаймыз және үшінші тарапқа мәліметтерді бермейміз.',
  },
  privacy_sec2_title: {
    en: '2. What Data We Collect',
    ru: '2. Собираемые данные',
    kz: '2. Жиналатын деректер',
  },
  privacy_sec2_desc: {
    en: 'We collect only the bare minimum required for platform operation: your display name/handle, account email, specified technical skills (to teach and to learn), and your self-written engineer bio.',
    ru: 'Мы собираем исключительно минимальный объем данных для работы платформы: имя или никнейм, рабочий email, выбранные компетенции (для обучения и изучения) и текст инженерного описания (bio).',
    kz: 'Біз тек платформа жұмысына қажетті ең аз деректерді жинаймыз: көрсетілетін есім немесе лақап ат, электрондық пошта, таңдалған дағдылар (үйрету және оқу үшін) және инженерлік сипаттама (bio).',
  },
  privacy_sec3_title: {
    en: '3. WebRTC Direct P2P Video & Screen Sharing',
    ru: '3. P2P WebRTC звонки и шеринг экрана',
    kz: '3. P2P WebRTC бейнебайланысы және экран көрсету',
  },
  privacy_sec3_desc: {
    en: 'All video, voice, and interactive screen-sharing sessions connect directly peer-to-peer using WebRTC. Audio and video streams are transmitted encrypted directly between peers and are never recorded or stored on platform servers.',
    ru: 'Все видеозвонки, аудиосвязь и совместный редактор кода передаются напрямую между участниками по протоколу WebRTC. Медиапотоки шифруются и никогда не записываются и не сохраняются на наших серверах.',
    kz: 'Барлық бейнебайланыс, дыбыс және экран бөлісу сессиялары қатысушылар арасында WebRTC арқылы тікелей peer-to-peer форматында жүреді. Медиаағындар шифрланады және серверлерімізде ешқашан жазылмайды.',
  },
  privacy_sec4_title: {
    en: '4. User Rights & Account Deletion',
    ru: '4. Права пользователей и удаление аккаунта',
    kz: '4. Пайдаланушы құқықтары және аккаунтты өшіру',
  },
  privacy_sec4_desc: {
    en: 'You retain full ownership of your data. You may modify your skills, profile, or request immediate and irreversible account and data deletion at any time through platform settings.',
    ru: 'Вы сохраняете полное право распоряжаться своими данными. Вы можете в любой момент обновить навыки, изменить профиль или запросить немедленное и необратимое удаление аккаунта в настройках.',
    kz: 'Сіз өз деректеріңіздің толық иесі болып қаласыз. Кез келген уақытта дағдыларыңызды жаңарта аласыз, профиліңізді өзгерте аласыз немесе параметрлер арқылы аккаунтты толық жоюды сұрай аласыз.',
  },

  // Platform Rules & Code of Conduct
  terms_title: {
    en: 'Platform Rules & Code of Conduct',
    ru: 'Правила платформы и кодекс инженеров',
    kz: 'Платформа ережелері және инженерлер кодексі',
  },
  terms_subtitle: {
    en: 'Standards, barter principles, and conduct rules governing all peer-to-peer exchanges on pixelmink.',
    ru: 'Регламент, принципы бартера и профессиональные нормы для всех участников платформы pixelmink.',
    kz: 'pixelmink платформасындағы барлық қатысушыларға арналған регламент, бартер қағидалары мен кәсіби нормалар.',
  },
  terms_last_updated: {
    en: 'Protocol Rules v1.0 • September 2026',
    ru: 'Правила протокола v1.0 • Сентябрь 2026',
    kz: 'Хаттама ережелері v1.0 • Қыркүйек 2026',
  },
  terms_r1_title: {
    en: '1. Strict 1:1 Reciprocal Barter (Zero Fiat)',
    ru: '1. Строгий эквивалентный бартер 1:1 (Без денег)',
    kz: '1. 1:1 қатаң теңгерімді бартер (Ақшасыз)',
  },
  terms_r1_desc: {
    en: '1 hour of teaching equals exactly 1 hour of learning. Any requests for fiat money, commercial consulting fees, or side payments are strictly prohibited and result in permanent ban.',
    ru: '1 час обучения равен ровно 1 часу изучения. Любые требования фиатных денег, платных консультаций или денежных вознаграждений категорически запрещены и влекут перманентный бан.',
    kz: '1 сағат үйрету дәл 1 сағат білім алуға тең. Ақшалай төлем талап ету, ақылы қызмет ұсыну қатаң тыйым салынады және аккаунттың біржола бұғатталуына әкеледі.',
  },
  terms_r2_title: {
    en: '2. Punctuality & Cancellation Policy',
    ru: '2. Пунктуальность и политика отмены сессий',
    kz: '2. Ұқыптылық және сессиялардан бас тарту саясаты',
  },
  terms_r2_desc: {
    en: 'Sessions must start on time. Rescheduling or cancellation is permitted at least 2 hours in advance. No-shows without notice deduct 1 credit in favor of the waiting peer.',
    ru: 'Сессии начинаются строго вовремя. Перенос или отмена допускаются минимум за 2 часа до начала. Неявка без предупреждения приводит к списанию 1 часа в пользу ожидавшего участника.',
    kz: 'Сессиялар келісілген уақытта басталуы тиіс. Кездесуді ауыстыру немесе тоқтату кемінде 2 сағат бұрын жасалуы керек. Ескертусіз келмеген жағдайда 1 сағат күткен қатысушы пайдасына есептеледі.',
  },
  terms_r3_title: {
    en: '3. Skill Authenticity & Genuine Competence',
    ru: '3. Достоверность навыков и реальный опыт',
    kz: '3. Дағдылардың шынайылығы және нақты тәжірибе',
  },
  terms_r3_desc: {
    en: 'List only skills in which you possess verified hands-on production or algorithmic knowledge. Misrepresenting your expertise damages community trust and lowers your matching rating.',
    ru: 'Указывайте только те компетенции, которыми владеете на практике. Искажение реального опыта разрушает доверие сообщества и снижает рейтинг в алгоритме матчинга.',
    kz: 'Профильде тек өзіңіз нақты тәжірибеде меңгерген дағдыларды көрсетіңіз. Жалған біліктілік қоғамдастық сенімін жояды және сәйкестендіру рейтингін түсіреді.',
  },
  terms_r4_title: {
    en: '4. Code Confidentiality & NDA Protection',
    ru: '4. Конфиденциальность закрытого кода и NDA',
    kz: '4. Жабық код пен NDA құпиялылығы',
  },
  terms_r4_desc: {
    en: 'During screen sharing or live debugging, copying, leaking, recording, or publishing proprietary company code, API credentials, or internal architecture shown by peers is strictly forbidden.',
    ru: 'Во время совместного дебага и демонстрации экрана строго запрещается копировать, сохранять, распространять или публиковать проприетарный код, API-ключи или коммерческие архитектуры участников.',
    kz: 'Бірлескен жұмыс және экран көрсету кезінде қатысушылардың жеке немесе компаниялық жабық кодын, API кілттерін таратуға немесе сақтауға қатаң тыйым салынады.',
  },
  terms_r5_title: {
    en: '5. Zero Toxicity & Engineering Respect',
    ru: '5. Культура общения и нулевая токсичность',
    kz: '5. Қарым-қатынас мәдениеті және нөлдік токсикалық',
  },
  terms_r5_desc: {
    en: 'Constructive code reviews, mutual respect across all experience levels (from Junior to Staff), and zero tolerance for harassment, arrogance, marketing, or spam.',
    ru: 'Конструктивная критика, взаимоуважение независимо от грейда инженера и нулевая терпимость к хамству, надменности, спаму и рекламе сторонних платных курсов.',
    kz: 'Сындарлы кері байланыс, деңгейіне қарамастан кез келген инженерге құрмет көрсету және дөрекілікке, менмендікке, спамға және жарнамаға нөлдік төзімділік.',
  },
  terms_r6_title: {
    en: '6. Honest Post-Session Reviews',
    ru: '6. Обязательные честные рецензии',
    kz: '6. Міндетті шынайы пікірлер',
  },
  terms_r6_desc: {
    en: 'Both participants must complete a technical feedback assessment after each call. Reviews calibrate the algorithm to prioritize high-value mentors across the platform.',
    ru: 'Оба участника обязаны оценить техническую сессию после ее завершения. Отзывы калибруют алгоритм и продвигают наиболее полезных и ответственных менторов.',
    kz: 'Сессия аяқталғаннан кейін екі қатысушы да техникалық бағалау жазуға міндетті. Пікірлер алгоритмді дәлдеп, ең пайдалы менторларды алға шығарады.',
  },
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('ru');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pixelmink_lang') as Language;
      if (saved && (saved === 'ru' || saved === 'kz' || saved === 'en')) {
        setLangState(saved);
      }
    } catch {}
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem('pixelmink_lang', newLang);
      document.cookie = `pixelmink_lang=${newLang}; path=/; max-age=31536000`;
    } catch {}
  };

  const t = (key: string): string => {
    const entry = DICTIONARY[key];
    if (!entry) return key;
    return entry[lang] || entry['ru'] || entry['en'] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
