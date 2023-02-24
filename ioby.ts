import fs from 'node:fs/promises';
import path from 'node:path';
// @ts-ignore
import keychain from 'keychain';
import puppeteer, { type ElementHandle } from 'puppeteer';
import invariant from 'tiny-invariant';

const IOBY_BASE_URL = 'https://ioby.org';
const IOBY_USERNAME = process.env.IOBY_USERNAME;
const IOBY_PAGE_PATH = process.env.IOBY_PAGE_PATH;
const ONE_MINUTE = 60 * 1000;

const puppeteerOptions = {
  devtools: true,
  args: ['--no-sandbox'],
};

function isNodeError(error: any): error is NodeJS.ErrnoException { return error instanceof Error; }

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getPassword = (): Promise<string> => new Promise((resolve, reject) => {
  keychain.getPassword({
    account: IOBY_USERNAME,
    service: 'ioby.org',
    type: 'internet',
  }, (err: Error, password: string) => {
    if (err) {
      reject(err);
    } else {
      resolve(password);
    }
  });
});

interface DownloadDonorListDetailOptions {
  downloadPath: string;
}

export const downloadDonorListDetail = async (options: DownloadDonorListDetailOptions): Promise<string> => {
  try {
    const { downloadPath } = options;

    const password = await getPassword();

    const browser = await puppeteer.launch(puppeteerOptions);
    const [page] = await browser.pages();

    const cdpSession = await page.target().createCDPSession();
    cdpSession.send('Browser.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: path.resolve(downloadPath),
    });

    await page.goto(IOBY_BASE_URL + '/user', { waitUntil: 'networkidle2' });

    const form = await page.$('#user-login');
    invariant(form, 'auth form not found');
    
    const usernameInput = await form.$('#edit-name');
    const passwordInput = await form.$('#edit-pass');
    const submit = await form.$('#edit-submit');

    await usernameInput?.type(IOBY_USERNAME);
    await passwordInput?.type(password);

    await submit?.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: ONE_MINUTE });

    console.log('Signed in');

    await page.goto(IOBY_BASE_URL + IOBY_PAGE_PATH, { waitUntil: 'networkidle2' });

    const donorListDetailLink = (await page.$x("//nav//a[contains(text(), 'Donor List Detail')]"))[0] as ElementHandle<Element>;
    await donorListDetailLink.click();

    console.log('Donor list detail');

    const downloadButtonXpath = "//a[contains(text(), 'Download donor list')]";
    await page.waitForXPath(downloadButtonXpath);

    console.log('Downloading...')

    const downloadButton = (await page.$x(downloadButtonXpath))[0] as ElementHandle<Element>;
    const href = await (await downloadButton.getProperty('href')).jsonValue() as string;
    const baseFilename = path.parse(href).name;
    await downloadButton.click();

    let downloadSuccess = false;
    while (downloadSuccess !== true) {
      try {
        const stats = await fs.stat(path.resolve(downloadPath, `${baseFilename}.csv`));
        if (stats) {
          downloadSuccess = true;
        }
      } catch (statsErr) {
        if (isNodeError(statsErr) && statsErr.code !== 'ENOENT') {
          console.error(statsErr);
          break;
        }

        await sleep(1000);
      }
    }

    if (downloadSuccess) {
      console.log(`Download succeeded ${baseFilename}.csv`);
    } else {
      console.log(`Download failed ${baseFilename}.csv`);
      process.exit(1);
    }

    return baseFilename;
  } catch (error) {
    console.log('Error downloading donor list detail from ioby:');
    console.error(error);
    throw error;
  }
}