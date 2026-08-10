import { app as o, BrowserWindow as l, session as _, desktopCapturer as h, ipcMain as w, shell as v } from "electron";
import { fileURLToPath as E } from "node:url";
import n from "node:path";
const m = n.dirname(E(import.meta.url));
process.env.APP_ROOT = n.join(m, "..");
const i = process.env.VITE_DEV_SERVER_URL, S = n.join(process.env.APP_ROOT, "dist-electron"), f = n.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = i ? n.join(process.env.APP_ROOT, "public") : f;
let e;
function u() {
  e = new l({
    icon: n.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: n.join(m, "preload.mjs")
    }
  }), e.webContents.on("did-finish-load", () => {
    e == null || e.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), i ? e.loadURL(i) : e.loadFile(n.join(f, "index.html"));
}
o.on("window-all-closed", () => {
  process.platform !== "darwin" && (o.quit(), e = null);
});
o.on("activate", () => {
  l.getAllWindows().length === 0 && u();
});
o.on("before-quit", () => {
});
o.whenReady().then(() => {
  u(), _.defaultSession.setDisplayMediaRequestHandler((r, a) => {
    const p = () => {
      try {
        a({});
      } catch {
      }
    };
    h.getSources({ types: ["screen", "window"], thumbnailSize: { width: 300, height: 200 } }).then((t) => {
      r.frame.send(
        "desktop-capturer-sources",
        t.map((s) => ({
          id: s.id,
          name: s.name,
          thumbnailDataUrl: s.thumbnail.toDataURL()
        }))
      ), w.once("desktop-capturer-source-selected", (s, c) => {
        const d = c ? t.find((R) => R.id === c) : void 0;
        d ? a({ video: d }) : p();
      });
    }).catch((t) => {
      console.error("Failed to list desktop capturer sources:", t), process.platform === "darwin" && v.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"), r.frame.send("desktop-capturer-permission-denied"), p();
    });
  });
});
export {
  S as MAIN_DIST,
  f as RENDERER_DIST,
  i as VITE_DEV_SERVER_URL
};
