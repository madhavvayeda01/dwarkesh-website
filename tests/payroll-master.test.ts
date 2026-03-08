import {
  calcPayrollMaster,
  deriveMonthlyCapDaysByWeekoff,
  resolvePayrollMasterWeeklyOffAndCap,
} from "../lib/payroll-master";

describe("payroll-master formulas", () => {
  it("matches excel reference row outputs", () => {
    const calc = calcPayrollMaster({
      uanNo: "",
      esicNo: "",
      actualRateOfPay: 1258,
      skillCategory: 1,
      actualWorkingDays: 31,
      monthlyCapDaysY: 24,
      otherBenefit: 0,
      tds: 0,
      loan: 0,
      adv: 0,
      tea: 0,
      lwf: 0,
    });

    expect(calc.minimumWagesL).toBe(511);
    expect(calc.payDaysAC).toBe(24);
    expect(calc.otHoursAD).toBe(28);
    expect(calc.basicAL).toBe(19440);
    expect(calc.hraAM).toBe(10752);
    expect(calc.grandTotalAQ).toBe(38998);
    expect(calc.netPayableBA).toBe(38798);
    expect(calc.totalBF).toBe(38998);
  });

  it("computes sunday weekly-off cap as 24 for February 2026", () => {
    const cap = deriveMonthlyCapDaysByWeekoff(2026, 1, 0);
    expect(cap).toBe(24);
  });

  it("keeps rotational weekly-off stable for same employee and period", () => {
    const first = resolvePayrollMasterWeeklyOffAndCap({
      clientId: "c1",
      employeeId: "e1",
      year: 2026,
      monthIndex: 1,
      weekendType: "ROTATIONAL",
    });
    const second = resolvePayrollMasterWeeklyOffAndCap({
      clientId: "c1",
      employeeId: "e1",
      year: 2026,
      monthIndex: 1,
      weekendType: "ROTATIONAL",
    });

    expect(first.weeklyOffDay).toBe(second.weeklyOffDay);
    expect(first.monthlyCapDaysY).toBe(second.monthlyCapDaysY);
    expect(first.weeklyOffDay).toBeGreaterThanOrEqual(0);
    expect(first.weeklyOffDay).toBeLessThanOrEqual(6);
  });

  it("resolves PF/ESIC branches per applicability", () => {
    const calc = calcPayrollMaster({
      uanNo: "1000001",
      esicNo: "1000002",
      actualRateOfPay: 2000,
      skillCategory: 1,
      actualWorkingDays: 26,
      monthlyCapDaysY: 26,
      otherBenefit: 0,
      tds: 0,
      loan: 0,
      adv: 0,
      tea: 0,
      lwf: 0,
    });

    expect(calc.pfApplicabilityAJ).toBe(1);
    expect(calc.esicApplicabilityAK).toBe(1);
    expect(calc.pfAR).toBe(1800);
    expect(calc.esicAS).toBe(0);
  });
});
