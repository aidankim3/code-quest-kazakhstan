(() => {
  "use strict";

  const STORAGE_KEY = "codeQuestKazakhstanV1";
  const $ = (id) => document.getElementById(id);
  const els = {
    lessonList: $("lessonList"), missionNumber: $("missionNumber"), missionTitle: $("missionTitle"),
    conceptBadge: $("conceptBadge"), instruction: $("missionInstruction"), codeCard: $("codeCard"),
    feedback: $("feedback"), hintBox: $("hintBox"), hintLevel: $("hintLevel"), hintBtn: $("hintBtn"),
    runBtn: $("runBtn"), nextBtn: $("nextBtn"), language: $("languageSelect"), starCount: $("starCount"),
    score: $("scoreValue"), lives: $("livesValue"), lessonChip: $("lessonChip"), canvas: $("gameCanvas"),
    overlay: $("gameOverlay"), overlayIcon: $("overlayIcon"), overlayTitle: $("overlayTitle"),
    overlayText: $("overlayText"), overlayButton: $("overlayButton"), levelPanel: $("levelPanel"),
    mapSelect: $("mapSelect"), fsmStatus: $("fsmStatus"), gateDialog: $("gateDialog"),
    gateForm: $("gateForm"), gateCodeInput: $("gateCodeInput"), gateFeedback: $("gateFeedback"),
    gateDestination: $("gateDestination"), gateCancelBtn: $("gateCancelBtn"), skipToLesson5Btn: $("skipToLesson5Btn"),
    skipToLesson7Btn: $("skipToLesson7Btn"),
    openMapEditorBtn: $("openMapEditorBtn"), mapEditorDialog: $("mapEditorDialog"), editorTools: $("editorTools"),
    editorGridEl: $("editorGrid"), editorError: $("editorError"), editorClearBtn: $("editorClearBtn"),
    editorSaveBtn: $("editorSaveBtn"), editorCloseBtn: $("editorCloseBtn")
  };
  const ctx = els.canvas.getContext("2d");

  // Only a salted verification value is distributed to students. This is a
  // classroom pace gate, not cryptographic protection.
  const ACCESS_CODE_HASH = 36869;
  // Hash of "0723" — gates the lesson-7 skip shortcut the same way.
  const SKIP_LESSON7_CODE_HASH = 16456;
  const defaultProgress = { completed: [], stars: {}, hints: {}, unlocked: ["1-1"], passedGates: [], language: "kk", current: "1-1", heroColor: "YELLOW", typingMode: true, soundEnabled: true, mapId: "classic", customMap: null, savedAt: null };
  let progress = loadProgress();
  let currentIndex = Math.max(0, MISSIONS.findIndex(m => m.id === progress.current));
  let selectedAnswer = "";
  let animationId = null;
  let heldDirection = "";
  let demoTimers = [];
  let pendingGateIndex = -1;
  let audioContext = null;
  let wakaHigh = false;
  let lastFsmSignature = "";
  const HERO_STEP_MS = 260;
  const GHOST_STEP_MS = 520;
  const MOVE_DIRECTIONS = [{dx:1,dy:0},{dx:0,dy:1},{dx:-1,dy:0},{dx:0,dy:-1}];
  const EATEN_STEP_MS = 360;
  const EATEN_WAIT_MS = 3000;
  const GHOST_RESPAWN_MIN_DISTANCE = 6;
  const GHOST_RECAPTURE_GUARD_MS = 700;
  const ITEM_RESPAWN_MIN_MS = 6000;
  const ITEM_RESPAWN_MAX_MS = 11000;
  const EDITOR_SIZE = 15;
  const EDITOR_MAX_GHOSTS = 3;
  const EDITOR_TOOLS = [
    { key: "WALL", icon: "⬛", labelKey: "editorToolWall" },
    { key: "DOT", icon: "•", labelKey: "editorToolDot" },
    { key: "POWER", icon: "⚪", labelKey: "editorToolPower", requiresEffect: "mapEditorPowerDot" },
    { key: "HERO", icon: "🟡", labelKey: "editorToolHero" },
    { key: "GHOST", icon: "👻", labelKey: "editorToolGhost" },
    { key: "ERASE", icon: "␡", labelKey: "editorToolErase" }
  ];
  let editorGrid = null;
  let editorHero = null;
  let editorGhosts = [];
  let editorTool = "WALL";
  let editorPainting = false;
  let editorCellEls = null;
  const ITEM_TYPES = [
    { key: "STEALTH", mechanicEffect: "itemStealthMechanic", durationMs: 5000, color: "#b388ff", icon: "🌫️" },
    { key: "PASS_THROUGH", mechanicEffect: "itemPassThroughMechanic", durationMs: 5000, color: "#4de3ff", icon: "🛡️" },
    { key: "SLOW_GHOST", mechanicEffect: "itemSlowGhostMechanic", durationMs: 5000, color: "#55e28a", icon: "🐌" },
    { key: "FAST_HERO", mechanicEffect: "itemFastHeroMechanic", durationMs: 5000, color: "#ffd83d", icon: "⚡" },
    { key: "NOCLIP_WALL", mechanicEffect: "itemNoclipWallMechanic", durationMs: 3000, color: "#ff9f43", icon: "👻" }
  ];

  const MAPS = [
    {
      id: "classic",
      grid: [
        "###############", "#.............#", "#.###.###.###.#", "#o#.........#o#", "#.#.##.#.##.#.#",
        "#.....#.#.....#", "###.#.#.#.#.###", "#...#.....#...#", "#.#.###.###.#.#", "#.#.........#.#",
        "#.#.##.#.##.#.#", "#o...#...#...o#", "#.##.#.#.#.##.#", "#.............#", "###############"
      ],
      hero: [1,1], ghosts: [[13,13],[1,7],[13,1]]
    },
    {
      id: "bridges",
      grid: [
        "###############", "#o...........o#", "#.###.###.###.#", "#.#.........#.#", "#.#.##.#.##.#.#",
        "#...#.....#...#", "###.#.###.#.###", "#.............#", "#.###.#.#.###.#", "#.....#.#.....#",
        "###.#.###.#.###", "#...#.....#...#", "#.#.##.#.##.#.#", "#o...........o#", "###############"
      ],
      hero: [1,1], ghosts: [[13,13],[1,7],[13,1]]
    },
    {
      id: "crossroads",
      grid: [
        "###############", "#.....#.#.....#", "#.###.#.#.###.#", "#.#...#.#...#.#", "#.#.###.###.#.#",
        "#o...........o#", "###.#.###.#.###", "#...#.....#...#", "#.###.#.#.###.#", "#.....#.#.....#",
        "###.#.#.#.#.###", "#.....#.#.....#", "#.###.....###.#", "#o...........o#", "###############"
      ],
      hero: [1,1], ghosts: [[13,13],[7,7],[13,1]]
    }
  ];
  const COLORS = { YELLOW: "#ffd83d", CYAN: "#4de3ff", PINK: "#ff5ea8", GREEN: "#55e28a" };
  let game = freshGame();

  function currentMap() {
    if (progress.mapId === "custom" && progress.customMap) {
      return { id: "custom", grid: progress.customMap.grid, hero: progress.customMap.hero, ghosts: progress.customMap.ghosts };
    }
    return MAPS.find(map => map.id === progress.mapId) || MAPS[0];
  }

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      const loaded = {
        ...defaultProgress,
        ...saved,
        completed: Array.isArray(saved?.completed) ? saved.completed : [],
        unlocked: Array.isArray(saved?.unlocked) ? saved.unlocked : [MISSIONS[0].id],
        passedGates: Array.isArray(saved?.passedGates) ? saved.passedGates : [],
        stars: saved?.stars && typeof saved.stars === "object" ? saved.stars : {}
      };
      if (!['kk','en'].includes(loaded.language)) loaded.language = 'kk';
      // Help is part of learning, not a penalty. Normalize older saved scores too.
      loaded.completed.forEach(id => { loaded.stars[id] = 3; });
      // Migration: Challenges were inserted after the original course shipped.
      // Rebuild every missing "completed mission -> next mission" unlock so an
      // older saved course can still advance with the Next mission button.
      loaded.completed.forEach(id => {
        const index = MISSIONS.findIndex(item => item.id === id);
        const next = MISSIONS[index + 1];
        if (index >= 0 && next && !loaded.unlocked.includes(next.id)) loaded.unlocked.push(next.id);
      });
      // Preserve legitimately completed work when this gate system is added
      // to an existing browser profile.
      const highestCompletedUnit = loaded.completed.reduce((highest, id) => Math.max(highest, Number(id.split("-")[0]) || 1), 1);
      for (let unit = 2; unit <= highestCompletedUnit; unit++) {
        const gateId = `unit-${unit}`;
        if (!loaded.passedGates.includes(gateId)) loaded.passedGates.push(gateId);
      }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded)); } catch (_) { /* Keep running when storage is unavailable. */ }
      return loaded;
    } catch (_) { return { ...defaultProgress }; }
  }
  function saveProgress() {
    progress.current = MISSIONS[currentIndex].id;
    progress.savedAt = new Date().toISOString();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch (_) { /* App remains usable if storage is blocked. */ }
  }
  function lang() { return progress.language; }
  function t(key) { return I18N[lang()][key] ?? I18N.en[key] ?? key; }
  function text(value) { return value?.[lang()] ?? value?.en ?? ""; }
  function mission() { return MISSIONS[currentIndex]; }
  function hasEffect(name) { return MISSIONS.some(m => progress.completed.includes(m.id) && m.effect === name); }
  function missionUnit(index) { return Number(MISSIONS[index]?.id.split("-")[0]) || 1; }
  function unitSessionCount(index) {
    const unit = missionUnit(index);
    return MISSIONS.filter((m, i) => missionUnit(i) === unit && Number(m.id.split("-")[1]) !== 5).length;
  }
  function boundaryGateId(index) {
    if (index <= 0 || missionUnit(index) === missionUnit(index - 1)) return "";
    return `unit-${missionUnit(index)}`;
  }
  function requiredGatesPassed(index) {
    // Walk actual mission-boundary gates rather than unit numbers: unit
    // numbers can have intentional gaps (e.g. a skipped unit reserved for a
    // future lesson block), and a gap must not create an unpassable gate.
    for (let i = 1; i <= index; i++) {
      const gateId = boundaryGateId(i);
      if (gateId && !progress.passedGates.includes(gateId)) return false;
    }
    return true;
  }
  function priorGatesPassed(index) {
    for (let i = 1; i < index; i++) {
      const gateId = boundaryGateId(i);
      if (gateId && !progress.passedGates.includes(gateId)) return false;
    }
    return true;
  }
  function isUnlocked(index) {
    if (index === 0 || progress.completed.includes(MISSIONS[index]?.id)) return true;
    // Sequential completion is authoritative; a stale or edited unlocked list
    // cannot skip unfinished missions or teacher gates.
    return requiredGatesPassed(index) && progress.completed.includes(MISSIONS[index - 1]?.id);
  }

  function ensureAudio() {
    if (!progress.soundEnabled) return null;
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) return null;
    if (!audioContext) audioContext = new AudioEngine();
    if (audioContext.state === "suspended") audioContext.resume();
    return audioContext;
  }

  function tone(frequency, duration = .08, type = "square", volume = .035, delay = 0) {
    const audio = ensureAudio();
    if (!audio) return;
    const start = audio.currentTime + delay;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(Math.max(volume, .0001), start);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain); gain.connect(audio.destination);
    oscillator.start(start); oscillator.stop(start + duration + .01);
  }

  function sfx(name) {
    if (!progress.soundEnabled) return;
    if (name === "move") { wakaHigh = !wakaHigh; tone(wakaHigh ? 150 : 115, .045, "square", .018); }
    if (name === "dot") { tone(620, .055, "square", .025); }
    if (name === "power") { tone(420, .08, "square", .035); tone(720, .1, "square", .03, .07); }
    if (name === "item") { tone(660, .06, "triangle", .03); tone(880, .08, "triangle", .03, .06); }
    if (name === "correct") { tone(523, .09, "triangle", .045); tone(659, .09, "triangle", .045, .09); tone(784, .14, "triangle", .045, .18); }
    if (name === "wrong") { tone(180, .12, "sawtooth", .025); tone(125, .18, "sawtooth", .025, .1); }
    if (name === "life") { tone(320, .12, "sawtooth", .04); tone(210, .14, "sawtooth", .04, .1); tone(120, .2, "sawtooth", .04, .21); }
    if (name === "win") { [523,659,784,1047].forEach((note, i) => tone(note, .14, "triangle", .045, i*.11)); }
    if (name === "gameOver") { [330,262,196,131].forEach((note, i) => tone(note, .2, "sawtooth", .035, i*.15)); }
    if (name === "start") { tone(330, .08, "square", .03); tone(440, .1, "square", .03, .09); }
  }

  function updateSoundButton() {
    const button = $("soundToggle");
    button.textContent = progress.soundEnabled ? "🔊" : "🔇";
    button.classList.toggle("muted", !progress.soundEnabled);
    const label = progress.soundEnabled ? t("soundOn") : t("soundOff");
    button.setAttribute("aria-label", label); button.title = label;
  }

  function freshGame() {
    const map = currentMap();
    const dots = new Set();
    map.grid.forEach((row, y) => [...row].forEach((cell, x) => { if (cell === "." || cell === "o") dots.add(`${x},${y}`); }));
    const [heroX, heroY] = map.hero;
    // The spawn tile is not a pellet. Otherwise a perfect clear requires
    // returning to the exact starting tile at the very end.
    dots.delete(`${heroX},${heroY}`);
    const now = performance.now();
    return {
      hero: movingEntity({ x: heroX, y: heroY, direction: "RIGHT", mouth: 0, nextMoveAt: now, pendingCollect: false }),
      ghosts: map.ghosts.map(([x,y], index) => ({
        ...movingEntity({ x, y }), startX: x, startY: y, dx: index === 1 ? 1 : -1, dy: 0, state: "PATROL", index,
        nextMoveAt: now + GHOST_STEP_MS + index * 90,
        color: ["#ff5ea8", "#4de3ff", "#ff9f43"][index]
      })),
      score: 0, lives: 3, dots, running: false, paused: false, pausedAt: 0, invincibleUntil: 0, collisionCooldownUntil: 0,
      item: null, itemSpawnAt: now + ITEM_RESPAWN_MIN_MS + Math.random() * (ITEM_RESPAWN_MAX_MS - ITEM_RESPAWN_MIN_MS),
      stealthUntil: 0, passThroughUntil: 0, slowGhostUntil: 0, fastHeroUntil: 0, noclipWallUntil: 0
    };
  }

  function movingEntity(entity) {
    return { ...entity, renderX: entity.x, renderY: entity.y, fromX: entity.x, fromY: entity.y, moveStartedAt: 0, moveDuration: 0 };
  }

  function beginEntityMove(entity, x, y, now, duration) {
    updateEntityVisual(entity, now);
    entity.fromX = entity.renderX; entity.fromY = entity.renderY;
    entity.x = x; entity.y = y;
    entity.moveStartedAt = now; entity.moveDuration = duration;
  }

  function updateEntityVisual(entity, now) {
    if (!entity.moveDuration) { entity.renderX = entity.x; entity.renderY = entity.y; return; }
    const amount = Math.min(1, Math.max(0, (now - entity.moveStartedAt) / entity.moveDuration));
    // Linear motion keeps a steady Pac-Man-like speed instead of slowing down at every tile.
    entity.renderX = entity.fromX + (entity.x - entity.fromX) * amount;
    entity.renderY = entity.fromY + (entity.y - entity.fromY) * amount;
    if (amount >= 1) { entity.renderX = entity.x; entity.renderY = entity.y; entity.moveDuration = 0; }
  }

  function placeEntity(entity, x, y) {
    entity.x = x; entity.y = y; entity.renderX = x; entity.renderY = y;
    entity.fromX = x; entity.fromY = y; entity.moveStartedAt = 0; entity.moveDuration = 0;
  }

  function updateVisualPositions(now) {
    updateEntityVisual(game.hero, now);
    game.ghosts.forEach(ghost => updateEntityVisual(ghost, now));
  }

  function activeGhostCount() {
    if (!hasEffect("ghost")) return 0;
    return hasEffect("complete") ? 3 : 2;
  }

  function renderFsmStatus() {
    const ghosts = game.ghosts.slice(0, activeGhostCount());
    const searchVisible = hasEffect("searchQueue");
    const signature = `${lang()}|${searchVisible}|${ghosts.map(ghost => ghost.state).join(",")}`;
    if (signature === lastFsmSignature) return;
    lastFsmSignature = signature;
    els.fsmStatus.classList.toggle("hidden", ghosts.length === 0);
    els.fsmStatus.replaceChildren();
    if (!ghosts.length) return;
    const label = document.createElement("span"); label.textContent = `👻 ${t("ghostAI")} ·`; els.fsmStatus.append(label);
    ["PATROL","CHASE","FRIGHTENED","EATEN"].forEach(state => {
      const count = ghosts.filter(ghost => ghost.state === state).length;
      if (!count) return;
      const stateLabel = document.createElement("span"); stateLabel.className = state.toLowerCase();
      stateLabel.textContent = `${t(state.toLowerCase())} ${count}`; els.fsmStatus.append(stateLabel);
    });
    if (searchVisible) {
      const searchLabel = document.createElement("span"); searchLabel.className = "search";
      searchLabel.textContent = `🧭 ${t("pathSearch")}`; els.fsmStatus.append(searchLabel);
    }
  }

  function applyTranslations() {
    document.documentElement.lang = lang() === "ko" ? "ko" : lang();
    document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-title]").forEach(el => {
      const label = t(el.dataset.i18nTitle); el.title = label; el.setAttribute("aria-label", label);
    });
    updateSoundButton();
    updateGameButtons();
    lastFsmSignature = "";
  }

  function renderAll() {
    clearDemoTimers();
    if (!isUnlocked(currentIndex)) {
      const fallback = MISSIONS.map((_, index) => index).filter(index => index <= currentIndex && isUnlocked(index)).pop();
      currentIndex = Number.isInteger(fallback) ? fallback : 0;
      selectedAnswer = "";
    }
    applyTranslations();
    renderMapSelect();
    renderLessons();
    renderMission();
    updateStats();
    updateSkipButton();
    updateSkipToLesson7Button();
    updateOpenMapEditorButton();
    drawGame(performance.now());
  }

  function updateOpenMapEditorButton() {
    els.openMapEditorBtn.classList.toggle("hidden", !hasEffect("mapEditorReachability"));
  }

  function updateSkipButton() {
    const targetIndex = MISSIONS.findIndex(m => m.lesson === 5);
    const alreadyThere = targetIndex <= 0 || progress.completed.includes(MISSIONS[targetIndex - 1]?.id) || progress.completed.includes(MISSIONS[targetIndex]?.id);
    els.skipToLesson5Btn.classList.toggle("hidden", alreadyThere);
  }

  function updateSkipToLesson7Button() {
    const targetIndex = MISSIONS.findIndex(m => m.lesson === 7);
    const alreadyThere = targetIndex <= 0 || progress.completed.includes(MISSIONS[targetIndex - 1]?.id) || progress.completed.includes(MISSIONS[targetIndex]?.id);
    els.skipToLesson7Btn.classList.toggle("hidden", alreadyThere);
  }

  function completeMissionsThrough(targetIndex) {
    MISSIONS.slice(0, targetIndex).forEach(m => {
      if (!progress.completed.includes(m.id)) progress.completed.push(m.id);
      progress.stars[m.id] = 3;
    });
    for (let i = 1; i <= targetIndex; i++) {
      const gateId = boundaryGateId(i);
      if (gateId && !progress.passedGates.includes(gateId)) progress.passedGates.push(gateId);
    }
    const target = MISSIONS[targetIndex];
    if (!progress.unlocked.includes(target.id)) progress.unlocked.push(target.id);
    currentIndex = targetIndex;
    selectedAnswer = "";
    game = freshGame();
    saveProgress();
    renderAll();
    els.levelPanel.classList.remove("open");
  }

  function skipToLesson5() {
    const targetIndex = MISSIONS.findIndex(m => m.lesson === 5);
    if (targetIndex <= 0) return;
    if (!confirm(t("skipConfirm"))) return;
    completeMissionsThrough(targetIndex);
  }

  function skipToLesson7() {
    const targetIndex = MISSIONS.findIndex(m => m.lesson === 7);
    if (targetIndex <= 0) return;
    const code = prompt(t("skipLesson7PasswordPrompt"));
    if (code === null) return;
    if (accessCodeHash(code.trim()) !== SKIP_LESSON7_CODE_HASH) { alert(t("skipLesson7WrongPassword")); return; }
    if (!confirm(t("skipConfirm7"))) return;
    completeMissionsThrough(targetIndex);
  }

  function renderMapSelect() {
    const names = t("mapNames");
    els.mapSelect.replaceChildren();
    MAPS.forEach((map, index) => {
      const option = document.createElement("option"); option.value = map.id; option.textContent = names[index];
      els.mapSelect.append(option);
    });
    if (progress.customMap) {
      const option = document.createElement("option"); option.value = "custom"; option.textContent = t("customMapName");
      els.mapSelect.append(option);
    }
    els.mapSelect.value = currentMap().id;
    els.mapSelect.setAttribute("aria-label", t("mapLabel"));
  }

  function renderLessons() {
    els.lessonList.replaceChildren();
    for (let lesson = 1; lesson <= t("lessonNames").length; lesson++) {
      const lessonMissions = MISSIONS.filter(m => m.lesson === lesson);
      const active = mission().lesson === lesson;
      const group = document.createElement("div");
      group.className = `lesson-group${active ? " active" : ""}`;
      const completeCount = lessonMissions.filter(m => progress.completed.includes(m.id)).length;
      const button = document.createElement("button");
      button.className = "lesson-title";
      button.innerHTML = `<span class="lesson-number">${lesson}</span><span class="lesson-title-text"></span><span class="lesson-stars">${completeCount}/${lessonMissions.length}</span>`;
      button.querySelector(".lesson-title-text").textContent = t("lessonNames")[lesson - 1];
      button.addEventListener("click", () => {
        const firstIndex = MISSIONS.findIndex(m => m.lesson === lesson && isUnlocked(MISSIONS.indexOf(m)));
        if (firstIndex >= 0) { currentIndex = firstIndex; selectedAnswer = ""; saveProgress(); renderAll(); }
      });
      const list = document.createElement("div");
      list.className = "mission-list";
      lessonMissions.forEach(m => {
        const index = MISSIONS.indexOf(m);
        const link = document.createElement("button");
        const locked = !isUnlocked(index);
        const session = Number(m.id.split("-")[1]);
        const gateId = boundaryGateId(index);
        const gateLocked = locked && Boolean(gateId) && !progress.passedGates.includes(gateId);
        const gateReady = gateLocked && priorGatesPassed(index) && progress.completed.includes(MISSIONS[index - 1]?.id);
        link.className = `mission-link${session === 5 ? " challenge-link" : ""}${index === currentIndex ? " current" : ""}${progress.completed.includes(m.id) ? " complete" : ""}${locked ? " locked" : ""}${gateLocked ? " gate-locked" : ""}`;
        link.textContent = session === 5 ? text(m.title) : `${t("session")} ${session} · ${text(m.title)}`;
        link.disabled = locked && !gateReady;
        link.addEventListener("click", () => {
          if (gateReady) { openGate(index); return; }
          currentIndex = index; selectedAnswer = ""; saveProgress(); renderAll(); els.levelPanel.classList.remove("open");
        });
        list.append(link);
      });
      group.append(button, list);
      els.lessonList.append(group);
    }
  }

  function renderMission() {
    const m = mission();
    const session = Number(m.id.split("-")[1]);
    els.missionNumber.textContent = session === 5 ? `★ ${t("challenge")}` : `${t("session")} ${session} / ${unitSessionCount(currentIndex)}`;
    els.missionTitle.textContent = text(m.title);
    els.conceptBadge.textContent = CONCEPTS[m.concept]?.[lang()] || m.concept;
    els.instruction.textContent = text(m.instruction);
    els.lessonChip.textContent = `${m.lesson} ${t("lesson")}`;
    els.feedback.className = "feedback hidden";
    els.hintBox.className = "hint-box hidden";
    els.nextBtn.classList.toggle("hidden", !progress.completed.includes(m.id));
    $("inputModeBar").classList.toggle("hidden", m.input === "choice");
    $("typingModeBtn").classList.toggle("active", progress.typingMode);
    $("selectModeBtn").classList.toggle("active", !progress.typingMode);
    const hintUsed = progress.hints[m.id] || 0;
    els.hintLevel.textContent = `${Math.min(hintUsed + 1, 3)}/3`;
    renderCodeInput(m);
    renderToolbox(m);
  }

  function renderCodeInput(m) {
    els.codeCard.replaceChildren();
    if (m.input === "choice") {
      const code = document.createElement("div");
      code.className = "code-line";
      code.textContent = m.code.split("{{answer}}")[0];
      els.codeCard.append(code, createChoices(m));
      return;
    }
    const lines = m.code.split("\n");
    lines.forEach((line, lineIndex) => {
      const row = document.createElement("div"); row.className = "code-line";
      const [before, after] = line.split("{{answer}}");
      appendHighlighted(row, before || "");
      if (line.includes("{{answer}}")) row.append(progress.typingMode ? createTypingInput(m) : createSelect(m));
      appendHighlighted(row, after || "");
      if (lineIndex > 0) row.style.paddingLeft = "18px";
      els.codeCard.append(row);
    });
  }

  function appendHighlighted(parent, source) {
    const parts = source.split(/(if|True|False|move\w*|stop|win|game_over|hide_dot|lose_life)/g);
    parts.forEach(part => {
      const span = document.createElement("span"); span.textContent = part;
      if (["if","True","False"].includes(part)) span.className = "code-keyword";
      else if (/^(move|stop|win|game_|hide_|lose_)/.test(part)) span.className = "code-function";
      parent.append(span);
    });
  }

  function createSelect(m) {
    const select = document.createElement("select"); select.className = "answer-select";
    const placeholder = document.createElement("option"); placeholder.value = ""; placeholder.textContent = "___"; select.append(placeholder);
    m.options.forEach(option => { const el = document.createElement("option"); el.value = option; el.textContent = option; select.append(el); });
    select.value = selectedAnswer;
    select.addEventListener("change", e => { selectedAnswer = e.target.value; });
    return select;
  }

  function createTypingInput(m) {
    const input = document.createElement("input");
    input.className = "answer-input"; input.type = "text"; input.value = selectedAnswer;
    input.placeholder = "_____"; input.autocomplete = "off"; input.autocapitalize = "off"; input.spellcheck = false;
    const longest = Math.max(m.answer.length, ...m.options.map(option => String(option).length));
    input.style.setProperty("--answer-width", `${Math.min(132, Math.max(64, 22 + longest * 7))}px`);
    input.setAttribute("aria-label", t("typingMode"));
    input.addEventListener("input", e => { selectedAnswer = e.target.value; });
    input.addEventListener("keydown", e => { if (e.key === "Enter") checkAnswer(); });
    // Keep the full layout in view on small screens; automatic focus can make
    // mobile browsers jump down to the keyboard/input area.
    if (window.innerWidth > 720) setTimeout(() => input.focus(), 0);
    return input;
  }

  function createChoices(m) {
    const grid = document.createElement("div"); grid.className = "choice-grid";
    m.options.forEach(option => {
      const button = document.createElement("button"); button.className = `choice-card${selectedAnswer === option ? " selected" : ""}`;
      button.textContent = option; button.type = "button";
      button.addEventListener("click", () => { selectedAnswer = option; grid.querySelectorAll("button").forEach(b => b.classList.toggle("selected", b === button)); });
      grid.append(button);
    });
    return grid;
  }

  function renderToolbox(m) {
    const box = $("codeToolbox");
    const items = $("toolboxItems");
    items.replaceChildren();
    box.classList.toggle("hidden", m.input === "choice");
    if (m.input === "choice") return;
    m.options.forEach(option => {
      const card = document.createElement("div"); card.className = "toolbox-item";
      const code = document.createElement("code"); code.textContent = option;
      card.append(code);
      const help = CODE_HELP[option];
      if (help) { const meaning = document.createElement("span"); meaning.textContent = help[lang()] || help.en; card.append(meaning); }
      items.append(card);
    });
  }

  function checkAnswer() {
    const m = mission();
    const normalized = value => String(value).trim().replace(/\s+/g, "").toLowerCase();
    const correct = m.input === "choice" ? m.options.includes(selectedAnswer) : normalized(selectedAnswer) === normalized(m.answer);
    els.feedback.classList.remove("hidden", "correct", "wrong");
    if (!selectedAnswer || !correct) {
      els.feedback.classList.add("wrong");
      els.feedback.textContent = !selectedAnswer ? t("selectAnswer") : feedbackForMistake(m);
      sfx("wrong");
      return;
    }
    els.feedback.classList.add("correct");
    els.feedback.textContent = `✓ ${t("correct")}`;
    sfx("correct");
    const nextIndex = currentIndex + 1;
    const next = MISSIONS[nextIndex];
    const nextGate = boundaryGateId(nextIndex);
    if (next && (!nextGate || progress.passedGates.includes(nextGate)) && !progress.unlocked.includes(next.id)) progress.unlocked.push(next.id);
    if (!progress.completed.includes(m.id)) {
      progress.completed.push(m.id);
      progress.stars[m.id] = 3;
      if (m.effect === "customize") progress.heroColor = selectedAnswer;
      game = freshGame();
    }
    saveProgress();
    if (nextGate && !progress.passedGates.includes(nextGate)) els.feedback.textContent = `✓ ${t("gateNeeded")}`;
    els.nextBtn.classList.remove("hidden");
    renderLessons(); updateStats(); celebrateFeature(m.effect); demonstrateEffect(m.effect);
  }

  function demonstrateEffect(effect) {
    if (!["right", "directions", "maze", "dots"].includes(effect)) return;
    game.running = true;
    const sequence = effect === "directions" ? ["RIGHT", "RIGHT", "DOWN", "LEFT"] : ["RIGHT", "RIGHT"];
    demoTimers = sequence.map((direction, index) => setTimeout(() => moveHero(direction), 350 + index * 420));
  }

  function clearDemoTimers() {
    demoTimers.forEach(timer => clearTimeout(timer));
    demoTimers = [];
  }

  function feedbackForMistake(m) {
    const map = {
      notWall: { kk:"Қабырға болса, қозғала алмаймыз. ‘Тең емес’ белгісін ізде.", en:"We cannot move into a wall. Look for ‘not equal’.", ko:"벽이라면 이동할 수 없어요. ‘같지 않다’ 기호를 찾아보세요." },
      score: { kk:"Әр кішкентай нүкте бір ұпай береді.", en:"Each small dot gives one point.", ko:"작은 점 하나는 1점을 줘요." },
      lives: { kk:"Бір соқтығыс бір өмірді азайтады.", en:"One collision removes one life.", ko:"한 번 충돌하면 생명 하나가 줄어요." }
    };
    return text(map[m.effect]) || t("wrong");
  }

  function showHint() {
    const m = mission();
    const used = Math.min((progress.hints[m.id] || 0) + 1, 3);
    progress.hints[m.id] = used; saveProgress();
    els.hintBox.textContent = `💡 ${text(m.hints[used - 1])}`;
    els.hintBox.classList.remove("hidden");
    els.hintLevel.textContent = `${used}/3`;
  }

  function nextMission() {
    if (currentIndex < MISSIONS.length - 1) {
      const nextIndex = currentIndex + 1;
      const gateId = boundaryGateId(nextIndex);
      if (gateId && !progress.passedGates.includes(gateId)) { openGate(nextIndex); return; }
      if (isUnlocked(nextIndex)) { currentIndex = nextIndex; selectedAnswer = ""; saveProgress(); renderAll(); }
    } else if (currentIndex === MISSIONS.length - 1) {
      showOverlay("🏆", t("allDone"), t("allDoneText"), t("playGame"));
    }
  }

  function accessCodeHash(value) {
    let hash = 19;
    for (const character of String(value)) hash = (hash * 37 + character.charCodeAt(0)) % 100003;
    return hash;
  }

  function openGate(nextIndex) {
    pendingGateIndex = nextIndex;
    const target = MISSIONS[nextIndex];
    els.gateDestination.textContent = `${target.lesson} ${t("lesson")} · ${t("session")} 1`;
    els.gateCodeInput.value = "";
    els.gateFeedback.classList.add("hidden");
    els.gateFeedback.textContent = "";
    if (typeof els.gateDialog.showModal === "function") els.gateDialog.showModal();
    else els.gateDialog.setAttribute("open", "");
    setTimeout(() => els.gateCodeInput.focus(), 0);
  }

  function closeGate() {
    pendingGateIndex = -1;
    if (typeof els.gateDialog.close === "function") els.gateDialog.close();
    else els.gateDialog.removeAttribute("open");
  }

  function submitGate(event) {
    event.preventDefault();
    const code = els.gateCodeInput.value.replace(/\D/g, "").slice(0, 3);
    if (code.length !== 3 || accessCodeHash(code) !== ACCESS_CODE_HASH || pendingGateIndex < 0) {
      els.gateFeedback.textContent = t("gateWrong");
      els.gateFeedback.classList.remove("hidden");
      els.gateCodeInput.select();
      sfx("wrong");
      return;
    }
    const gateId = boundaryGateId(pendingGateIndex);
    if (gateId && !progress.passedGates.includes(gateId)) progress.passedGates.push(gateId);
    const target = MISSIONS[pendingGateIndex];
    if (target && !progress.unlocked.includes(target.id)) progress.unlocked.push(target.id);
    currentIndex = pendingGateIndex; selectedAnswer = ""; pendingGateIndex = -1;
    if (typeof els.gateDialog.close === "function") els.gateDialog.close();
    else els.gateDialog.removeAttribute("open");
    saveProgress(); renderAll(); sfx("correct");
  }

  function celebrateFeature(effect) {
    const pulseEffects = ["maze","dots","ghost","complete"];
    if (pulseEffects.includes(effect)) {
      els.canvas.animate([{ filter: "brightness(1)" }, { filter: "brightness(1.8)" }, { filter: "brightness(1)" }], { duration: 650 });
    }
  }

  function updateStats() {
    els.starCount.textContent = Object.values(progress.stars).reduce((a, b) => a + Number(b || 0), 0);
    $("starTotal").textContent = `/ ${MISSIONS.length * 3}`;
    els.score.textContent = game.score;
    els.lives.textContent = "♥ ".repeat(Math.max(0, game.lives)).trim() || "—";
  }

  function updateGameButtons() {
    const button = $("pauseGameBtn");
    const label = $("pauseGameLabel");
    label.textContent = game.paused ? t("resumeGame") : t("stopGame");
    button.firstChild.textContent = game.paused ? "▶ " : "⏸ ";
    button.classList.toggle("paused", game.paused);
  }

  function showOverlay(icon, title, message, buttonText) {
    els.overlayIcon.textContent = icon; els.overlayTitle.textContent = title; els.overlayText.textContent = message;
    els.overlayButton.textContent = buttonText; els.overlay.classList.remove("hidden");
  }
  function hideOverlay() { els.overlay.classList.add("hidden"); }

  function startGame() {
    clearDemoTimers(); game = freshGame(); game.running = true; game.paused = false; hideOverlay(); updateStats(); updateGameButtons();
    heldDirection = ""; sfx("start");
    if (!animationId) animationId = requestAnimationFrame(gameLoop);
  }

  function togglePause() {
    if (!els.overlay.classList.contains("hidden")) return;
    if (game.paused) {
      const now = performance.now();
      const pausedFor = Math.max(0, now - game.pausedAt);
      [game.hero, ...game.ghosts].forEach(entity => {
        if (entity.moveDuration) entity.moveStartedAt += pausedFor;
      });
      if (game.invincibleUntil > game.pausedAt) game.invincibleUntil += pausedFor;
      if (game.collisionCooldownUntil > game.pausedAt) game.collisionCooldownUntil += pausedFor;
      game.ghosts.forEach(ghost => {
        if (ghost.releaseAt > game.pausedAt) ghost.releaseAt += pausedFor;
        if (ghost.recaptureGuardUntil > game.pausedAt) ghost.recaptureGuardUntil += pausedFor;
      });
      ["itemSpawnAt","stealthUntil","passThroughUntil","slowGhostUntil","fastHeroUntil","noclipWallUntil"].forEach(key => {
        if (game[key] > game.pausedAt) game[key] += pausedFor;
      });
      game.paused = false; game.running = true; game.hero.nextMoveAt = now;
      game.ghosts.forEach((ghost, index) => { ghost.nextMoveAt = now + index * 90; });
      sfx("start");
    } else {
      const now = performance.now();
      updateVisualPositions(now);
      game.pausedAt = now; game.paused = true; game.running = false;
    }
    updateGameButtons(); drawGame(performance.now());
  }

  function restartGame() {
    clearDemoTimers(); game = freshGame(); game.running = true; game.paused = false;
    heldDirection = ""; hideOverlay(); updateStats(); updateGameButtons(); drawGame(performance.now()); sfx("start");
  }

  function resetCurrentPage() {
    if (!confirm(t("resetPageConfirm"))) return;
    location.reload();
  }

  function gameLoop(time) {
    const frameTime = game.paused ? game.pausedAt : time;
    updateVisualPositions(frameTime);
    if (game.hero.pendingCollect && !game.hero.moveDuration) {
      game.hero.pendingCollect = false;
      collectDot();
      collectItem(frameTime);
    }
    if (game.running && heldDirection && time >= game.hero.nextMoveAt) attemptHeroMove(heldDirection, time);
    if (game.running && hasEffect("ghost")) moveGhosts(time);
    if (game.running) checkGhostCollision(time);
    if (game.running) maybeSpawnItem(time);
    drawGame(frameTime);
    animationId = requestAnimationFrame(gameLoop);
  }

  function moveHero(direction) {
    const now = performance.now();
    if (game.paused) return;
    if (!els.overlay.classList.contains("hidden")) return;
    if (!game.running) game.running = true;
    attemptHeroMove(direction, now);
  }

  function attemptHeroMove(direction, now) {
    if (now < game.hero.nextMoveAt) return false;
    // moveHero() (keydown/tap) calls this directly, outside the game loop's
    // own per-frame ordering. Without resolving the previous tile's pending
    // dot here too, a move starting right as the last one finishes can
    // overwrite hero.x/y before collectDot() ever runs for it, silently
    // skipping that dot or power dot.
    updateEntityVisual(game.hero, now);
    if (game.hero.pendingCollect && !game.hero.moveDuration) {
      game.hero.pendingCollect = false;
      collectDot();
      collectItem(now);
    }
    const allowed = hasEffect("directions") ? ["UP","DOWN","LEFT","RIGHT"] : hasEffect("right") ? ["RIGHT"] : [];
    if (!allowed.includes(direction)) return false;
    const grid = currentMap().grid;
    const vectors = { UP:[0,-1], DOWN:[0,1], LEFT:[-1,0], RIGHT:[1,0] };
    const [dx,dy] = vectors[direction]; const nx = game.hero.x + dx; const ny = game.hero.y + dy;
    game.hero.direction = direction;
    const wall = grid[ny]?.[nx] === "#";
    const phasing = hasEffect("itemNoclipWallMechanic") && now < game.noclipWallUntil;
    if ((hasEffect("walls") || hasEffect("maze")) && wall && !phasing) { game.hero.nextMoveAt = now + 80; return false; }
    if (!grid[ny] || nx < 0 || nx >= grid[0].length) return false;
    const stepDuration = heroStepDuration(now);
    game.hero.nextMoveAt = now + stepDuration;
    beginEntityMove(game.hero, nx, ny, now, stepDuration);
    game.hero.pendingCollect = true;
    sfx("move");
    checkGhostCollision(); drawGame(performance.now());
    return true;
  }

  function collectDot() {
    if (!hasEffect("dots")) return;
    const key = `${game.hero.x},${game.hero.y}`;
    if (!game.dots.has(key)) return;
    const isPower = currentMap().grid[game.hero.y][game.hero.x] === "o" && hasEffect("powerDot");
    game.dots.delete(key);
    game.score += hasEffect("score") ? (isPower ? 5 : 1) : 0;
    if (isPower) game.invincibleUntil = performance.now() + 6000;
    sfx(isPower ? "power" : "dot");
    updateStats();
    if (hasEffect("win") && game.dots.size === 0) { game.running = false; sfx("win"); showOverlay("🏆", t("win"), t("winText"), t("tryAgain")); }
  }

  function ghostHomeTile(ghost) { return { x: ghost.startX, y: ghost.startY }; }

  function moveEatenGhost(ghost, now, grid) {
    const home = ghostHomeTile(ghost);
    if (ghost.x === home.x && ghost.y === home.y) {
      if (!ghost.releaseAt) ghost.releaseAt = now + EATEN_WAIT_MS;
      if (now >= ghost.releaseAt) {
        ghost.state = "PATROL";
        ghost.releaseAt = 0;
        ghost.dx = ghost.index === 1 ? 1 : -1; ghost.dy = 0;
        ghost.nextMoveAt = now + GHOST_STEP_MS;
      } else {
        ghost.nextMoveAt = now + 120;
      }
      return;
    }
    const moves = MOVE_DIRECTIONS.filter(move => grid[ghost.y + move.dy]?.[ghost.x + move.dx] !== "#");
    if (!moves.length) { ghost.nextMoveAt = now + EATEN_STEP_MS; return; }
    const reverse = moves.find(move => move.dx === -ghost.dx && move.dy === -ghost.dy);
    const nonReverse = moves.filter(move => move !== reverse);
    const chosen = chooseToward(nonReverse.length ? nonReverse : moves, ghost, home, grid);
    ghost.dx = chosen.dx; ghost.dy = chosen.dy;
    ghost.nextMoveAt = now + EATEN_STEP_MS;
    beginEntityMove(ghost, ghost.x + chosen.dx, ghost.y + chosen.dy, now, EATEN_STEP_MS);
  }

  function moveGhosts(now = performance.now()) {
    const grid = currentMap().grid;
    game.ghosts.slice(0, activeGhostCount()).forEach(ghost => {
      if (now < ghost.nextMoveAt) return;
      if (ghost.state === "EATEN") { moveEatenGhost(ghost, now, grid); return; }
      const previousState = ghost.state;
      const distance = Math.abs(ghost.x - game.hero.x) + Math.abs(ghost.y - game.hero.y);
      const stealthed = hasEffect("itemStealthMechanic") && now < game.stealthUntil;
      ghost.state = now < game.invincibleUntil ? "FRIGHTENED" : (!stealthed && distance <= 5) ? "CHASE" : "PATROL";
      let stepDuration = ghost.state === "FRIGHTENED" ? Math.round(GHOST_STEP_MS * 1.65) : GHOST_STEP_MS;
      if (hasEffect("itemSlowGhostMechanic") && now < game.slowGhostUntil) stepDuration *= 2;
      ghost.nextMoveAt = now + stepDuration;

      const moves = MOVE_DIRECTIONS.filter(move => grid[ghost.y + move.dy]?.[ghost.x + move.dx] !== "#");
      if (!moves.length) return;
      const reverse = moves.find(move => move.dx === -ghost.dx && move.dy === -ghost.dy);
      const forward = moves.find(move => move.dx === ghost.dx && move.dy === ghost.dy);
      const nonReverse = moves.filter(move => move !== reverse);
      let chosen;

      if (ghost.state === "FRIGHTENED") {
        // Reverse once on entry, then take unpredictable non-reversing turns.
        const frightenedMoves = nonReverse.length ? nonReverse : moves;
        chosen = previousState !== "FRIGHTENED" && reverse ? reverse : frightenedMoves[Math.floor(Math.random() * frightenedMoves.length)];
      } else if (ghost.state === "CHASE") {
        const target = ghostTarget(ghost, grid);
        chosen = chooseToward(nonReverse.length ? nonReverse : moves, ghost, target, grid);
      } else {
        // Patrol toward a personal corner; only reconsider direction at intersections.
        const corners = [{x:grid[0].length-2,y:1},{x:1,y:grid.length-2},{x:grid[0].length-2,y:grid.length-2}];
        chosen = forward && nonReverse.length <= 1 ? forward : chooseToward(nonReverse.length ? nonReverse : moves, ghost, corners[ghost.index], grid);
      }
      ghost.dx = chosen.dx; ghost.dy = chosen.dy;
      beginEntityMove(ghost, ghost.x + chosen.dx, ghost.y + chosen.dy, now, stepDuration);
    });
    renderFsmStatus(); checkGhostCollision();
  }

  function ghostTarget(ghost, grid) {
    const vectors = { UP:[0,-1], DOWN:[0,1], LEFT:[-1,0], RIGHT:[1,0] };
    const [hx,hy] = vectors[game.hero.direction] || [1,0];
    if (ghost.index === 0) return { x:game.hero.x, y:game.hero.y }; // direct chaser
    if (ghost.index === 1) return { x:game.hero.x + hx * 3, y:game.hero.y + hy * 3 }; // ambusher
    // The third ghost blocks the side opposite Pac-Man's next turn.
    return { x:game.hero.x - hy * 3, y:game.hero.y + hx * 3 };
  }

  function chooseToward(moves, ghost, target, grid) {
    const destination = nearestWalkable(target, grid);
    return [...moves].sort((a,b) => {
      const ax = ghost.x + a.dx, ay = ghost.y + a.dy;
      const bx = ghost.x + b.dx, by = ghost.y + b.dy;
      const da = pathDistance(ax, ay, destination, grid);
      const db = pathDistance(bx, by, destination, grid);
      // Stable personality-based tie breaker prevents every ghost choosing the same turn.
      const ta = (MOVE_DIRECTIONS.indexOf(a) + ghost.index) % MOVE_DIRECTIONS.length;
      const tb = (MOVE_DIRECTIONS.indexOf(b) + ghost.index) % MOVE_DIRECTIONS.length;
      return da - db || ta - tb;
    })[0];
  }

  function nearestWalkable(target, grid) {
    const width = grid[0].length, height = grid.length;
    const tx = Math.max(1, Math.min(width - 2, Math.round(target.x)));
    const ty = Math.max(1, Math.min(height - 2, Math.round(target.y)));
    if (grid[ty][tx] !== "#") return { x:tx, y:ty };
    let best = { x:game.hero.x, y:game.hero.y }, bestDistance = Infinity;
    grid.forEach((row, y) => [...row].forEach((cell, x) => {
      if (cell === "#") return;
      const distance = Math.abs(x - tx) + Math.abs(y - ty);
      if (distance < bestDistance) { best = {x,y}; bestDistance = distance; }
    }));
    return best;
  }

  function pathDistance(startX, startY, target, grid) {
    if (startX === target.x && startY === target.y) return 0;
    const queue = [{x:startX,y:startY,distance:0}];
    const seen = new Set([`${startX},${startY}`]);
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index];
      for (const move of MOVE_DIRECTIONS) {
        const x = current.x + move.dx, y = current.y + move.dy, key = `${x},${y}`;
        if (seen.has(key) || grid[y]?.[x] === "#" || grid[y]?.[x] === undefined) continue;
        if (x === target.x && y === target.y) return current.distance + 1;
        seen.add(key); queue.push({x,y,distance:current.distance+1});
      }
    }
    return Infinity;
  }

  function walkableTiles(grid) {
    const tiles = [];
    grid.forEach((row, y) => [...row].forEach((cell, x) => { if (cell !== "#") tiles.push({ x, y }); }));
    return tiles;
  }

  function randomFarTile(grid) {
    const distanceFromHero = tile => Math.abs(tile.x - game.hero.x) + Math.abs(tile.y - game.hero.y);
    const tiles = walkableTiles(grid);
    const far = tiles.filter(tile => distanceFromHero(tile) >= GHOST_RESPAWN_MIN_DISTANCE);
    if (far.length) return far[Math.floor(Math.random() * far.length)];
    return tiles.reduce((best, tile) => (distanceFromHero(tile) > distanceFromHero(best) ? tile : best), tiles[0]);
  }

  function activeItemPool() { return ITEM_TYPES.filter(type => hasEffect(type.mechanicEffect)); }

  function heroStepDuration(now) {
    return (hasEffect("itemFastHeroMechanic") && now < game.fastHeroUntil) ? Math.round(HERO_STEP_MS / 2) : HERO_STEP_MS;
  }

  function maybeSpawnItem(now) {
    if (game.item || now < game.itemSpawnAt) return;
    const pool = activeItemPool();
    if (!pool.length) return;
    const type = pool[Math.floor(Math.random() * pool.length)];
    const tile = randomFarTile(currentMap().grid);
    game.item = { type: type.key, x: tile.x, y: tile.y };
  }

  function collectItem(now) {
    if (!game.item || game.hero.x !== game.item.x || game.hero.y !== game.item.y) return;
    const type = ITEM_TYPES.find(entry => entry.key === game.item.type);
    if (type.key === "STEALTH") game.stealthUntil = now + type.durationMs;
    else if (type.key === "PASS_THROUGH") game.passThroughUntil = now + type.durationMs;
    else if (type.key === "SLOW_GHOST") game.slowGhostUntil = now + type.durationMs;
    else if (type.key === "FAST_HERO") game.fastHeroUntil = now + type.durationMs;
    else if (type.key === "NOCLIP_WALL") game.noclipWallUntil = now + type.durationMs;
    game.item = null;
    game.itemSpawnAt = now + ITEM_RESPAWN_MIN_MS + Math.random() * (ITEM_RESPAWN_MAX_MS - ITEM_RESPAWN_MIN_MS);
    sfx("item");
  }

  function eatGhostRandom(ghost, now) {
    const tile = randomFarTile(currentMap().grid);
    placeEntity(ghost, tile.x, tile.y);
    ghost.dx = ghost.index === 1 ? 1 : -1; ghost.dy = 0;
    ghost.state = "PATROL";
    ghost.nextMoveAt = now + GHOST_STEP_MS;
    // Guards against instant re-capture even if power mode is still running.
    ghost.recaptureGuardUntil = now + GHOST_RECAPTURE_GUARD_MS;
  }

  function eatGhostHome(ghost, now) {
    ghost.state = "EATEN";
    ghost.releaseAt = 0;
    ghost.nextMoveAt = now;
  }

  function checkGhostCollision() {
    if (!hasEffect("ghostCollision")) return;
    const now = performance.now();
    if (now < game.collisionCooldownUntil) return;
    updateVisualPositions(now);
    const ghost = game.ghosts.slice(0, activeGhostCount()).find(item =>
      item.state !== "EATEN" && (!item.recaptureGuardUntil || now >= item.recaptureGuardUntil) &&
      Math.hypot(game.hero.renderX - item.renderX, game.hero.renderY - item.renderY) < .52
    );
    if (!ghost) return;
    if (now < game.invincibleUntil) {
      game.score += 5;
      if (hasEffect("ghostRespawnHome")) eatGhostHome(ghost, now);
      else if (hasEffect("ghostRespawnRandom")) eatGhostRandom(ghost, now);
      else { placeEntity(ghost, ghost.startX, ghost.startY); ghost.dx = ghost.index === 1 ? 1 : -1; ghost.dy = 0; ghost.state = "PATROL"; ghost.nextMoveAt = now + GHOST_STEP_MS; }
      sfx("power"); updateStats(); renderFsmStatus(); return;
    }
    if (hasEffect("itemPassThroughMechanic") && now < game.passThroughUntil) return;
    if (hasEffect("lives")) game.lives--;
    game.collisionCooldownUntil = now + 900;
    placeEntity(game.hero, ...currentMap().hero); game.hero.pendingCollect = false; game.hero.nextMoveAt = now + HERO_STEP_MS; heldDirection = ""; sfx("life"); updateStats();
    if (hasEffect("gameOver") && game.lives <= 0) { game.running = false; sfx("gameOver"); showOverlay("👻", t("gameOver"), "", t("tryAgain")); }
  }

  function drawGame(time = 0) {
    if (game.paused) time = game.pausedAt;
    updateVisualPositions(time);
    const grid = currentMap().grid;
    const size = els.canvas.width / grid.length;
    ctx.clearRect(0,0,els.canvas.width,els.canvas.height);
    ctx.fillStyle = "#050819"; ctx.fillRect(0,0,els.canvas.width,els.canvas.height);
    const showWalls = hasEffect("walls") || hasEffect("maze") || progress.completed.some(id => Number(id[0]) >= 3);
    grid.forEach((row,y) => [...row].forEach((cell,x) => {
      if (cell === "#" && showWalls) {
        ctx.fillStyle = "#223995"; ctx.fillRect(x*size+2,y*size+2,size-4,size-4);
        ctx.strokeStyle = "#4d69db"; ctx.lineWidth = 2; ctx.strokeRect(x*size+5,y*size+5,size-10,size-10);
      } else if ((cell === "." || cell === "o") && hasEffect("dots") && game.dots.has(`${x},${y}`)) {
        ctx.beginPath(); ctx.fillStyle = cell === "o" && hasEffect("powerDot") ? "#fff" : "#ffdca8";
        ctx.arc(x*size+size/2,y*size+size/2,cell === "o" && hasEffect("powerDot") ? 6 : 2.7,0,Math.PI*2); ctx.fill();
      }
    }));
    if (game.item) drawItem(game.item, size, time);
    if (hasEffect("start") || progress.completed.length === 0) drawHero(game.hero.renderX*size+size/2, game.hero.renderY*size+size/2, size*.38, time);
    if (hasEffect("ghost")) game.ghosts.slice(0, activeGhostCount()).forEach(ghost => {
      drawGhost(ghost.renderX*size+size/2, ghost.renderY*size+size/2, size*.34, time, ghost.color, ghost);
    });
    renderFsmStatus();
  }

  function drawItem(item, size, time) {
    const type = ITEM_TYPES.find(entry => entry.key === item.type);
    if (!type) return;
    const x = item.x*size+size/2, y = item.y*size+size/2 + Math.sin(time/160)*2;
    const pulse = .78 + Math.abs(Math.sin(time/220))*.22;
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, size*.36*pulse, 0, Math.PI*2);
    ctx.fillStyle = `${type.color}33`; ctx.fill();
    ctx.font = `${Math.round(size*.42)}px sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(type.icon, x, y);
    ctx.restore();
  }

  function drawHero(x,y,r,time) {
    const directions = { RIGHT:0, DOWN:Math.PI/2, LEFT:Math.PI, UP:-Math.PI/2 };
    const a = directions[game.hero.direction] || 0; const mouth = .20 + Math.abs(Math.sin(time/120))*.18;
    const buffed = time < game.stealthUntil || time < game.passThroughUntil || time < game.slowGhostUntil || time < game.fastHeroUntil || time < game.noclipWallUntil;
    if (buffed) {
      ctx.save();
      ctx.beginPath(); ctx.arc(x,y,r+5,0,Math.PI*2);
      ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath(); ctx.moveTo(x,y); ctx.arc(x,y,r,a+mouth,a+Math.PI*2-mouth); ctx.closePath();
    ctx.fillStyle = COLORS[progress.heroColor] || COLORS.YELLOW; ctx.fill();
  }
  function drawGhost(x,y,r,time,color,ghost) {
    const bob = Math.sin(time / 95 + ghost.index) * 1.2;
    ctx.save(); ctx.translate(x,y+bob);
    if (ghost.state !== "EATEN") {
      ctx.beginPath(); ctx.arc(0,0,r,Math.PI,0); ctx.lineTo(r,r);
      for (let i=2;i>=-2;i--) ctx.lineTo(i*r/2, r-(Math.abs(i + Math.floor(time/130))%2 ? 5 : 0));
      ctx.lineTo(-r,0); ctx.fillStyle = time < game.invincibleUntil ? "#344cc5" : color; ctx.fill();
    }
    ctx.fillStyle = "white"; [-r*.38,r*.38].forEach(ex => { ctx.beginPath(); ctx.arc(ex,-r*.12,r*.22,0,Math.PI*2); ctx.fill(); });
    ctx.fillStyle = "#15256d"; [-r*.38,r*.38].forEach(ex => { ctx.beginPath(); ctx.arc(ex+ghost.dx*2,-r*.1+ghost.dy*2,r*.09,0,Math.PI*2); ctx.fill(); }); ctx.restore();
  }

  function isBorderCell(x, y) {
    return x === 0 || y === 0 || x === EDITOR_SIZE - 1 || y === EDITOR_SIZE - 1;
  }

  function blankEditorGrid() {
    const rows = [];
    for (let y = 0; y < EDITOR_SIZE; y++) {
      let row = "";
      for (let x = 0; x < EDITOR_SIZE; x++) row += isBorderCell(x, y) ? "#" : ".";
      rows.push(row);
    }
    return rows;
  }

  function setEditorCell(grid, x, y, char) {
    const row = grid[y];
    grid[y] = row.slice(0, x) + char + row.slice(x + 1);
  }

  function availableEditorTools() {
    return EDITOR_TOOLS.filter(tool => !tool.requiresEffect || hasEffect(tool.requiresEffect));
  }

  function openMapEditor() {
    const saved = progress.customMap;
    editorGrid = saved ? saved.grid.slice() : blankEditorGrid();
    editorHero = saved ? { x: saved.hero[0], y: saved.hero[1] } : null;
    editorGhosts = saved ? saved.ghosts.map(([x, y]) => ({ x, y })) : [];
    editorTool = "WALL";
    els.editorError.classList.add("hidden");
    renderEditorTools();
    renderEditorGrid();
    if (typeof els.mapEditorDialog.showModal === "function") els.mapEditorDialog.showModal();
    else els.mapEditorDialog.setAttribute("open", "");
  }

  function closeMapEditor() {
    if (typeof els.mapEditorDialog.close === "function") els.mapEditorDialog.close();
    else els.mapEditorDialog.removeAttribute("open");
  }

  function renderEditorTools() {
    els.editorTools.replaceChildren();
    availableEditorTools().forEach(tool => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `editor-tool${tool.key === editorTool ? " active" : ""}`;
      btn.textContent = `${tool.icon} ${t(tool.labelKey)}`;
      btn.addEventListener("click", () => { editorTool = tool.key; renderEditorTools(); });
      els.editorTools.append(btn);
    });
  }

  function editorCellChar(x, y) {
    if (editorHero && editorHero.x === x && editorHero.y === y) return "HERO";
    if (editorGhosts.some(g => g.x === x && g.y === y)) return "GHOST";
    return editorGrid[y][x];
  }

  function classForEditorCell(x, y) {
    const border = isBorderCell(x, y);
    const tile = editorCellChar(x, y);
    let cls = "editor-cell";
    if (border) cls += " wall border-tile";
    else if (tile === "HERO") cls += " hero";
    else if (tile === "GHOST") cls += " ghost";
    else if (tile === "#") cls += " wall";
    else if (tile === "o") cls += " power";
    else cls += " dot";
    return cls;
  }

  // Rebuilds the 15x15 grid of cell elements from scratch. Only called when
  // opening/clearing the editor — repainting during a drag must reuse the
  // same elements (see refreshEditorGrid) or the browser loses track of
  // which cell is under the pointer mid-gesture, breaking drag-to-paint.
  function renderEditorGrid() {
    els.editorGridEl.replaceChildren();
    editorCellEls = [];
    for (let y = 0; y < EDITOR_SIZE; y++) {
      const row = [];
      for (let x = 0; x < EDITOR_SIZE; x++) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.dataset.x = x; cell.dataset.y = y;
        els.editorGridEl.append(cell);
        row.push(cell);
      }
      editorCellEls.push(row);
    }
    refreshEditorGrid();
  }

  // Updates every cell's visual class in place, without touching the DOM
  // structure — safe to call on every paint action during a drag.
  function refreshEditorGrid() {
    for (let y = 0; y < EDITOR_SIZE; y++) {
      for (let x = 0; x < EDITOR_SIZE; x++) {
        editorCellEls[y][x].className = classForEditorCell(x, y);
      }
    }
  }

  function applyEditorTool(x, y) {
    if (isBorderCell(x, y)) return;
    if (editorTool === "HERO") {
      editorHero = { x, y };
      editorGhosts = editorGhosts.filter(g => !(g.x === x && g.y === y));
    } else if (editorTool === "GHOST") {
      if (editorHero && editorHero.x === x && editorHero.y === y) return;
      if (editorGhosts.some(g => g.x === x && g.y === y) || editorGhosts.length >= EDITOR_MAX_GHOSTS) return;
      editorGhosts.push({ x, y });
    } else if (editorTool === "ERASE") {
      if (editorHero && editorHero.x === x && editorHero.y === y) editorHero = null;
      editorGhosts = editorGhosts.filter(g => !(g.x === x && g.y === y));
      setEditorCell(editorGrid, x, y, ".");
    } else {
      if (editorHero && editorHero.x === x && editorHero.y === y) editorHero = null;
      editorGhosts = editorGhosts.filter(g => !(g.x === x && g.y === y));
      setEditorCell(editorGrid, x, y, editorTool === "WALL" ? "#" : editorTool === "POWER" ? "o" : ".");
    }
    refreshEditorGrid();
  }

  function reachableFrom(grid, start) {
    const seen = new Set([`${start.x},${start.y}`]);
    const queue = [start];
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index];
      for (const move of MOVE_DIRECTIONS) {
        const x = current.x + move.dx, y = current.y + move.dy, key = `${x},${y}`;
        if (seen.has(key) || grid[y]?.[x] === "#" || grid[y]?.[x] === undefined) continue;
        seen.add(key);
        queue.push({ x, y });
      }
    }
    return seen;
  }

  function showEditorError(message) {
    els.editorError.textContent = message;
    els.editorError.classList.remove("hidden");
  }

  function saveEditorMap() {
    els.editorError.classList.add("hidden");
    if (!editorHero) { showEditorError(t("editorErrorNoHero")); return; }
    if (!editorGhosts.length) { showEditorError(t("editorErrorNoGhost")); return; }
    const reachable = reachableFrom(editorGrid, editorHero);
    const allReachable = editorGhosts.every(g => reachable.has(`${g.x},${g.y}`));
    if (!allReachable) { showEditorError(t("editorErrorUnreachable")); return; }
    progress.customMap = {
      grid: editorGrid.slice(),
      hero: [editorHero.x, editorHero.y],
      ghosts: editorGhosts.map(g => [g.x, g.y])
    };
    progress.mapId = "custom";
    saveProgress();
    closeMapEditor();
    renderMapSelect();
    game = freshGame();
    updateStats(); updateGameButtons(); drawGame(performance.now());
    els.feedback.classList.remove("hidden", "wrong"); els.feedback.classList.add("correct");
    els.feedback.textContent = `✓ ${t("editorSaved")}`;
    sfx("correct");
  }

  els.runBtn.addEventListener("click", checkAnswer);
  els.hintBtn.addEventListener("click", showHint);
  els.nextBtn.addEventListener("click", nextMission);
  els.gateForm.addEventListener("submit", submitGate);
  els.gateCancelBtn.addEventListener("click", closeGate);
  els.skipToLesson5Btn.addEventListener("click", skipToLesson5);
  els.skipToLesson7Btn.addEventListener("click", skipToLesson7);
  els.openMapEditorBtn.addEventListener("click", openMapEditor);
  els.editorCloseBtn.addEventListener("click", closeMapEditor);
  els.editorSaveBtn.addEventListener("click", saveEditorMap);
  els.editorClearBtn.addEventListener("click", () => {
    editorGrid = blankEditorGrid(); editorHero = null; editorGhosts = [];
    els.editorError.classList.add("hidden");
    renderEditorGrid();
  });
  function paintEditorCellAtPoint(clientX, clientY) {
    // Touch (and pen) implicitly capture the pointer to the element under the
    // initial pointerdown, so event.target stays pinned to that first cell
    // for the whole gesture — hit-testing by coordinate is what actually
    // finds the cell currently under the finger while dragging.
    const target = document.elementFromPoint(clientX, clientY);
    const cell = target && target.closest ? target.closest(".editor-cell") : null;
    if (!cell || !els.editorGridEl.contains(cell)) return;
    applyEditorTool(Number(cell.dataset.x), Number(cell.dataset.y));
  }
  els.editorGridEl.addEventListener("pointerdown", event => {
    event.preventDefault();
    editorPainting = true;
    paintEditorCellAtPoint(event.clientX, event.clientY);
  });
  els.editorGridEl.addEventListener("pointermove", event => {
    if (!editorPainting) return;
    paintEditorCellAtPoint(event.clientX, event.clientY);
  });
  window.addEventListener("pointerup", () => { editorPainting = false; });
  window.addEventListener("pointercancel", () => { editorPainting = false; });
  els.gateDialog.addEventListener("cancel", () => { pendingGateIndex = -1; });
  els.gateCodeInput.addEventListener("input", event => { event.target.value = event.target.value.replace(/\D/g, "").slice(0, 3); });
  els.language.addEventListener("change", e => { progress.language=e.target.value; saveProgress(); renderAll(); });
  els.mapSelect.addEventListener("change", e => {
    clearDemoTimers(); progress.mapId = e.target.value; saveProgress(); game = freshGame(); updateStats(); updateGameButtons(); drawGame(performance.now()); sfx("start");
  });
  $("soundToggle").addEventListener("click",()=>{
    progress.soundEnabled = !progress.soundEnabled; saveProgress(); updateSoundButton();
    if (progress.soundEnabled) sfx("start");
  });
  $("typingModeBtn").addEventListener("click",()=>{ progress.typingMode=true; selectedAnswer=""; saveProgress(); renderMission(); });
  $("selectModeBtn").addEventListener("click",()=>{ progress.typingMode=false; selectedAnswer=""; saveProgress(); renderMission(); });
  els.language.value = progress.language;
  $("playGameBtn").addEventListener("click", startGame);
  $("pauseGameBtn").addEventListener("click", togglePause);
  $("restartGameBtn").addEventListener("click", restartGame);
  $("resetPageBtn").addEventListener("click", resetCurrentPage);
  els.overlayButton.addEventListener("click", startGame);
  document.querySelectorAll("[data-direction]").forEach(button => {
    button.addEventListener("pointerdown", event => {
      event.preventDefault(); heldDirection = button.dataset.direction; moveHero(heldDirection);
      button.setPointerCapture?.(event.pointerId);
    });
    const release = () => { if (heldDirection === button.dataset.direction) heldDirection = ""; };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("click", event => { if (event.detail === 0) moveHero(button.dataset.direction); });
  });
  const keyDirections = {ArrowUp:"UP",ArrowDown:"DOWN",ArrowLeft:"LEFT",ArrowRight:"RIGHT"};
  window.addEventListener("keydown", e=>{
    if (!keyDirections[e.key]) return;
    const target = e.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;
    e.preventDefault(); heldDirection = keyDirections[e.key]; moveHero(heldDirection);
  });
  window.addEventListener("keyup", e=>{ if (keyDirections[e.key] === heldDirection) heldDirection = ""; });
  window.addEventListener("blur", ()=>{ heldDirection = ""; });
  $("menuBtn").addEventListener("click",()=>els.levelPanel.classList.add("open"));
  $("closeMenuBtn").addEventListener("click",()=>els.levelPanel.classList.remove("open"));
  window.addEventListener("resize",()=>drawGame(performance.now()));

  renderAll();
  animationId = requestAnimationFrame(gameLoop);
})();
