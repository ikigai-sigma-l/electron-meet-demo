import { session as R, desktopCapturer as h, ipcMain as w, shell as v, app as s, BrowserWindow as d } from "electron";
import { fileURLToPath as E } from "node:url";
import n from "node:path";
function P() {
  R.defaultSession.setDisplayMediaRequestHandler((r, a) => {
    const t = () => {
      try {
        a({});
      } catch {
      }
    };
    h.getSources({ types: ["screen", "window"], thumbnailSize: { width: 300, height: 200 } }).then((i) => {
      if (!r.frame) {
        t();
        return;
      }
      r.frame.send(
        "desktop-capturer-sources",
        i.map((o) => ({
          id: o.id,
          name: o.name,
          thumbnailDataUrl: o.thumbnail.toDataURL()
        }))
      ), w.once("desktop-capturer-source-selected", (o, p) => {
        const l = p ? i.find((_) => _.id === p) : void 0;
        l ? a({ video: l }) : t();
      });
    }).catch((i) => {
      var o;
      console.error("Failed to list desktop capturer sources:", i), process.platform === "darwin" && v.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"), (o = r.frame) == null || o.send("desktop-capturer-permission-denied"), t();
    });
  });
}
const m = n.dirname(E(import.meta.url));
process.env.APP_ROOT = n.join(m, "..");
const c = process.env.VITE_DEV_SERVER_URL, D = n.join(process.env.APP_ROOT, "dist-electron"), f = n.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = c ? n.join(process.env.APP_ROOT, "public") : f;
let e;
function u() {
  e = new d({
    icon: n.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: n.join(m, "preload.mjs")
    }
  }), e.webContents.on("did-finish-load", () => {
    e == null || e.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), e.webContents.on("console-message", (r, a, t) => {
    console.log("[renderer]", t);
  }), c ? e.loadURL(c) : e.loadFile(n.join(f, "index.html"));
}
s.on("window-all-closed", () => {
  process.platform !== "darwin" && (s.quit(), e = null);
});
s.on("activate", () => {
  d.getAllWindows().length === 0 && u();
});
s.on("before-quit", () => {
});
s.whenReady().then(() => {
  u(), P();
});
export {
  D as MAIN_DIST,
  f as RENDERER_DIST,
  c as VITE_DEV_SERVER_URL
};
