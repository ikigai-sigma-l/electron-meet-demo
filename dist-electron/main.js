import { session as h, desktopCapturer as _, ipcMain as w, shell as v, app as t, BrowserWindow as l } from "electron";
import { fileURLToPath as E } from "node:url";
import n from "node:path";
function P() {
  h.defaultSession.setDisplayMediaRequestHandler((r, p) => {
    const i = () => {
      try {
        p({});
      } catch {
      }
    };
    _.getSources({ types: ["screen", "window"], thumbnailSize: { width: 300, height: 200 } }).then((s) => {
      if (!r.frame) {
        i();
        return;
      }
      r.frame.send(
        "desktop-capturer-sources",
        s.map((o) => ({
          id: o.id,
          name: o.name,
          thumbnailDataUrl: o.thumbnail.toDataURL()
        }))
      ), w.once("desktop-capturer-source-selected", (o, c) => {
        const d = c ? s.find((R) => R.id === c) : void 0;
        d ? p({ video: d }) : i();
      });
    }).catch((s) => {
      var o;
      console.error("Failed to list desktop capturer sources:", s), process.platform === "darwin" && v.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"), (o = r.frame) == null || o.send("desktop-capturer-permission-denied"), i();
    });
  });
}
const m = n.dirname(E(import.meta.url));
process.env.APP_ROOT = n.join(m, "..");
const a = process.env.VITE_DEV_SERVER_URL, j = n.join(process.env.APP_ROOT, "dist-electron"), f = n.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = a ? n.join(process.env.APP_ROOT, "public") : f;
let e;
function u() {
  e = new l({
    icon: n.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: n.join(m, "preload.mjs")
    }
  }), e.webContents.on("did-finish-load", () => {
    e == null || e.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), a ? e.loadURL(a) : e.loadFile(n.join(f, "index.html"));
}
t.on("window-all-closed", () => {
  process.platform !== "darwin" && (t.quit(), e = null);
});
t.on("activate", () => {
  l.getAllWindows().length === 0 && u();
});
t.on("before-quit", () => {
});
t.whenReady().then(() => {
  u(), P();
});
export {
  j as MAIN_DIST,
  f as RENDERER_DIST,
  a as VITE_DEV_SERVER_URL
};
