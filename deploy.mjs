import { Client } from "ssh2";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const HOST = "access-5019149174.webspace-host.com";
const PORT = 22;
const USERNAME = "a1365921";
const CREDENTIALS_FILE = join(__dirname, ".ionos-ftp-password");
function loadPassword() {
  if (process.env.IONOS_FTP_PASSWORD) return process.env.IONOS_FTP_PASSWORD;
  try {
    return readFileSync(CREDENTIALS_FILE, "utf8").trim();
  } catch {
    return null;
  }
}
const PASSWORD = loadPassword();
const REMOTE_DIR = ".";

if (!PASSWORD) {
  console.error(`Set IONOS_FTP_PASSWORD env var, or put the password in ${CREDENTIALS_FILE}`);
  process.exit(1);
}

const mode = process.argv[2] ?? "list";

const conn = new Client();

conn.on("ready", () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;

    if (mode === "list") {
      sftp.readdir(REMOTE_DIR, (err, list) => {
        if (err) throw err;
        console.log(`Contents of ${REMOTE_DIR}:`);
        for (const item of list) {
          console.log(`  ${item.filename} (${item.attrs.size} bytes)`);
        }
        conn.end();
      });
    } else if (mode === "upload") {
      const file = process.argv[3] ?? "index.html";
      const localPath = join(__dirname, file);
      const remotePath = `${REMOTE_DIR}/${file}`;
      const data = readFileSync(localPath);
      sftp.writeFile(remotePath, data, (err) => {
        if (err) throw err;
        console.log(`Uploaded ${localPath} -> ${remotePath} (${data.length} bytes)`);
        conn.end();
      });
    } else if (mode === "download") {
      const file = process.argv[3] ?? "index.html";
      const localPath = join(__dirname, file);
      const remotePath = `${REMOTE_DIR}/${file}`;
      sftp.readFile(remotePath, (err, data) => {
        if (err) throw err;
        writeFileSync(localPath, data);
        console.log(`Downloaded ${remotePath} -> ${localPath} (${data.length} bytes)`);
        conn.end();
      });
    } else {
      console.error("Unknown mode:", mode);
      conn.end();
    }
  });
});

conn.on("error", (err) => {
  console.error("Connection error:", err.message);
  process.exit(1);
});

conn.connect({
  host: HOST,
  port: PORT,
  username: USERNAME,
  password: PASSWORD,
});
