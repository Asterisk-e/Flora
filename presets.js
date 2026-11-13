/* Flora modes and starter files. Pure data plus small content builders — no DOM access. */
(function (root) {
  'use strict';

  const GROUPS = [
    { id: 'general', label: 'Everyday' },
    { id: 'school', label: 'School and study' },
    { id: 'work', label: 'Work and making' },
    { id: 'comfort', label: 'Comfort' }
  ];

  /* patch: settings applied when the mode is chosen. apps/tools: what is pinned in the sidebar. seeds: starter files. */
  const MODES = [
    { id: 'standard', group: 'general', name: 'Standard', tag: 'Everything on',
      blurb: 'Every application and tool, with Flora’s default look.',
      patch: { theme: 'light', textScale: 100, fontFamily: 'serif', animLevel: 'full', quietToasts: false, examLock: false, focusMinutes: 25, breakMinutes: 5, compactMode: false },
      apps: ['doc', 'sheet', 'slides', 'note', 'board', 'code', 'sketch', 'cards', 'kanban', 'journal'],
      tools: ['amethyst', 'tasks', 'focus', 'calc', 'units', 'wordstats', 'encoding', 'timetable', 'countdown', 'grades'], seeds: [] },

    { id: 'school-junior', group: 'school', name: 'School: Junior', tag: 'Ages 7 to 11',
      blurb: 'Bigger text, a friendly reading font, gentle motion and just the apps for homework, drawing and spelling practice.',
      patch: { theme: 'light', textScale: 118, fontFamily: 'readable', animLevel: 'gentle', bigTargets: true, quietToasts: false, examLock: false, focusMinutes: 15, breakMinutes: 5, compactMode: false },
      apps: ['doc', 'note', 'sketch', 'cards', 'board', 'kanban'], tools: ['tasks', 'timetable', 'focus', 'calc', 'countdown'],
      seeds: ['homework-board', 'spelling-cards', 'school-timetable'] },

    { id: 'school-secondary', group: 'school', name: 'School: Secondary', tag: 'Ages 11 to 18',
      blurb: 'Essays, revision cards, a homework board and a weekly timetable, with grade and deadline tools within reach.',
      patch: { theme: 'light', textScale: 104, fontFamily: 'serif', animLevel: 'gentle', quietToasts: false, examLock: false, focusMinutes: 25, breakMinutes: 5, compactMode: false },
      apps: ['doc', 'sheet', 'slides', 'note', 'cards', 'kanban'], tools: ['timetable', 'grades', 'countdown', 'tasks', 'focus', 'calc', 'units', 'wordstats'],
      seeds: ['homework-board', 'revision-cards', 'school-timetable', 'essay-plan'] },

    { id: 'university', group: 'school', name: 'University', tag: 'Lectures and long projects',
      blurb: 'Lecture notes, an assignment tracker, a reading list and longer focus sessions.',
      patch: { theme: 'paper', textScale: 100, fontFamily: 'serif', animLevel: 'gentle', quietToasts: false, examLock: false, focusMinutes: 50, breakMinutes: 10, compactMode: false },
      apps: ['doc', 'note', 'sheet', 'slides', 'cards', 'kanban', 'journal'], tools: ['grades', 'countdown', 'wordstats', 'focus', 'timetable', 'tasks', 'calc'],
      seeds: ['lecture-notes', 'assignment-board', 'reading-list'] },

    { id: 'exam', group: 'school', name: 'Exam mode', tag: 'Revision without distractions',
      blurb: 'Hides everything except revision tools, mutes notifications, starts 50-minute focus sessions and counts down to your exam.',
      patch: { theme: 'light', textScale: 106, fontFamily: 'serif', animLevel: 'off', quietToasts: true, examLock: true, focusMinutes: 50, breakMinutes: 10, compactMode: true },
      apps: ['note', 'cards', 'doc'], tools: ['focus', 'countdown', 'calc'],
      seeds: ['revision-timetable', 'revision-cards'] },

    { id: 'work', group: 'work', name: 'Work', tag: 'Documents, plans and projects',
      blurb: 'Documents, spreadsheets, slides and a project board, plus a task list and focus timer.',
      patch: { theme: 'light', textScale: 100, fontFamily: 'sans', animLevel: 'gentle', quietToasts: false, examLock: false, focusMinutes: 25, breakMinutes: 5, compactMode: false },
      apps: ['doc', 'sheet', 'slides', 'kanban', 'note', 'board'], tools: ['tasks', 'focus', 'calc', 'units', 'wordstats', 'amethyst'],
      seeds: ['meeting-notes', 'project-board'] },

    { id: 'writer', group: 'work', name: 'Writer', tag: 'Quiet and typographic',
      blurb: 'A paper-coloured workspace for drafts and daily pages, with word counts and no interruptions.',
      patch: { theme: 'paper', textScale: 108, fontFamily: 'serif', animLevel: 'gentle', quietToasts: true, examLock: false, focusMinutes: 30, breakMinutes: 5, compactMode: true },
      apps: ['doc', 'note', 'journal'], tools: ['wordstats', 'focus', 'encoding'],
      seeds: ['draft', 'daily-pages'] },

    { id: 'creative', group: 'work', name: 'Creative', tag: 'Sketch, collect, present',
      blurb: 'A sketchbook, mood boards and slides first, with notes and a journal alongside.',
      patch: { theme: 'light', textScale: 100, fontFamily: 'serif', animLevel: 'full', quietToasts: false, examLock: false, focusMinutes: 40, breakMinutes: 10, compactMode: false },
      apps: ['sketch', 'board', 'slides', 'doc', 'journal', 'note'], tools: ['focus', 'tasks', 'amethyst'],
      seeds: ['sketchbook', 'mood-board'] },

    { id: 'developer', group: 'work', name: 'Developer', tag: 'Snippets and sprints',
      blurb: 'A dark workspace with a code editor, a sprint board, and the encoding and unit tools you reach for most.',
      patch: { theme: 'dark', textScale: 100, fontFamily: 'sans', animLevel: 'gentle', quietToasts: false, examLock: false, focusMinutes: 45, breakMinutes: 10, compactMode: false },
      apps: ['code', 'kanban', 'note', 'doc', 'sheet'], tools: ['encoding', 'units', 'calc', 'wordstats', 'tasks', 'focus'],
      seeds: ['snippets', 'sprint-board'] },

    { id: 'easy-reading', group: 'comfort', name: 'Easy reading', tag: 'Large, calm, high contrast',
      blurb: 'Large text, a clear reading font with extra spacing, stronger contrast, bigger buttons and no animation.',
      patch: { theme: 'light', textScale: 128, fontFamily: 'readable', readableSpacing: true, highContrast: true, bigTargets: true, underlineLinks: true, animLevel: 'off', quietToasts: false, examLock: false, focusMinutes: 20, breakMinutes: 10, compactMode: false },
      apps: ['doc', 'note', 'cards', 'journal'], tools: ['tasks', 'focus', 'countdown', 'calc'], seeds: [] },

    { id: 'minimal', group: 'comfort', name: 'Minimal', tag: 'Almost nothing on screen',
      blurb: 'A compact sidebar with documents and notes only. Everything else is one search away.',
      patch: { theme: 'light', textScale: 100, fontFamily: 'serif', animLevel: 'gentle', quietToasts: true, examLock: false, focusMinutes: 25, breakMinutes: 5, compactMode: true },
      apps: ['doc', 'note'], tools: ['tasks'], seeds: [] }
  ];

  /* ---- starter file builders: (h) => { type, name, content } with h.uid() available ---- */
  const card = (h, q, a) => ({ id: h.uid(), q, a, known: false });
  const kcard = (h, text, extra = {}) => ({ id: h.uid(), text, label: '', due: '', ...extra });
  const col = (h, title, cards = []) => ({ id: h.uid(), title, cards });
  const sheet = (rows) => {
    const cells = {}; let cols = 6;
    rows.forEach((row, r) => row.forEach((value, c) => { cells[String.fromCharCode(65 + c) + (r + 1)] = value; cols = Math.max(cols, row.length); }));
    return { cells, rows: Math.max(20, rows.length + 4), cols: Math.max(12, cols) };
  };
  const inDays = n => { const d = new Date(Date.now() + n * 864e5); return d.toISOString().slice(0, 10); };

  const SEEDS = {
    'homework-board': h => ({ type: 'kanban', name: 'Homework board', content: { columns: [
      col(h, 'To do', [kcard(h, 'Maths worksheet', { label: 'gold', due: inDays(2) }), kcard(h, 'Read chapter 4', { label: 'blue' })]),
      col(h, 'Doing', [kcard(h, 'Science project poster', { label: 'green', due: inDays(6) })]),
      col(h, 'Done', [kcard(h, 'Spelling test practice')])] } }),
    'assignment-board': h => ({ type: 'kanban', name: 'Assignment tracker', content: { columns: [
      col(h, 'Upcoming', [kcard(h, 'Essay draft', { label: 'rose', due: inDays(9) }), kcard(h, 'Lab report', { label: 'gold', due: inDays(4) })]),
      col(h, 'In progress', [kcard(h, 'Problem set 3', { label: 'blue', due: inDays(2) })]),
      col(h, 'Submitted', [])] } }),
    'project-board': h => ({ type: 'kanban', name: 'Project board', content: { columns: [
      col(h, 'Backlog', [kcard(h, 'Collect requirements'), kcard(h, 'Draft timeline', { label: 'gold' })]),
      col(h, 'This week', [kcard(h, 'Kick-off meeting', { label: 'blue', due: inDays(1) })]),
      col(h, 'Blocked', []), col(h, 'Done', [])] } }),
    'sprint-board': h => ({ type: 'kanban', name: 'Sprint board', content: { columns: [
      col(h, 'Todo', [kcard(h, 'Set up repository'), kcard(h, 'Write the parser', { label: 'gold' })]),
      col(h, 'In progress', [kcard(h, 'Review pull request', { label: 'blue' })]),
      col(h, 'Review', []), col(h, 'Shipped', [])] } }),

    'spelling-cards': h => ({ type: 'cards', name: 'Spelling words', content: { cards: [
      card(h, 'necessary', 'One collar, two sleeves: 1 c, 2 s'), card(h, 'because', 'Big elephants can always understand small elephants'),
      card(h, 'friend', 'Ends in end'), card(h, 'separate', 'There is “a rat” in sep-a-rat-e'), card(h, 'beautiful', 'beau + ti + ful')] } }),
    'revision-cards': h => ({ type: 'cards', name: 'Revision cards', content: { cards: [
      card(h, 'What does a mitochondrion do?', 'Releases energy from glucose (respiration).'),
      card(h, 'Area of a circle', 'π × r²'), card(h, 'What is a noun?', 'A word that names a person, place, thing or idea.'),
      card(h, 'Define “photosynthesis”', 'Plants make glucose from carbon dioxide and water using light.'),
      card(h, 'Pythagoras’ theorem', 'a² + b² = c² in a right-angled triangle.')] } }),

    'school-timetable': () => ({ type: 'sheet', name: 'Weekly timetable', content: sheet([
      ['Period', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      ['1  09:00', 'Maths', 'English', 'Science', 'History', 'Art'],
      ['2  10:00', 'English', 'Maths', 'PE', 'Science', 'Music'],
      ['Break', '', '', '', '', ''],
      ['3  11:20', 'Science', 'Geography', 'Maths', 'English', 'Maths'],
      ['4  12:20', 'History', 'Science', 'English', 'Maths', 'Free study'],
      ['Lunch', '', '', '', '', ''],
      ['5  13:40', 'PE', 'Art', 'Computing', 'Geography', 'Assembly']]) }),
    'revision-timetable': () => ({ type: 'sheet', name: 'Revision timetable', content: sheet([
      ['Day', 'Morning', 'Afternoon', 'Evening'],
      ['Monday', 'Maths', 'English', 'Review cards'], ['Tuesday', 'Science', 'Maths past paper', 'Review cards'],
      ['Wednesday', 'History', 'Science', 'Rest'], ['Thursday', 'English', 'Geography', 'Review cards'],
      ['Friday', 'Weak topics', 'Past papers', 'Rest']]) }),
    'reading-list': () => ({ type: 'sheet', name: 'Reading list', content: sheet([
      ['Title', 'Author', 'Course', 'Pages', 'Done'], ['', '', '', '', ''], ['', '', '', '', '']]) }),

    'essay-plan': () => ({ type: 'doc', name: 'Essay plan', content:
      '<h1>Essay plan</h1><p><b>Question:</b> </p><h2>Introduction</h2><p>State your argument in one sentence.</p><h2>Point 1</h2><p>Claim, evidence, explanation.</p><h2>Point 2</h2><p>Claim, evidence, explanation.</p><h2>Point 3</h2><p>Claim, evidence, explanation.</p><h2>Conclusion</h2><p>Return to the question and answer it.</p>' }),
    'lecture-notes': () => ({ type: 'doc', name: 'Lecture notes', content:
      '<h1>Lecture notes</h1><p><b>Module:</b> &nbsp; <b>Date:</b> </p><h2>Key ideas</h2><ul><li></li></ul><h2>Questions to follow up</h2><ul><li></li></ul><h2>Summary in my own words</h2><p></p>' }),
    'meeting-notes': () => ({ type: 'doc', name: 'Meeting notes', content:
      '<h1>Meeting notes</h1><p><b>Date:</b> &nbsp; <b>Attendees:</b> </p><h2>Agenda</h2><ol><li></li></ol><h2>Decisions</h2><ul><li></li></ul><h2>Actions</h2><ul><li>Who, what, by when</li></ul>' }),
    'draft': () => ({ type: 'doc', name: 'First draft', content: '<h1>Working title</h1><p>Begin anywhere. You can tidy it later.</p>' }),
    'daily-pages': h => ({ type: 'journal', name: 'Daily pages', content: { entries: [{ id: h.uid(), date: inDays(0), mood: 3, text: 'Three things on my mind today:\n\n' }] } }),
    'snippets': () => ({ type: 'code', name: 'snippets', content: { lang: 'javascript', wrap: false, tab: 2,
      text: '// Handy snippets\nconst sum = (list) => list.reduce((a, b) => a + b, 0);\n\nfunction debounce(fn, ms = 200) {\n  let timer;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), ms);\n  };\n}\n' } }),
    'sketchbook': () => ({ type: 'sketch', name: 'Sketchbook', content: { w: 960, h: 560, data: null } }),
    'mood-board': h => ({ type: 'board', name: 'Mood board', content: [
      { id: h.uid(), text: 'Colours: warm cream, ink, one bright accent', color: 'yellow' }, { id: h.uid(), text: 'Words: calm, tactile, unhurried', color: 'green' },
      { id: h.uid(), text: 'References to collect', color: 'pink' }] })
  };

  const byId = id => MODES.find(mode => mode.id === id) || MODES[0];
  function seedFiles(modeId, h) { return (byId(modeId).seeds || []).map(id => SEEDS[id] && SEEDS[id](h)).filter(Boolean); }
  function seedLabels(modeId, h) { return seedFiles(modeId, h).map(file => file.name); }

  root.FloraPresets = { GROUPS, MODES, byId, seedFiles, seedLabels };
})(typeof window !== 'undefined' ? window : globalThis);
