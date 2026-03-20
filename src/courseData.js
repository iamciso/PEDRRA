export const DEFAULT_COURSE = {
  id: 'course-pedrra1',
  title: 'PEDRRA I',
  desc: 'Interactive training on personal data breach risk assessment.',
  icon: '🛡️',
  color: '#0C4DA2',
  createdAt: 1710000000000,
  modules: [
    /* ── M1: Pre-Reading ─────────────────────────────── */
    { id: 'm1', title: 'Pre-Reading', icon: '\u{1F4D6}', phase: 'before',
      desc: 'Review before training (~30 min)', items: [
      { id: 'i1', type: 'doc', title: 'EUDPR Regulation', desc: 'Focus on Articles 33\u201335',
        url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32018R1725' },
      { id: 'i2', type: 'doc', title: 'EDPS Breach Guidelines', desc: 'November 2018',
        url: 'https://www.edps.europa.eu/data-protection/our-work/publications/guidelines/2018-11-21-guidelines-personal-data-breach_en' },
      { id: 'i3', type: 'doc', title: 'Pre-Reading Package', desc: '10-page preparation', url: '' },
      { id: 'i4', type: 'doc', title: 'Risk Assessment Primer', desc: '2-page reference', url: '' },
      { id: 'i5', type: 'survey', title: 'Pre-Training Self-Assessment',
        desc: 'Baseline confidence (helps measure progress)', qs: [
        { id: 'p1', text: 'I can distinguish a security incident from a data breach.', type: 'scale' },
        { id: 'p2', text: 'I understand breach types: Confidentiality, Integrity, Availability.', type: 'scale' },
        { id: 'p3', text: 'I can determine whether to notify the EDPS.', type: 'scale' },
        { id: 'p4', text: 'I can assess Risk vs High Risk.', type: 'scale' },
        { id: 'p5', text: 'I know when the 72-hour deadline starts.', type: 'scale' },
        { id: 'p6', text: 'I know when Article 35 communication is required.', type: 'scale' },
        { id: 'p7', text: 'I understand encryption/pseudonymisation in risk assessment.', type: 'scale' },
        { id: 'p8', text: 'I can coordinate IT Security, LCO, and DPO during a breach.', type: 'scale' },
      ]},
      { id: 'i5b', type: 'survey', title: 'Pre-Training Knowledge Check',
        desc: "Quick baseline \u2014 don't worry about scores!", qs: [
        { id: 'pk1', text: 'Encrypted laptop = always Unlikely Risk, no EDPS notification.', type: 'tf', opts: ['True','False'], ok: 1 },
        { id: 'pk2', text: '72-hour clock starts when the DPO is formally informed.', type: 'tf', opts: ['True','False'], ok: 1 },
        { id: 'pk3', text: 'Pseudonymised data is no longer personal data under EUDPR.', type: 'tf', opts: ['True','False'], ok: 1 },
        { id: 'pk4', text: 'A processor must notify the controller without undue delay.', type: 'tf', opts: ['True','False'], ok: 0 },
        { id: 'pk5', text: 'High Risk = communicate to subjects AND notify EDPS.', type: 'tf', opts: ['True','False'], ok: 0 },
        { id: 'pk6', text: 'Risk assessment should focus on organisational reputation.', type: 'tf', opts: ['True','False'], ok: 1 },
        { id: 'pk7', text: 'Health Status Indicator (Good/Fair/Poor) = health data (Art. 10).', type: 'tf', opts: ['True','False'], ok: 0 },
        { id: 'pk8', text: 'Retention violations must be in the EDPS notification.', type: 'tf', opts: ['True','False'], ok: 0 },
      ]},
    ]},

    /* ── M2: Welcome ─────────────────────────────────── */
    { id: 'm2', title: 'Welcome & Context', icon: '\u2B50', phase: 'live',
      desc: 'Introduction and ground rules', items: [
      { id: 'i6', type: 'slides', title: 'Welcome Slides', slides: [
        { t: 'Welcome to PEDRRA', c: 'PErsonal Data bReach Risk Assessment\n\nEuropean Data Protection Supervisor', l: 'title' },
        { t: 'Programme', c: '09:30 Welcome\n10:00 Scenario 1\n11:00 Break\n11:15 Lecture\n12:15 Lunch\n13:15 Scenario 2\n14:30 Quiz\n15:15 Debrief', l: 'content' },
        { t: 'Ground Rules', c: '\u{1F512} Chatham House Rule\n\u{1F91D} No blame\n\u{1F5E3}\uFE0F Every voice matters\n\u{1F4F1} Phone ready for quiz', l: 'content' },
        { l: 'poll', t: 'Quick Check', text: 'What does EUDPR stand for?',
          opts: ['EU Data Privacy Regulation', 'EU Data Protection Regulation', 'European Union Data Privacy Rules', 'European Data Processing Regulation'],
          ok: 1, xp: 50, timer: 30, notes: 'Warm-up question to test devices' },
        { t: 'Key Principle', c: 'Not every security incident is a data breach,\nbut every data breach is a security incident.', l: 'quote' },
        { l: 'poll', t: 'Experience Check', text: 'Have you handled a data breach before?',
          opts: ['Yes, multiple times', 'Yes, once', 'No, but trained', 'No experience'],
          ok: -1, xp: 0, timer: 20, notes: 'Opinion poll — helps gauge audience experience' },
      ]},
    ]},

    /* ── M3: Scenario 1 ──────────────────────────────── */
    { id: 'm3', title: 'Scenario 1: Encrypted Gateway', icon: '\u{1F512}', phase: 'live',
      desc: 'Stolen laptop scenario', items: [
      { id: 'i7', type: 'doc', title: 'Scenario 1 Briefing', desc: 'Context and technical findings', url: '' },
      { id: 'i8', type: 'doc', title: 'Team Workbook', desc: 'Risk assessment template', url: '' },
    ]},

    /* ── M4: Lecture ──────────────────────────────────── */
    { id: 'm4', title: 'Lecture: Breach Essentials', icon: '\u{1F393}', phase: 'live',
      desc: '60-min EDPS perspective', items: [
      { id: 'i9', type: 'slides', title: 'Breach Essentials', slides: [
        { t: 'Breach Essentials', c: 'EDPS Perspective\nRisk Assessment\nNotification', l: 'title' },
        { t: '3-Tier Framework', c: 'Unlikely Risk = Record only\n\nRisk = Notify EDPS (72h)\n\nHigh Risk = Notify EDPS + Data subjects', l: 'content' },
        { l: 'poll', t: 'Knowledge Check', text: 'When does the 72-hour notification clock start?',
          opts: ['When the breach occurs', 'When the DPO is informed', 'At reasonable certainty', 'When IT reports it'],
          ok: 2, xp: 100, timer: 30, notes: 'Key concept — discuss after reveal' },
        { t: '72-Hour Rule', c: 'Notify without undue delay,\nwhere feasible within 72 hours.\n\nClock starts at reasonable certainty.', l: 'quote' },
      ]},
    ]},

    /* ── M5: Scenario 2 ──────────────────────────────── */
    { id: 'm5', title: 'Scenario 2: Data Leak', icon: '\u2601\uFE0F', phase: 'live',
      desc: 'Cloud compromise', items: [
      { id: 'i10', type: 'doc', title: 'Scenario 2 Briefing', desc: 'Full scenario', url: '' },
      { id: 'i11', type: 'doc', title: 'Team Workbook', desc: '4 blocks + communication draft', url: '' },
    ]},

    /* ── M6: Quiz ────────────────────────────────────── */
    { id: 'm6', title: 'Quiz & Examples', icon: '\u2753', phase: 'live',
      desc: 'Interactive knowledge check', items: [
      { id: 'i12', type: 'quiz', title: 'Training Quiz', desc: '8 questions', qs: [
        { id: 'Q1', text: 'Stolen Laptop: why might this NOT be High Risk?', type: 'mc',
          opts: ['Stolen from locked office','Encrypted + backup exists','Only professional emails','Remote wipe sent'], ok: 1, xp: 100 },
        { id: 'Q2', text: 'Remote wipe pending: impact on risk?', type: 'mc',
          opts: ['No change','Increases risk','Decreases risk','No legal impact'], ok: 1, xp: 100 },
        { id: 'Q3', text: 'CloudVault: which field triggered High Risk?', type: 'mc',
          opts: ['Passwords','Health Status Indicator','750K records','Cross-border'], ok: 1, xp: 100 },
        { id: 'Q4', text: 'Data retention oversight: impact?', type: 'mc',
          opts: ['Irrelevant','Compounds severity','Lowers risk','Only if unencrypted'], ok: 1, xp: 100 },
        { id: 'Q5', text: 'EUDPR Art. 33: notify EDPS...', type: 'mc',
          opts: ['Immediately','24 hours','72 hours max','Only if High Risk'], ok: 2, xp: 100 },
        { id: 'Q6', text: 'HR emails with CC. Notify?', type: 'bn',
          opts: ['Notify',"Don't Notify"], ok: 0, xp: 50 },
        { id: 'Q7', text: 'Whistleblower DB published. Communicate?', type: 'bn',
          opts: ['Communicate',"Don't"], ok: 0, xp: 50 },
        { id: 'Q8', text: 'Encrypted USB lost, backups. Notify?', type: 'bn',
          opts: ['Notify','May not be required'], ok: 1, xp: 50 },
      ]},
      { id: 'i13', type: 'quiz', title: 'Scenario Verdicts', desc: 'Team votes', qs: [
        { id: 'V1', text: 'Scenario 1 verdict?', type: 'poll', opts: ['Unlikely Risk','Risk','High Risk'], ok: -1, xp: 25 },
        { id: 'V2', text: 'Scenario 2 (pre-inject)?', type: 'poll', opts: ['Unlikely Risk','Risk','High Risk'], ok: -1, xp: 25 },
        { id: 'V3', text: 'Scenario 2 (post-inject)?', type: 'poll', opts: ['Unlikely Risk','Risk','High Risk'], ok: -1, xp: 25 },
      ]},
    ]},

    /* ── M7: Evaluation ──────────────────────────────── */
    { id: 'm7', title: 'Evaluation', icon: '\u{1F4CB}', phase: 'after',
      desc: 'Post-training evaluation (Kirkpatrick L1-L2)', items: [
      { id: 'e1', type: 'survey', title: 'Level 1: Reaction & Satisfaction',
        desc: 'Rate 1-5. Anonymous.', qs: [
        { id: 'H1a', text: 'CONTENT & RELEVANCE', type: 'header' },
        { id: 'L11', text: 'Content relevant to my job.', type: 'scale' },
        { id: 'L12', text: 'Content current and accurate.', type: 'scale' },
        { id: 'L13', text: 'Appropriate level.', type: 'scale' },
        { id: 'L14', text: 'Scenarios were realistic.', type: 'scale' },
        { id: 'L15', text: 'Clarified Security Incident vs Data Breach.', type: 'scale' },
        { id: 'L16', text: 'More confident: Risk vs High Risk.', type: 'scale' },
        { id: 'H1b', text: 'METHODS & DELIVERY', type: 'header' },
        { id: 'L17', text: 'TTX format effective.', type: 'scale' },
        { id: 'L18', text: 'Activities enhanced understanding.', type: 'scale' },
        { id: 'L19', text: 'Good lecture/practice balance.', type: 'scale' },
        { id: 'L1a', text: 'Communication exercise useful.', type: 'scale' },
        { id: 'L1b', text: 'Pace appropriate.', type: 'scale' },
        { id: 'L1c', text: 'Platform easy to use.', type: 'scale' },
        { id: 'H1c', text: 'FACILITATION', type: 'header' },
        { id: 'L1d', text: 'Facilitators knowledgeable.', type: 'scale' },
        { id: 'L1e', text: 'Communicated clearly.', type: 'scale' },
        { id: 'L1f', text: 'Managed debates well.', type: 'scale' },
        { id: 'L1g', text: 'Psychologically safe.', type: 'scale' },
        { id: 'H1d', text: 'OVERALL', type: 'header' },
        { id: 'L1h', text: 'Overall satisfied.', type: 'scale' },
        { id: 'L1i', text: 'Would recommend.', type: 'scale' },
        { id: 'L1j', text: 'Met expectations.', type: 'scale' },
        { id: 'L1k', text: 'Confidence applying learning (1-5).', type: 'scale' },
        { id: 'H1e', text: 'OPEN-ENDED', type: 'header' },
        { id: 'L1l', text: 'Most valuable?', type: 'text' },
        { id: 'L1m', text: 'What to improve?', type: 'text' },
        { id: 'L1n', text: 'Additional topics?', type: 'text' },
        { id: 'L1o', text: '72h deadline still unclear?', type: 'text' },
      ]},
      { id: 'e2', type: 'survey', title: 'Post-Training Knowledge Check (Level 2)',
        desc: 'Same as pre-training \u2014 measure progress!', qs: [
        { id: 'pk1b', text: 'Encrypted laptop = always Unlikely Risk.', type: 'tf', opts: ['True','False'], ok: 1 },
        { id: 'pk2b', text: '72h clock starts at DPO notification.', type: 'tf', opts: ['True','False'], ok: 1 },
        { id: 'pk3b', text: 'Pseudonymised = not personal data.', type: 'tf', opts: ['True','False'], ok: 1 },
        { id: 'pk4b', text: 'Processor must notify controller.', type: 'tf', opts: ['True','False'], ok: 0 },
        { id: 'pk5b', text: 'High Risk = subjects + EDPS.', type: 'tf', opts: ['True','False'], ok: 0 },
        { id: 'pk6b', text: 'Focus on organisational reputation.', type: 'tf', opts: ['True','False'], ok: 1 },
        { id: 'pk7b', text: 'Health indicator = health data.', type: 'tf', opts: ['True','False'], ok: 0 },
        { id: 'pk8b', text: 'Retention violations in notification.', type: 'tf', opts: ['True','False'], ok: 0 },
      ]},
      { id: 'e3', type: 'survey', title: 'Knowledge Gaps (Objective 7)',
        desc: 'We deliver a resource within 4 weeks.', qs: [
        { id: 'G1', text: 'Top knowledge gap #1:', type: 'text' },
        { id: 'G2', text: 'Proposed resource for gap #1:', type: 'text' },
        { id: 'G3', text: 'Knowledge gap #2:', type: 'text' },
        { id: 'G4', text: 'Proposed resource for gap #2:', type: 'text' },
      ]},
    ]},

    /* ── M8: Follow-Up Resources ─────────────────────── */
    { id: 'm8', title: 'Follow-Up Resources', icon: '\u{1F680}', phase: 'after',
      desc: 'Post-training materials', items: [
      { id: 'f1', type: 'doc', title: 'Risk Assessment Tool', desc: 'Standard template', url: '' },
      { id: 'f2', type: 'doc', title: 'Art. 35 Communication Template', desc: 'Pre-filled', url: '' },
    ]},

    /* ── M9: Level 3 Follow-Up ───────────────────────── */
    { id: 'm9', title: 'Level 3: Follow-Up (3-6 months)', icon: '\u{1F4CA}', phase: 'after',
      desc: 'Behavioural change survey', items: [
      { id: 'l31', type: 'survey', title: 'Participant Self-Assessment',
        desc: 'How has training changed your work?', qs: [
        { id: 'H3a', text: 'APPLICATION', type: 'header' },
        { id: 'L31', text: 'How often applied PEDRRA knowledge?', type: 'choice', opts: ['Daily','Weekly','Monthly','Rarely','Never'] },
        { id: 'L32', text: 'Used EDPS Risk Assessment Tool?', type: 'choice', opts: ['Yes','No'] },
        { id: 'L33', text: 'Team updated Communication Protocol?', type: 'choice', opts: ['Yes','In progress','No'] },
        { id: 'L34', text: 'Risk vs High Risk debate? Used PEDRRA criteria?', type: 'choice', opts: ['Yes, PEDRRA','Yes, other','No situation'] },
        { id: 'H3b', text: 'SPECIFICS', type: 'header' },
        { id: 'L35', text: 'Skills applied most?', type: 'text' },
        { id: 'L36', text: 'Work practice changes:', type: 'text' },
        { id: 'L37', text: 'Impact on incident response:', type: 'text' },
        { id: 'H3c', text: 'BARRIERS', type: 'header' },
        { id: 'L38', text: 'Barriers encountered:', type: 'text' },
        { id: 'L39', text: 'Support needed:', type: 'text' },
      ]},
      { id: 'l32', type: 'survey', title: 'Manager Observation',
        desc: 'For supervisors (optional)', qs: [
        { id: 'M1', text: 'Improved IT-DPO coordination?', type: 'choice', opts: ['Significant','Some','No change','Decline'] },
        { id: 'M2', text: 'Reports more complete?', type: 'choice', opts: ['Significantly','Somewhat','No change'] },
        { id: 'M3', text: 'Specific improvements:', type: 'text' },
        { id: 'M4', text: 'Organisational benefit:', type: 'text' },
      ]},
    ]},
  ],
};
