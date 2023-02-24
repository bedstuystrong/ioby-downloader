declare global {
  namespace NodeJS {
    interface ProcessEnv {
      IOBY_USERNAME: string;
      IOBY_PAGE_PATH: string;
    }
  }
}

export {};
