export const trim = (string: string) => string.trim();

export const padLeftZero = (string: number) => {
  return `${string}`.length === 1 ? `0${string}` : `${string}`;
};

export const toStandardDate = (dateString: string) => {
  const date = new Date(dateString);
  const yyyy = date.getFullYear();
  const mm = date.getMonth() + 1;
  const dd = date.getDate();
  return `${yyyy}-${padLeftZero(mm)}-${padLeftZero(dd)}`;
};
export const toStandardTime = (dateString: string) => {
  const date = new Date(dateString);
  const hh = date.getHours();
  const mm = date.getMinutes() + 1;
  const ss = date.getSeconds();
  return `${padLeftZero(hh)}:${padLeftZero(mm)}:${padLeftZero(ss)}`;
};
