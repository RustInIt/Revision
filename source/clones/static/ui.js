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
let currentTargetUrl = "https://duckduckgo.com";

function isPopupMode() {
	const params = new URLSearchParams(location.search);
	return params.get("popup") === "1";
}

function getPopupTarget() {
	const params = new URLSearchParams(location.search);
	return params.get("url") || currentTargetUrl;
}

function buildPopupUrl(targetUrl) {
	const popupUrl = new URL(location.href);
	popupUrl.searchParams.set("popup", "1");
	popupUrl.searchParams.set("url", targetUrl);
	return popupUrl.toString();
}

function resolveInputToUrl(input) {
	const trimmed = String(input || "").trim();
	if (!trimmed) return "https://duckduckgo.com";
	if (/\s/.test(trimmed)) {
		return `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`;
	}

	if (/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(trimmed)) {
		return trimmed;
	}

	const candidate = `https://${trimmed}`;
	try {
		const parsed = new URL(candidate);
		const hostname = parsed.hostname;
		const isIPv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
		const isLocalhost = hostname === "localhost";
		const hasDomainDot = hostname.includes(".");

		if (isIPv4 || isLocalhost || hasDomainDot) {
			return candidate;
		}
	} catch {
		// Fall through to search query.
	}

	return `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`;
}

function navigateTo(inputOrUrl) {
	currentTargetUrl = resolveInputToUrl(inputOrUrl);
	frame.go(currentTargetUrl);
}

function bindEnterToNavigate(inputElement, onSubmit) {
	if (!inputElement) {
		return;
	}

	inputElement.addEventListener("keydown", (event) => {
		if (
			event.key === "Enter" ||
			event.key === "NumpadEnter" ||
			event.code === "Enter" ||
			event.code === "NumpadEnter" ||
			event.keyCode === 13
		) {
			event.preventDefault();
			onSubmit();
		}
	});
}

function startHomepageSearch(inputElement, bodyElement) {
	if (!inputElement || !bodyElement || !frame) {
		throw new Error("Homepage search prerequisites are missing.");
	}

	const nextTarget = resolveInputToUrl(inputElement.value);
	showWebContent(bodyElement, frame);
	requestAnimationFrame(() => {
		navigateTo(nextTarget);
	});
}

function bindClickToNavigate(element, onSubmit) {
	if (!element) {
		return;
	}

	element.addEventListener("click", (event) => {
		event.preventDefault();
		onSubmit();
	});
}

function bindSubmitToNavigate(formElement, onSubmit) {
	if (!formElement) {
		return;
	}

	formElement.addEventListener("submit", (event) => {
		event.preventDefault();
		onSubmit();
	});
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
		body.style.margin = "0";
		body.style.height = "100vh";
		body.style.display = "block";
		body.style.overflow = "hidden";
		const frameElement = frame.element || frame.frame;
		if (!frameElement) {
			throw new Error("ScramJet frame element was not created.");
		}
		frameElement.style.display = "block";
		frameElement.style.width = "100vw";
		frameElement.style.height = "calc(100vh - 40px)";
		frameElement.style.margin = "0";
		frameElement.style.border = "none";
		body.appendChild(frameElement);
	body.id = "app";

	const footer = document.createElement("footer");
    footer.innerHTML = `
		<button id="popout" class="popout-btn" type="button" aria-label="Open current page in new window" title="Open in new window">
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M14 3h7v7"></path>
				<path d="M10 14 21 3"></path>
				<path d="M21 14v7h-7"></path>
				<path d="M3 10V3h7"></path>
				<path d="m3 3 7 7"></path>
			</svg>
		</button>
		<div class="search-shell">
			<input id="search-bar" class="no-cursor search-bar" autocomplete="off" autocapitalize="off" placeholder="Search DuckDuckGo or enter URL ..." />
		</div>
    `;

	body.appendChild(footer);
	const search = document.getElementById("search-bar"); // 100% efficient, I promise..
	const popout = document.getElementById("popout");
	search.value = currentTargetUrl;
	bindEnterToNavigate(search, () => navigateTo(search.value));

	if (popout) {
		popout.addEventListener("click", function() {
			const child = window.open(buildPopupUrl(currentTargetUrl), "_blank", "noopener,noreferrer");
			if (child) {
				child.opener = null;
			}
		});
	}
		mountedFrame = true;
	}
}

document.addEventListener("DOMContentLoaded", async function() {
	let URL = "";
	const searchForm = document.getElementById("primary-search-form");
	const search = document.getElementById("search");
	const searchAction = document.getElementById("primary-search-action");
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

	if (isPopupMode()) {
		body.innerHTML = "";
		body.style.margin = "0";
		body.style.height = "100vh";
		body.style.display = "block";
		body.style.overflow = "hidden";

		const frameElement = frame.element || frame.frame;
		if (!frameElement) {
			throw new Error("ScramJet frame element was not created.");
		}

		frameElement.style.width = "100vw";
		frameElement.style.height = "100vh";
		frameElement.style.border = "none";
		frameElement.style.margin = "0";
		frameElement.style.display = "block";

		body.appendChild(frameElement);
		navigateTo(getPopupTarget());
		return;
	}

	if (!search || !body) {
		console.error("Homepage search input or app container is missing.");
		return;
	}

	search.value = URL;
	search.focus();
	const runHomepageSearch = () => {
		try {
			URL = resolveInputToUrl(search.value);
			startHomepageSearch(search, body);
		} catch (error) {
			console.error("Failed to start web content from homepage search:", error);
		}
	};

	bindSubmitToNavigate(searchForm, runHomepageSearch);
	bindClickToNavigate(searchAction, runHomepageSearch);
});
