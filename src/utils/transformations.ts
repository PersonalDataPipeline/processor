////
/// Types
//

export interface PipelineTransforms {
  trim: (string: string) => string;
  toStandardDate: (string: string) => string;
  toStandardTime: (string: string) => string;
  toUpperCase: (string: string) => string;
}

////
/// Helpers
//

const padLeftZero = (string: number) => {
  return `${string}`.length === 1 ? `0${string}` : `${string}`;
};

////
/// Exports
//

const trim = (string: string) => (string ? string.trim() : "");

const toUpperCase = (string: string) => string.toUpperCase();

const toStandardDate = (dateString: string) => {
  const date = new Date(dateString);
  if (!dateString || date.toString() === "Invalid Date") {
    return "";
  }
  const yyyy = date.getFullYear();
  const mm = date.getMonth() + 1;
  const dd = date.getDate();
  return `${yyyy}-${padLeftZero(mm)}-${padLeftZero(dd)}`;
};

const toStandardTime = (dateString: string) => {
  const date = new Date(dateString);
  const hh = date.getHours();
  const mm = date.getMinutes() + 1;
  const ss = date.getSeconds();
  return `${padLeftZero(hh)}:${padLeftZero(mm)}:${padLeftZero(ss)}`;
};

const defaultExport: PipelineTransforms = {
  trim,
  toStandardDate,
  toStandardTime,
  toUpperCase,
};

export default defaultExport;
