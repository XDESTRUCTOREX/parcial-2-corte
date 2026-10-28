const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const PORT = process.env.PORT || 3000;
const HEALTH_URL = `http://localhost:${PORT}/health`;

const waitForServer = (retries = 30, interval = 1000) => {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      http
        .get(HEALTH_URL, (res) => {
          if (res.statusCode === 200) {
            return resolve();
          }
          if (attempts >= retries) return reject(new Error("Timeout esperando al servidor"));
          setTimeout(check, interval);
        })
        .on("error", () => {
          if (attempts >= retries) return reject(new Error("Timeout esperando al servidor"));
          setTimeout(check, interval);
        });
    };
    check();
  });
};

(async () => {
  console.log("Iniciando servidor para Newman...");
  const serverProcess = spawn(
    process.execPath,
    [path.join(__dirname, "test-server.js")],
    {
      stdio: "inherit",
      env: { ...process.env, PORT: String(PORT), NODE_ENV: "test" },
    }
  );

  try {
    await waitForServer();
    console.log("Servidor disponible. Ejecutando colección Postman mediante Newman...");

    const newman = spawn(
      "newman",
      [
        "run",
        "postman/DES-11-API-Tests.postman_collection.json",
        "-e",
        "postman/DES-11-Environment.json",
        "--reporters",
        "cli,json",
        "--reporter-json-export",
        "postman/newman-report.json",
      ],
      { stdio: "inherit", shell: true }
    );

    newman.on("close", (code) => {
      console.log(`Newman finalizó con código ${code}`);
      serverProcess.kill("SIGTERM");
      process.exit(code);
    });
  } catch (err) {
    console.error("Error ejecutando pruebas Newman:", err);
    serverProcess.kill("SIGTERM");
    process.exit(1);
  }
})();
