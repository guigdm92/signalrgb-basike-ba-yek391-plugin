/*
 * SignalRGB plugin - Basike Ba-YEK391 (ABNT2, Sinowealth)
 *   Cabo:    258A:019D
 *   Sem fio: 258A:0150 (receptor 2.4 GHz)
 *
 * Autor: guigdm92 - feito com a ajuda do Claude AI (Anthropic).
 * https://github.com/guigdm92/signalrgb-basike-ba-yek391-plugin
 *
 * Protocolo (descoberto por captura USB do software OemDrv da Basike):
 *
 * Cabo - feature report 0x09 (520 bytes) na interface 1, usage page 0xFF02.
 *   Cabecalho: 09 CMD 00 00 01 00 LEN_LO LEN_HI
 *   CMD 0x08 = quadro em tempo real (modo musica), 0x017A = 378 bytes:
 *     126 LEDs x RGB intercalado.
 *
 * Sem fio - output report 0x13 (20 bytes) na interface 1, usage page 0xFF02.
 *   13 CMD TOTAL SEQ LEN [14 bytes] CHECKSUM
 *   CMD 0x88 = quadro em tempo real. LEN = 0x10 + bytes usados no pacote.
 *   CHECKSUM = soma dos 19 bytes anteriores.
 *   Os dados sao grupos por cor: R G B N idx1 ... idxN.
 *
 * Nos dois casos, quando os quadros param o teclado volta sozinho para o
 * efeito salvo nele. Indices dos LEDs vem de Dev\kb\KB.ini do software oficial.
 */

export function Name() { return "Basike Ba-YEK391"; }
export function VendorId() { return 0x258A; }
export function ProductId() { return [WIRED_PID, WIRELESS_PID]; }
export function Publisher() { return "guigdm92"; }
export function Documentation() { return REPOSITORY_URL; }
export function Size() { return [64, 22]; }
export function DefaultPosition() { return [10, 100]; }
export function DefaultScale() { return 2.5; }
export function DeviceType() { return "keyboard"; }

/* global
LightingMode:readonly
forcedColor:readonly
wirelessQuality:readonly
*/
export function ControllableParameters() {
	return [
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Canvas usa o efeito ativo do SignalRGB. Forced aplica uma cor fixa.", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "Cor usada no modo Forced", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"wirelessQuality", "group":"lighting", "label":"Qualidade sem fio", description: "So vale pelo receptor. Cores mais precisas deixam a animacao mais lenta.", "type":"combobox", "values":["Precisa", "Equilibrada", "Rapida"], "default":"Equilibrada"},
	];
}

export function ConflictingProcesses() {
	return ["OemDrv.exe"];
}

const WIRED_PID = 0x019D;
const WIRELESS_PID = 0x0150;

const LED_COUNT = 126;
const PACKET_LENGTH = 520;
const STREAM_HEADER = [0x09, 0x08, 0x00, 0x00, 0x01, 0x00, 0x7A, 0x01];

const WIRELESS_PACKET_LENGTH = 20;
const WIRELESS_CHUNK = 14;
const WIRELESS_KEEPALIVE_MS = 1000;
const QUANTIZE_STEP = { "Precisa": 8, "Equilibrada": 24, "Rapida": 48 };

const vKeys = [
	0,      12, 18, 24, 30,  36, 42, 48, 54,      60, 66, 72, 78,  84,
	1,  7, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79,         85,  91, 97, 103, 109,
	2,  8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 81,         86,  92, 98, 104,
	3,  9, 15, 21, 27, 33, 39, 45, 51, 57, 63, 69, 75,             87,  93, 99, 105, 110,
	4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64, 70, 76,       82,        94, 100, 106,
	5, 11, 17,         35,         53, 59, 65,          77, 83, 89,     95, 107, 112,
];

const vKeyNames = [
	"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Delete",
	"' \"", "1 !", "2 @", "3 #", "4 $", "5 %", "6 ¨", "7 &", "8 *", "9 (", "0 )", "- _", "= +", "Backspace", "Insert", "NumLock", "Num /", "Num *", "Num -",
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "´ `", "[ {", "Enter", "Page Up", "Num 7", "Num 8", "Num 9",
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", "Ç", "~ ^", "] }", "Page Down", "Num 4", "Num 5", "Num 6", "Num +",
	"Left Shift", "\\ |", "Z", "X", "C", "V", "B", "N", "M", ", <", ". >", "; :", "Right Shift", "Up Arrow", "Num 1", "Num 2", "Num 3",
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "/ ?", "Left Arrow", "Down Arrow", "Right Arrow", "Num 0", "Num .", "Num Enter",
];

// Posicoes = centro de cada tecla no KB.ini, na mesma escala da imagem
// Basike-Ba-YEK391.png (707x245 -> grade 64x22), para os LEDs baterem com a imagem.
const vKeyPositions = [
	[2, 3], [9, 3], [11, 3], [14, 3], [17, 3], [22, 3], [25, 3], [28, 3], [31, 3], [35, 3], [38, 3], [41, 3], [44, 3], [48, 3],
	[3, 6], [5, 6], [9, 6], [11, 6], [14, 6], [17, 6], [20, 6], [23, 6], [26, 6], [29, 6], [32, 6], [35, 6], [38, 6], [43, 6], [48, 6], [51, 6], [54, 6], [57, 6], [60, 6],
	[3, 9], [7, 9], [10, 9], [13, 9], [16, 9], [19, 9], [22, 9], [25, 9], [28, 9], [31, 9], [34, 9], [37, 9], [40, 9], [42, 9], [48, 9], [51, 9], [54, 9], [57, 9],
	[4, 12], [8, 12], [11, 12], [14, 12], [17, 12], [20, 12], [23, 12], [26, 12], [29, 12], [32, 12], [34, 12], [37, 12], [40, 12], [48, 12], [51, 12], [54, 12], [57, 12], [60, 11],
	[3, 15], [6, 15], [9, 15], [12, 15], [15, 15], [18, 15], [21, 15], [24, 15], [27, 15], [30, 15], [33, 15], [36, 15], [40, 15], [45, 16], [51, 15], [54, 15], [57, 15],
	[3, 18], [7, 18], [10, 18], [21, 18], [32, 18], [35, 18], [38, 18], [42, 19], [45, 19], [48, 19], [53, 18], [57, 18], [60, 17],
];

