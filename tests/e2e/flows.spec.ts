import { test, expect } from "@playwright/test";
test("math → function → bookmark → note → mastery persists", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: /数学 100/ }).click();
  await page.getByRole("link", { name: /函数应用/ }).click();
  await page.getByRole("link", { name: /函数零点、方程根与图像交点/ }).click();
  await expect(
    page.getByRole("heading", { name: "函数零点、方程根与图像交点" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "收藏", exact: true }).click();
  await page
    .getByRole("textbox", { name: "我的笔记" })
    .fill("方程解 = 图像交点，下次先画图。");
  await page.getByRole("button", { name: "🟡 会做", exact: true }).click();
  await page.waitForTimeout(700);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "我的笔记" })).toHaveValue(
    "方程解 = 图像交点，下次先画图。",
  );
  await expect(
    page.getByRole("button", { name: "已收藏", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "🟡 会做", exact: true }),
  ).toHaveClass(/selected/);
});
test("upload → crop → associate → reload → related SOP → redo", async ({
  page,
}) => {
  await page.goto("/mistakes/new?sop=SOP082");
  await page
    .getByRole("textbox", { name: "错题标题" })
    .fill("Sn 求 an 的第一项");
  await page
    .getByRole("textbox", { name: "题目内容" })
    .fill("已知 $S_n=n^2$，求 $a_n$。");
  await page
    .getByLabel("相册上传", { exact: true })
    .setInputFiles("public/icon-192.png");
  await expect(
    page.getByRole("heading", { name: "保留需要的部分" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "完成裁剪并添加" }).click();
  await expect(page.getByText("查看原图", { exact: true })).toBeVisible();
  await page.getByLabel("🧮 计算失误", { exact: true }).check();
  await page
    .getByRole("textbox", { name: "我当时为什么错？" })
    .fill("SECRET_OLD_ANSWER");
  await page.getByRole("button", { name: "完成记录", exact: true }).click();
  await expect(page).toHaveURL(/\/mistakes\/[a-f0-9-]+$/);
  const detail = page.url();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "错题标题" })).toHaveValue(
    "Sn 求 an 的第一项",
  );
  await expect(page.getByLabel("🧮 计算失误", { exact: true })).toBeChecked();
  await page.getByRole("link", { name: "查看对应 SOP" }).click();
  await expect(
    page.getByRole("heading", { name: "你有 1 道相关错题" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Sn 求 an 的第一项", exact: true })
    .click();
  await page.getByRole("button", { name: "↻ 再做一次" }).click();
  await expect(page.getByText("SECRET_OLD_ANSWER")).toHaveCount(0);
  await page.getByRole("button", { name: "给我第一步", exact: true }).click();
  await page.getByRole("button", { name: "🟢 已解决", exact: true }).click();
  await expect(
    page.getByText("这道题你曾经做错过。现在你已经会了。"),
  ).toBeVisible();
  await page.goto(detail);
  await expect(page.getByLabel("错题状态", { exact: true })).toHaveValue(
    "solved",
  );
});
test("plain-language rescue and full text search", async ({ page }) => {
  await page.goto("/learn?mode=rescue");
  await page.getByRole("button", { name: "有数列 an / Sn" }).click();
  await page.getByRole("button", { name: "已知 Sn，求 an" }).click();
  await expect(page.getByRole("link", { name: /SOP 082/ })).toBeVisible();
  await page.getByRole("button", { name: "搜索题型", exact: true }).click();
  await page.getByRole("textbox", { name: "搜索题型" }).fill("至少一个");
  await expect(page.getByRole("link", { name: /SOP 062/ })).toBeVisible();
});
for (const width of [375, 430, 768, 1440])
  test(`responsive ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of [
      "/",
      "/learn",
      "/sop/SOP001",
      "/mistakes/new",
      "/profile",
    ]) {
      await page.goto(path);
      await page.waitForTimeout(250);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    await page.goto("/");
    await page.screenshot({
      path: `test-results/home-${width}.png`,
      fullPage: true,
    });
  });
test("cached SOP and new note survive offline reload", async ({
  page,
  context,
}) => {
  await page.goto("/learn");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.getByRole("button", { name: "搜索题型", exact: true }).click();
  await page.getByRole("textbox", { name: "搜索题型" }).fill("SOP014");
  await page.getByRole("link", { name: /SOP 014/ }).click();
  await expect(
    page.getByRole("heading", { name: "函数定义域", exact: true }),
  ).toBeVisible();
  await page.waitForFunction(async () => !!(await caches.match("/sop/SOP014")));
  await page.waitForTimeout(700);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "函数定义域", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "我的笔记" })
    .fill("离线记住先看分母。");
  await page.waitForTimeout(600);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "我的笔记" })).toHaveValue(
    "离线记住先看分母。",
  );
  await context.setOffline(false);
});
test("local mode accurately labels synchronization and protects admin", async ({
  page,
}) => {
  await page.goto("/profile");
  await expect(
    page.getByText("正在使用本机模式", { exact: true }),
  ).toBeVisible();
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "仅管理员可访问" }),
  ).toBeVisible();
});

test("reading position resumes and backup import preserves edited notes", async ({
  page,
}) => {
  await page.goto("/sop/SOP001");
  await expect(page.getByRole("textbox", { name: "我的笔记" })).toBeVisible();
  await page.getByRole("textbox", { name: "我的笔记" }).fill("备份里的旧笔记");
  await page.evaluate(() =>
    window.scrollTo({ top: 1300, behavior: "instant" }),
  );
  await page.waitForTimeout(900);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Math.round(window.scrollY)))
    .toBeGreaterThan(1100);
  await page.goto("/profile");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出全部记录与图片" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  await page.goto("/sop/SOP001");
  await page.getByRole("textbox", { name: "我的笔记" }).fill("现在的新笔记");
  await page.waitForTimeout(300);
  await page.goto("/profile");
  await page
    .getByText("导入备份", { exact: true })
    .locator("input")
    .setInputFiles(path!);
  await expect(
    page.getByText("备份已导入。遇到相同记录时保留副本，没有覆盖现有记录。"),
  ).toBeVisible();
  await page.goto("/sop/SOP001");
  await expect(page.getByRole("textbox", { name: "我的笔记" })).toHaveValue(
    "现在的新笔记",
  );
  await page.getByText("同步时保留的另一版笔记", { exact: true }).click();
  await expect(page.getByText("备份里的旧笔记", { exact: true })).toBeVisible();
});
