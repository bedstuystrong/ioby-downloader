declare global {
  namespace NodeJS {
    interface ProcessEnv {
      IOBY_USERNAME: string;
      IOBY_PAGE_PATH: string;
      AIRTABLE_API_KEY: string;
    }
  }
}

export {};
