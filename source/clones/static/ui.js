/**
 *  
 *  Rewritten version of ScramJet's original UI file, for my search bar :3
 *  
 *  This version includes my UI, since I didn't really like
 *   ScramJet's..
 * 
 *  Hopefully this looks nicer! :3
 *  
 *  ** NOT DESIGNED FOR MOBILE (Or really small screens :3) **
 *  ** Maybe I'll add proper scaling in the future!         **
 * 
 */

const { Controller, config } = $scramjetController;

config.injectPath = "/controller/controller.inject.js";

let controller;
let frame;
let mountedFrame = false;

function resolveInputToUrl(input) {
	const trimmed = String(input || "").trim();
	if (!trimmed) return "https://duckduckgo.com";

	if (/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(trimmed)) {
		return trimmed;
	}

	const looksLikeHost =
		/^(localhost|\d{1,3}(?:\.\d{1,3}){3})(:\d+)?(\/.*)?$/i.test(trimmed) ||
		(/^[^\s]+\.[^\s]+/.test(trimmed) && !trimmed.includes(" "));

	if (looksLikeHost) {
		return `https://${trimmed}`;
	}

	return `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`;
}

function getWispUrl() {
	const protocol = location.protocol === "https:" ? "wss" : "ws";
	return globalThis?._CONFIG?.wispurl || `${protocol}://${location.host}/wisp/`;
}

async function waitForControllerOrReady(registration, timeoutMs = 10000) {
	if (navigator.serviceWorker.controller) return;

	const ready = navigator.serviceWorker.ready.then(() => {});
	const controllerChanged = new Promise((resolve) => {
		const onChange = () => {
			navigator.serviceWorker.removeEventListener("controllerchange", onChange);
			resolve();
		};
		navigator.serviceWorker.addEventListener("controllerchange", onChange, { once: true });
	});
	const timeout = new Promise((resolve) => setTimeout(resolve, timeoutMs));

	await Promise.race([ready, controllerChanged, timeout]);

	if (!navigator.serviceWorker.controller && registration.active) {
		await new Promise((resolve) => {
			navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
		});
	}
}

async function initController() {
	const registration = await navigator.serviceWorker.register("/sw.js");
	await waitForControllerOrReady(registration);

	const serviceworker = navigator.serviceWorker.controller ?? registration.active;
	if (!serviceworker) {
		throw new Error("No service worker available for controller initialization.");
	}

	const LibcurlClient = globalThis?.LibcurlTransport?.LibcurlClient;
	if (!LibcurlClient) {
		throw new Error("Libcurl transport is unavailable.");
	}

	controller = new Controller({
		serviceworker,
		transport: new LibcurlClient({
			wisp: getWispUrl(),
		}),
	});

	await controller.wait();
	frame = controller.createFrame();
}

function showWebContent(body, frame) {
    if (!mountedFrame) {
		body.innerHTML = "";
		const frameElement = frame.element || frame.frame;
		if (!frameElement) {
			throw new Error("ScramJet frame element was not created.");
		}
		body.appendChild(frameElement);
	body.id = "app";

	const footer = document.createElement("footer");
    footer.innerHTML = `
		<input id="search-bar" class="no-cursor search-bar" autocomplete="off" autocapitalize="off" placeholder="Search DuckDuckGo or enter URL ..." />
    `;

	body.appendChild(footer);
	const search = document.getElementById("search-bar"); // 100% efficient, I promise..
    search.addEventListener("keydown", function(event) {
		if (event.key == "Enter") {
			frame.go(resolveInputToUrl(search.value));
		}
	});
		mountedFrame = true;
	}
}

document.addEventListener("DOMContentLoaded", async function() {
	let URL = "";
	const search = document.getElementById("search");
	const body = document.getElementById("app");

	try {
		await initController();
	} catch (error) {
		console.error("Failed to initialize ScramJet controller:", error);
		if (search) {
			search.placeholder = "Initialization failed, check console logs.";
		}
		return;
	}

	search.value = URL;
	search.addEventListener("keydown", function(event) {
		if (event.key == "Enter") {
			URL = resolveInputToUrl(search.value);
			showWebContent(body, frame);
			frame.go(URL);
		}
	});
});
