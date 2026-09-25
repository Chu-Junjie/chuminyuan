import { test, expect } from "@playwright/test";
test("English rescue, reading, answers, notes and subject-safe navigation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: /英语 58/ }).click();
  await expect(page.getByRole("heading", { name: "英语练习室" })).toBeVisible();
  await page.getByRole("button", { name: "我卡住了", exact: true }).click();
  await page.getByRole("button", { name: "语法填空无从下手" }).click();
  await page.getByRole("button", { name: "动词：谓语还是非谓语" }).click();
  await page.getByRole("link", { name: /GF2 .*给动词/ }).click();
  await expect(
    page.getByRole("heading", { name: "给动词：谓语还是非谓语？" }),
  ).toBeVisible();
  await expect(page.getByText(/^答案速查/)).not.toBeVisible();
  await page.getByText("查看参考答案", { exact: true }).click();
  await expect(page.getByText(/^答案速查/)).toBeVisible();
  await expect(page.getByRole("link", { name: /下一篇/ })).toHaveAttribute(
    "href",
    "/sop/EN-GF3/",
  );
  await page.getByRole("button", { name: "收藏", exact: true }).click();
  await page
    .getByRole("textbox", { name: "我的笔记" })
    .fill("先找句子已有谓语。");
  await page.getByRole("button", { name: "🟡 会做", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "我的笔记" })).toHaveValue(
    "先找句子已有谓语。",
  );
  await expect(
    page.getByRole("button", { name: "已收藏", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "记一道错题 +" }).click();
  await expect(
    page.getByRole("combobox", { name: "科目", exact: true }),
  ).toHaveValue("english");
  await expect(page.getByRole("combobox", { name: "关联 SOP" })).toHaveValue(
    "EN-GF2",
  );
  await page.getByRole("textbox", { name: "错题标题" }).fill("动词先分流");
  await page.getByLabel("G-P 谓语", { exact: true }).check();
  await page.getByRole("button", { name: "完成记录", exact: true }).click();
  await expect(page).toHaveURL(/\/mistakes\/edit\/?\?id=[a-f0-9-]+$/);
  await page.reload();
  await expect(page.getByLabel("G-P 谓语", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "↻ 再做一次" }).click();
  await page.getByRole("button", { name: "给我第一步", exact: true }).click();
  await expect(
    page.getByText("1. 找句子主干，圈已有谓语动词。", { exact: true }),
  ).toBeVisible();
});
test("English search, textbook tables, mobile map and math isolation", async ({
  page,
}) => {
  await page.goto("/subjects/english");
  await page.getByRole("button", { name: "搜索题型", exact: true }).click();
  await page.getByRole("textbox", { name: "搜索英语内容" }).fill("infer");
  await expect(
    page.getByRole("link", { name: /R6 .*推理判断题/ }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "搜索英语内容" })
    .fill("school open day");
  await expect(
    page.getByRole("link", { name: /常见应用文任务卡/ }),
  ).toBeVisible();
  await page.goto("/sop/EN-11-0");
  await expect(
    page.getByRole("cell", { name: /Back to school/ }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/subjects/english");
  await expect(page.getByRole("heading", { name: "英语练习室" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/subjects/math");
  await expect(page.getByRole("heading", { name: "数学练习室" })).toBeVisible();
  await expect(page.locator(".chapter-card")).toHaveCount(24);
});

test("English reading and notes remain available offline", async ({
  page,
  context,
}) => {
  await page.goto("/sop/EN-GF2/");
  await expect(
    page.getByRole("heading", {
      name: "给动词：谓语还是非谓语？",
      exact: true,
    }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await page.reload();
  await page
    .getByRole("textbox", { name: "我的笔记" })
    .fill("离线也记得先找谓语");
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const response = await caches.match("/data/english/catalog.json");
        return !!response;
      }),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "给动词：谓语还是非谓语？",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "我的笔记" })).toHaveValue(
    "离线也记得先找谓语",
  );
});
