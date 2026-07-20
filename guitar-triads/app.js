(function () {
  "use strict";

  // ============================================================
  // THEORY ENGINE
  // ============================================================

  var LETTERS = "CDEFGAB";
  var NATURAL_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var ACC_SYMBOL = { "-2": "𝄫", "-1": "♭", "0": "", "1": "♯", "2": "𝄪" };

  function accidentalSymbol(diff) {
    if (ACC_SYMBOL[String(diff)] !== undefined) return ACC_SYMBOL[String(diff)];
    return diff > 0 ? "+" + diff : String(diff);
  }

  function noteName(letter, acc) {
    return letter + accidentalSymbol(acc);
  }

  // Every key spelling offered in the dropdown (mirrors the "every key" style of guitarscale.org)
  var KEY_LIST = [
    { label: "C", letter: "C", acc: 0 },
    { label: "C#", letter: "C", acc: 1 },
    { label: "Db", letter: "D", acc: -1 },
    { label: "D", letter: "D", acc: 0 },
    { label: "D#", letter: "D", acc: 1 },
    { label: "Eb", letter: "E", acc: -1 },
    { label: "E", letter: "E", acc: 0 },
    { label: "F", letter: "F", acc: 0 },
    { label: "F#", letter: "F", acc: 1 },
    { label: "Gb", letter: "G", acc: -1 },
    { label: "G", letter: "G", acc: 0 },
    { label: "G#", letter: "G", acc: 1 },
    { label: "Ab", letter: "A", acc: -1 },
    { label: "A", letter: "A", acc: 0 },
    { label: "A#", letter: "A", acc: 1 },
    { label: "Bb", letter: "B", acc: -1 },
    { label: "B", letter: "B", acc: 0 }
  ];

  var SCALE_TYPES = {
    major: { name: "Major (Ionian)", offsets: [0, 2, 4, 5, 7, 9, 11], degreeSteps: [0, 1, 2, 3, 4, 5, 6], degreeLabels: ["1", "2", "3", "4", "5", "6", "7"], parent: "major" },
    minor: { name: "Natural Minor (Aeolian)", offsets: [0, 2, 3, 5, 7, 8, 10], degreeSteps: [0, 1, 2, 3, 4, 5, 6], degreeLabels: ["1", "2", "b3", "4", "5", "b6", "b7"], parent: "minor" },
    majorPent: { name: "Major Pentatonic", offsets: [0, 2, 4, 7, 9], degreeSteps: [0, 1, 2, 4, 5], degreeLabels: ["1", "2", "3", "5", "6"], parent: "major" },
    minorPent: { name: "Minor Pentatonic", offsets: [0, 3, 5, 7, 10], degreeSteps: [0, 2, 3, 4, 6], degreeLabels: ["1", "b3", "4", "5", "b7"], parent: "minor" }
  };

  // Full 7-note parent scales, used to derive diatonic triads regardless of which
  // (possibly pentatonic) subset is currently drawn on the fretboard.
  var PARENT_SCALES = {
    major: { offsets: [0, 2, 4, 5, 7, 9, 11], romans: ["I", "ii", "iii", "IV", "V", "vi", "vii°"], qualities: ["maj", "min", "min", "maj", "maj", "min", "dim"] },
    minor: { offsets: [0, 2, 3, 5, 7, 8, 10], romans: ["i", "ii°", "III", "iv", "v", "VI", "VII"], qualities: ["min", "dim", "maj", "min", "min", "maj", "maj"] }
  };

  function spellScale(rootLetter, rootPc, offsets, degreeSteps) {
    var rootLetterIdx = LETTERS.indexOf(rootLetter);
    return degreeSteps.map(function (step, i) {
      var letter = LETTERS[(rootLetterIdx + step) % 7];
      var targetPc = (rootPc + offsets[i] + 1200) % 12;
      var nat = NATURAL_PC[letter];
      var diff = (targetPc - nat + 12) % 12;
      if (diff > 6) diff -= 12;
      return { letter: letter, acc: diff, pc: targetPc };
    });
  }

  function keyRootPc(letter, acc) {
    return (NATURAL_PC[letter] + acc + 1200) % 12;
  }

  // ============================================================
  // FRETBOARD MODEL
  // ============================================================

  var STRINGS_OPEN_MIDI = [40, 45, 50, 55, 59, 64]; // low E, A, D, G, B, high E
  var STRING_NAMES = ["E", "A", "D", "G", "B", "E"];
  var NUM_FRETS = 15;
  var FRET_MARKERS = { 3: 1, 5: 1, 7: 1, 9: 1, 12: 2, 15: 1 };

  function generateTriadShapes(triadPCs, stringSetIndices, maxFret) {
    var rootPC = triadPCs[0], thirdPC = triadPCs[1], fifthPC = triadPCs[2];
    function roleOf(pc) {
      if (pc === rootPC) return "R";
      if (pc === thirdPC) return "3";
      if (pc === fifthPC) return "5";
      return null;
    }
    var lowS = stringSetIndices[0], midS = stringSetIndices[1], topS = stringSetIndices[2];
    var searchLimit = maxFret + 12;
    var shapes = [];

    for (var f = 0; f <= maxFret; f++) {
      var lowMidi = STRINGS_OPEN_MIDI[lowS] + f;
      var lowRole = roleOf(lowMidi % 12);
      if (!lowRole) continue;

      var remaining = [
        { pc: rootPC, role: "R" },
        { pc: thirdPC, role: "3" },
        { pc: fifthPC, role: "5" }
      ].filter(function (r) { return r.role !== lowRole; });

      var midChoice = null;
      for (var ci = 0; ci < remaining.length; ci++) {
        var cand = remaining[ci];
        for (var f2 = 0; f2 <= searchLimit; f2++) {
          var midi2 = STRINGS_OPEN_MIDI[midS] + f2;
          if (midi2 > lowMidi && midi2 % 12 === cand.pc) {
            if (!midChoice || midi2 < midChoice.midi) {
              midChoice = { midi: midi2, fret: f2, role: cand.role, pc: cand.pc };
            }
            break;
          }
        }
      }
      if (!midChoice || midChoice.fret > maxFret) continue;

      var lastRole = remaining.filter(function (r) { return r.role !== midChoice.role; })[0];
      var topChoice = null;
      for (var f3 = 0; f3 <= searchLimit; f3++) {
        var midi3 = STRINGS_OPEN_MIDI[topS] + f3;
        if (midi3 > midChoice.midi && midi3 % 12 === lastRole.pc) {
          topChoice = { midi: midi3, fret: f3, role: lastRole.role, pc: lastRole.pc };
          break;
        }
      }
      if (!topChoice || topChoice.fret > maxFret) continue;

      shapes.push({
        stringSet: [lowS, midS, topS],
        notes: [
          { string: lowS, fret: f, role: lowRole, pc: lowMidi % 12 },
          { string: midS, fret: midChoice.fret, role: midChoice.role, pc: midChoice.pc },
          { string: topS, fret: topChoice.fret, role: topChoice.role, pc: topChoice.pc }
        ],
        inversion: lowRole === "R" ? "Root" : (lowRole === "3" ? "1st Inv" : "2nd Inv")
      });
    }
    return shapes;
  }

  // ============================================================
  // SVG RENDERING
  // ============================================================

  var SVG_NS = "http://www.w3.org/2000/svg";
  var LEFT_MARGIN = 46, TOP_MARGIN = 26, RIGHT_MARGIN = 24, BOTTOM_MARGIN = 40;
  var NUT_WIDTH = 10, FRET_WIDTH = 56, STRING_SPACING = 34;
  var DOT_R = 11;

  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function boardWidth() {
    return LEFT_MARGIN + NUT_WIDTH + NUM_FRETS * FRET_WIDTH + RIGHT_MARGIN;
  }

  // Per-window coordinate mapping. Mirrors are applied in coordinate space so
  // text labels stay readable instead of being CSS-mirrored.
  function makeGeometry(state) {
    function fx(x) {
      return state.lefty ? boardWidth() - x : x;
    }
    return {
      fx: fx,
      fretCenterX: function (fret) {
        if (fret === 0) return fx(LEFT_MARGIN - 18);
        return fx(LEFT_MARGIN + NUT_WIDTH + (fret - 0.5) * FRET_WIDTH);
      },
      fretLineX: function (fret) {
        return fx(LEFT_MARGIN + NUT_WIDTH + fret * FRET_WIDTH);
      },
      // Default orientation: high E (idx 5) on top, low E (idx 0) on bottom.
      // flipV inverts to bass-on-top.
      stringY: function (stringIdx) {
        var row = state.flipV ? stringIdx : 5 - stringIdx;
        return TOP_MARGIN + row * STRING_SPACING;
      }
    };
  }

  function buildFretboardSvg(svg, geo) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    var width = boardWidth();
    var height = TOP_MARGIN + 5 * STRING_SPACING + BOTTOM_MARGIN;
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);

    var boardTop = Math.min(geo.stringY(0), geo.stringY(5)) - 12;
    var boardBottom = Math.max(geo.stringY(0), geo.stringY(5)) + 12;

    // fret marker dots (behind everything)
    Object.keys(FRET_MARKERS).forEach(function (fretStr) {
      var fret = parseInt(fretStr, 10);
      var count = FRET_MARKERS[fretStr];
      var cx = geo.fretCenterX(fret);
      if (count === 1) {
        svg.appendChild(svgEl("circle", { cx: cx, cy: (boardTop + boardBottom) / 2, r: 5, class: "fret-marker" }));
      } else {
        svg.appendChild(svgEl("circle", { cx: cx, cy: geo.stringY(1) + (geo.stringY(2) - geo.stringY(1)) / 2, r: 5, class: "fret-marker" }));
        svg.appendChild(svgEl("circle", { cx: cx, cy: geo.stringY(3) + (geo.stringY(4) - geo.stringY(3)) / 2, r: 5, class: "fret-marker" }));
      }
    });

    // fret lines
    for (var f = 0; f <= NUM_FRETS; f++) {
      var x = geo.fretLineX(f);
      svg.appendChild(svgEl("line", {
        x1: x, y1: boardTop, x2: x, y2: boardBottom,
        class: f === 0 ? "nut-line" : "fret-line"
      }));
    }
    // fret numbers
    for (var fn = 1; fn <= NUM_FRETS; fn++) {
      if (fn === 3 || fn === 5 || fn === 7 || fn === 9 || fn === 12 || fn === 15) {
        var fnx = geo.fretCenterX(fn);
        var t = svgEl("text", { x: fnx, y: boardBottom + 20, class: "fret-number", "text-anchor": "middle" });
        t.textContent = fn;
        svg.appendChild(t);
      }
    }
    // strings
    for (var s = 0; s < 6; s++) {
      var y = geo.stringY(s);
      svg.appendChild(svgEl("line", {
        x1: geo.fx(LEFT_MARGIN - 30), y1: y, x2: geo.fretLineX(NUM_FRETS), y2: y,
        class: "string-line", "stroke-width": 1 + (5 - s) * 0.35
      }));
      var lbl = svgEl("text", { x: geo.fx(LEFT_MARGIN - 36), y: y, class: "string-label", "text-anchor": "middle", "dominant-baseline": "central" });
      lbl.textContent = STRING_NAMES[s];
      svg.appendChild(lbl);
    }
  }

  function drawScaleNotes(svg, state, pcToInfo, geo) {
    for (var s = 0; s < 6; s++) {
      for (var f = 0; f <= NUM_FRETS; f++) {
        var midi = STRINGS_OPEN_MIDI[s] + f;
        var pc = midi % 12;
        var info = pcToInfo[pc];
        if (!info) continue;
        var cx = geo.fretCenterX(f);
        var cy = geo.stringY(s);
        var isRoot = pc === state.keyRootPc;

        var circle = svgEl("circle", {
          cx: cx, cy: cy, r: DOT_R,
          class: "note-dot scale" + (isRoot ? " root" : "")
        });
        svg.appendChild(circle);

        var labelText = "";
        if (state.displayMode === "notes") labelText = noteName(info.letter, info.acc);
        else if (state.displayMode === "degrees") labelText = info.degree;
        if (labelText) {
          var lbl = svgEl("text", { x: cx, y: cy, class: "note-label scale-label" + (isRoot ? " root-label" : "") });
          lbl.textContent = labelText;
          svg.appendChild(lbl);
        }
      }
    }
  }

  function drawTriadShapes(svg, state, shapes, pcToInfo, geo) {
    shapes.forEach(function (shape) {
      var pts = shape.notes.map(function (n) { return { x: geo.fretCenterX(n.fret), y: geo.stringY(n.string), n: n }; });

      var minX = Math.min.apply(null, pts.map(function (p) { return p.x; })) - DOT_R - 5;
      var maxX = Math.max.apply(null, pts.map(function (p) { return p.x; })) + DOT_R + 5;
      var minY = Math.min.apply(null, pts.map(function (p) { return p.y; })) - DOT_R - 5;
      var maxY = Math.max.apply(null, pts.map(function (p) { return p.y; })) + DOT_R + 5;
      svg.appendChild(svgEl("rect", {
        x: minX, y: minY, width: maxX - minX, height: maxY - minY,
        rx: 6, ry: 6, class: "triad-shape-box"
      }));

      var tag = svgEl("text", { x: minX + 4, y: minY - 3, class: "triad-inv-tag" });
      tag.textContent = shape.inversion;
      svg.appendChild(tag);

      pts.forEach(function (p) {
        var circle = svgEl("circle", { cx: p.x, cy: p.y, r: DOT_R + 1, class: "note-dot role-" + p.n.role });
        circle.style.fill = p.n.role === "R" ? "#cc3333" : (p.n.role === "3" ? "#2e8b57" : "#3366cc");
        circle.style.stroke = "#20200f";
        circle.style.strokeWidth = "1";
        svg.appendChild(circle);

        var info = pcToInfo[p.n.pc];
        var labelText = p.n.role;
        if (state.displayMode === "notes" && info) labelText = noteName(info.letter, info.acc);
        else if (state.displayMode === "degrees" && info) labelText = info.degree;

        var lbl = svgEl("text", { x: p.x, y: p.y, class: "note-label triad-label" });
        lbl.textContent = labelText;
        svg.appendChild(lbl);

        var title = svgEl("title", {});
        title.textContent = (info ? noteName(info.letter, info.acc) : "") + " - " + (p.n.role === "R" ? "Root" : p.n.role === "3" ? "3rd" : "5th") + " of triad, " + shape.inversion + " (fret " + p.n.fret + ")";
        circle.appendChild(title);
      });
    });
  }

  // ============================================================
  // PER-WINDOW STATE HELPERS
  // ============================================================

  function currentKeyEntry(state) {
    for (var i = 0; i < KEY_LIST.length; i++) {
      if (KEY_LIST[i].letter === state.keyLetter && KEY_LIST[i].acc === state.keyAcc) return KEY_LIST[i];
    }
    return KEY_LIST[0];
  }

  function computeTriadPCs(state) {
    var parentName = SCALE_TYPES[state.scaleType].parent;
    var parent = PARENT_SCALES[parentName];
    var i = state.triadDegree;
    var rootOff = parent.offsets[i % 7];
    var thirdOff = parent.offsets[(i + 2) % 7];
    var fifthOff = parent.offsets[(i + 4) % 7];
    return [
      (state.keyRootPc + rootOff) % 12,
      (state.keyRootPc + thirdOff) % 12,
      (state.keyRootPc + fifthOff) % 12
    ];
  }

  function buildPcToInfo(state) {
    var def = SCALE_TYPES[state.scaleType];
    var spelled = spellScale(state.keyLetter, state.keyRootPc, def.offsets, def.degreeSteps);
    var map = {};
    spelled.forEach(function (n, i) {
      map[n.pc] = { letter: n.letter, acc: n.acc, degree: def.degreeLabels[i] };
    });
    return map;
  }

  // Triad note labels need spellings even for chord tones outside the currently
  // displayed scale subset (e.g. a pentatonic view still needs the 3rd/5th spelled).
  function buildScaleIndependentInfo(state, triadPCs, parent) {
    var spelled = spellScale(state.keyLetter, state.keyRootPc, parent.offsets, [0, 1, 2, 3, 4, 5, 6]);
    var map = {};
    var i = state.triadDegree;
    var idxs = [i % 7, (i + 2) % 7, (i + 4) % 7];
    idxs.forEach(function (idx, roleIdx) {
      var n = spelled[idx];
      map[triadPCs[roleIdx]] = { letter: n.letter, acc: n.acc, degree: "" };
    });
    return map;
  }

  // ============================================================
  // WINDOW MANAGER
  // ============================================================

  var desktop, taskbarApps, startMenu;
  var zTop = 10;
  var winSeq = 0;

  function focusWindow(win) {
    win.root.style.zIndex = ++zTop;
    document.querySelectorAll(".xp-window").forEach(function (el) { el.classList.remove("focused"); });
    win.root.classList.add("focused");
    document.querySelectorAll(".taskbar-app").forEach(function (el) { el.classList.remove("active"); });
    win.taskBtn.classList.add("active");
  }

  function createAppWindow() {
    winSeq++;
    var seq = winSeq;
    var tmpl = document.getElementById("xpWindowTemplate");
    var root = tmpl.content.firstElementChild.cloneNode(true);

    var state = {
      keyLetter: "C",
      keyAcc: 0,
      scaleType: "major",
      displayMode: "dots",
      showScale: true,
      showTriad: false,
      triadDegree: 0,
      stringSets: [[2, 3, 4], [3, 4, 5]],
      keyRootPc: keyRootPc("C", 0),
      lefty: false,
      flipV: false
    };

    var win = { root: root, state: state, taskBtn: null, minimized: false };

    function q(sel) { return root.querySelector(sel); }

    // ---- taskbar button ----
    var taskBtn = document.createElement("div");
    taskBtn.className = "taskbar-app";
    win.taskBtn = taskBtn;
    taskbarApps.appendChild(taskBtn);
    taskBtn.addEventListener("click", function () {
      if (win.minimized) {
        win.minimized = false;
        root.classList.remove("minimized");
        focusWindow(win);
      } else if (root.classList.contains("focused")) {
        minimizeWin();
      } else {
        focusWindow(win);
      }
    });

    // ---- populate selects ----
    var keySel = q(".keySelect");
    KEY_LIST.forEach(function (k, i) {
      var opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = k.label;
      if (k.label === "C") opt.selected = true;
      keySel.appendChild(opt);
    });

    // radio groups must be unique per window
    root.querySelectorAll(".displayModeRadio").forEach(function (r) {
      r.name = "displayMode-" + seq;
    });

    function populateTriadDegreeSelect() {
      var sel = q(".triadDegreeSelect");
      sel.innerHTML = "";
      var parent = PARENT_SCALES[SCALE_TYPES[state.scaleType].parent];
      var spelled = spellScale(state.keyLetter, state.keyRootPc, parent.offsets, [0, 1, 2, 3, 4, 5, 6]);
      for (var i = 0; i < 7; i++) {
        var rootNote = spelled[i];
        var qualityLabel = parent.qualities[i] === "maj" ? "major" : parent.qualities[i] === "min" ? "minor" : "diminished";
        var opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = parent.romans[i] + " – " + noteName(rootNote.letter, rootNote.acc) + " " + qualityLabel;
        sel.appendChild(opt);
      }
      sel.value = String(state.triadDegree);
    }

    // ---- render ----
    function render() {
      var svg = q(".fretboardSvg");
      var geo = makeGeometry(state);
      buildFretboardSvg(svg, geo);

      var pcToInfo = buildPcToInfo(state);
      if (state.showScale) drawScaleNotes(svg, state, pcToInfo, geo);

      var triadReadout = q(".triadReadout");
      var statusTriad = q(".statusTriad");

      if (state.showTriad) {
        var parent = PARENT_SCALES[SCALE_TYPES[state.scaleType].parent];
        var triadPCs = computeTriadPCs(state);
        var spelled = spellScale(state.keyLetter, state.keyRootPc, parent.offsets, [0, 1, 2, 3, 4, 5, 6]);
        var rootNote = spelled[state.triadDegree];
        var qualityLabel = parent.qualities[state.triadDegree] === "maj" ? "major" : parent.qualities[state.triadDegree] === "min" ? "minor" : "diminished";

        var allShapes = [];
        state.stringSets.forEach(function (ss) {
          allShapes = allShapes.concat(generateTriadShapes(triadPCs, ss, NUM_FRETS));
        });
        drawTriadShapes(svg, state, allShapes, buildScaleIndependentInfo(state, triadPCs, parent), geo);

        var label = parent.romans[state.triadDegree] + " – " + noteName(rootNote.letter, rootNote.acc) + " " + qualityLabel;
        triadReadout.textContent = label + ": " + allShapes.length + " shape(s) shown across selected string sets.";
        statusTriad.textContent = "Triad: " + label;
      } else {
        triadReadout.textContent = 'Pick a degree and check "Highlight triad" to see shapes.';
        statusTriad.textContent = "Triad: off";
      }

      var keyEntry = currentKeyEntry(state);
      var summary = keyEntry.label + " " + SCALE_TYPES[state.scaleType].name;
      q(".statusKey").textContent = "Key: " + keyEntry.label;
      q(".statusScale").textContent = "Scale: " + SCALE_TYPES[state.scaleType].name;
      q(".titlebar-text").textContent = "GuitarTriads98.exe - " + summary;
      taskBtn.textContent = "♪ " + summary;
    }

    // ---- control wiring ----
    keySel.addEventListener("change", function () {
      var entry = KEY_LIST[parseInt(keySel.value, 10)];
      state.keyLetter = entry.letter;
      state.keyAcc = entry.acc;
      state.keyRootPc = keyRootPc(entry.letter, entry.acc);
      populateTriadDegreeSelect();
      render();
    });

    q(".scaleSelect").addEventListener("change", function (e) {
      state.scaleType = e.target.value;
      populateTriadDegreeSelect();
      render();
    });

    root.querySelectorAll(".displayModeRadio").forEach(function (r) {
      r.addEventListener("change", function (e) {
        state.displayMode = e.target.value;
        render();
      });
    });

    q(".showScaleToggle").addEventListener("change", function (e) {
      state.showScale = e.target.checked;
      render();
    });

    q(".showTriadToggle").addEventListener("change", function (e) {
      state.showTriad = e.target.checked;
      render();
    });

    q(".triadDegreeSelect").addEventListener("change", function (e) {
      state.triadDegree = parseInt(e.target.value, 10);
      render();
    });

    root.querySelectorAll(".stringSetChk").forEach(function (c) {
      c.addEventListener("change", function () {
        var sets = [];
        root.querySelectorAll(".stringSetChk").forEach(function (chk) {
          if (chk.checked) sets.push(chk.value.split(",").map(Number));
        });
        state.stringSets = sets;
        render();
      });
    });

    q(".leftyToggle").addEventListener("change", function (e) {
      state.lefty = e.target.checked;
      render();
    });

    q(".flipVToggle").addEventListener("change", function (e) {
      state.flipV = e.target.checked;
      render();
    });

    // ---- window chrome behavior ----
    function closeWin() {
      root.remove();
      taskBtn.remove();
    }

    function minimizeWin() {
      win.minimized = true;
      root.classList.add("minimized");
      taskBtn.classList.remove("active");
    }

    q(".tb-close").addEventListener("click", closeWin);
    q(".tb-min").addEventListener("click", minimizeWin);
    q(".tb-max").addEventListener("click", function () {
      root.classList.toggle("maximized");
      focusWindow(win);
    });

    // click anywhere on the window brings it to front
    root.addEventListener("pointerdown", function () { focusWindow(win); }, true);

    // drag by titlebar
    var titlebar = q(".titlebar");
    titlebar.addEventListener("pointerdown", function (e) {
      if (e.target.closest(".tb-btn")) return;
      if (root.classList.contains("maximized")) return;
      var startX = e.clientX, startY = e.clientY;
      var startL = root.offsetLeft, startT = root.offsetTop;
      function onMove(ev) {
        root.style.left = (startL + ev.clientX - startX) + "px";
        root.style.top = Math.max(0, startT + ev.clientY - startY) + "px";
      }
      function onUp() {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      }
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      e.preventDefault();
    });

    // File menu
    var dropdown = q(".menu-dropdown");
    q(".menu-file").addEventListener("click", function (e) {
      var wasHidden = dropdown.classList.contains("hidden");
      document.querySelectorAll(".menu-dropdown").forEach(function (d) { d.classList.add("hidden"); });
      if (wasHidden) dropdown.classList.remove("hidden");
      e.stopPropagation();
    });
    q(".opt-new").addEventListener("click", function () {
      dropdown.classList.add("hidden");
      focusWindow(createAppWindow());
    });
    q(".opt-close").addEventListener("click", closeWin);

    // ---- place on desktop (cascade) ----
    var wWidth = Math.min(960, desktop.clientWidth - 16);
    var baseLeft = Math.max(8, (desktop.clientWidth - wWidth) / 2);
    var offset = ((seq - 1) % 7) * 26;
    root.style.left = Math.min(baseLeft + offset, Math.max(8, desktop.clientWidth - wWidth - 8)) + "px";
    root.style.top = (10 + offset) + "px";

    desktop.appendChild(root);
    populateTriadDegreeSelect();
    render();
    focusWindow(win);
    return win;
  }

  // ============================================================
  // DESKTOP / TASKBAR
  // ============================================================

  function updateClock() {
    var el = document.getElementById("taskbarClock");
    var d = new Date();
    var h = d.getHours();
    var ampm = h >= 12 ? "PM" : "AM";
    h = h % 12; if (h === 0) h = 12;
    var m = d.getMinutes();
    el.textContent = h + ":" + (m < 10 ? "0" + m : m) + " " + ampm;
  }

  function init() {
    desktop = document.getElementById("desktop");
    taskbarApps = document.getElementById("taskbarApps");
    startMenu = document.getElementById("startMenu");

    document.getElementById("startBtn").addEventListener("click", function (e) {
      startMenu.classList.toggle("hidden");
      e.stopPropagation();
    });
    document.getElementById("startNewWindow").addEventListener("click", function () {
      startMenu.classList.add("hidden");
      createAppWindow();
    });

    // any stray click closes menus
    document.addEventListener("click", function () {
      document.querySelectorAll(".menu-dropdown").forEach(function (d) { d.classList.add("hidden"); });
      startMenu.classList.add("hidden");
    });

    createAppWindow();

    updateClock();
    setInterval(updateClock, 1000 * 15);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
