import request from "supertest";

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const smokeDescribe = process.env.TEST_BASE_URL ? describe : describe.skip;

smokeDescribe("API smoke tests", () => {
  const adminUsername = process.env.TEST_ADMIN_USERNAME || process.env.ADMIN_USERNAME;
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  const adminDescribe = adminUsername && adminPassword ? describe : describe.skip;

  adminDescribe("admin auth", () => {
    const agent = request.agent(baseUrl);
    let createdClientId = "";

    it("logs in with admin credentials", async () => {
      const res = await agent.post("/api/auth/login").send({
        usernameOrEmail: adminUsername,
        password: adminPassword,
      });

      expect(res.status).toBe(200);
      expect(res.body?.success).toBe(true);
      expect(res.body?.data?.role).toBe("admin");
      expect(res.headers["set-cookie"]?.join(";") || "").toContain("session_token=");
    });

    it("reads admin settings using authenticated session", async () => {
      const res = await agent.get("/api/admin/settings");
      expect(res.status).toBe(200);
      expect(res.body?.success).toBe(true);
      expect(typeof res.body?.data?.consultantCount).toBe("number");
    });

    it("force-enables G shift in shift master config", async () => {
      const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const createClient = await agent.post("/api/admin/clients").send({
        name: `Shift Test ${suffix}`,
        email: `shift_test_${suffix}@example.com`,
        password: "test123",
      });

      expect(createClient.status).toBe(201);
      createdClientId = createClient.body?.data?.client?.id || "";
      expect(typeof createdClientId).toBe("string");
      expect(createdClientId.length).toBeGreaterThan(0);

      const saveConfig = await agent.put("/api/admin/shift-master").send({
        clientId: createdClientId,
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

      expect(saveConfig.status).toBe(200);
      expect(saveConfig.body?.success).toBe(true);
      expect(saveConfig.body?.data?.config?.generalShiftEnabled).toBe(true);
    });
  });

  it("rejects unauthenticated document generation request", async () => {
    const res = await request(baseUrl).post("/api/client/documents/generate-pdf").send({
      templateId: "dummy",
      empCode: "EMP001",
    });

    expect(res.status).toBe(401);
    expect(res.body?.success).toBe(false);
    expect(typeof res.body?.message).toBe("string");
  });
});
