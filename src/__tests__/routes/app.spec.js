import request from "supertest";
import app from "../../index.js";

describe("GET: /", () => {
  it("should return 200", async () => {
    const response = await request(app).get("/");
    expect(response.statusCode).toEqual(200);
  });
});
