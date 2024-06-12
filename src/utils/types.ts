export interface OutputHandler {
  handlers: OutputStrategy[];
  isReady: () => boolean;
}

export interface OutputStrategy {
  name: () => string;
  isReady: (data?: object) => string[];
}
