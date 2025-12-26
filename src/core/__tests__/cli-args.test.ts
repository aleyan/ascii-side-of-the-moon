import { describe, it, expect } from "vitest";
import { parseCliArgs } from "../../cli-args";

describe("parseCliArgs", () => {
  it("uses the provided now() fallback when no date is supplied", () => {
    // Arrange
    const now = new Date("2025-01-01T00:00:00Z");
    // Act
    const result = parseCliArgs([], { now: () => now });
    // Assert
    expect(result.date).toEqual(now);
    expect(result.observer).toBeUndefined();
    expect(result.frame).toBe("celestial_up");
  });

  it("parses YYYY-MM-DD into UTC midnight", () => {
    // Arrange
    const args = ["2025-09-21"];
    // Act
    const result = parseCliArgs(args);
    // Assert
    expect(result.date.toISOString()).toBe("2025-09-21T00:00:00.000Z");
  });

  it("parses an inline HH:MM time (same argument or split argument)", () => {
    // Arrange
    const inlineArgs = ["2025-09-21T12:30"];
    const splitArgs = ["2025-09-21", "12:30"];
    // Act
    const inlineResult = parseCliArgs(inlineArgs);
    const splitResult = parseCliArgs(splitArgs);
    // Assert
    expect(inlineResult.date.toISOString()).toBe("2025-09-21T12:30:00.000Z");
    expect(splitResult.date.toISOString()).toBe("2025-09-21T12:30:00.000Z");
  });

  it("parses latitude/longitude/elevation flags", () => {
    // Arrange
    const args = [
      "2025-01-01",
      "--lat",
      "37.7749",
      "--lon",
      "-122.4194",
      "--elevation",
      "25"
    ];
    // Act
    const result = parseCliArgs(args);
    // Assert
    expect(result.observer).toEqual({
      latitude: 37.7749,
      longitude: -122.4194,
      elevationMeters: 25
    });
  });

  it("throws when latitude is provided without longitude", () => {
    // Arrange
    const args = ["--lat", "10"];
    // Act / Assert
    expect(() => parseCliArgs(args)).toThrow("Latitude and longitude must be provided together.");
  });

  it("throws when time is provided without a date", () => {
    // Arrange
    const args = ["12:30"];
    // Act / Assert
    expect(() => parseCliArgs(args)).toThrow("Cannot specify time without a date. Provide YYYY-MM-DD first.");
  });

  it("throws for invalid date strings", () => {
    // Arrange
    const args = ["not-a-date"];
    // Act / Assert
    expect(() => parseCliArgs(args)).toThrow(/Invalid date format/);
  });

  describe("frame argument", () => {
    it("defaults to celestial_up when no lat/lon is provided", () => {
      // Arrange
      const args = ["2025-01-01"];
      // Act
      const result = parseCliArgs(args);
      // Assert
      expect(result.frame).toBe("celestial_up");
      expect(result.observer).toBeUndefined();
    });

    it("defaults to observer when lat/lon is provided", () => {
      // Arrange
      const args = ["2025-01-01", "--lat", "40", "--lon", "-74"];
      // Act
      const result = parseCliArgs(args);
      // Assert
      expect(result.frame).toBe("observer");
      expect(result.observer).toBeDefined();
    });

    it("parses --frame=celestial_up", () => {
      // Arrange
      const args = ["2025-01-01", "--frame=celestial_up"];
      // Act
      const result = parseCliArgs(args);
      // Assert
      expect(result.frame).toBe("celestial_up");
    });

    it("parses --frame celestial_down", () => {
      // Arrange
      const args = ["2025-01-01", "--frame", "celestial_down"];
      // Act
      const result = parseCliArgs(args);
      // Assert
      expect(result.frame).toBe("celestial_down");
    });

    it("parses --frame observer", () => {
      // Arrange
      const args = ["2025-01-01", "--frame", "observer"];
      // Act
      const result = parseCliArgs(args);
      // Assert
      expect(result.frame).toBe("observer");
    });

    it("allows explicit frame override even when lat/lon is provided", () => {
      // Arrange
      const args = ["2025-01-01", "--lat", "40", "--lon", "-74", "--frame", "celestial_up"];
      // Act
      const result = parseCliArgs(args);
      // Assert
      expect(result.frame).toBe("celestial_up");
      expect(result.observer).toBeDefined();
    });

    it("throws for invalid frame value", () => {
      // Arrange
      const args = ["2025-01-01", "--frame", "invalid"];
      // Act / Assert
      expect(() => parseCliArgs(args)).toThrow(/Invalid frame value: invalid/);
    });

    it("throws when frame flag is missing value", () => {
      // Arrange
      const args = ["2025-01-01", "--frame"];
      // Act / Assert
      expect(() => parseCliArgs(args)).toThrow(/Missing value for --frame/);
    });
  });
});

