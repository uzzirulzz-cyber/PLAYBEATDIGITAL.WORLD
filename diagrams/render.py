import asyncio
import os
from playwright.async_api import async_playwright

HTML = "/home/z/my-project/diagrams/sequence.html"
OUT = "/home/z/my-project/diagrams/playbeat-sequence-diagrams.png"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(
            viewport={"width": 1400, "height": 1000},
            device_scale_factor=2,
        )
        await page.goto(f"file://{HTML}", wait_until="networkidle")
        await page.wait_for_timeout(400)

        el = page.locator("#root")
        bbox = await el.bounding_box()
        if bbox:
            fit_w = max(1400, int(bbox["width"] + 80))
            fit_h = int(bbox["height"] + 80)
            await page.set_viewport_size({"width": fit_w, "height": fit_h})
            await page.wait_for_timeout(250)

        await el.screenshot(path=OUT)
        await browser.close()
        print(f"OK {OUT} ({os.path.getsize(OUT)/1024:.0f}KB)")

asyncio.run(main())
