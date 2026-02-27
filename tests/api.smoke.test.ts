import request from "supertest";

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";

describe("API smoke tests", () => {
  const adminUsername = process.env.TEST_ADMIN_USERNAME || process.env.ADMIN_USERNAME;
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  const adminDescribe = adminUsername && adminPassword ? describe : describe.skip;

  adminDescribe("admin auth + employees", () => {
    const agent = request.agent(baseUrl);

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

    it("reads employees list using authenticated session", async () => {
      const res = await agent.get("/api/admin/employees");
      expect(res.status).toBe(200);
      expect(res.body?.success).toBe(true);
      expect(Array.isArray(res.body?.data?.employees)).toBe(true);
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
