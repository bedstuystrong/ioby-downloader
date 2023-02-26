import 'dotenv/config';

import fs from 'node:fs/promises';
import { promisify } from 'node:util';
import g from 'glob';
import type csvParser from 'csv-parser';

import { downloadDonorListDetail } from './ioby';
import { readCSV } from './csv';
import AirtableBase from './airtable';

const glob = promisify(g);

const downloadPath = './downloads';
const baseFilename = 'download-donor-detail-recurring';

const csvParseOptions: csvParser.Options = {
  mapHeaders: ({header}) => header.toLowerCase(),
};

(async () => {
  try {
    // const downloadedBaseFilename = await downloadDonorListDetail({
    //   downloadPath,
    // });

    // const oldPreviousFile = (await glob(`${downloadPath}/${baseFilename}_*_previous.csv`))[0];
    // await fs.rm(oldPreviousFile);
    
    // let previousFile = (await glob(`${downloadPath}/${baseFilename}_*_current.csv`))[0];
    // await fs.rename(
    //   previousFile,
    //   previousFile.replace('current', 'previous'),
    // );
    // previousFile = previousFile.replace('current', 'previous');

    // const currentFile = `${downloadPath}/${baseFilename}_${Date.now()}_current.csv`;
    // await fs.rename(
    //   `${downloadPath}/${downloadedBaseFilename}.csv`,
    //   currentFile,
    // );

    const previousFile = (await glob(`${downloadPath}/${baseFilename}_*_previous.csv`))[0]
    const currentFile = (await glob(`${downloadPath}/${baseFilename}_*_current.csv`))[0]

    const previousCSV = await readCSV(previousFile, csvParseOptions);
    const currentCSV = await readCSV(currentFile, csvParseOptions);

    const latestDateFromPreviousCSV = previousCSV[0].date;
    const startingIndex = currentCSV.findIndex(row => row.date === latestDateFromPreviousCSV);

    if (startingIndex <= 0) {
      console.log('No new donation records');
      process.exit(0);
    }

    const newRows = currentCSV.slice(0, startingIndex); 
    console.log(`Found ${newRows.length} new donation record(s)`);

    const iobyAirtable = new AirtableBase('finance').table('ioby');
    const createdRecords = await iobyAirtable.create(newRows)
    console.log(`Added ${createdRecords.length} new donation record(s) to Airtable`);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
