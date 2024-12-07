import { existsSync } from "fs";
import { lstat, mkdir, readFile, rm } from "fs/promises";
import { server } from "./main";
import { HttpClient } from "@duplojs/http-client";
import { stringToBytes } from "@duplojs/core";

describe("integration", () => {
	beforeEach(async() => {
		for (const directory of ["test/upload", "test/savedFile"]) {
			if (existsSync(directory)) {
				await rm(directory, { recursive: true });
			}

			await mkdir(directory);
		}
	});

	afterAll(() => {
		server.close();
	});

	const client = new HttpClient({
		baseUrl: "http://localhost:15159",
	});

	it("GET /users", async() => {
		const result1 = await client
			.get({ path: "/users" })
			.IWantInformation("users")
			.then(({ body }) => body);

		expect(result1).toStrictEqual({
			ignoredUserId: ["toto"],
			page: 0,
			take: 10,
		});

		const whenCode = vi.fn();
		const whenInformation = vi.fn();
		const whenResponseSuccess = vi.fn();

		const result2 = await client
			.get({
				path: "/users",
				query: {
					ignoredUserId: "tutu",
					page: 20,
					take: 9,
				},
			})
			.whenCode("200", whenCode)
			.whenInformation("users", whenInformation)
			.whenResponseSuccess(whenResponseSuccess)
			.IWantInformation("users")
			.then(({ body }) => body);

		expect(whenCode.mock.lastCall).toMatchObject([
			{
				code: 200,
				information: "users",
			},
		]);
		expect(whenInformation.mock.lastCall).toMatchObject([
			{
				code: 200,
				information: "users",
			},
		]);
		expect(whenResponseSuccess.mock.lastCall).toMatchObject([
			{
				code: 200,
				information: "users",
			},
		]);

		expect(result2).toStrictEqual({
			ignoredUserId: ["tutu"],
			page: 20,
			take: 9,
		});
	});

	it("POST /users", async() => {
		const result = await client
			.post({
				path: "/users",
				body: {
					name: "liam",
					age: 16,
				},
			})
			.IWantInformation("userCreated")
			.then(({ body }) => body);

		expect(result).toStrictEqual({
			name: "liam",
			age: 16,
		});
	});

	it("send file", async() => {
		const formData = new FormData();
		formData.append("accepte", "true");
		const blob = new Blob([await readFile("test/fakeFiles/1mb.png", "utf-8")]);
		formData.append(
			"docs",
			new File([blob], "avatar.png", {
				type: "image/png",
				lastModified: Date.now(),
			}),
		);

		const result = await client
			.post({
				path: "/docs",
				body: formData,
			});

		expect(result.code).toBe(204);
		expect(existsSync("test/savedFile/toto.png")).toBe(true);
		expect((await lstat("test/savedFile/toto.png")).size).toBe(stringToBytes("1mb"));
	});
});
