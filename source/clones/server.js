import { createBareServer } from "./node_modules/.pnpm/node_modules/@nebula-services/bare-server-node/dist/createServer.js";
import { createServer } from "http";
import { createServer as createNetServer } from "net";
import Fastify from "./node_modules/.pnpm/node_modules/fastify/fastify.js";
import fastifyStatic from "./node_modules/.pnpm/node_modules/@fastify/static/index.js";
import { join } from "node:path";
import rspackConfig from "./rspack.config.ts";
import { rspack } from "@rspack/core";
import { fileURLToPath } from "node:url";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";
import { chmodSync, writeFileSync } from "fs";
import { PORTManager } from "../source/manager.js";

const bare = createBareServer("/bare/", {
    logErrors: true,
    blockLocal: false,
});

wisp.options.allow_loopback_ips = true;
wisp.options.allow_private_ips = true;

const fastify = Fastify({
    serverFactory: (handler) => {
        return createServer()
            .on("request", (req, res) => {
                res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
                res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");

                if (bare.shouldRoute(req)) {
                    bare.routeRequest(req, res);
                } else {
                    handler(req, res);
                }
            })
            .on("upgrade", (req, socket, head) => {
                if (bare.shouldRoute(req)) {
                    bare.routeUpgrade(req, socket, head);
                } else {
                    wisp.routeRequest(req, socket, head);
                }
            });
    },
});

const libcurlDistPath = join(
    fileURLToPath(new URL(".", import.meta.url)),
    "./node_modules/.pnpm/node_modules/@mercuryworkshop/libcurl-transport/dist"
);

fastify.register(fastifyStatic, {
    root: join(fileURLToPath(new URL(".", import.meta.url)), "./static"),
    decorateReply: false,
});

fastify.register(fastifyStatic, {
    root: join(fileURLToPath(new URL(".", import.meta.url)), "./packages/core/dist"),
    prefix: "/scramjet/",
    decorateReply: false,
});

fastify.register(fastifyStatic, {
    root: join(fileURLToPath(new URL(".", import.meta.url)), "./packages/core/dist"),
    prefix: "/scram/",
    decorateReply: false,
});

fastify.register(fastifyStatic, {
    root: join(fileURLToPath(new URL(".", import.meta.url)), "./packages/controller/dist"),
    prefix: "/controller/",
    decorateReply: false,
});

fastify.register(fastifyStatic, {
    root: join(fileURLToPath(new URL(".", import.meta.url)), "./assets"),
    prefix: "/assets/",
    decorateReply: false,
});

fastify.register(fastifyStatic, {
    root: libcurlDistPath,
    prefix: "/libcurl/",
    decorateReply: false,
});

const isCodespaces = process.env.CODESPACES === "true";
const manager = new PORTManager();
let rawPort = manager.pickPORT();
let PORT = rawPort && rawPort !== -1 ? Number(rawPort) : 8080;

function mapCodespacesPort(port) {
    if (!isCodespaces) {
        return port;
    }

    const candidate = Number(port);
    return Number.isInteger(candidate) && candidate > 0
        ? 3000 + (candidate % 1000)
        : 3000;
}

function isPortAvailable(port, host = "0.0.0.0") {
    return new Promise((resolve) => {
        const probe = createNetServer();

        probe.once("error", (error) => {
            if (error?.code === "EADDRINUSE") {
                resolve(false);
                return;
            }
            resolve(false);
        });

        probe.once("listening", () => {
            probe.close(() => resolve(true));
        });

        probe.listen(port, host);
    });
}

async function selectAvailablePort(initialPort, initialRawPort) {
    const MAX_ATTEMPTS = 25;
    const tried = new Set();
    let selectedPort = initialPort;
    let selectedRawPort = initialRawPort;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        if (!tried.has(selectedPort) && await isPortAvailable(selectedPort)) {
            return { port: selectedPort, rawPort: selectedRawPort };
        }

        const busyPort = selectedPort;
        tried.add(selectedPort);
        const nextRawPort = manager.newPORT();
        selectedRawPort = nextRawPort;
        selectedPort = mapCodespacesPort(nextRawPort);
        console.log(`[PORT] ${busyPort} is busy, retrying with ${selectedPort} (attempt ${attempt}/${MAX_ATTEMPTS})`);
    }

    throw new Error(`Failed to find an available port after ${MAX_ATTEMPTS} attempts.`);
}

if (isCodespaces) {
    const envPort = Number(process.env.PORT);
    if (Number.isInteger(envPort) && envPort > 0) {
        PORT = envPort;
    } else {
        PORT = mapCodespacesPort(rawPort);
    }
}

(async () => {
    try {
        const selected = await selectAvailablePort(PORT, rawPort);
        PORT = selected.port;
        rawPort = selected.rawPort;

        await fastify.listen({
            port: PORT,
            host: "0.0.0.0",
        });

        console.log(`\n[SUCCESS] Server listening on 0.0.0.0:${PORT}`);

        if (isCodespaces && process.env.CODESPACE_NAME) {
            console.log(`[CODESPACES] Auto-forward expected on port ${PORT}`);
            console.log(`[LINK] https://${process.env.CODESPACE_NAME}-${PORT}.app.github.dev`);
        }
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();

fastify.setNotFoundHandler((request, reply) => {
    console.error("PAGE PUNCHED THROUGH SW - " + request.url);
    reply.code(593).statusMessage("INVALID").send("punch through");
});

if (!process.env.CI) {
    try {
        writeFileSync(
            ".git/hooks/pre-commit",
            "pnpm prettier . -w\ngit update-index --again"
        );
        chmodSync(".git/hooks/pre-commit", 0o755);
    } catch {}
    const compiler = rspack(rspackConfig);
    compiler.watch({}, (err, stats) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(
            stats.toString({
                preset: "minimal",
                colors: true,
                version: false,
            })
        );
    });
}