import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

export async function renderHTMLToPNG(html: string, outputPath: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1080, height: 1350 }); // Updated to match new larger dimensions for crispness
  await page.setContent(html);
  
  await page.screenshot({ path: outputPath, fullPage: true });
  await browser.close();
}