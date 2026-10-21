#!/usr/bin/env node
import { n as __require, r as __toESM, t as __commonJSMin } from "./rolldown-runtime-CorII3pd.js";
import path from "node:path";
import process$1 from "node:process";
import { stripVTControlCharacters, styleText } from "node:util";
import { AsyncLocalStorage, AsyncResource } from "node:async_hooks";
import * as readline from "node:readline";
// ../../node_modules/@inquirer/core/dist/lib/key.js
var keybindingLookup = /* @__PURE__ */ new Set(["emacs", "vim"]);
function isKeybinding(value) {
	return keybindingLookup.has(value);
}
function getDefaultKeybindings() {
	const env = process.env["INQUIRER_KEYBINDINGS"];
	if (!env) return [];
	return Array.from(new Set(env.toLowerCase().split(/[\s,]+/).filter(isKeybinding)));
}
var isUpKey = (key, keybindings = []) => key.name === "up" || keybindings.includes("vim") && key.name === "k" || keybindings.includes("emacs") && key.ctrl && key.name === "p";
var isDownKey = (key, keybindings = []) => key.name === "down" || keybindings.includes("vim") && key.name === "j" || keybindings.includes("emacs") && key.ctrl && key.name === "n";
var isSpaceKey = (key) => key.name === "space";
var isBackspaceKey = (key) => key.name === "backspace";
var isTabKey = (key) => key.name === "tab";
var isNumberKey = (key) => "1234567890".includes(key.name);
var isEnterKey = (key) => key.name === "enter" || key.name === "return";
// ../../node_modules/@inquirer/core/dist/lib/errors.js
var AbortPromptError = class extends Error {
	name = "AbortPromptError";
	message = "Prompt was aborted";
	constructor(options) {
		super();
		this.cause = options?.cause;
	}
};
var CancelPromptError = class extends Error {
	name = "CancelPromptError";
	message = "Prompt was canceled";
};
var ExitPromptError = class extends Error {
	name = "ExitPromptError";
};
var HookError = class extends Error {
	name = "HookError";
};
var ValidationError = class extends Error {
	name = "ValidationError";
};
// ../../node_modules/@inquirer/core/dist/lib/hook-engine.js
var hookStorage = new AsyncLocalStorage();
function createStore(rl) {
	return {
		rl,
		hooks: [],
		hooksCleanup: [],
		hooksEffect: [],
		index: 0,
		handleChange() {}
	};
}
function withHooks(rl, cb) {
	const store = createStore(rl);
	function cycle(render) {
		store.handleChange = () => {
			store.index = 0;
			render();
		};
		store.handleChange();
	}
	return hookStorage.run(store, () => cb(cycle));
}
function getStore() {
	const store = hookStorage.getStore();
	if (!store) throw new HookError("[Inquirer] Hook functions can only be called from within a prompt");
	return store;
}
function readline$1() {
	return getStore().rl;
}
function withUpdates(fn) {
	const wrapped = (...args) => {
		const store = getStore();
		let shouldUpdate = false;
		const oldHandleChange = store.handleChange;
		store.handleChange = () => {
			shouldUpdate = true;
		};
		const returnValue = fn(...args);
		if (shouldUpdate) oldHandleChange();
		store.handleChange = oldHandleChange;
		return returnValue;
	};
	return AsyncResource.bind(wrapped);
}
function withPointer(cb) {
	const store = getStore();
	const { index } = store;
	const returnValue = cb({
		get() {
			return store.hooks[index];
		},
		set(value) {
			store.hooks[index] = value;
		},
		initialized: index in store.hooks
	});
	store.index++;
	return returnValue;
}
function handleChange() {
	getStore().handleChange();
}
var effectScheduler = {
	queue(cb) {
		const store = getStore();
		const { index } = store;
		store.hooksEffect.push(() => {
			store.hooksCleanup[index]?.();
			const cleanFn = cb(readline$1());
			if (cleanFn != null && typeof cleanFn !== "function") throw new ValidationError("useEffect return value must be a cleanup function or nothing.");
			store.hooksCleanup[index] = cleanFn;
		});
	},
	run() {
		const store = getStore();
		withUpdates(() => {
			store.hooksEffect.forEach((effect) => {
				effect();
			});
			store.hooksEffect.length = 0;
		})();
	},
	clearAll() {
		const store = getStore();
		store.hooksCleanup.forEach((cleanFn) => {
			cleanFn?.();
		});
		store.hooksEffect.length = 0;
		store.hooksCleanup.length = 0;
	}
};
// ../../node_modules/@inquirer/core/dist/lib/use-state.js
function isFactory(value) {
	return typeof value === "function";
}
function isReducer(value) {
	return typeof value === "function";
}
function useState(defaultValue) {
	return withPointer((pointer) => {
		const setState = AsyncResource.bind(function setState(newValue) {
			const currentValue = pointer.get();
			const nextValue = isReducer(newValue) ? newValue(currentValue) : newValue;
			if (!Object.is(currentValue, nextValue)) {
				pointer.set(nextValue);
				handleChange();
			}
		});
		if (pointer.initialized) return [pointer.get(), setState];
		const value = isFactory(defaultValue) ? defaultValue() : defaultValue;
		pointer.set(value);
		return [value, setState];
	});
}
// ../../node_modules/@inquirer/core/dist/lib/use-effect.js
function useEffect(cb, depArray) {
	withPointer((pointer) => {
		const oldDeps = pointer.get();
		if (!Array.isArray(oldDeps) || depArray.some((dep, i) => !Object.is(dep, oldDeps[i]))) effectScheduler.queue(cb);
		pointer.set(depArray);
	});
}
// ../../node_modules/@inquirer/figures/dist/index.js
function isUnicodeSupported() {
	if (!process$1.platform.startsWith("win")) return process$1.env["TERM"] !== "linux";
	return Boolean(process$1.env["CI"]) || Boolean(process$1.env["WT_SESSION"]) || Boolean(process$1.env["TERMINUS_SUBLIME"]) || process$1.env["ConEmuTask"] === "{cmd::Cmder}" || process$1.env["TERM_PROGRAM"] === "Terminus-Sublime" || process$1.env["TERM_PROGRAM"] === "vscode" || process$1.env["TERM"] === "xterm-256color" || process$1.env["TERM"] === "alacritty" || process$1.env["TERMINAL_EMULATOR"] === "JetBrains-JediTerm";
}
var common = {
	circleQuestionMark: "(?)",
	questionMarkPrefix: "(?)",
	square: "█",
	squareDarkShade: "▓",
	squareMediumShade: "▒",
	squareLightShade: "░",
	squareTop: "▀",
	squareBottom: "▄",
	squareLeft: "▌",
	squareRight: "▐",
	squareCenter: "■",
	bullet: "●",
	dot: "․",
	ellipsis: "…",
	pointerSmall: "›",
	triangleUp: "▲",
	triangleUpSmall: "▴",
	triangleDown: "▼",
	triangleDownSmall: "▾",
	triangleLeftSmall: "◂",
	triangleRightSmall: "▸",
	home: "⌂",
	heart: "♥",
	musicNote: "♪",
	musicNoteBeamed: "♫",
	arrowUp: "↑",
	arrowDown: "↓",
	arrowLeft: "←",
	arrowRight: "→",
	arrowLeftRight: "↔",
	arrowUpDown: "↕",
	almostEqual: "≈",
	notEqual: "≠",
	lessOrEqual: "≤",
	greaterOrEqual: "≥",
	identical: "≡",
	infinity: "∞",
	subscriptZero: "₀",
	subscriptOne: "₁",
	subscriptTwo: "₂",
	subscriptThree: "₃",
	subscriptFour: "₄",
	subscriptFive: "₅",
	subscriptSix: "₆",
	subscriptSeven: "₇",
	subscriptEight: "₈",
	subscriptNine: "₉",
	oneHalf: "½",
	oneThird: "⅓",
	oneQuarter: "¼",
	oneFifth: "⅕",
	oneSixth: "⅙",
	oneEighth: "⅛",
	twoThirds: "⅔",
	twoFifths: "⅖",
	threeQuarters: "¾",
	threeFifths: "⅗",
	threeEighths: "⅜",
	fourFifths: "⅘",
	fiveSixths: "⅚",
	fiveEighths: "⅝",
	sevenEighths: "⅞",
	line: "─",
	lineBold: "━",
	lineDouble: "═",
	lineDashed0: "┄",
	lineDashed1: "┅",
	lineDashed2: "┈",
	lineDashed3: "┉",
	lineDashed4: "╌",
	lineDashed5: "╍",
	lineDashed6: "╴",
	lineDashed7: "╶",
	lineDashed8: "╸",
	lineDashed9: "╺",
	lineDashed10: "╼",
	lineDashed11: "╾",
	lineDashed12: "−",
	lineDashed13: "–",
	lineDashed14: "‐",
	lineDashed15: "⁃",
	lineVertical: "│",
	lineVerticalBold: "┃",
	lineVerticalDouble: "║",
	lineVerticalDashed0: "┆",
	lineVerticalDashed1: "┇",
	lineVerticalDashed2: "┊",
	lineVerticalDashed3: "┋",
	lineVerticalDashed4: "╎",
	lineVerticalDashed5: "╏",
	lineVerticalDashed6: "╵",
	lineVerticalDashed7: "╷",
	lineVerticalDashed8: "╹",
	lineVerticalDashed9: "╻",
	lineVerticalDashed10: "╽",
	lineVerticalDashed11: "╿",
	lineDownLeft: "┐",
	lineDownLeftArc: "╮",
	lineDownBoldLeftBold: "┓",
	lineDownBoldLeft: "┒",
	lineDownLeftBold: "┑",
	lineDownDoubleLeftDouble: "╗",
	lineDownDoubleLeft: "╖",
	lineDownLeftDouble: "╕",
	lineDownRight: "┌",
	lineDownRightArc: "╭",
	lineDownBoldRightBold: "┏",
	lineDownBoldRight: "┎",
	lineDownRightBold: "┍",
	lineDownDoubleRightDouble: "╔",
	lineDownDoubleRight: "╓",
	lineDownRightDouble: "╒",
	lineUpLeft: "┘",
	lineUpLeftArc: "╯",
	lineUpBoldLeftBold: "┛",
	lineUpBoldLeft: "┚",
	lineUpLeftBold: "┙",
	lineUpDoubleLeftDouble: "╝",
	lineUpDoubleLeft: "╜",
	lineUpLeftDouble: "╛",
	lineUpRight: "└",
	lineUpRightArc: "╰",
	lineUpBoldRightBold: "┗",
	lineUpBoldRight: "┖",
	lineUpRightBold: "┕",
	lineUpDoubleRightDouble: "╚",
	lineUpDoubleRight: "╙",
	lineUpRightDouble: "╘",
	lineUpDownLeft: "┤",
	lineUpBoldDownBoldLeftBold: "┫",
	lineUpBoldDownBoldLeft: "┨",
	lineUpDownLeftBold: "┥",
	lineUpBoldDownLeftBold: "┩",
	lineUpDownBoldLeftBold: "┪",
	lineUpDownBoldLeft: "┧",
	lineUpBoldDownLeft: "┦",
	lineUpDoubleDownDoubleLeftDouble: "╣",
	lineUpDoubleDownDoubleLeft: "╢",
	lineUpDownLeftDouble: "╡",
	lineUpDownRight: "├",
	lineUpBoldDownBoldRightBold: "┣",
	lineUpBoldDownBoldRight: "┠",
	lineUpDownRightBold: "┝",
	lineUpBoldDownRightBold: "┡",
	lineUpDownBoldRightBold: "┢",
	lineUpDownBoldRight: "┟",
	lineUpBoldDownRight: "┞",
	lineUpDoubleDownDoubleRightDouble: "╠",
	lineUpDoubleDownDoubleRight: "╟",
	lineUpDownRightDouble: "╞",
	lineDownLeftRight: "┬",
	lineDownBoldLeftBoldRightBold: "┳",
	lineDownLeftBoldRightBold: "┯",
	lineDownBoldLeftRight: "┰",
	lineDownBoldLeftBoldRight: "┱",
	lineDownBoldLeftRightBold: "┲",
	lineDownLeftRightBold: "┮",
	lineDownLeftBoldRight: "┭",
	lineDownDoubleLeftDoubleRightDouble: "╦",
	lineDownDoubleLeftRight: "╥",
	lineDownLeftDoubleRightDouble: "╤",
	lineUpLeftRight: "┴",
	lineUpBoldLeftBoldRightBold: "┻",
	lineUpLeftBoldRightBold: "┷",
	lineUpBoldLeftRight: "┸",
	lineUpBoldLeftBoldRight: "┹",
	lineUpBoldLeftRightBold: "┺",
	lineUpLeftRightBold: "┶",
	lineUpLeftBoldRight: "┵",
	lineUpDoubleLeftDoubleRightDouble: "╩",
	lineUpDoubleLeftRight: "╨",
	lineUpLeftDoubleRightDouble: "╧",
	lineUpDownLeftRight: "┼",
	lineUpBoldDownBoldLeftBoldRightBold: "╋",
	lineUpDownBoldLeftBoldRightBold: "╈",
	lineUpBoldDownLeftBoldRightBold: "╇",
	lineUpBoldDownBoldLeftRightBold: "╊",
	lineUpBoldDownBoldLeftBoldRight: "╉",
	lineUpBoldDownLeftRight: "╀",
	lineUpDownBoldLeftRight: "╁",
	lineUpDownLeftBoldRight: "┽",
	lineUpDownLeftRightBold: "┾",
	lineUpBoldDownBoldLeftRight: "╂",
	lineUpDownLeftBoldRightBold: "┿",
	lineUpBoldDownLeftBoldRight: "╃",
	lineUpBoldDownLeftRightBold: "╄",
	lineUpDownBoldLeftBoldRight: "╅",
	lineUpDownBoldLeftRightBold: "╆",
	lineUpDoubleDownDoubleLeftDoubleRightDouble: "╬",
	lineUpDoubleDownDoubleLeftRight: "╫",
	lineUpDownLeftDoubleRightDouble: "╪",
	lineCross: "╳",
	lineBackslash: "╲",
	lineSlash: "╱"
};
var specialMainSymbols = {
	tick: "✔",
	info: "ℹ",
	warning: "⚠",
	cross: "✘",
	squareSmall: "◻",
	squareSmallFilled: "◼",
	circle: "◯",
	circleFilled: "◉",
	circleDotted: "◌",
	circleDouble: "◎",
	circleCircle: "ⓞ",
	circleCross: "ⓧ",
	circlePipe: "Ⓘ",
	radioOn: "◉",
	radioOff: "◯",
	checkboxOn: "☒",
	checkboxOff: "☐",
	checkboxCircleOn: "ⓧ",
	checkboxCircleOff: "Ⓘ",
	pointer: "❯",
	triangleUpOutline: "△",
	triangleLeft: "◀",
	triangleRight: "▶",
	lozenge: "◆",
	lozengeOutline: "◇",
	hamburger: "☰",
	smiley: "㋡",
	mustache: "෴",
	star: "★",
	play: "▶",
	nodejs: "⬢",
	oneSeventh: "⅐",
	oneNinth: "⅑",
	oneTenth: "⅒"
};
var specialFallbackSymbols = {
	tick: "√",
	info: "i",
	warning: "‼",
	cross: "×",
	squareSmall: "□",
	squareSmallFilled: "■",
	circle: "( )",
	circleFilled: "(*)",
	circleDotted: "( )",
	circleDouble: "( )",
	circleCircle: "(○)",
	circleCross: "(×)",
	circlePipe: "(│)",
	radioOn: "(*)",
	radioOff: "( )",
	checkboxOn: "[×]",
	checkboxOff: "[ ]",
	checkboxCircleOn: "(×)",
	checkboxCircleOff: "( )",
	pointer: ">",
	triangleUpOutline: "∆",
	triangleLeft: "◄",
	triangleRight: "►",
	lozenge: "♦",
	lozengeOutline: "◊",
	hamburger: "≡",
	smiley: "☺",
	mustache: "┌─┐",
	star: "✶",
	play: "►",
	nodejs: "♦",
	oneSeventh: "1/7",
	oneNinth: "1/9",
	oneTenth: "1/10"
};
var mainSymbols = {
	...common,
	...specialMainSymbols
};
var fallbackSymbols = {
	...common,
	...specialFallbackSymbols
};
var figures = isUnicodeSupported() ? mainSymbols : fallbackSymbols;
Object.entries(specialMainSymbols);
// ../../node_modules/@inquirer/core/dist/lib/theme.js
var defaultTheme = {
	prefix: {
		idle: styleText("blue", "?"),
		done: styleText("green", figures.tick)
	},
	spinner: {
		interval: 80,
		frames: [
			"⠋",
			"⠙",
			"⠹",
			"⠸",
			"⠼",
			"⠴",
			"⠦",
			"⠧",
			"⠇",
			"⠏"
		].map((frame) => styleText("yellow", frame))
	},
	keybindings: [],
	style: {
		answer: (text) => styleText("cyan", text),
		message: (text) => styleText("bold", text),
		error: (text) => styleText("red", `> ${text}`),
		defaultAnswer: (text) => styleText("dim", `(${text})`),
		help: (text) => styleText("dim", text),
		highlight: (text) => styleText("cyan", text),
		key: (text) => styleText("cyan", styleText("bold", `<${text}>`))
	}
};
function getDefaultTheme() {
	return {
		...defaultTheme,
		keybindings: getDefaultKeybindings()
	};
}
// ../../node_modules/@inquirer/core/dist/lib/make-theme.js
function isPlainObject(value) {
	if (typeof value !== "object" || value === null) return false;
	let proto = value;
	while (Object.getPrototypeOf(proto) !== null) proto = Object.getPrototypeOf(proto);
	return Object.getPrototypeOf(value) === proto;
}
function deepMerge(...objects) {
	const output = {};
	for (const obj of objects) for (const [key, value] of Object.entries(obj)) {
		const prevValue = output[key];
		output[key] = isPlainObject(prevValue) && isPlainObject(value) ? deepMerge(prevValue, value) : value;
	}
	return output;
}
function makeTheme(...themes) {
	return deepMerge(...[getDefaultTheme(), ...themes.filter((theme) => theme != null)]);
}
// ../../node_modules/@inquirer/core/dist/lib/use-prefix.js
function usePrefix({ status = "idle", theme }) {
	const [showLoader, setShowLoader] = useState(false);
	const [tick, setTick] = useState(0);
	const { prefix, spinner } = makeTheme(theme);
	useEffect(() => {
		if (status === "loading") {
			let tickInterval;
			let inc = -1;
			const delayTimeout = setTimeout(() => {
				setShowLoader(true);
				tickInterval = setInterval(() => {
					inc = inc + 1;
					setTick(inc % spinner.frames.length);
				}, spinner.interval);
			}, 300);
			return () => {
				clearTimeout(delayTimeout);
				clearInterval(tickInterval);
			};
		} else setShowLoader(false);
	}, [status]);
	if (showLoader) return spinner.frames[tick];
	return typeof prefix === "string" ? prefix : prefix[status === "loading" ? "idle" : status] ?? prefix["idle"];
}
// ../../node_modules/@inquirer/core/dist/lib/use-memo.js
function useMemo(fn, dependencies) {
	return withPointer((pointer) => {
		const prev = pointer.get();
		if (!pointer.initialized || prev.dependencies.length !== dependencies.length || prev.dependencies.some((dep, i) => dep !== dependencies[i])) {
			const value = fn();
			pointer.set({
				value,
				dependencies
			});
			return value;
		}
		return prev.value;
	});
}
// ../../node_modules/@inquirer/core/dist/lib/use-ref.js
function useRef(val) {
	return useState({ current: val })[0];
}
// ../../node_modules/@inquirer/core/dist/lib/use-keypress.js
function useKeypress(userHandler) {
	const signal = useRef(userHandler);
	signal.current = userHandler;
	useEffect((rl) => {
		let ignore = false;
		const handler = withUpdates((_input, event) => {
			if (ignore) return;
			signal.current(event, rl);
		});
		rl.input.on("keypress", handler);
		return () => {
			ignore = true;
			rl.input.removeListener("keypress", handler);
		};
	}, []);
}
// ../../node_modules/cli-width/index.js
var require_cli_width = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = cliWidth;
	function normalizeOpts(options) {
		const defaultOpts = {
			defaultWidth: 0,
			output: process.stdout,
			tty: __require("tty")
		};
		if (!options) return defaultOpts;
		Object.keys(defaultOpts).forEach(function(key) {
			if (!options[key]) options[key] = defaultOpts[key];
		});
		return options;
	}
	function cliWidth(options) {
		const opts = normalizeOpts(options);
		if (opts.output.getWindowSize) return opts.output.getWindowSize()[0] || opts.defaultWidth;
		if (opts.tty.getWindowSize) return opts.tty.getWindowSize()[1] || opts.defaultWidth;
		if (opts.output.columns) return opts.output.columns;
		if (process.env.CLI_WIDTH) {
			const width = parseInt(process.env.CLI_WIDTH, 10);
			if (!isNaN(width) && width !== 0) return width;
		}
		return opts.defaultWidth;
	}
}));
// ../../node_modules/fast-string-truncated-width/dist/utils.js
var getCodePointsLength = (() => {
	const SURROGATE_PAIR_RE = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
	return (input) => {
		let surrogatePairsNr = 0;
		SURROGATE_PAIR_RE.lastIndex = 0;
		while (SURROGATE_PAIR_RE.test(input)) surrogatePairsNr += 1;
		return input.length - surrogatePairsNr;
	};
})();
var isFullWidth = (x) => {
	return x === 12288 || x >= 65281 && x <= 65376 || x >= 65504 && x <= 65510;
};
var isWideNotCJKTNotEmoji = (x) => {
	return x === 8987 || x === 9001 || x >= 12272 && x <= 12287 || x >= 12289 && x <= 12350 || x >= 12441 && x <= 12543 || x >= 12549 && x <= 12591 || x >= 12593 && x <= 12686 || x >= 12688 && x <= 12771 || x >= 12783 && x <= 12830 || x >= 12832 && x <= 12871 || x >= 12880 && x <= 19903 || x >= 65040 && x <= 65049 || x >= 65072 && x <= 65106 || x >= 65108 && x <= 65126 || x >= 65128 && x <= 65131 || x >= 127488 && x <= 127490 || x >= 127504 && x <= 127547 || x >= 127552 && x <= 127560 || x >= 131072 && x <= 196605 || x >= 196608 && x <= 262141;
};
// ../../node_modules/fast-string-truncated-width/dist/index.js
var ANSI_RE = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]|\u001b\]8;[^;]*;.*?(?:\u0007|\u001b\u005c)/y;
var CONTROL_RE = /[\x00-\x08\x0A-\x1F\x7F-\x9F]{1,1000}/y;
var CJKT_WIDE_RE = /(?:(?![\uFF61-\uFF9F\uFF00-\uFFEF])[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Tangut}]){1,1000}/uy;
var TAB_RE = /\t{1,1000}/y;
var EMOJI_RE = /[\u{1F1E6}-\u{1F1FF}]{2}|\u{1F3F4}[\u{E0061}-\u{E007A}]{2}[\u{E0030}-\u{E0039}\u{E0061}-\u{E007A}]{1,3}\u{E007F}|(?:\p{Emoji}\uFE0F\u20E3?|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation})(?:\u200D(?:\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation}|\p{Emoji}\uFE0F\u20E3?))*/uy;
var LATIN_RE = /(?:[\x20-\x7E\xA0-\xFF](?!\uFE0F)){1,1000}/y;
var MODIFIER_RE = /\p{M}+/gu;
var NO_TRUNCATION$1 = {
	limit: Infinity,
	ellipsis: ""
};
var getStringTruncatedWidth = (input, truncationOptions = {}, widthOptions = {}) => {
	const LIMIT = truncationOptions.limit ?? Infinity;
	const ELLIPSIS = truncationOptions.ellipsis ?? "";
	const ELLIPSIS_WIDTH = truncationOptions?.ellipsisWidth ?? (ELLIPSIS ? getStringTruncatedWidth(ELLIPSIS, NO_TRUNCATION$1, widthOptions).width : 0);
	const ANSI_WIDTH = 0;
	const CONTROL_WIDTH = widthOptions.controlWidth ?? 0;
	const TAB_WIDTH = widthOptions.tabWidth ?? 8;
	const EMOJI_WIDTH = widthOptions.emojiWidth ?? 2;
	const FULL_WIDTH_WIDTH = 2;
	const REGULAR_WIDTH = widthOptions.regularWidth ?? 1;
	const WIDE_WIDTH = widthOptions.wideWidth ?? FULL_WIDTH_WIDTH;
	const PARSE_BLOCKS = [
		[LATIN_RE, REGULAR_WIDTH],
		[ANSI_RE, ANSI_WIDTH],
		[CONTROL_RE, CONTROL_WIDTH],
		[TAB_RE, TAB_WIDTH],
		[EMOJI_RE, EMOJI_WIDTH],
		[CJKT_WIDE_RE, WIDE_WIDTH]
	];
	let indexPrev = 0;
	let index = 0;
	let length = input.length;
	let lengthExtra = 0;
	let truncationEnabled = false;
	let truncationIndex = length;
	let truncationLimit = Math.max(0, LIMIT - ELLIPSIS_WIDTH);
	let unmatchedStart = 0;
	let unmatchedEnd = 0;
	let width = 0;
	let widthExtra = 0;
	outer: while (true) {
		if (unmatchedEnd > unmatchedStart || index >= length && index > indexPrev) {
			const unmatched = input.slice(unmatchedStart, unmatchedEnd) || input.slice(indexPrev, index);
			lengthExtra = 0;
			for (const char of unmatched.replaceAll(MODIFIER_RE, "")) {
				const codePoint = char.codePointAt(0) || 0;
				if (isFullWidth(codePoint)) widthExtra = FULL_WIDTH_WIDTH;
				else if (isWideNotCJKTNotEmoji(codePoint)) widthExtra = WIDE_WIDTH;
				else widthExtra = REGULAR_WIDTH;
				if (width + widthExtra > truncationLimit) truncationIndex = Math.min(truncationIndex, Math.max(unmatchedStart, indexPrev) + lengthExtra);
				if (width + widthExtra > LIMIT) {
					truncationEnabled = true;
					break outer;
				}
				lengthExtra += char.length;
				width += widthExtra;
			}
			unmatchedStart = unmatchedEnd = 0;
		}
		if (index >= length) break outer;
		for (let i = 0, l = PARSE_BLOCKS.length; i < l; i++) {
			const [BLOCK_RE, BLOCK_WIDTH] = PARSE_BLOCKS[i];
			BLOCK_RE.lastIndex = index;
			if (BLOCK_RE.test(input)) {
				lengthExtra = BLOCK_RE === CJKT_WIDE_RE ? getCodePointsLength(input.slice(index, BLOCK_RE.lastIndex)) : BLOCK_RE === EMOJI_RE ? 1 : BLOCK_RE.lastIndex - index;
				widthExtra = lengthExtra * BLOCK_WIDTH;
				if (width + widthExtra > truncationLimit) truncationIndex = Math.min(truncationIndex, index + Math.floor((truncationLimit - width) / BLOCK_WIDTH));
				if (width + widthExtra > LIMIT) {
					truncationEnabled = true;
					break outer;
				}
				width += widthExtra;
				unmatchedStart = indexPrev;
				unmatchedEnd = index;
				index = indexPrev = BLOCK_RE.lastIndex;
				continue outer;
			}
		}
		index += 1;
	}
	return {
		width: truncationEnabled ? truncationLimit : width,
		index: truncationEnabled ? truncationIndex : length,
		truncated: truncationEnabled,
		ellipsed: truncationEnabled && LIMIT >= ELLIPSIS_WIDTH
	};
};
// ../../node_modules/fast-string-width/dist/index.js
var NO_TRUNCATION = {
	limit: Infinity,
	ellipsis: "",
	ellipsisWidth: 0
};
var fastStringWidth = (input, options = {}) => {
	return getStringTruncatedWidth(input, NO_TRUNCATION, options).width;
};
// ../../node_modules/fast-wrap-ansi/lib/main.js
var ESC$1 = "\x1B";
var CSI = "";
var END_CODE = 39;
var ANSI_ESCAPE_BELL = "\x07";
var ANSI_CSI = "[";
var ANSI_OSC = "]";
var ANSI_SGR_TERMINATOR = "m";
var ANSI_ESCAPE_LINK = `${ANSI_OSC}8;;`;
var GROUP_REGEX = new RegExp(`(?:\\${ANSI_CSI}(?<code>\\d+)m|\\${ANSI_ESCAPE_LINK}(?<uri>.*)${ANSI_ESCAPE_BELL})`, "y");
var getClosingCode = (openingCode) => {
	if (openingCode >= 30 && openingCode <= 37) return 39;
	if (openingCode >= 90 && openingCode <= 97) return 39;
	if (openingCode >= 40 && openingCode <= 47) return 49;
	if (openingCode >= 100 && openingCode <= 107) return 49;
	if (openingCode === 1 || openingCode === 2) return 22;
	if (openingCode === 3) return 23;
	if (openingCode === 4) return 24;
	if (openingCode === 7) return 27;
	if (openingCode === 8) return 28;
	if (openingCode === 9) return 29;
	if (openingCode === 0) return 0;
};
var wrapAnsiCode = (code) => `${ESC$1}${ANSI_CSI}${code}${ANSI_SGR_TERMINATOR}`;
var wrapAnsiHyperlink = (url) => `${ESC$1}${ANSI_ESCAPE_LINK}${url}${ANSI_ESCAPE_BELL}`;
var wrapWord = (rows, word, columns) => {
	const characters = word[Symbol.iterator]();
	let isInsideEscape = false;
	let isInsideLinkEscape = false;
	let lastRow = rows.at(-1);
	let visible = lastRow === void 0 ? 0 : fastStringWidth(lastRow);
	let currentCharacter = characters.next();
	let nextCharacter = characters.next();
	let rawCharacterIndex = 0;
	while (!currentCharacter.done) {
		const character = currentCharacter.value;
		const characterLength = fastStringWidth(character);
		if (visible + characterLength <= columns) rows[rows.length - 1] += character;
		else {
			rows.push(character);
			visible = 0;
		}
		if (character === ESC$1 || character === CSI) {
			isInsideEscape = true;
			isInsideLinkEscape = word.startsWith(ANSI_ESCAPE_LINK, rawCharacterIndex + 1);
		}
		if (isInsideEscape) {
			if (isInsideLinkEscape) {
				if (character === ANSI_ESCAPE_BELL) {
					isInsideEscape = false;
					isInsideLinkEscape = false;
				}
			} else if (character === ANSI_SGR_TERMINATOR) isInsideEscape = false;
		} else {
			visible += characterLength;
			if (visible === columns && !nextCharacter.done) {
				rows.push("");
				visible = 0;
			}
		}
		currentCharacter = nextCharacter;
		nextCharacter = characters.next();
		rawCharacterIndex += character.length;
	}
	lastRow = rows.at(-1);
	if (!visible && lastRow !== void 0 && lastRow.length && rows.length > 1) rows[rows.length - 2] += rows.pop();
};
var stringVisibleTrimSpacesRight = (string) => {
	const words = string.split(" ");
	let last = words.length;
	while (last) {
		if (fastStringWidth(words[last - 1])) break;
		last--;
	}
	if (last === words.length) return string;
	return words.slice(0, last).join(" ") + words.slice(last).join("");
};
var exec = (string, columns, options = {}) => {
	if (options.trim !== false && string.trim() === "") return "";
	let returnValue = "";
	let escapeCode;
	let escapeUrl;
	const words = string.split(" ");
	let rows = [""];
	let rowLength = 0;
	for (let index = 0; index < words.length; index++) {
		const word = words[index];
		if (options.trim !== false) {
			const row = rows.at(-1) ?? "";
			const trimmed = row.trimStart();
			if (row.length !== trimmed.length) {
				rows[rows.length - 1] = trimmed;
				rowLength = fastStringWidth(trimmed);
			}
		}
		if (index !== 0) {
			if (rowLength >= columns && (options.wordWrap === false || options.trim === false)) {
				rows.push("");
				rowLength = 0;
			}
			if (rowLength || options.trim === false) {
				rows[rows.length - 1] += " ";
				rowLength++;
			}
		}
		const wordLength = fastStringWidth(word);
		if (options.hard && wordLength > columns) {
			const remainingColumns = columns - rowLength;
			const breaksStartingThisLine = 1 + Math.floor((wordLength - remainingColumns - 1) / columns);
			if (Math.floor((wordLength - 1) / columns) < breaksStartingThisLine) rows.push("");
			wrapWord(rows, word, columns);
			rowLength = fastStringWidth(rows.at(-1) ?? "");
			continue;
		}
		if (rowLength + wordLength > columns && rowLength && wordLength) {
			if (options.wordWrap === false && rowLength < columns) {
				wrapWord(rows, word, columns);
				rowLength = fastStringWidth(rows.at(-1) ?? "");
				continue;
			}
			rows.push("");
			rowLength = 0;
		}
		if (rowLength + wordLength > columns && options.wordWrap === false) {
			wrapWord(rows, word, columns);
			rowLength = fastStringWidth(rows.at(-1) ?? "");
			continue;
		}
		rows[rows.length - 1] += word;
		rowLength += wordLength;
	}
	if (options.trim !== false) rows = rows.map((row) => stringVisibleTrimSpacesRight(row));
	const preString = rows.join("\n");
	let inSurrogate = false;
	for (let i = 0; i < preString.length; i++) {
		const character = preString[i];
		returnValue += character;
		if (!inSurrogate) {
			inSurrogate = character >= "\ud800" && character <= "\udbff";
			if (inSurrogate) continue;
		} else inSurrogate = false;
		if (character === ESC$1 || character === CSI) {
			GROUP_REGEX.lastIndex = i + 1;
			const groups = GROUP_REGEX.exec(preString)?.groups;
			if (groups?.code !== void 0) {
				const code = Number.parseFloat(groups.code);
				escapeCode = code === END_CODE ? void 0 : code;
			} else if (groups?.uri !== void 0) escapeUrl = groups.uri.length === 0 ? void 0 : groups.uri;
		}
		if (preString[i + 1] === "\n") {
			if (escapeUrl) returnValue += wrapAnsiHyperlink("");
			const closingCode = escapeCode ? getClosingCode(escapeCode) : void 0;
			if (escapeCode && closingCode) returnValue += wrapAnsiCode(closingCode);
		} else if (character === "\n") {
			if (escapeCode && getClosingCode(escapeCode)) returnValue += wrapAnsiCode(escapeCode);
			if (escapeUrl) returnValue += wrapAnsiHyperlink(escapeUrl);
		}
	}
	return returnValue;
};
var CRLF_OR_LF = /\r?\n/;
function wrapAnsi(string, columns, options) {
	return String(string).normalize().split(CRLF_OR_LF).map((line) => exec(line, columns, options)).join("\n");
}
// ../../node_modules/@inquirer/core/dist/lib/utils.js
var import_cli_width = /* @__PURE__ */ __toESM(require_cli_width(), 1);
/**
* Force line returns at specific width. This function is ANSI code friendly and it'll
* ignore invisible codes during width calculation.
* @param {string} content
* @param {number} width
* @return {string}
*/
function breakLines(content, width) {
	return content.split("\n").flatMap((line) => wrapAnsi(line, width, {
		trim: false,
		wordWrap: false
	}).split("\n").map((str) => str.trimEnd())).join("\n");
}
/**
* Returns the width of the active readline, or 80 as default value.
* @returns {number}
*/
function readlineWidth() {
	return (0, import_cli_width.default)({
		defaultWidth: 80,
		output: readline$1().output
	});
}
// ../../node_modules/@inquirer/core/dist/lib/pagination/use-pagination.js
function usePointerPosition({ active, renderedItems, pageSize, loop }) {
	const state = useRef({
		lastPointer: active,
		lastActive: void 0
	});
	const { lastPointer, lastActive } = state.current;
	const middle = Math.floor(pageSize / 2);
	const renderedLength = renderedItems.reduce((acc, item) => acc + item.length, 0);
	const defaultPointerPosition = renderedItems.slice(0, active).reduce((acc, item) => acc + item.length, 0);
	let pointer = defaultPointerPosition;
	if (renderedLength > pageSize) {
		if (loop) {
			/**
			* Creates the next position for the pointer considering an infinitely
			* looping list of items to be rendered on the page.
			*
			* The goal is to progressively move the cursor to the middle position as the user move down, and then keep
			* the cursor there. When the user move up, maintain the cursor position.
			*/
			pointer = lastPointer;
			if (lastActive != null && lastActive < active && active - lastActive < pageSize) pointer = Math.min(middle, Math.abs(active - lastActive) === 1 ? Math.min(lastPointer + (renderedItems[lastActive]?.length ?? 0), Math.max(defaultPointerPosition, lastPointer)) : lastPointer + active - lastActive);
		} else {
			/**
			* Creates the next position for the pointer considering a finite list of
			* items to be rendered on a page.
			*
			* The goal is to keep the pointer in the middle of the page whenever possible, until
			* we reach the bounds of the list (top or bottom). In which case, the cursor moves progressively
			* to the bottom or top of the list.
			*/
			const spaceUnderActive = renderedItems.slice(active).reduce((acc, item) => acc + item.length, 0);
			pointer = spaceUnderActive < pageSize - middle ? pageSize - spaceUnderActive : Math.min(defaultPointerPosition, middle);
		}
	}
	state.current.lastPointer = pointer;
	state.current.lastActive = active;
	return pointer;
}
function usePagination({ items, active, renderItem, pageSize, loop = true }) {
	const width = readlineWidth();
	const bound = (num) => (num % items.length + items.length) % items.length;
	const renderedItems = items.map((item, index) => {
		if (item == null) return [];
		return breakLines(renderItem({
			item,
			index,
			isActive: index === active
		}), width).split("\n");
	});
	const renderedLength = renderedItems.reduce((acc, item) => acc + item.length, 0);
	const renderItemAtIndex = (index) => renderedItems[index] ?? [];
	const pointer = usePointerPosition({
		active,
		renderedItems,
		pageSize,
		loop
	});
	const activeItem = renderItemAtIndex(active).slice(0, pageSize);
	const activeItemPosition = pointer + activeItem.length <= pageSize ? pointer : pageSize - activeItem.length;
	const pageBuffer = Array.from({ length: pageSize });
	pageBuffer.splice(activeItemPosition, activeItem.length, ...activeItem);
	const itemVisited = /* @__PURE__ */ new Set([active]);
	let bufferPointer = activeItemPosition + activeItem.length;
	let itemPointer = bound(active + 1);
	while (bufferPointer < pageSize && !itemVisited.has(itemPointer) && (loop && renderedLength > pageSize ? itemPointer !== active : itemPointer > active)) {
		const linesToAdd = renderItemAtIndex(itemPointer).slice(0, pageSize - bufferPointer);
		pageBuffer.splice(bufferPointer, linesToAdd.length, ...linesToAdd);
		itemVisited.add(itemPointer);
		bufferPointer += linesToAdd.length;
		itemPointer = bound(itemPointer + 1);
	}
	bufferPointer = activeItemPosition - 1;
	itemPointer = bound(active - 1);
	while (bufferPointer >= 0 && !itemVisited.has(itemPointer) && (loop && renderedLength > pageSize ? itemPointer !== active : itemPointer < active)) {
		const lines = renderItemAtIndex(itemPointer);
		const linesToAdd = lines.slice(Math.max(0, lines.length - bufferPointer - 1));
		pageBuffer.splice(bufferPointer - linesToAdd.length + 1, linesToAdd.length, ...linesToAdd);
		itemVisited.add(itemPointer);
		bufferPointer -= linesToAdd.length;
		itemPointer = bound(itemPointer - 1);
	}
	return pageBuffer.filter((line) => typeof line === "string").join("\n");
}
// ../../node_modules/@inquirer/type/dist/utils.js
/**
* Create a promise and get access to its `resolve` and `reject` functions.
*
* Mirrors `Promise.withResolvers()`, available starting from Node 22.
* TODO: Remove once Node 22 becomes the minimum supported version.
*/
function withResolver() {
	let resolve;
	let reject;
	return {
		promise: new Promise((res, rej) => {
			resolve = res;
			reject = rej;
		}),
		resolve,
		reject
	};
}
// ../../node_modules/mute-stream/lib/index.js
var require_lib = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Stream = __require("stream");
	var MuteStream = class extends Stream {
		#isTTY = null;
		constructor(opts = {}) {
			super(opts);
			this.writable = this.readable = true;
			this.muted = false;
			this.on("pipe", this._onpipe);
			this.replace = opts.replace;
			this._prompt = opts.prompt || null;
			this._hadControl = false;
		}
		#destSrc(key, def) {
			if (this._dest) return this._dest[key];
			if (this._src) return this._src[key];
			return def;
		}
		#proxy(method, ...args) {
			if (typeof this._dest?.[method] === "function") this._dest[method](...args);
			if (typeof this._src?.[method] === "function") this._src[method](...args);
		}
		get isTTY() {
			if (this.#isTTY !== null) return this.#isTTY;
			return this.#destSrc("isTTY", false);
		}
		set isTTY(val) {
			this.#isTTY = val;
		}
		get rows() {
			return this.#destSrc("rows");
		}
		get columns() {
			return this.#destSrc("columns");
		}
		mute() {
			this.muted = true;
		}
		unmute() {
			this.muted = false;
		}
		_onpipe(src) {
			this._src = src;
		}
		pipe(dest, options) {
			this._dest = dest;
			return super.pipe(dest, options);
		}
		pause() {
			if (this._src) return this._src.pause();
		}
		resume() {
			if (this._src) return this._src.resume();
		}
		write(c) {
			if (this.muted) {
				if (!this.replace) return true;
				if (c.match(/^\u001b/)) {
					if (c.indexOf(this._prompt) === 0) {
						c = c.slice(this._prompt.length);
						c = c.replace(/./g, this.replace);
						c = this._prompt + c;
					}
					this._hadControl = true;
					return this.emit("data", c);
				} else {
					if (this._prompt && this._hadControl && c.indexOf(this._prompt) === 0) {
						this._hadControl = false;
						this.emit("data", this._prompt);
						c = c.slice(this._prompt.length);
					}
					c = c.toString().replace(/./g, this.replace);
				}
			}
			this.emit("data", c);
		}
		end(c) {
			if (this.muted) {
				if (c && this.replace) c = c.toString().replace(/./g, this.replace);
				else c = null;
			}
			if (c) this.emit("data", c);
			this.emit("end");
		}
		destroy(...args) {
			return this.#proxy("destroy", ...args);
		}
		destroySoon(...args) {
			return this.#proxy("destroySoon", ...args);
		}
		close(...args) {
			return this.#proxy("close", ...args);
		}
	};
	module.exports = MuteStream;
}));
// ../../node_modules/signal-exit/dist/mjs/signals.js
/**
* This is not the set of all possible signals.
*
* It IS, however, the set of all signals that trigger
* an exit on either Linux or BSD systems.  Linux is a
* superset of the signal names supported on BSD, and
* the unknown signals just fail to register, so we can
* catch that easily enough.
*
* Windows signals are a different set, since there are
* signals that terminate Windows processes, but don't
* terminate (or don't even exist) on Posix systems.
*
* Don't bother with SIGKILL.  It's uncatchable, which
* means that we can't fire any callbacks anyway.
*
* If a user does happen to register a handler on a non-
* fatal signal like SIGWINCH or something, and then
* exit, it'll end up firing `process.emit('exit')`, so
* the handler will be fired anyway.
*
* SIGBUS, SIGFPE, SIGSEGV and SIGILL, when not raised
* artificially, inherently leave the process in a
* state from which it is not safe to try and enter JS
* listeners.
*/
var signals = [];
signals.push("SIGHUP", "SIGINT", "SIGTERM");
if (process.platform !== "win32") signals.push("SIGALRM", "SIGABRT", "SIGVTALRM", "SIGXCPU", "SIGXFSZ", "SIGUSR2", "SIGTRAP", "SIGSYS", "SIGQUIT", "SIGIOT");
if (process.platform === "linux") signals.push("SIGIO", "SIGPOLL", "SIGPWR", "SIGSTKFLT");
// ../../node_modules/signal-exit/dist/mjs/index.js
var processOk = (process) => !!process && typeof process === "object" && typeof process.removeListener === "function" && typeof process.emit === "function" && typeof process.reallyExit === "function" && typeof process.listeners === "function" && typeof process.kill === "function" && typeof process.pid === "number" && typeof process.on === "function";
var kExitEmitter = Symbol.for("signal-exit emitter");
var global = globalThis;
var ObjectDefineProperty = Object.defineProperty.bind(Object);
var Emitter = class {
	emitted = {
		afterExit: false,
		exit: false
	};
	listeners = {
		afterExit: [],
		exit: []
	};
	count = 0;
	id = Math.random();
	constructor() {
		if (global[kExitEmitter]) return global[kExitEmitter];
		ObjectDefineProperty(global, kExitEmitter, {
			value: this,
			writable: false,
			enumerable: false,
			configurable: false
		});
	}
	on(ev, fn) {
		this.listeners[ev].push(fn);
	}
	removeListener(ev, fn) {
		const list = this.listeners[ev];
		const i = list.indexOf(fn);
		/* c8 ignore start */
		if (i === -1) return;
		/* c8 ignore stop */
		if (i === 0 && list.length === 1) list.length = 0;
		else list.splice(i, 1);
	}
	emit(ev, code, signal) {
		if (this.emitted[ev]) return false;
		this.emitted[ev] = true;
		let ret = false;
		for (const fn of this.listeners[ev]) ret = fn(code, signal) === true || ret;
		if (ev === "exit") ret = this.emit("afterExit", code, signal) || ret;
		return ret;
	}
};
var SignalExitBase = class {};
var signalExitWrap = (handler) => {
	return {
		onExit(cb, opts) {
			return handler.onExit(cb, opts);
		},
		load() {
			return handler.load();
		},
		unload() {
			return handler.unload();
		}
	};
};
var SignalExitFallback = class extends SignalExitBase {
	onExit() {
		return () => {};
	}
	load() {}
	unload() {}
};
var SignalExit = class extends SignalExitBase {
	/* c8 ignore start */
	#hupSig = process$2.platform === "win32" ? "SIGINT" : "SIGHUP";
	/* c8 ignore stop */
	#emitter = new Emitter();
	#process;
	#originalProcessEmit;
	#originalProcessReallyExit;
	#sigListeners = {};
	#loaded = false;
	constructor(process) {
		super();
		this.#process = process;
		this.#sigListeners = {};
		for (const sig of signals) this.#sigListeners[sig] = () => {
			const listeners = this.#process.listeners(sig);
			let { count } = this.#emitter;
			/* c8 ignore start */
			const p = process;
			if (typeof p.__signal_exit_emitter__ === "object" && typeof p.__signal_exit_emitter__.count === "number") count += p.__signal_exit_emitter__.count;
			/* c8 ignore stop */
			if (listeners.length === count) {
				this.unload();
				const ret = this.#emitter.emit("exit", null, sig);
				/* c8 ignore start */
				const s = sig === "SIGHUP" ? this.#hupSig : sig;
				if (!ret) process.kill(process.pid, s);
			}
		};
		this.#originalProcessReallyExit = process.reallyExit;
		this.#originalProcessEmit = process.emit;
	}
	onExit(cb, opts) {
		/* c8 ignore start */
		if (!processOk(this.#process)) return () => {};
		/* c8 ignore stop */
		if (this.#loaded === false) this.load();
		const ev = opts?.alwaysLast ? "afterExit" : "exit";
		this.#emitter.on(ev, cb);
		return () => {
			this.#emitter.removeListener(ev, cb);
			if (this.#emitter.listeners["exit"].length === 0 && this.#emitter.listeners["afterExit"].length === 0) this.unload();
		};
	}
	load() {
		if (this.#loaded) return;
		this.#loaded = true;
		this.#emitter.count += 1;
		for (const sig of signals) try {
			const fn = this.#sigListeners[sig];
			if (fn) this.#process.on(sig, fn);
		} catch (_) {}
		this.#process.emit = (ev, ...a) => {
			return this.#processEmit(ev, ...a);
		};
		this.#process.reallyExit = (code) => {
			return this.#processReallyExit(code);
		};
	}
	unload() {
		if (!this.#loaded) return;
		this.#loaded = false;
		signals.forEach((sig) => {
			const listener = this.#sigListeners[sig];
			/* c8 ignore start */
			if (!listener) throw new Error("Listener not defined for signal: " + sig);
			/* c8 ignore stop */
			try {
				this.#process.removeListener(sig, listener);
			} catch (_) {}
			/* c8 ignore stop */
		});
		this.#process.emit = this.#originalProcessEmit;
		this.#process.reallyExit = this.#originalProcessReallyExit;
		this.#emitter.count -= 1;
	}
	#processReallyExit(code) {
		/* c8 ignore start */
		if (!processOk(this.#process)) return 0;
		this.#process.exitCode = code || 0;
		/* c8 ignore stop */
		this.#emitter.emit("exit", this.#process.exitCode, null);
		return this.#originalProcessReallyExit.call(this.#process, this.#process.exitCode);
	}
	#processEmit(ev, ...args) {
		const og = this.#originalProcessEmit;
		if (ev === "exit" && processOk(this.#process)) {
			if (typeof args[0] === "number") this.#process.exitCode = args[0];
			/* c8 ignore start */
			const ret = og.call(this.#process, ev, ...args);
			/* c8 ignore start */
			this.#emitter.emit("exit", this.#process.exitCode, null);
			/* c8 ignore stop */
			return ret;
		} else return og.call(this.#process, ev, ...args);
	}
};
var process$2 = globalThis.process;
var { onExit, load, unload } = signalExitWrap(processOk(process$2) ? new SignalExit(process$2) : new SignalExitFallback());
// ../../node_modules/@inquirer/ansi/dist/index.js
var ESC = "\x1B[";
/** Hide the cursor */
var cursorHide = "\x1B[?25l";
/** Show the cursor */
var cursorShow = "\x1B[?25h";
/** Move cursor up by count rows */
var cursorUp = (rows = 1) => rows > 0 ? `${ESC}${rows}A` : "";
/** Move cursor down by count rows */
var cursorDown = (rows = 1) => rows > 0 ? `${ESC}${rows}B` : "";
/** Move cursor to position (x, y) */
var cursorTo = (x, y) => {
	if (typeof y === "number" && !Number.isNaN(y)) return `${ESC}${y + 1};${x + 1}H`;
	return `${ESC}${x + 1}G`;
};
var eraseLine = "\x1B[2K";
/** Erase the specified number of lines above the cursor */
var eraseLines = (lines) => lines > 0 ? (eraseLine + cursorUp(1)).repeat(lines - 1) + "\x1B[2K\x1B[G" : "";
// ../../node_modules/@inquirer/core/dist/lib/screen-manager.js
var height = (content) => content.split("\n").length;
var lastLine = (content) => content.split("\n").pop() ?? "";
var ScreenManager = class {
	height = 0;
	extraLinesUnderPrompt = 0;
	cursorPos;
	rl;
	constructor(rl) {
		this.rl = rl;
		this.cursorPos = rl.getCursorPos();
	}
	write(content) {
		this.rl.output.unmute();
		this.rl.output.write(content);
		this.rl.output.mute();
	}
	render(content, bottomContent = "") {
		const promptLine = lastLine(content);
		const rawPromptLine = stripVTControlCharacters(promptLine);
		let prompt = rawPromptLine;
		if (this.rl.line.length > 0) prompt = prompt.slice(0, -this.rl.line.length);
		this.rl.setPrompt(prompt);
		this.cursorPos = this.rl.getCursorPos();
		const width = readlineWidth();
		content = breakLines(content, width);
		bottomContent = breakLines(bottomContent, width);
		if (rawPromptLine.length % width === 0) content += "\n";
		let output = content + (bottomContent ? "\n" + bottomContent : "");
		const bottomContentHeight = Math.floor(rawPromptLine.length / width) - this.cursorPos.rows + (bottomContent ? height(bottomContent) : 0);
		if (bottomContentHeight > 0) output += cursorUp(bottomContentHeight);
		output += cursorTo(this.cursorPos.cols);
		/**
		* Render and store state for future re-rendering
		*/
		this.write(cursorDown(this.extraLinesUnderPrompt) + eraseLines(this.height) + output);
		this.extraLinesUnderPrompt = bottomContentHeight;
		this.height = height(output);
	}
	checkCursorPos() {
		const cursorPos = this.rl.getCursorPos();
		if (cursorPos.cols !== this.cursorPos.cols) {
			this.write(cursorTo(cursorPos.cols));
			this.cursorPos = cursorPos;
		}
	}
	done({ clearContent }) {
		this.rl.setPrompt("");
		let output = cursorDown(this.extraLinesUnderPrompt);
		output += clearContent ? eraseLines(this.height) : "\n";
		output += "\x1B[G";
		output += cursorShow;
		this.write(output);
		this.rl.close();
	}
};
// ../../node_modules/@inquirer/core/dist/lib/create-prompt.js
var import_lib = /* @__PURE__ */ __toESM(require_lib(), 1);
var nativeSetImmediate = globalThis.setImmediate;
var nativeClearImmediate = globalThis.clearImmediate;
/**
* Register an event listener and return its disposer, so registrations collapse
* into a single statement: `cleanups.add(listenTo(rl, 'close', handler))`.
*/
function listenTo(target, event, listener) {
	if ("on" in target) {
		target.on(event, listener);
		return () => target.removeListener(event, listener);
	}
	target.addEventListener(event, listener);
	return () => target.removeEventListener(event, listener);
}
function getCallSites() {
	const savedPrepareStackTrace = Error.prepareStackTrace;
	let result = [];
	try {
		Error.prepareStackTrace = (_, callSites) => {
			const callSitesWithoutCurrent = callSites.slice(1);
			result = callSitesWithoutCurrent;
			return callSitesWithoutCurrent;
		};
		(/* @__PURE__ */ new Error()).stack;
	} catch {
		return result;
	}
	Error.prepareStackTrace = savedPrepareStackTrace;
	return result;
}
function createPrompt(view) {
	const callSites = getCallSites();
	const prompt = (config, context = {}) => {
		const { input = process.stdin, signal } = context;
		const cleanups = /* @__PURE__ */ new Set();
		const output = new import_lib.default();
		output.pipe(context.output ?? process.stdout);
		const rl = readline.createInterface({
			terminal: true,
			input,
			output
		});
		output.mute();
		const screen = new ScreenManager(rl);
		const { promise, resolve, reject } = withResolver();
		return withHooks(rl, (cycle) => {
			const clearEffects = AsyncResource.bind(() => effectScheduler.clearAll());
			const settlePrompt = (settle) => {
				try {
					clearEffects();
					settle();
				} catch (error) {
					reject(error);
				}
			};
			const resolvePrompt = (value) => settlePrompt(() => resolve(value));
			const rejectPrompt = (error) => settlePrompt(() => reject(error));
			const promptPromise = Object.assign(promise.finally(() => {
				cleanups.forEach((cleanup) => cleanup());
				screen.done({ clearContent: Boolean(context.clearPromptOnDone) });
				output.end();
			}).then(() => promise), { cancel: () => rejectPrompt(new CancelPromptError()) });
			if (signal) {
				const abort = () => rejectPrompt(new AbortPromptError({ cause: signal.reason }));
				if (signal.aborted) {
					abort();
					return promptPromise;
				}
				cleanups.add(listenTo(signal, "abort", abort));
			}
			cleanups.add(onExit((code, signal) => {
				rejectPrompt(new ExitPromptError(`User force closed the prompt with ${code} ${signal}`));
			}));
			cleanups.add(listenTo(rl, "SIGINT", () => rejectPrompt(new ExitPromptError(`User force closed the prompt with SIGINT`))));
			cleanups.add(listenTo(rl, "close", clearEffects));
			const startCycle = () => {
				cleanups.add(listenTo(rl.input, "keypress", () => screen.checkCursorPos()));
				let pendingDone = null;
				cycle(() => {
					let effectsSettled = false;
					try {
						const nextView = view(config, (value) => {
							if (effectsSettled) resolvePrompt(value);
							else pendingDone = { value };
						});
						if (nextView === void 0) {
							let callerFilename = callSites[1]?.getFileName();
							if (callerFilename && !callerFilename.startsWith("file://")) callerFilename = path.resolve(callerFilename);
							throw new Error(`Prompt functions must return a string.\n    at ${callerFilename}`);
						}
						const [content, bottomContent] = typeof nextView === "string" ? [nextView] : nextView;
						screen.render(content, bottomContent);
						effectScheduler.run();
					} catch (error) {
						rejectPrompt(error);
					}
					effectsSettled = true;
					if (pendingDone !== null) {
						const { value } = pendingDone;
						pendingDone = null;
						resolvePrompt(value);
					}
				});
			};
			if ("readableFlowing" in input) {
				const immediate = nativeSetImmediate(startCycle);
				cleanups.add(() => nativeClearImmediate(immediate));
			} else startCycle();
			return promptPromise;
		});
	};
	return prompt;
}
// ../../node_modules/@inquirer/core/dist/lib/Separator.js
/**
* Separator object
* Used to space/separate choices group
*/
var Separator = class {
	separator = styleText("dim", Array.from({ length: 15 }).join(figures.line));
	type = "separator";
	constructor(separator) {
		if (separator) this.separator = separator;
	}
	static isSeparator(choice) {
		return Boolean(choice && typeof choice === "object" && "type" in choice && choice.type === "separator");
	}
};
// ../../node_modules/@inquirer/checkbox/dist/index.js
var checkboxTheme = {
	icon: {
		checked: styleText("green", figures.circleFilled),
		unchecked: figures.circle,
		cursor: figures.pointer,
		disabledChecked: styleText("green", figures.circleDouble),
		disabledUnchecked: "-"
	},
	style: {
		disabled: (text) => styleText("dim", text),
		renderSelectedChoices: (selectedChoices) => selectedChoices.map((choice) => choice.short).join(", "),
		description: (text) => styleText("cyan", text),
		keysHelpTip: (keys) => keys.map(([key, action]) => `${styleText("bold", key)} ${styleText("dim", action)}`).join(styleText("dim", " • "))
	},
	i18n: { disabledError: "This option is disabled and cannot be toggled." }
};
function isSelectable$1(item) {
	return !Separator.isSeparator(item) && !item.disabled;
}
function isNavigable$1(item) {
	return !Separator.isSeparator(item);
}
function isChecked(item) {
	return !Separator.isSeparator(item) && item.checked;
}
function toggle(item) {
	return isSelectable$1(item) ? {
		...item,
		checked: !item.checked
	} : item;
}
function check(checked) {
	return function(item) {
		return isSelectable$1(item) ? {
			...item,
			checked
		} : item;
	};
}
function normalizeChoices$1(choices) {
	return choices.map((choice) => {
		if (Separator.isSeparator(choice)) return choice;
		if (typeof choice !== "object" || choice === null || !("value" in choice)) {
			const name = String(choice);
			return {
				value: choice,
				name,
				short: name,
				checkedName: name,
				disabled: false,
				checked: false
			};
		}
		const name = choice.name ?? String(choice.value);
		const normalizedChoice = {
			value: choice.value,
			name,
			short: choice.short ?? name,
			checkedName: choice.checkedName ?? name,
			disabled: choice.disabled ?? false,
			checked: choice.checked ?? false
		};
		if (choice.description) normalizedChoice.description = choice.description;
		return normalizedChoice;
	});
}
var dist_default = createPrompt((config, done) => {
	const { pageSize = 7, loop = true, required, validate = () => true } = config;
	const shortcuts = {
		all: "a",
		invert: "i",
		...config.shortcuts
	};
	const theme = makeTheme(checkboxTheme, config.theme);
	const { keybindings } = theme;
	const [status, setStatus] = useState("idle");
	const prefix = usePrefix({
		status,
		theme
	});
	const [items, setItems] = useState(normalizeChoices$1(config.choices));
	const bounds = useMemo(() => {
		const first = items.findIndex(isNavigable$1);
		const last = items.findLastIndex(isNavigable$1);
		if (first === -1) throw new ValidationError("[checkbox prompt] No selectable choices. All choices are disabled.");
		return {
			first,
			last
		};
	}, [items]);
	const [active, setActive] = useState(bounds.first);
	const [errorMsg, setError] = useState();
	useKeypress(async (key) => {
		if (status !== "idle") return;
		if (isEnterKey(key)) {
			setStatus("loading");
			const selection = items.filter(isChecked);
			const isValid = await validate([...selection]);
			setStatus("idle");
			if (required && !selection.length) setError("At least one choice must be selected");
			else if (isValid === true) {
				setStatus("done");
				done(selection.map((choice) => choice.value));
			} else setError(isValid || "You must select a valid value");
		} else if (isUpKey(key, keybindings) || isDownKey(key, keybindings)) {
			if (errorMsg) setError(void 0);
			if (loop || isUpKey(key, keybindings) && active !== bounds.first || isDownKey(key, keybindings) && active !== bounds.last) {
				const offset = isUpKey(key, keybindings) ? -1 : 1;
				let next = active;
				do
					next = (next + offset + items.length) % items.length;
				while (!isNavigable$1(items[next]));
				setActive(next);
			}
		} else if (isSpaceKey(key)) {
			const activeItem = items[active];
			if (activeItem && !Separator.isSeparator(activeItem)) {
				if (activeItem.disabled) setError(theme.i18n.disabledError);
				else {
					setError(void 0);
					setItems(items.map((choice, i) => i === active ? toggle(choice) : choice));
				}
			}
		} else if (key.name === shortcuts.all) {
			const selectAll = items.some((choice) => isSelectable$1(choice) && !choice.checked);
			setItems(items.map(check(selectAll)));
		} else if (key.name === shortcuts.invert) setItems(items.map(toggle));
		else if (isNumberKey(key)) {
			const selectedIndex = Number(key.name) - 1;
			let selectableIndex = -1;
			const position = items.findIndex((item) => {
				if (Separator.isSeparator(item)) return false;
				selectableIndex++;
				return selectableIndex === selectedIndex;
			});
			const selectedItem = items[position];
			if (selectedItem && isSelectable$1(selectedItem)) {
				setActive(position);
				setItems(items.map((choice, i) => i === position ? toggle(choice) : choice));
			}
		}
	});
	const message = theme.style.message(config.message, status);
	let description;
	const page = usePagination({
		items,
		active,
		renderItem({ item, isActive }) {
			if (Separator.isSeparator(item)) return ` ${item.separator}`;
			const cursor = isActive ? theme.icon.cursor : " ";
			if (item.disabled) {
				const disabledLabel = typeof item.disabled === "string" ? item.disabled : "(disabled)";
				const checkbox = item.checked ? theme.icon.disabledChecked : theme.icon.disabledUnchecked;
				return theme.style.disabled(`${cursor}${checkbox} ${item.name} ${disabledLabel}`);
			}
			if (isActive) description = item.description;
			const checkbox = item.checked ? theme.icon.checked : theme.icon.unchecked;
			const name = item.checked ? item.checkedName : item.name;
			return (isActive ? theme.style.highlight : (x) => x)(`${cursor}${checkbox} ${name}`);
		},
		pageSize,
		loop
	});
	if (status === "done") {
		const selection = items.filter(isChecked);
		return [
			prefix,
			message,
			theme.style.answer(theme.style.renderSelectedChoices(selection, items))
		].filter(Boolean).join(" ");
	}
	const keys = [["↑↓", "navigate"], ["space", "select"]];
	if (shortcuts.all) keys.push([shortcuts.all, "all"]);
	if (shortcuts.invert) keys.push([shortcuts.invert, "invert"]);
	keys.push(["⏎", "submit"]);
	const helpLine = theme.style.keysHelpTip(keys);
	return `${[
		[prefix, message].filter(Boolean).join(" "),
		page,
		" ",
		description ? theme.style.description(description) : "",
		errorMsg ? theme.style.error(errorMsg) : "",
		helpLine
	].filter(Boolean).join("\n").trimEnd()}${cursorHide}`;
});
// ../../node_modules/@inquirer/confirm/dist/index.js
var confirmTheme = {
	keywords: {
		yes: "Yes",
		no: "No",
		error: ({ yes, no }) => `You must answer with "${yes}" or "${no}"`
	},
	style: { confirmDefault: (text) => {
		const first = text[0] ?? "";
		if (first.toLowerCase() === first.toUpperCase()) return styleText("cyan", text);
		return first.toUpperCase() + text.slice(1);
	} }
};
var dist_default$1 = createPrompt((config, done) => {
	const [status, setStatus] = useState("idle");
	const [value, setValue] = useState("");
	const [errorMsg, setError] = useState();
	const theme = makeTheme(confirmTheme, config.theme);
	const prefix = usePrefix({
		status,
		theme
	});
	const { yes, no } = theme.keywords;
	const yesHint = (yes[0] ?? "").toLowerCase();
	const noHint = (no[0] ?? "").toLowerCase();
	const hint = config.default === false ? `${yesHint}/${theme.style.confirmDefault(noHint)}` : `${theme.style.confirmDefault(yesHint)}/${noHint}`;
	function boolToString(value) {
		return value ? yes : no;
	}
	const { transformer = boolToString } = config;
	function getBooleanValue(value) {
		const v = value.trim().toLowerCase();
		if (v === "") return config.default !== false;
		if (yes.toLowerCase().startsWith(v)) return true;
		if (no.toLowerCase().startsWith(v)) return false;
		if ("yes".startsWith(v)) return true;
		if ("no".startsWith(v)) return false;
	}
	useKeypress((key, rl) => {
		if (status !== "idle") return;
		if (isEnterKey(key)) {
			const answer = getBooleanValue(value);
			if (answer === void 0) {
				rl.write(value);
				setError(theme.keywords.error({
					yes,
					no
				}));
				return;
			}
			setValue(transformer(answer));
			setStatus("done");
			done(answer);
		} else if (isTabKey(key)) {
			const answer = boolToString(!(getBooleanValue(value) ?? config.default !== false));
			rl.clearLine(0);
			rl.write(answer);
			setValue(answer);
		} else {
			setValue(rl.line);
			setError(void 0);
		}
	});
	let formattedValue = value;
	let defaultValue = "";
	if (status === "done") formattedValue = theme.style.answer(value);
	else defaultValue = ` ${theme.style.defaultAnswer(hint)}`;
	const message = theme.style.message(config.message, status);
	let error = "";
	if (errorMsg) error = theme.style.error(errorMsg);
	return [`${prefix} ${message}${defaultValue} ${formattedValue}`, error];
});
// ../../node_modules/@inquirer/input/dist/index.js
var inputTheme = { validationFailureMode: "keep" };
var dist_default$2 = createPrompt((config, done) => {
	const { prefill = "tab" } = config;
	const theme = makeTheme(inputTheme, config.theme);
	const [status, setStatus] = useState("idle");
	const [defaultValue, setDefaultValue] = useState(String(config.default ?? ""));
	const [errorMsg, setError] = useState();
	const [value, setValue] = useState("");
	const prefix = usePrefix({
		status,
		theme
	});
	async function validate(value) {
		const { required, pattern, patternError = "Invalid input" } = config;
		if (required && !value) return "You must provide a value";
		if (pattern && !pattern.test(value)) return patternError;
		if (typeof config.validate === "function") return await config.validate(value) || "You must provide a valid value";
		return true;
	}
	useKeypress(async (key, rl) => {
		if (status !== "idle") return;
		if (isEnterKey(key)) {
			const answer = value || defaultValue;
			setStatus("loading");
			const isValid = await validate(answer);
			if (isValid === true) {
				setValue(answer);
				setStatus("done");
				done(answer);
			} else {
				if (theme.validationFailureMode === "clear") setValue("");
				else rl.write(value);
				setError(isValid);
				setStatus("idle");
			}
		} else if (isBackspaceKey(key) && !value) setDefaultValue("");
		else if (isTabKey(key) && !value) {
			setDefaultValue("");
			rl.clearLine(0);
			rl.write(defaultValue);
			setValue(defaultValue);
		} else {
			setValue(rl.line);
			setError(void 0);
		}
	});
	useEffect((rl) => {
		if (prefill === "editable" && defaultValue) {
			rl.write(defaultValue);
			setValue(defaultValue);
		}
	}, []);
	const message = theme.style.message(config.message, status);
	let formattedValue = value;
	if (typeof config.transformer === "function") formattedValue = config.transformer(value, { isFinal: status === "done" });
	else if (status === "done") formattedValue = theme.style.answer(value);
	let defaultStr;
	if (defaultValue && status !== "done" && !value) defaultStr = theme.style.defaultAnswer(defaultValue);
	let error = "";
	if (errorMsg) error = theme.style.error(errorMsg);
	return [[
		prefix,
		message,
		defaultStr,
		formattedValue
	].filter((v) => v !== void 0).join(" "), error];
});
// ../../node_modules/@inquirer/select/dist/index.js
var selectTheme = {
	icon: { cursor: figures.pointer },
	style: {
		disabled: (text) => styleText("dim", text),
		description: (text) => styleText("cyan", text),
		keysHelpTip: (keys) => keys.map(([key, action]) => `${styleText("bold", key)} ${styleText("dim", action)}`).join(styleText("dim", " • "))
	},
	i18n: { disabledError: "This option is disabled and cannot be selected." },
	indexMode: "hidden"
};
function isSelectable(item) {
	return !Separator.isSeparator(item) && !item.disabled;
}
function isNavigable(item) {
	return !Separator.isSeparator(item);
}
function normalizeChoices(choices) {
	return choices.map((choice) => {
		if (Separator.isSeparator(choice)) return choice;
		if (typeof choice !== "object" || choice === null || !("value" in choice)) {
			const name = String(choice);
			return {
				value: choice,
				name,
				short: name,
				disabled: false
			};
		}
		const name = choice.name ?? String(choice.value);
		const normalizedChoice = {
			value: choice.value,
			name,
			short: choice.short ?? name,
			disabled: choice.disabled ?? false
		};
		if (choice.description) normalizedChoice.description = choice.description;
		return normalizedChoice;
	});
}
var dist_default$3 = createPrompt((config, done) => {
	const { loop = true, pageSize = 7 } = config;
	const theme = makeTheme(selectTheme, config.theme);
	const { keybindings } = theme;
	const [status, setStatus] = useState("idle");
	const prefix = usePrefix({
		status,
		theme
	});
	const searchTimeoutRef = useRef();
	const searchEnabled = !keybindings.includes("vim");
	const items = useMemo(() => normalizeChoices(config.choices), [config.choices]);
	const bounds = useMemo(() => {
		const first = items.findIndex(isNavigable);
		const last = items.findLastIndex(isNavigable);
		if (first === -1) throw new ValidationError("[select prompt] No selectable choices. All choices are disabled.");
		return {
			first,
			last
		};
	}, [items]);
	const defaultItemIndex = useMemo(() => {
		if (!("default" in config)) return -1;
		return items.findIndex((item) => isSelectable(item) && item.value === config.default);
	}, [config.default, items]);
	const [active, setActive] = useState(defaultItemIndex === -1 ? bounds.first : defaultItemIndex);
	const selectedChoice = items[active];
	if (selectedChoice == null || Separator.isSeparator(selectedChoice)) throw new Error("Active index does not point to a choice");
	const [errorMsg, setError] = useState();
	useKeypress((key, rl) => {
		clearTimeout(searchTimeoutRef.current);
		if (errorMsg) setError(void 0);
		if (isEnterKey(key)) {
			if (selectedChoice.disabled) setError(theme.i18n.disabledError);
			else {
				setStatus("done");
				done(selectedChoice.value);
			}
		} else if (isUpKey(key, keybindings) || isDownKey(key, keybindings)) {
			rl.clearLine(0);
			if (loop || isUpKey(key, keybindings) && active !== bounds.first || isDownKey(key, keybindings) && active !== bounds.last) {
				const offset = isUpKey(key, keybindings) ? -1 : 1;
				let next = active;
				do
					next = (next + offset + items.length) % items.length;
				while (!isNavigable(items[next]));
				setActive(next);
			}
		} else if (isNumberKey(key) && !Number.isNaN(Number(rl.line))) {
			const selectedIndex = Number(rl.line) - 1;
			let selectableIndex = -1;
			const position = items.findIndex((item) => {
				if (Separator.isSeparator(item)) return false;
				selectableIndex++;
				return selectableIndex === selectedIndex;
			});
			const item = items[position];
			if (item != null && isSelectable(item)) setActive(position);
			searchTimeoutRef.current = setTimeout(() => {
				rl.clearLine(0);
			}, 700);
		} else if (isBackspaceKey(key)) rl.clearLine(0);
		else if (searchEnabled) {
			const searchTerm = rl.line.toLowerCase();
			const matchIndex = items.findIndex((item) => {
				if (Separator.isSeparator(item) || !isSelectable(item)) return false;
				return item.name.toLowerCase().startsWith(searchTerm);
			});
			if (matchIndex !== -1) setActive(matchIndex);
			searchTimeoutRef.current = setTimeout(() => {
				rl.clearLine(0);
			}, 700);
		}
	});
	useEffect(() => () => {
		clearTimeout(searchTimeoutRef.current);
	}, []);
	const message = theme.style.message(config.message, status);
	const helpLine = theme.style.keysHelpTip([["↑↓", "navigate"], ["⏎", "select"]]);
	let separatorCount = 0;
	const page = usePagination({
		items,
		active,
		renderItem({ item, isActive, index }) {
			if (Separator.isSeparator(item)) {
				separatorCount++;
				return ` ${item.separator}`;
			}
			const cursor = isActive ? theme.icon.cursor : " ";
			const indexLabel = theme.indexMode === "number" ? `${index + 1 - separatorCount}. ` : "";
			if (item.disabled) {
				const disabledLabel = typeof item.disabled === "string" ? item.disabled : "(disabled)";
				const disabledCursor = isActive ? theme.icon.cursor : "-";
				return theme.style.disabled(`${disabledCursor} ${indexLabel}${item.name} ${disabledLabel}`);
			}
			return (isActive ? theme.style.highlight : (x) => x)(`${cursor} ${indexLabel}${item.name}`);
		},
		pageSize,
		loop
	});
	if (status === "done") return [
		prefix,
		message,
		theme.style.answer(selectedChoice.short)
	].filter(Boolean).join(" ");
	const { description } = selectedChoice;
	return `${[
		[prefix, message].filter(Boolean).join(" "),
		page,
		" ",
		description ? theme.style.description(description) : "",
		errorMsg ? theme.style.error(errorMsg) : "",
		helpLine
	].filter(Boolean).join("\n").trimEnd()}${cursorHide}`;
});
export { dist_default as checkbox, dist_default$1 as confirm, dist_default$2 as input, dist_default$3 as select };
