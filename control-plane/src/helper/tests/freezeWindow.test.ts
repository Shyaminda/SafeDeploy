import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateFreezeWindow, unfreezeIfExpired } from "../freezeWindow.js";
import * as healthStore from "../../health-state/store.js";

describe("freezeWindow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("updateFreezeWindow", () => {
    it("creates a new freeze window when no existing state", () => {
      vi.spyOn(healthStore, "loadServiceHealthState").mockReturnValue(null);
      const saveSpy = vi
        .spyOn(healthStore, "saveServiceHealthState")
        .mockImplementation(() => {});

      updateFreezeWindow("demo-app", 15 * 60 * 1000);

      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          service: "demo-app",
          freezeUntil: expect.any(String),
        }),
      );
    });

    it("keeps existing freeze if it expires later than proposed", () => {
      const futureFreeze = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
      vi.spyOn(healthStore, "loadServiceHealthState").mockReturnValue({
        service: "demo-app",
        lastEvaluatedAt: new Date().toISOString(),
        lastExhaustedAt: new Date().toISOString(),
        freezeUntil: futureFreeze,
      });
      const saveSpy = vi
        .spyOn(healthStore, "saveServiceHealthState")
        .mockImplementation(() => {});

      updateFreezeWindow("demo-app", 5 * 60 * 1000); // 5 min freeze (shorter)

      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          freezeUntil: futureFreeze,
        }),
      );
    });

    it("extends freeze if proposed expires later than existing", () => {
      const shortFreeze = new Date(Date.now() + 1000).toISOString(); // 1 second from now
      vi.spyOn(healthStore, "loadServiceHealthState").mockReturnValue({
        service: "demo-app",
        lastEvaluatedAt: new Date().toISOString(),
        lastExhaustedAt: new Date().toISOString(),
        freezeUntil: shortFreeze,
      });
      const saveSpy = vi
        .spyOn(healthStore, "saveServiceHealthState")
        .mockImplementation(() => {});

      updateFreezeWindow("demo-app", 60 * 60 * 1000); // 1 hour freeze (longer)

      const savedState = saveSpy.mock.calls[0]![0];
      expect(new Date(savedState.freezeUntil!).getTime()).toBeGreaterThan(
        new Date(shortFreeze).getTime(),
      );
    });

    it("preserves existing lastExhaustedAt", () => {
      const existingExhausted = "2026-01-01T00:00:00.000Z";
      vi.spyOn(healthStore, "loadServiceHealthState").mockReturnValue({
        service: "demo-app",
        lastEvaluatedAt: new Date().toISOString(),
        lastExhaustedAt: existingExhausted,
      });
      const saveSpy = vi
        .spyOn(healthStore, "saveServiceHealthState")
        .mockImplementation(() => {});

      updateFreezeWindow("demo-app", 15 * 60 * 1000);

      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          lastExhaustedAt: existingExhausted,
        }),
      );
    });
  });

  describe("unfreezeIfExpired", () => {
    it("does nothing when no state exists", () => {
      vi.spyOn(healthStore, "loadServiceHealthState").mockReturnValue(null);
      const saveSpy = vi.spyOn(healthStore, "saveServiceHealthState");

      unfreezeIfExpired("demo-app");

      expect(saveSpy).not.toHaveBeenCalled();
    });

    it("does nothing when no freezeUntil is set", () => {
      vi.spyOn(healthStore, "loadServiceHealthState").mockReturnValue({
        service: "demo-app",
        lastEvaluatedAt: new Date().toISOString(),
        lastExhaustedAt: new Date().toISOString(),
      });
      const saveSpy = vi.spyOn(healthStore, "saveServiceHealthState");

      unfreezeIfExpired("demo-app");

      expect(saveSpy).not.toHaveBeenCalled();
    });

    it("removes freeze when it has expired", () => {
      const pastFreeze = new Date(Date.now() - 1000).toISOString();
      vi.spyOn(healthStore, "loadServiceHealthState").mockReturnValue({
        service: "demo-app",
        lastEvaluatedAt: new Date().toISOString(),
        lastExhaustedAt: "2026-01-01T00:00:00.000Z",
        freezeUntil: pastFreeze,
      });
      const saveSpy = vi
        .spyOn(healthStore, "saveServiceHealthState")
        .mockImplementation(() => {});

      unfreezeIfExpired("demo-app");

      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          service: "demo-app",
          lastExhaustedAt: "2026-01-01T00:00:00.000Z",
        }),
      );
      // freezeUntil should not be in the saved state
      const saved = saveSpy.mock.calls[0]![0];
      expect(saved.freezeUntil).toBeUndefined();
    });

    it("does not unfreeze when freeze is still active", () => {
      const futureFreeze = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      vi.spyOn(healthStore, "loadServiceHealthState").mockReturnValue({
        service: "demo-app",
        lastEvaluatedAt: new Date().toISOString(),
        lastExhaustedAt: new Date().toISOString(),
        freezeUntil: futureFreeze,
      });
      const saveSpy = vi.spyOn(healthStore, "saveServiceHealthState");

      unfreezeIfExpired("demo-app");

      expect(saveSpy).not.toHaveBeenCalled();
    });
  });
});
