import fs from 'node:fs';
import csv from 'csv-parser';

type ParsedCSV = Record<string, any>[];

export const readCSV = async (filename: string, options: csv.Options = {}): Promise<ParsedCSV> => 
  new Promise((resolve, reject) => {
    const results: ParsedCSV = [];
    fs.createReadStream(filename)
      .pipe(csv(options))
      .on('data', (data) => results.push(data))
      .on('error', reject)
      .on('end', () => {
        resolve(results);
      });
  });