require('dotenv').config();

const fs = require('node:fs/promises');
const { promisify } = require('node:util');
const glob = promisify(require('glob'));

const { downloadDonorListDetail } = require('./ioby');

const downloadPath = './downloads';
const baseFilename = 'download-donor-detail-recurring';

/**
 * File renaming as history:
 * current -> previous
 * when a new file is sucessfully downloaded,
 * 1. delete previous
 * 2. rename current to previous
 * 3. rename new file to current
 * there must always be 2 files
 */



(async () => {
  try {
    const downloadedBaseFilename = await downloadDonorListDetail({
      downloadPath,
    });

    const oldPreviousFile = (await glob(`${downloadPath}/${baseFilename}_*_previous.csv`))[0];
    await fs.rm(oldPreviousFile);
    
    let previousFile = (await glob(`${downloadPath}/${baseFilename}_*_current.csv`))[0];
    await fs.rename(
      previousFile,
      previousFile.replace('current', 'previous'),
    );
    previousFile = previousFile.replace('current', 'previous');

    const currentFile = `${downloadPath}/${baseFilename}_${Date.now()}_current.csv`;
    await fs.rename(
      `${downloadPath}/${downloadedBaseFilename}.csv`,
      currentFile,
    );

    console.log(await glob(`${downloadPath}/*.csv`))

    // diff csvs
    // upload to airtable

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
