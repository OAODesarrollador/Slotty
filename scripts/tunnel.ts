import { spawn, execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";

async function updateEnvLocal(newAppUrl: string) {
  const envPath = path.join(process.cwd(), ".env.local");
  try {
    let content = await fs.readFile(envPath, "utf8");
    const appUrlRegex = /^APP_URL=.*$/m;
    
    if (appUrlRegex.test(content)) {
      content = content.replace(appUrlRegex, `APP_URL=${newAppUrl}`);
    } else {
      content += `\nAPP_URL=${newAppUrl}`;
    }
    
    await fs.writeFile(envPath, content, "utf8");
    console.log(`\n✅ .env.local actualizado con APP_URL=${newAppUrl}`);
  } catch (error) {
    console.error("\n❌ Error actualizando .env.local:", error);
  }
}

async function main() {
  console.log("🚀 Iniciando ngrok para el puerto 3000...");

  try {
    // Check if ngrok is installed
    execSync("ngrok --version", { stdio: "ignore" });
  } catch {
    console.error("❌ ngrok no esta instalado globalmente. Por favor instalalo desde https://ngrok.com/");
    process.exit(1);
  }

  // Start ngrok in the background
  const ngrok = spawn("ngrok", ["http", "3000", "--log=stdout"]);
  
  const rl = readline.createInterface({
    input: ngrok.stdout,
    terminal: false
  });

  let urlFound = false;

  rl.on("line", async (line) => {
    // Show ngrok logs until we find the URL
    if (!urlFound) {
      console.log(`[ngrok] ${line}`);
    }

    const match = line.match(/url=(https:\/\/[a-z0-9-.]+\.ngrok-free\.app)/);
    
    if (match && !urlFound) {
      const ngrokUrl = match[1];
      urlFound = true;
      console.log(`\n🔗 ngrok URL capturada: ${ngrokUrl}`);
      await updateEnvLocal(ngrokUrl);
      console.log("\n💡 .env.local actualizado. Puedes cerrar este proceso con Ctrl+C una vez que termines de testear.");
    }
  });

  ngrok.stderr.on("data", (data) => {
    console.error(`ngrok error: ${data}`);
  });

  ngrok.on("close", (code) => {
    console.log(`\n❌ ngrok finalizo con codigo ${code}`);
    process.exit(code || 0);
  });

  // Handle process termination
  process.on("SIGINT", () => {
    ngrok.kill();
    process.exit();
  });
}

main().catch(console.error);
