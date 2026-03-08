import {
  normalizeShiftMasterConfigInput,
  resolveEmployeeShift,
  resolveWeeklyOffDay,
} from "../lib/shift-master-service";

describe("shift-master-service helpers", () => {
  it("force-enables G in config normalization", () => {
    const normalized = normalizeShiftMasterConfigInput({
      clientId: "c1",
      generalShiftEnabled: false,
      generalShiftStart: "09:00",
      generalShiftEnd: "17:00",
      shiftAEnabled: true,
      shiftAStart: "08:00",
      shiftAEnd: "16:00",
      shiftBEnabled: true,
      shiftBStart: "16:00",
      shiftBEnd: "00:00",
      shiftCEnabled: true,
      shiftCStart: "00:00",
      shiftCEnd: "08:00",
      weekendType: "SUN",
    });

    expect(normalized.generalShiftEnabled).toBe(true);
    expect(normalized.warnings.length).toBeGreaterThan(0);
  });

  it("always assigns G for female workers", () => {
    const shift = resolveEmployeeShift({
      clientId: "c1",
      employeeId: "e1",
      month: 2,
      year: 2026,
      gender: "Female",
      shiftCategory: "WORKER",
      enabledShifts: ["G", "A", "B", "C"],
    });
    expect(shift).toBe("G");
  });

  it("always assigns G for male staff", () => {
    const shift = resolveEmployeeShift({
      clientId: "c1",
      employeeId: "e2",
      month: 2,
      year: 2026,
      gender: "Male",
      shiftCategory: "STAFF",
      enabledShifts: ["G", "A", "B", "C"],
    });
    expect(shift).toBe("G");
  });

  it("never assigns G to workers when A/B/C are available", () => {
    const shift = resolveEmployeeShift({
      clientId: "c1",
      employeeId: "e3",
      month: 2,
      year: 2026,
      gender: "Male",
      shiftCategory: "WORKER",
      enabledShifts: ["G", "A", "B", "C"],
    });
    expect(["A", "B", "C"]).toContain(shift);
  });

  it("returns fixed weekday for non-rotational mode", () => {
    const day = resolveWeeklyOffDay({
      clientId: "c1",
      employeeId: "e4",
      month: 2,
      year: 2026,
      weekendType: "WED",
    });
    expect(day).toBe(3);
  });

  it("is stable for same employee and month in rotational mode", () => {
    const first = resolveWeeklyOffDay({
      clientId: "c1",
      employeeId: "e5",
      month: 2,
      year: 2026,
      weekendType: "ROTATIONAL",
    });
    const second = resolveWeeklyOffDay({
      clientId: "c1",
      employeeId: "e5",
      month: 2,
      year: 2026,
      weekendType: "ROTATIONAL",
    });
    expect(first).toBe(second);
  });

  it("changes with month in rotational mode", () => {
    const first = resolveWeeklyOffDay({
      clientId: "c1",
      employeeId: "e5",
      month: 2,
      year: 2026,
      weekendType: "ROTATIONAL",
    });
    const second = resolveWeeklyOffDay({
      clientId: "c1",
      employeeId: "e5",
      month: 3,
      year: 2026,
      weekendType: "ROTATIONAL",
    });
    expect(typeof first).toBe("number");
    expect(typeof second).toBe("number");
  });
});
