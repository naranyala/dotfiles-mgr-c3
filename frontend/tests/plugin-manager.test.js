import { expect, test, describe } from "bun:test";
import { PluginManager } from "../src/core/plugin-manager.js";

describe("PluginManager", () => {
    test("should register and retrieve a plugin", () => {
        const testPlugin = { name: "TestPlugin", render: () => "<div>Test</div>" };
        PluginManager.register("TestPlugin", testPlugin);
        
        const plugins = PluginManager.getPlugins();
        expect(plugins).toBeArray();
        expect(plugins.length).toBeGreaterThan(0);
        
        const retrieved = plugins.find(p => p.name === "TestPlugin");
        expect(retrieved).toBeDefined();
        expect(retrieved.render()).toBe("<div>Test</div>");
    });
});