export function LedNames() {
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
}

let isWireless = false;
let lastWirelessPayload = "";
let lastWirelessSend = 0;

export function Initialize() {
	isWireless = device.productId() === WIRELESS_PID;
	device.setName(isWireless ? "Basike Ba-YEK391 (sem fio)" : "Basike Ba-YEK391");
	device.setImageFromUrl(DEVICE_IMAGE);
}

export function Render() {
	sendColors();
}

export function Shutdown(SystemSuspending) {
	if (SystemSuspending) {
		sendColors("#000000");
	}
	// Sem quadros novos o teclado volta sozinho para o efeito salvo nele.
}

function getKeyColors(overrideColor) {
	const colors = [];

	for (let idx = 0; idx < vKeys.length; idx++) {
		if (overrideColor) {
			colors.push(hexToRgb(overrideColor));
		} else if (LightingMode === "Forced") {
			colors.push(hexToRgb(forcedColor));
		} else {
			colors.push(device.color(vKeyPositions[idx][0], vKeyPositions[idx][1]));
		}
	}

	return colors;
}

function sendColors(overrideColor) {
	const colors = getKeyColors(overrideColor);

	if (isWireless) {
		sendWirelessColors(colors, overrideColor !== undefined);
	} else {
		sendWiredColors(colors);
	}
}

function sendWiredColors(colors) {
	const rgbData = new Array(LED_COUNT * 3).fill(0);

	for (let idx = 0; idx < vKeys.length; idx++) {
		const offset = vKeys[idx] * 3;
		rgbData[offset]     = colors[idx][0];
		rgbData[offset + 1] = colors[idx][1];
		rgbData[offset + 2] = colors[idx][2];
	}

	device.send_report(STREAM_HEADER.concat(rgbData), PACKET_LENGTH);
	device.pause(1);
}

function sendWirelessColors(colors, force) {
	// Cada pacote pelo receptor leva ~6 ms, entao as cores sao arredondadas e
	// agrupadas: teclas com a mesma cor vao num unico grupo R G B N idx...
	const step = QUANTIZE_STEP[wirelessQuality] || QUANTIZE_STEP["Equilibrada"];
	const groups = new Map();

	for (let idx = 0; idx < vKeys.length; idx++) {
		const r = quantize(colors[idx][0], step);
		const g = quantize(colors[idx][1], step);
		const b = quantize(colors[idx][2], step);
		const key = (r << 16) | (g << 8) | b;

		if (!groups.has(key)) {
			groups.set(key, []);
		}

		groups.get(key).push(vKeys[idx]);
	}

	const payload = [];

	groups.forEach((leds, key) => {
		payload.push((key >> 16) & 0xFF, (key >> 8) & 0xFF, key & 0xFF, leds.length, ...leds);
	});

	// Quadro repetido so e reenviado de tempos em tempos, para o teclado nao
	// voltar ao efeito proprio.
	const payloadKey = payload.join(",");
	const now = Date.now();

	if (!force && payloadKey === lastWirelessPayload && now - lastWirelessSend < WIRELESS_KEEPALIVE_MS) {
		return;
	}

	lastWirelessPayload = payloadKey;
	lastWirelessSend = now;

	const total = Math.ceil(payload.length / WIRELESS_CHUNK);

	for (let seq = 0; seq < total; seq++) {
		const part = payload.slice(seq * WIRELESS_CHUNK, (seq + 1) * WIRELESS_CHUNK);
		const packet = new Array(WIRELESS_PACKET_LENGTH).fill(0);

		packet[0] = 0x13;
		packet[1] = 0x88;
		packet[2] = total;
		packet[3] = seq;
		packet[4] = 0x10 + part.length;

		for (let i = 0; i < part.length; i++) {
			packet[5 + i] = part[i];
		}

		let sum = 0;

		for (let i = 0; i < WIRELESS_PACKET_LENGTH - 1; i++) {
			sum += packet[i];
		}

		packet[WIRELESS_PACKET_LENGTH - 1] = sum & 0xFF;

		device.write(packet, WIRELESS_PACKET_LENGTH);
	}
}

function quantize(value, step) {
	return Math.min(255, Math.round(value / step) * step);
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

	if (!result) {
		return [0, 0, 0];
	}

	return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

export function Validate(endpoint) {
	return endpoint.interface === 1 && endpoint.usage === 0x0002 && endpoint.usage_page === 0xff02;
}

const REPOSITORY_URL = "https://github.com/guigdm92/signalrgb-basike-ba-yek391-plugin";
const DEVICE_IMAGE = "https://raw.githubusercontent.com/guigdm92/signalrgb-basike-ba-yek391-plugin/main/Basike-Ba-YEK391.png";

export function ImageUrl() {
	return DEVICE_IMAGE;
}
