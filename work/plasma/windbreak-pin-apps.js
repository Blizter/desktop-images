// Plasma runs each script in this folder once per user (a desktop's home keeps the record):
// pins the image's apps in the taskbar next to whatever the user pinned, and drops Discover,
// which the image doesn't have.
const pins = [
    "applications:vlc.desktop",
    "applications:com.nextcloud.desktopclient.nextcloud.desktop",
    "applications:element-desktop.desktop",
];
for (const panel of panels()) {
    for (const type of ["org.kde.plasma.icontasks", "org.kde.plasma.taskmanager"]) {
        for (const tasks of panel.widgets(type)) {
            tasks.currentConfigGroup = ["General"];
            const old = tasks.readConfig("launchers", []);
            const launchers = (Array.isArray(old) ? old : String(old).split(","))
                .filter((l) => l && l !== "applications:org.kde.discover.desktop");
            for (const pin of pins) {
                if (!launchers.includes(pin)) launchers.push(pin);
            }
            tasks.writeConfig("launchers", launchers);
        }
    }
}
