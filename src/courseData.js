export const DEFAULT_COURSE = {
  id: 'course-pedrra1',
  title: 'PEDRRA I',
  desc: 'Interactive training on personal data breach risk assessment.',
  icon: '🛡️',
  color: '#003399',
  createdAt: 1710000000000,
  modules: [
    /* ══════════════════════════════════════════════════════════
       BEFORE TRAINING
       ══════════════════════════════════════════════════════════ */
    { id: 'm-before', title: 'Before Training', icon: '📖', phase: 'before',
      desc: 'Preparation materials (~30 min reading)', items: [
      { id: 'bt-doc1', type: 'doc', title: 'EUDPR Regulation', desc: 'Focus on Articles 33–35',
        url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32018R1725' },
      { id: 'bt-doc2', type: 'doc', title: 'EDPS Breach Guidelines', desc: 'November 2018 guidelines',
        url: 'https://www.edps.europa.eu/data-protection/our-work/publications/guidelines/2018-11-21-guidelines-personal-data-breach_en' },
      { id: 'bt-doc3', type: 'doc', title: 'Pre-Reading Package', desc: '10-page preparation document', url: '' },
      { id: 'bt-doc4', type: 'doc', title: 'Risk Assessment Primer', desc: '2-page quick reference', url: '' },
      { id: 'bt-survey', type: 'survey', title: 'Pre-Training Self-Assessment',
        desc: 'Baseline confidence — helps measure your progress', qs: [
        { id: 'p1', text: 'I can distinguish a security incident from a data breach.', type: 'scale' },
        { id: 'p2', text: 'I understand breach types: Confidentiality, Integrity, Availability.', type: 'scale' },
        { id: 'p3', text: 'I can determine whether to notify the EDPS.', type: 'scale' },
        { id: 'p4', text: 'I can assess Risk vs High Risk.', type: 'scale' },
        { id: 'p5', text: 'I know when the 72-hour deadline starts.', type: 'scale' },
        { id: 'p6', text: 'I know when Article 35 communication is required.', type: 'scale' },
        { id: 'p7', text: 'I understand encryption/pseudonymisation in risk assessment.', type: 'scale' },
        { id: 'p8', text: 'I can coordinate IT Security, LCO, and DPO during a breach.', type: 'scale' },
      ]},
    ]},

    /* ══════════════════════════════════════════════════════════
       TRAINING DAY
       ══════════════════════════════════════════════════════════ */

    /* ── Pre-Knowledge Quiz ─────────────────────────────────── */
    { id: 'm-prequiz', title: 'Pre-Knowledge Quiz', icon: '🧠', phase: 'live',
      desc: 'Quick baseline check before we begin', items: [
      { id: 'pk-quiz', type: 'quiz', title: 'Pre-Training Knowledge Check',
        desc: "Quick baseline — don't worry about scores!", qs: [
        { id: 'pk1', text: 'Encrypted laptop = always Unlikely Risk, no EDPS notification.', type: 'tf', opts: ['True','False'], ok: 1, xp: 25 },
        { id: 'pk2', text: '72-hour clock starts when the DPO is formally informed.', type: 'tf', opts: ['True','False'], ok: 1, xp: 25 },
        { id: 'pk3', text: 'Pseudonymised data is no longer personal data under EUDPR.', type: 'tf', opts: ['True','False'], ok: 1, xp: 25 },
        { id: 'pk4', text: 'A processor must notify the controller without undue delay.', type: 'tf', opts: ['True','False'], ok: 0, xp: 25 },
        { id: 'pk5', text: 'High Risk = communicate to subjects AND notify EDPS.', type: 'tf', opts: ['True','False'], ok: 0, xp: 25 },
        { id: 'pk6', text: 'Risk assessment should focus on organisational reputation.', type: 'tf', opts: ['True','False'], ok: 1, xp: 25 },
        { id: 'pk7', text: 'Health Status Indicator (Good/Fair/Poor) = health data (Art. 10).', type: 'tf', opts: ['True','False'], ok: 0, xp: 25 },
        { id: 'pk8', text: 'Retention violations must be included in EDPS notification.', type: 'tf', opts: ['True','False'], ok: 0, xp: 25 },
      ]},
    ]},

    /* ── Main Presentation (the full training day) ──────────── */
    { id: 'm-presentation', title: 'Training Presentation', icon: '🎬', phase: 'live',
      desc: 'Full training day — intro, scenarios, lecture, polls', items: [
      { id: 'td-slides', type: 'slides', title: 'PEDRRA Training Day', slides: [

        /* ── 1. Introduction ── */
        { t: 'Welcome to PEDRRA', c: 'PErsonal Data bReach Risk Assessment\n\nEuropean Data Protection Supervisor', l: 'title',
          bg: '#003399', color: '#FFFFFF' },
        { t: 'About This Training', c: '- Interactive table-top exercise (TTX)\n- Two real-world scenarios\n- Hands-on risk assessment practice\n- Live polls and quizzes throughout\n- No blame — learning environment', l: 'bullets' },
        { t: 'Ground Rules', c: '🔒 Chatham House Rule\n🤝 No blame culture\n🗣️ Every voice matters\n📱 Keep your phone ready for polls\n⏰ We respect break times', l: 'content' },
        { l: 'poll', t: 'Quick Check', text: 'What does EUDPR stand for?',
          opts: ['EU Data Privacy Regulation', 'EU Data Protection Regulation', 'European Union Data Privacy Rules', 'European Data Processing Regulation'],
          ok: 1, xp: 50, timer: 30, notes: 'Warm-up question to test devices' },

        /* ── 2. Agenda ── */
        { t: 'Programme', c: '09:30  Welcome & Introduction\n10:00  Scenario 1: Encrypted Gateway\n11:00  ☕ Break\n11:15  Lecture: Breach Essentials\n12:15  🍽️ Lunch\n13:15  Scenario 2: Cloud Data Leak\n14:30  Final Quiz & Review\n15:15  Debrief & Close', l: 'content',
          notes: 'Adjust times as needed for your session' },
        { l: 'poll', t: 'Experience Check', text: 'Have you handled a data breach before?',
          opts: ['Yes, multiple times', 'Yes, once', 'No, but I have been trained', 'No experience at all'],
          ok: -1, xp: 0, timer: 20, notes: 'Opinion poll — helps gauge audience experience' },

        /* ── 3. Scenario 1: Encrypted Gateway ── */
        { t: 'Scenario 1', c: 'Encrypted Gateway', l: 'title', bg: '#1a365d', color: '#FFFFFF' },
        { t: 'Scenario 1: The Facts', c: '- A staff member reports a laptop stolen from their car\n- Laptop was password-protected and full-disk encrypted (BitLocker)\n- Contains: work emails, project files, HR evaluation draft\n- Remote wipe initiated but not yet confirmed\n- Backups exist on the network drive', l: 'bullets',
          notes: 'Give teams 5 min to read, then 15 min to discuss' },
        { t: 'Team Exercise', c: '1. Is this a personal data breach? Why/why not?\n2. What type(s) of breach: Confidentiality / Integrity / Availability?\n3. What is your initial risk assessment?\n4. Do we need to notify the EDPS?\n5. Do we need to communicate to data subjects?', l: 'content',
          notes: '20 minutes for team work. Walk around and facilitate.' },
        { l: 'poll', t: 'Scenario 1 Vote', text: 'What is your team\'s risk assessment for Scenario 1?',
          opts: ['Unlikely Risk — record only', 'Risk — notify EDPS', 'High Risk — notify EDPS + subjects'],
          ok: -1, xp: 25, timer: 45, notes: 'Let teams discuss before voting' },
        { t: 'Scenario 1: Key Points', c: '✅ Encryption significantly reduces risk\n✅ Backups = no availability breach\n⚠️ Remote wipe pending = uncertainty\n⚠️ HR evaluation = sensitive context\n\n→ Likely "Unlikely Risk" but must be documented', l: 'content',
          notes: 'Discuss each point. Ask teams to justify their answers.' },

        /* ── 4. Break ── */
        { t: '☕ Break', c: '15 minutes\n\nWe resume at 11:15', l: 'title', bg: '#2D3748', color: '#FFFFFF' },

        /* ── 5. Lecture: Breach Essentials ── */
        { t: 'Breach Essentials', c: 'EDPS Perspective', l: 'title', bg: '#003399', color: '#FFFFFF' },
        { t: 'What is a Personal Data Breach?', c: 'A breach of security leading to the\naccidental or unlawful\n**destruction, loss, alteration,\nunauthorised disclosure of, or access to**\npersonal data', l: 'quote' },
        { t: 'Key Principle', c: 'Not every security incident is a data breach,\nbut every data breach is a security incident.', l: 'quote',
          notes: 'This is the single most important takeaway' },
        { t: '3 Types of Breach', c: '🔓 **Confidentiality** — unauthorised disclosure or access\n\n✏️ **Integrity** — unauthorised alteration\n\n🚫 **Availability** — loss of access or destruction', l: 'content' },
        { t: '3-Tier Risk Framework', c: '1️⃣ **Unlikely Risk** → Record internally only\n\n2️⃣ **Risk** → Notify EDPS within 72 hours\n\n3️⃣ **High Risk** → Notify EDPS + Communicate to data subjects', l: 'content',
          notes: 'This framework is the core of the training' },
        { l: 'poll', t: 'Knowledge Check', text: 'When does the 72-hour notification clock start?',
          opts: ['When the breach occurs', 'When the DPO is informed', 'At reasonable certainty of breach', 'When IT Security reports it'],
          ok: 2, xp: 100, timer: 30, notes: 'Key concept — discuss after reveal' },
        { t: '72-Hour Rule', c: '"Notify the EDPS without undue delay,\nwhere feasible not later than 72 hours\nafter having become aware of it."\n\n→ Clock starts at **reasonable certainty**', l: 'quote' },
        { t: 'Risk Assessment Factors', c: '- Type and sensitivity of personal data\n- Number of data subjects affected\n- Ease of identification\n- Severity of consequences for individuals\n- Special characteristics of individuals (children, vulnerable)\n- Special characteristics of the controller\n- Number of affected individuals', l: 'bullets' },
        { l: 'poll', t: 'Quick Poll', text: 'Encrypted laptop stolen. Remote wipe confirmed. What risk level?',
          opts: ['Unlikely Risk', 'Risk', 'High Risk'],
          ok: 0, xp: 50, timer: 25, notes: 'After wipe confirmed + encryption = Unlikely Risk' },

        /* ── 6. Lunch ── */
        { t: '🍽️ Lunch Break', c: '60 minutes\n\nWe resume at 13:15', l: 'title', bg: '#2D3748', color: '#FFFFFF' },

        /* ── 7. Scenario 2: Cloud Data Leak ── */
        { t: 'Scenario 2', c: 'Cloud Data Leak', l: 'title', bg: '#742a2a', color: '#FFFFFF' },
        { t: 'Scenario 2: The Facts', c: '- Cloud service provider reports a security vulnerability\n- 750,000 records potentially exposed for 3 weeks\n- Data includes: names, emails, staff IDs, Health Status Indicators\n- Health Status Indicator values: Good / Fair / Poor\n- Data was not encrypted at rest\n- Retention policy had expired on 40% of records', l: 'bullets',
          notes: 'This is deliberately more complex. Give teams extra time.' },
        { t: 'Team Exercise', c: '1. Classify the breach type(s)\n2. Assess the risk level with justification\n3. Is the Health Status Indicator "health data" under Art. 10?\n4. Does the retention violation affect your assessment?\n5. Draft key points for data subject communication', l: 'content',
          notes: '25 minutes for team work' },
        { l: 'poll', t: 'Scenario 2 Vote', text: 'Risk assessment for Scenario 2 (initial)?',
          opts: ['Unlikely Risk', 'Risk — notify EDPS', 'High Risk — notify EDPS + subjects'],
          ok: -1, xp: 25, timer: 45 },
        { t: 'INJECT: New Information', c: '⚠️ UPDATE from IT Security:\n\n"We have confirmed that 12 records were actually accessed.\nThese include 3 senior management profiles with\nHealth Status Indicator = Poor."', l: 'content',
          bg: '#9B2C2C', color: '#FFFFFF',
          notes: 'This inject changes the assessment significantly' },
        { l: 'poll', t: 'Scenario 2 Re-Vote', text: 'After the inject, what is your revised risk assessment?',
          opts: ['Stays the same', 'Increases to Risk', 'Increases to High Risk'],
          ok: -1, xp: 25, timer: 30 },
        { t: 'Scenario 2: Key Points', c: '⚠️ Health Status Indicator = likely Art. 10 health data\n⚠️ 750K records × 3 weeks = significant exposure\n⚠️ Retention violation compounds severity\n⚠️ Confirmed access to sensitive records\n\n→ **High Risk** — EDPS notification + data subject communication required', l: 'content' },

        /* ── 8. Closing ── */
        { t: 'Key Takeaways', c: '1. Every breach must be assessed on its own merits\n2. Encryption is a key mitigating factor\n3. 72-hour clock starts at reasonable certainty\n4. Document everything, even "Unlikely Risk"\n5. When in doubt, notify — better safe than sorry', l: 'content',
          bg: '#003399', color: '#FFFFFF' },
        { l: 'rating', t: 'Rate This Session', text: 'How would you rate today\'s training?',
          opts: ['1','2','3','4','5'], ok: -1, xp: 0, timer: 20,
          notes: 'Quick feedback before close' },
        { t: 'Thank You!', c: 'Questions? Contact the DPO team.\n\nEuropean Data Protection Supervisor\nwww.edps.europa.eu', l: 'title',
          bg: '#003399', color: '#FFFFFF' },
      ]},
    ]},

    /* ── Post-Training Survey ───────────────────────────────── */
    { id: 'm-postsurvey', title: 'Post-Training Survey', icon: '📋', phase: 'live',
      desc: 'Knowledge check after training', items: [
      { id: 'ps-quiz', type: 'quiz', title: 'Post-Training Knowledge Check',
        desc: 'Same questions as pre-quiz — let\'s see your progress!', qs: [
        { id: 'pk1b', text: 'Encrypted laptop = always Unlikely Risk.', type: 'tf', opts: ['True','False'], ok: 1, xp: 50,
          explanation: 'Not always — depends on what data was on the laptop, whether wipe was confirmed, etc.' },
        { id: 'pk2b', text: '72h clock starts at DPO formal notification.', type: 'tf', opts: ['True','False'], ok: 1, xp: 50,
          explanation: 'Clock starts at reasonable certainty, not formal DPO notification.' },
        { id: 'pk3b', text: 'Pseudonymised = no longer personal data.', type: 'tf', opts: ['True','False'], ok: 1, xp: 50,
          explanation: 'Pseudonymised data IS still personal data. Only anonymous data is not.' },
        { id: 'pk4b', text: 'Processor must notify controller without undue delay.', type: 'tf', opts: ['True','False'], ok: 0, xp: 50,
          explanation: 'Correct — Art. 33(2) requires processors to notify the controller.' },
        { id: 'pk5b', text: 'High Risk = communicate to subjects + notify EDPS.', type: 'tf', opts: ['True','False'], ok: 0, xp: 50,
          explanation: 'Correct — both notification AND communication are required.' },
        { id: 'pk6b', text: 'Risk assessment should focus on organisational reputation.', type: 'tf', opts: ['True','False'], ok: 1, xp: 50,
          explanation: 'Focus must be on IMPACT TO INDIVIDUALS, not organisational reputation.' },
        { id: 'pk7b', text: 'Health Status Indicator (Good/Fair/Poor) = health data.', type: 'tf', opts: ['True','False'], ok: 0, xp: 50,
          explanation: 'Yes — even simple health indicators constitute Art. 10 health data.' },
        { id: 'pk8b', text: 'Retention violations must be in EDPS notification.', type: 'tf', opts: ['True','False'], ok: 0, xp: 50,
          explanation: 'Correct — retention failures compound breach severity and must be disclosed.' },
      ]},
    ]},

    /* ══════════════════════════════════════════════════════════
       AFTER TRAINING
       ══════════════════════════════════════════════════════════ */

    /* ── Evaluation ─────────────────────────────────────────── */
    { id: 'm-eval', title: 'Evaluation', icon: '📊', phase: 'after',
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
        { id: 'L1l', text: 'Most valuable aspect?', type: 'text' },
        { id: 'L1m', text: 'What to improve?', type: 'text' },
        { id: 'L1n', text: 'Additional topics you would like covered?', type: 'text' },
      ]},
    ]},

    /* ── Follow-Up Resources ────────────────────────────────── */
    { id: 'm-resources', title: 'Follow-Up Resources', icon: '🚀', phase: 'after',
      desc: 'Post-training materials and tools', items: [
      { id: 'f1', type: 'doc', title: 'Risk Assessment Tool', desc: 'Standard EDPS template', url: '' },
      { id: 'f2', type: 'doc', title: 'Art. 35 Communication Template', desc: 'Pre-filled template', url: '' },
      { id: 'f3', type: 'doc', title: 'Breach Notification Checklist', desc: '72-hour action plan', url: '' },
    ]},

    /* ── Level 3: Follow-Up (3-6 months) ────────────────────── */
    { id: 'm-followup', title: 'Follow-Up (3-6 months)', icon: '📈', phase: 'after',
      desc: 'Behavioural change assessment', items: [
      { id: 'l31', type: 'survey', title: 'Participant Self-Assessment',
        desc: 'How has training changed your work?', qs: [
        { id: 'H3a', text: 'APPLICATION', type: 'header' },
        { id: 'L31', text: 'How often applied PEDRRA knowledge?', type: 'choice', opts: ['Daily','Weekly','Monthly','Rarely','Never'] },
        { id: 'L32', text: 'Used EDPS Risk Assessment Tool?', type: 'choice', opts: ['Yes','No'] },
        { id: 'L33', text: 'Team updated Communication Protocol?', type: 'choice', opts: ['Yes','In progress','No'] },
        { id: 'L34', text: 'Risk vs High Risk debate? Used PEDRRA criteria?', type: 'choice', opts: ['Yes, PEDRRA','Yes, other method','No situation arose'] },
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
        { id: 'M3', text: 'Specific improvements observed:', type: 'text' },
        { id: 'M4', text: 'Organisational benefit:', type: 'text' },
      ]},
    ]},
  ],
};
