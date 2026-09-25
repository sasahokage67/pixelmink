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

  // Metrics
  metric_exchanged: {
    en: 'Exchanged',
    ru: 'Обменено часов',
    kz: 'Алмасылған сағат',
  },
  metric_accuracy: {
    en: 'Match Accuracy',
    ru: 'Точность матчинга',
    kz: 'Сәйкестік дәлдігі',
  },
  metric_cost: {
    en: 'Cost per Hour',
    ru: 'Стоимость часа',
    kz: 'Сағаттық бағасы',
  },
  metric_free: {
    en: '$0.00 (Zero Money)',
    ru: '$0.00 (Только знания)',
    kz: '$0.00 (Тек білім)',
  },
  metric_infra: {
    en: 'Infrastructure',
    ru: 'Инфраструктура',
    kz: 'Инфрақұрылым',
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
    en: 'Computer Science Matrix',
    ru: 'Матрица навыков Computer Science',
    kz: 'Computer Science дағдылар матрицасы',
  },
  reg_matrix_desc: {
    en: 'Select the topics you can mentor in, and the skills you want to learn.',
    ru: 'Выберите темы, которым вы можете обучать, и то, что хотите изучить.',
    kz: 'Үйрете алатын тақырыптарды және үйренгіңіз келетін дағдыларды таңдаңыз.',
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
    en: 'Search CS skills (e.g. Rust, PyTorch, Concurrency)...',
    ru: 'Поиск по CS навыкам (например, Rust, PyTorch, Concurrency)...',
    kz: 'CS дағдыларын іздеу (мысалы, Rust, PyTorch, Concurrency)...',
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
    en: 'Calculated Peer Match Power',
    ru: 'Рассчитанная сила матчинга',
    kz: 'Есептелген сәйкестік күші',
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
    return entry[lang] || entry['en'] || key;
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
