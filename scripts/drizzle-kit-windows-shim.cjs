// Drizzle Kit bundles tsx, which calls os.userInfo() to name its temporary
// directory. Some Windows environments fail that call before Drizzle loads.
// tsx prefers process.geteuid() when it exists; its value is only used for
// the temporary-directory name, so this fallback is safe on Windows.
if (typeof process.geteuid !== "function") {
  process.geteuid = () => 0;
}
