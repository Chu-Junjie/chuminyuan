import { test, expect } from "@playwright/test";
// Opt-in integration tests require a disposable seeded Supabase project and two test accounts.
test("real Auth login and private record synchronization", async ({ page }) => {
  test.skip(
    !process.env.TEST_EMAIL || !process.env.TEST_PASSWORD,
    "No Supabase test credentials configured",
  );
  await page.goto("/profile");
  await page.getByLabel("邮箱", { exact: true }).fill(process.env.TEST_EMAIL!);
  await page
    .getByLabel("密码", { exact: true })
    .fill(process.env.TEST_PASSWORD!);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(
    page.getByText(`已登录：${process.env.TEST_EMAIL}`),
  ).toBeVisible();
  await page.goto("/sop/SOP014");
  await page
    .getByRole("textbox", { name: "我的笔记" })
    .fill("cloud integration note");
  await expect(page.getByRole("status").first()).toContainText("已同步到云端");
});
