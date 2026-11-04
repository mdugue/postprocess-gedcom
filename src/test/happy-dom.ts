import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Separate preload: Testing Library reads the DOM globals when it is imported.
GlobalRegistrator.register();
